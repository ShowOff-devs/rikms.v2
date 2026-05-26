<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgencyScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return ApiResponse::error('Authentication is required.', [], 401);
        }

        if ($user->isSuperAdmin()) {
            return $next($request);
        }

        if ($user->isAgencyAdmin() && ! $user->agency_id) {
            return ApiResponse::error('Your account is not assigned to an agency.', [], 403);
        }

        return $next($request);
    }
}
