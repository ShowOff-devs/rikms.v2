<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    private const DEPLOYED_ENVIRONMENTS = ['pilot', 'staging', 'production'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('X-Frame-Options', 'DENY');

        if ($this->isDeployedEnvironment()) {
            $response->headers->set(
                'Content-Security-Policy-Report-Only',
                "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self' https: wss:",
            );

            if ($request->isSecure() || str_starts_with((string) config('app.url'), 'https://')) {
                $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
            }
        }

        return $response;
    }

    private function isDeployedEnvironment(): bool
    {
        return in_array((string) config('app.env'), self::DEPLOYED_ENVIRONMENTS, true);
    }
}
