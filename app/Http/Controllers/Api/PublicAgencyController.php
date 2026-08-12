<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicAgencyResource;
use App\Http\Resources\PublicResearchResource;
use App\Models\Agency;
use App\Services\PublicResponseCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicAgencyController extends Controller
{
    public function __construct(private readonly PublicResponseCache $cache) {}

    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $type = (string) $request->query('type', 'all');

        $payload = $this->cache->rememberAgency('agency-list', compact('search', 'type'), function () use ($search, $type, $request): array {
            $agencies = Agency::query()
                ->where('status', 'active')->whereNull('archived_at')
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($query) use ($search): void {
                        $query->where('name', 'like', "%{$search}%")
                            ->orWhere('short_name', 'like', "%{$search}%")
                            ->orWhere('full_name', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%")
                            ->orWhere('type', 'like', "%{$search}%");
                    });
                })
                ->when($type !== 'all', fn ($query) => $query->where('type', $type))
                ->withCount(['research' => fn ($query) => $query->publiclyVisible()])
                ->orderBy('name')->get();

            return ['data' => PublicAgencyResource::collection($agencies)->resolve($request)];
        });

        return response()->json($payload);
    }

    public function show(Request $request, Agency $agency): JsonResponse
    {
        abort_unless($agency->status === 'active', 404);

        $payload = $this->cache->rememberAgency('agency-detail', ['id' => $agency->id], fn (): array => [
            'data' => (new PublicAgencyResource(
                $agency->loadCount(['research' => fn ($query) => $query->publiclyVisible()]),
            ))->resolve($request),
        ]);

        return response()->json($payload);
    }

    public function types(): JsonResponse
    {
        return response()->json($this->cache->rememberAgency('agency-types', [], fn (): array => [
            'data' => Agency::query()
                ->where('status', 'active')->whereNull('archived_at')
                ->distinct()
                ->orderBy('type')
                ->pluck('type')
                ->values(),
        ]));
    }

    public function research(Agency $agency): AnonymousResourceCollection
    {
        abort_unless($agency->status === 'active', 404);

        $records = $agency
            ->research()
            ->with('agency')
            ->publiclyVisible()
            ->orderByDesc('publication_year')
            ->orderByDesc('updated_at')
            ->get();

        return PublicResearchResource::collection($records);
    }
}
