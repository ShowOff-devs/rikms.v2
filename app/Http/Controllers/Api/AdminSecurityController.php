<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\SecurityEventResource;
use App\Models\SecurityEvent;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminSecurityController extends Controller
{
    use RespondsWithApiPagination;

    public function events(Request $request): JsonResponse
    {
        $query = SecurityEvent::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event_type'), fn (Builder $query) => $query->where('event_type', $request->string('event_type')))
            ->when($request->filled('severity'), fn (Builder $query) => $query->where('severity', $request->string('severity')))
            ->when($request->has('resolved'), fn (Builder $query) => $request->boolean('resolved') ? $query->whereNotNull('resolved_at') : $query->whereNull('resolved_at'))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Security events retrieved.',
            $query->paginate($this->perPage($request)),
            SecurityEventResource::class,
            $request,
        );
    }

    public function show(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        return ApiResponse::success(
            'Security event retrieved.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function resolve(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by']);

        $securityEvent->forceFill([
            'resolved_at' => now(),
            'resolved_by' => $request->user()->id,
        ])->save();

        AuditLogger::record(
            $request,
            'security_event.resolved',
            $securityEvent,
            $oldValues,
            $securityEvent->only(['resolved_at', 'resolved_by']),
        );

        return ApiResponse::success(
            'Security event resolved.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }

    public function reopen(Request $request, SecurityEvent $securityEvent): JsonResponse
    {
        $oldValues = $securityEvent->only(['resolved_at', 'resolved_by']);

        $securityEvent->forceFill([
            'resolved_at' => null,
            'resolved_by' => null,
        ])->save();

        AuditLogger::record(
            $request,
            'security_event.reopened',
            $securityEvent,
            $oldValues,
            $securityEvent->only(['resolved_at', 'resolved_by']),
        );

        return ApiResponse::success(
            'Security event reopened.',
            (new SecurityEventResource($securityEvent->load(['user', 'agency'])))->resolve($request),
        );
    }
}
