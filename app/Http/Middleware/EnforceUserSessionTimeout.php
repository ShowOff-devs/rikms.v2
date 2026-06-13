<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceUserSessionTimeout
{
    private const LAST_ACTIVITY_KEY = 'rikms_last_activity_at';

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $request->hasSession()) {
            return $next($request);
        }

        $timeoutMinutes = $this->timeoutMinutes($user->security_preferences ?? []);
        $lastActivityAt = $request->session()->get(self::LAST_ACTIVITY_KEY);

        if ($timeoutMinutes && is_numeric($lastActivityAt) && now()->timestamp - (int) $lastActivityAt > $timeoutMinutes * 60) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->is('api/*') || $request->expectsJson()) {
                return ApiResponse::error('Your session expired. Sign in again to continue.', [], 401);
            }

            if ($request->is('admin') || $request->is('admin/*')) {
                return redirect()->guest(route('admin.login'))
                    ->withErrors(['email' => 'Your session expired. Sign in again to continue.']);
            }

            return redirect()->guest(route('agency.login'))
                ->withErrors(['email' => 'Your session expired. Sign in again to continue.']);
        }

        $request->session()->put(self::LAST_ACTIVITY_KEY, now()->timestamp);

        return $next($request);
    }

    /**
     * @param  array<string, mixed>  $preferences
     */
    private function timeoutMinutes(array $preferences): ?int
    {
        $timeout = (int) ($preferences['sessionTimeout'] ?? 0);

        return $timeout >= 5 && $timeout <= 240 ? $timeout : null;
    }
}
