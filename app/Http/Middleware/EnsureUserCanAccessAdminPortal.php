<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserCanAccessAdminPortal
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $request->is('api/*') || $request->expectsJson()
                ? ApiResponse::error('Authentication is required.', [], 401)
                : redirect()->route('admin.login');
        }

        if (! $user->isActive() || ! $user->canAccessAdminPortal()) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                abort(403, 'You do not have permission to access the administration portal.');
            }

            return ApiResponse::error('You do not have permission to access the administration portal.', [], 403);
        }

        return $next($request);
    }
}
