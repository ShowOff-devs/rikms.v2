<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PublicAccessRequestCaptchaVerifier
{
    public function verify(
        Request $request,
        string $configurationKey = 'rikms.public_access_requests.captcha',
    ): bool {
        if (! config($configurationKey.'.enabled')) {
            return true;
        }

        $provider = (string) config($configurationKey.'.provider', 'turnstile');

        if ($provider !== 'turnstile') {
            Log::warning('Public form CAPTCHA provider is unsupported.', [
                'provider' => $provider,
            ]);

            return false;
        }

        $secret = config($configurationKey.'.secret_key');
        $token = $request->input('captcha_token', $request->input('cf-turnstile-response'));

        if (! is_string($secret) || trim($secret) === '' || ! is_string($token) || trim($token) === '') {
            Log::notice('Public form CAPTCHA rejected a submission.', [
                'reason' => 'captcha_missing',
                'ip_hash' => hash('sha256', (string) $request->ip()),
            ]);

            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout((float) config($configurationKey.'.timeout_seconds', 3))
                ->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $request->ip(),
                ]);
        } catch (\Throwable $exception) {
            Log::warning('Public form CAPTCHA verification failed before completion.', [
                'reason' => 'captcha_provider_error',
                'exception_class' => $exception::class,
                'ip_hash' => hash('sha256', (string) $request->ip()),
            ]);

            return false;
        }

        $allowedHostnames = config($configurationKey.'.allowed_hostnames', []);
        $expectedAction = (string) config(
            $configurationKey.'.expected_action',
            'public_access_request',
        );
        $hostname = strtolower(rtrim(trim((string) $response->json('hostname')), '.'));
        $action = (string) $response->json('action');
        $providerAccepted = $response->ok() && $response->json('success') === true;
        $hostnameAccepted = is_array($allowedHostnames)
            && $allowedHostnames !== []
            && in_array($hostname, $allowedHostnames, true);
        $actionAccepted = $expectedAction !== '' && hash_equals($expectedAction, $action);
        $verified = $providerAccepted && $hostnameAccepted && $actionAccepted;

        if (! $verified) {
            Log::notice('Public form CAPTCHA rejected a submission.', [
                'reason' => match (true) {
                    ! $providerAccepted => 'captcha_failed',
                    ! $hostnameAccepted => 'captcha_hostname_mismatch',
                    ! $actionAccepted => 'captcha_action_mismatch',
                    default => 'captcha_failed',
                },
                'provider_status' => $response->status(),
                'ip_hash' => hash('sha256', (string) $request->ip()),
            ]);
        }

        return $verified;
    }
}
