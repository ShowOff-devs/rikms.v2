<?php

use App\Http\Middleware\AddSecurityHeaders;
use App\Http\Middleware\AuthorizeAdminRoute;
use App\Http\Middleware\ConfigureTrustedHosts;
use App\Http\Middleware\ConfigureTrustedProxies;
use App\Http\Middleware\EnforcePlatformMaintenanceMode;
use App\Http\Middleware\EnforceUserSessionTimeout;
use App\Http\Middleware\EnsureAgencyScope;
use App\Http\Middleware\EnsureSuperAdminHasTwoFactor;
use App\Http\Middleware\EnsureUserCanAccessAdminPortal;
use App\Http\Middleware\EnsureUserHasPermission;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Support\ApiResponse;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->prepend([
            ConfigureTrustedHosts::class,
            ConfigureTrustedProxies::class,
        ]);

        $middleware->statefulApi();

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'agency.scope' => EnsureAgencyScope::class,
            'admin.portal' => EnsureUserCanAccessAdminPortal::class,
            'admin.authorize' => AuthorizeAdminRoute::class,
            'permission' => EnsureUserHasPermission::class,
            'role' => EnsureUserHasRole::class,
            'super_admin.2fa' => EnsureSuperAdminHasTwoFactor::class,
        ]);

        $middleware->web(append: [
            AddSecurityHeaders::class,
            EnforcePlatformMaintenanceMode::class,
            EnforceUserSessionTimeout::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->api(append: [
            EnforcePlatformMaintenanceMode::class,
            EnforceUserSessionTimeout::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (AuthenticationException $exception, $request) {
            if ($request->is('api/*')) {
                return ApiResponse::error('Authentication is required.', [], 401);
            }

            if ($request->is('admin') || $request->is('admin/*')) {
                return redirect()->guest(route('admin.login'));
            }

            if ($request->is('agency') || $request->is('agency/*')) {
                return redirect()->guest(route('agency.login'));
            }
        });
    })->create();
