<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyTurnstileFortifyRequests
{
    public function __construct(private readonly VerifyTurnstile $turnstile) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('POST')) {
            return $next($request);
        }

        if ($request->routeIs('login.store')) {
            return $this->turnstile->handle($request, $next, 'agency_login');
        }

        if ($request->routeIs('password.email')) {
            return $this->turnstile->handle($request, $next, 'password_reset');
        }

        return $next($request);
    }
}
