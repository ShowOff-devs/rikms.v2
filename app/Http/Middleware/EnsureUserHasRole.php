<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return redirect()->route('login');
            }

            return ApiResponse::error('Authentication is required.', [], 401);
        }

        if (! $user->hasAnyRole($this->normalizeArguments($roles))) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                abort(403, 'You do not have permission to access this resource.');
            }

            return ApiResponse::error('You do not have permission to access this resource.', [], 403);
        }

        return $next($request);
    }

    /**
     * @param  array<int, string>  $arguments
     * @return array<int, string>
     */
    private function normalizeArguments(array $arguments): array
    {
        return collect($arguments)
            ->flatMap(fn (string $argument): array => explode(',', $argument))
            ->map(fn (string $role): string => trim($role))
            ->filter()
            ->values()
            ->all();
    }
}
