<?php

namespace App\Http\Middleware;

use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\User;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminResourceScope
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        foreach ($request->route()?->parameters() ?? [] as $resource) {
            $agencyId = match (true) {
                $resource instanceof Agency => (int) $resource->id,
                $resource instanceof Research => (int) $resource->agency_id,
                $resource instanceof User => $resource->agency_id ? (int) $resource->agency_id : null,
                $resource instanceof AccessRequest => (int) $resource->research()->value('agency_id'),
                $resource instanceof ResearchFile => (int) $resource->research()->value('agency_id'),
                default => false,
            };

            if ($agencyId !== false && ! $user?->canAccessAgency($agencyId)) {
                if ($request->is('api/*') || $request->expectsJson()) {
                    return ApiResponse::error('This resource is outside your assigned administrative scope.', [], 403);
                }

                abort(403, 'This resource is outside your assigned administrative scope.');
            }
        }

        return $next($request);
    }
}
