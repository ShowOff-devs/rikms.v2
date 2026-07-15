<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\SecurityEventLogger;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgencyScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('Authentication is required.', [], 401);
        }

        if (! $user->isAgencyAdmin()) {
            return $this->deny($request, 'You do not have permission to access the agency portal.');
        }

        if (! $user->isActive()) {
            return $this->logoutAndDeny($request, 'Your account is inactive. Contact a system administrator.');
        }

        $agency = $user->agency_id ? $user->agency()->first() : null;

        if (! $user->agency_id || ! $agency) {
            return $this->logoutAndDeny($request, 'Your account is not assigned to an active agency.');
        }

        if ($agency->status !== 'active' || $agency->trashed()) {
            return $this->logoutAndDeny($request, 'Your agency account is inactive. Contact a system administrator.');
        }

        return $next($request);
    }

    private function deny(Request $request, string $message): Response
    {
        if ($request->is('api/*') || $request->expectsJson()) {
            return ApiResponse::error($message, [], 403);
        }

        abort(403, $message);
    }

    private function logoutAndDeny(Request $request, string $message): Response
    {
        $user = $request->user();

        if ($user) {
            SecurityEventLogger::record($request, 'session.revoked', $user, 'medium', [
                'reason' => 'agency_scope_denied',
            ]);
            AuditLogger::record($request, 'session.revoked', null, null, [
                'reason' => 'agency_scope_denied',
            ]);
        }

        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        if ($request->is('api/*') || $request->expectsJson()) {
            return ApiResponse::error($message, [], 403);
        }

        return redirect()->guest(route('agency.login'))
            ->withErrors(['email' => $message]);
    }
}
