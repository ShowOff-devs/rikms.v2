<?php

namespace App\Http\Middleware;

use App\Services\TurnstileVerificationService;
use App\Support\SecurityEventLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;

class VerifyTurnstile
{
    public function __construct(private readonly TurnstileVerificationService $turnstile) {}

    public function handle(Request $request, Closure $next, string $action): Response
    {
        $expectedAction = (string) config("rikms.turnstile.actions.{$action}");
        $result = $this->turnstile->verify($request, $expectedAction);

        if ($result->valid) {
            return $next($request);
        }

        $failureKey = 'turnstile-failure:'.hash('sha256', $action.'|'.(string) $request->ip());
        RateLimiter::hit($failureKey, 600);
        $attempts = RateLimiter::attempts($failureKey);

        SecurityEventLogger::record($request, 'captcha.verification_failed', null,
            $result->reason === 'provider_unavailable' ? 'high' : 'medium', [
                'protected_action' => $action,
                'reason' => $result->reason,
                'correlation_id' => $request->headers->get('X-Request-ID'),
                'repeated_failure' => $attempts >= 5,
                'failure_count' => $attempts,
            ]);

        throw ValidationException::withMessages([
            'captcha_token' => ['We could not verify the submission. Please try again.'],
        ]);
    }
}
