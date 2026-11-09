<?php

namespace App\Services;

use App\Support\TurnstileVerificationResult;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Throwable;

class TurnstileVerificationService
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function verify(Request $request, string $expectedAction): TurnstileVerificationResult
    {
        $legacyConfiguration = match ($expectedAction) {
            'public_access_request' => 'rikms.public_access_requests.captcha',
            'public_contact' => 'rikms.public_contact.captcha',
            default => null,
        };
        $enabled = config('rikms.turnstile.enabled') === true
            || ($legacyConfiguration !== null && config($legacyConfiguration.'.enabled') === true);

        if (! $enabled) {
            return app()->environment(['local', 'testing'])
                ? TurnstileVerificationResult::valid()
                : TurnstileVerificationResult::invalid('configuration_error');
        }

        $secret = trim((string) (config('rikms.turnstile.secret_key')
            ?: ($legacyConfiguration ? config($legacyConfiguration.'.secret_key') : null)));
        $hostnames = config('rikms.turnstile.expected_hostnames', []);

        if ($hostnames === [] && $legacyConfiguration !== null) {
            $hostnames = config($legacyConfiguration.'.allowed_hostnames', []);
        }
        $token = $request->input('captcha_token', $request->input('cf-turnstile-response'));

        if ($secret === '' || ! is_array($hostnames) || $hostnames === [] || $expectedAction === '') {
            return TurnstileVerificationResult::invalid('configuration_error');
        }

        if (! is_string($token) || trim($token) === '' || strlen($token) > 4096) {
            return TurnstileVerificationResult::invalid('missing_or_malformed_token');
        }

        try {
            $response = Http::asForm()
                ->connectTimeout(2)
                ->timeout(max(1, (float) config('rikms.turnstile.timeout_seconds', 3)))
                ->post(self::VERIFY_URL, array_filter([
                    'secret' => $secret,
                    'response' => trim($token),
                    'remoteip' => $request->ip(),
                ], static fn (mixed $value): bool => $value !== null && $value !== ''));
        } catch (ConnectionException) {
            return TurnstileVerificationResult::invalid('provider_unavailable');
        } catch (Throwable) {
            return TurnstileVerificationResult::invalid('provider_unavailable');
        }

        if (! $response->successful()) {
            return TurnstileVerificationResult::invalid('provider_unavailable');
        }

        $errorCodes = array_values(array_filter(
            (array) $response->json('error-codes', []),
            'is_string',
        ));

        if ($response->json('success') !== true) {
            $reason = in_array('timeout-or-duplicate', $errorCodes, true)
                ? 'expired_or_reused_token'
                : 'invalid_token';

            return TurnstileVerificationResult::invalid($reason, $errorCodes);
        }

        $hostname = strtolower(rtrim(trim((string) $response->json('hostname')), '.'));

        if (! in_array($hostname, $hostnames, true)) {
            return TurnstileVerificationResult::invalid('hostname_mismatch');
        }

        $action = (string) $response->json('action');

        if (! hash_equals($expectedAction, $action)) {
            return TurnstileVerificationResult::invalid('action_mismatch');
        }

        return TurnstileVerificationResult::valid();
    }
}
