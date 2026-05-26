<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicAgencyResource;
use App\Http\Resources\PublicResearchResource;
use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicAgencyController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $search = trim((string) $request->query('search', ''));
        $type = (string) $request->query('type', 'all');

        $agencies = Agency::query()
            ->where('status', 'active')
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query
                        ->where('name', 'like', "%{$search}%")
                        ->orWhere('short_name', 'like', "%{$search}%")
                        ->orWhere('full_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%");
                });
            })
            ->when($type !== 'all', fn ($query) => $query->where('type', $type))
            ->withCount(['research' => fn ($query) => $query->whereIn('status', ['published', 'archived'])])
            ->orderBy('name')
            ->get();

        return PublicAgencyResource::collection($agencies);
    }

    public function show(Agency $agency): PublicAgencyResource
    {
        abort_unless($agency->status === 'active', 404);

        return new PublicAgencyResource(
            $agency->loadCount(['research' => fn ($query) => $query->whereIn('status', ['published', 'archived'])]),
        );
    }

    public function types()
    {
        return response()->json([
            'data' => Agency::query()
                ->where('status', 'active')
                ->distinct()
                ->orderBy('type')
                ->pluck('type')
                ->values(),
        ]);
    }

    public function research(Agency $agency): AnonymousResourceCollection
    {
        abort_unless($agency->status === 'active', 404);

        $records = $agency
            ->research()
            ->with('agency')
            ->whereIn('status', ['published', 'archived'])
            ->orderByDesc('publication_year')
            ->orderByDesc('updated_at')
            ->get();

        return PublicResearchResource::collection($records);
    }
}
