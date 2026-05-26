<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPermission
{
    public function handle(Request $request, Closure $next, string ...$permissions): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('Authentication is required.', [], 401);
        }

        if (! $user->hasAnyPermission($this->normalizeArguments($permissions))) {
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
            ->map(fn (string $permission): string => trim($permission))
            ->filter()
            ->values()
            ->all();
    }
}
