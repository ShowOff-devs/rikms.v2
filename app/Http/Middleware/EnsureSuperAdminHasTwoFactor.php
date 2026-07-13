<?php

namespace App\Http\Middleware;

use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdminHasTwoFactor
{
    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user?->isSuperAdmin()
            || ! $this->settings->superAdminMfaRequired()
            || $user->hasEnabledTwoFactorAuthentication()
            || $request->routeIs('two-factor.*')
        ) {
            return $next($request);
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return ApiResponse::error('Two-factor authentication is required for Super Admin accounts.', [
                'redirect' => route('two-factor.show', absolute: false),
            ], 403);
        }

        return redirect()
            ->route('two-factor.show')
            ->with('status', 'Two-factor authentication is required for Super Admin accounts.');
    }
}
