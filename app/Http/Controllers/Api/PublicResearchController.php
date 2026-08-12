<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicResearchResource;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Services\PublicResearchQueryService;
use App\Services\PublicResponseCache;
use App\Support\ResearchAnalyticsTracker;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicResearchController extends Controller
{
    private const SDG_COLORS = [
        'SDG 1' => '#e5243b', 'SDG 2' => '#dda63a', 'SDG 3' => '#4c9f38',
        'SDG 4' => '#c5192d', 'SDG 5' => '#ff3a21', 'SDG 6' => '#26bde2',
        'SDG 7' => '#fcc30b', 'SDG 8' => '#a21942', 'SDG 9' => '#fd6925',
        'SDG 10' => '#dd1367', 'SDG 11' => '#fd9d24', 'SDG 12' => '#bf8b2e',
        'SDG 13' => '#3f7e44', 'SDG 14' => '#0a97d9', 'SDG 15' => '#56c02b',
        'SDG 16' => '#00689d', 'SDG 17' => '#19486a',
    ];

    public function __construct(
        private readonly PublicResearchQueryService $queries,
        private readonly PublicResponseCache $cache,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $parameters = $this->queries->parameters($request);
        $payload = $this->cache->rememberResearchList(
            $parameters,
            fn (): array => $this->queries->listing($parameters, $request),
        );

        return response()->json($payload);
    }

    public function show(Request $request, string $identifier): PublicResearchResource
    {
        $research = $this->resolvePublicResearch($identifier);
        ResearchAnalyticsTracker::recordView($request, $research, 'public');

        return new PublicResearchResource($research);
    }

    public function download(Request $request, string $identifier): JsonResponse|StreamedResponse
    {
        $research = $this->resolvePublicResearch($identifier);

        if ($this->publicAccessLevel((string) $research->access_level) !== 'public') {
            return response()->json(['message' => 'This research record is not available for public download.'], 403);
        }

        $file = $this->publicDownloadFile($research);

        if (! $file) {
            return response()->json(['message' => 'No public PDF is available for this research record.'], 404);
        }

        if (! Storage::disk($file->disk)->exists($file->path)) {
            return response()->json(['message' => 'The stored research file could not be found.'], 404);
        }

        $research->increment('downloads');
        ResearchAnalyticsTracker::recordDownload($request, $research, $file, 'public');

        return Storage::disk($file->disk)->download($file->path, $file->original_name);
    }

    public function summary(Request $request): JsonResponse
    {
        $payload = $this->cache->rememberResearchSummary(
            fn (): array => $this->queries->summary($request, self::SDG_COLORS),
        );

        return response()->json($payload);
    }

    private function resolvePublicResearch(string $identifier): Research
    {
        return $this->queries->baseQuery()
            ->with('agency')
            ->where(function (Builder $query) use ($identifier): void {
                $query->where('slug', $identifier);

                if (ctype_digit($identifier)) {
                    $query->orWhere('id', (int) $identifier);
                }
            })->firstOrFail();
    }

    private function publicAccessLevel(string $accessLevel): string
    {
        return match ($accessLevel) {
            'request_required', 'private' => 'restricted',
            'embargoed' => 'embargo',
            default => $accessLevel,
        };
    }

    private function publicDownloadFile(Research $research): ?ResearchFile
    {
        return $research->files()
            ->whereNull('archived_at')
            ->where('status', 'active')
            ->where(function (Builder $query): void {
                $query->where('access_level', 'public')->orWhere('visibility', 'public');
            })
            ->orderByDesc('uploaded_at')->orderByDesc('id')->first();
    }
}
