<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicResearchResource;
use App\Models\Research;
use Illuminate\Http\Request;

class PublicResearchController extends Controller
{
    private const SDG_COLORS = [
        'SDG 1' => '#e5243b',
        'SDG 2' => '#dda63a',
        'SDG 3' => '#4c9f38',
        'SDG 4' => '#c5192d',
        'SDG 5' => '#ff3a21',
        'SDG 6' => '#26bde2',
        'SDG 7' => '#fcc30b',
        'SDG 8' => '#a21942',
        'SDG 9' => '#fd6925',
        'SDG 10' => '#dd1367',
        'SDG 11' => '#fd9d24',
        'SDG 12' => '#bf8b2e',
        'SDG 13' => '#3f7e44',
        'SDG 14' => '#0a97d9',
        'SDG 15' => '#56c02b',
        'SDG 16' => '#00689d',
        'SDG 17' => '#19486a',
    ];

    public function index(Request $request)
    {
        $query = $this->normalizeQuery($request);
        $records = Research::query()
            ->with('agency')
            ->whereIn('status', ['published', 'archived'])
            ->get();

        $filtered = $this->sortRecords(
            $this->filterRecords($records, $query),
            $query['sort'],
        )->values();

        $total = $filtered->count();
        $perPage = $query['perPage'];
        $totalPages = max(1, (int) ceil($total / $perPage));
        $page = min(max($query['page'], 1), $totalPages);
        $items = $filtered->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'items' => PublicResearchResource::collection($items)->resolve(),
            'total' => $total,
            'page' => $page,
            'perPage' => $perPage,
            'totalPages' => $totalPages,
            'facets' => $this->facets($records),
        ]);
    }

    public function show(Research $research): PublicResearchResource
    {
        abort_unless(in_array($research->status, ['published', 'archived'], true), 404);

        return new PublicResearchResource($research->load('agency'));
    }

    public function summary()
    {
        $records = Research::query()
            ->with('agency')
            ->whereIn('status', ['published', 'archived'])
            ->orderByDesc('publication_year')
            ->orderByDesc('updated_at')
            ->get();

        return response()->json([
            'researchCount' => $records->count(),
            'agencyCount' => $records->pluck('agency_id')->unique()->count(),
            'latestPublicationCount' => $records
                ->filter(fn (Research $record): bool => (int) $record->publication_year >= 2025)
                ->count(),
            'sdgCards' => collect(range(1, 17))->map(function (int $number) use ($records): array {
                $label = "SDG {$number}";

                return [
                    'number' => (string) $number,
                    'label' => $label,
                    'color' => self::SDG_COLORS[$label],
                    'count' => $records->filter(
                        fn (Research $record): bool => in_array($label, $record->sdgs ?? [], true),
                    )->count(),
                ];
            })->values(),
            'featuredResearch' => PublicResearchResource::collection($records->take(6))->resolve(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeQuery(Request $request): array
    {
        return [
            'search' => trim((string) $request->query('search', '')),
            'agencies' => $this->arrayQuery($request, 'agency'),
            'categories' => $this->arrayQuery($request, 'category'),
            'sdgs' => $this->arrayQuery($request, 'sdg'),
            'years' => array_map('intval', $this->arrayQuery($request, 'year')),
            'accessLevels' => $this->arrayQuery($request, 'access'),
            'statuses' => $this->arrayQuery($request, 'status'),
            'yearFrom' => (int) $request->query('from', 0),
            'yearTo' => (int) $request->query('to', 9999),
            'sort' => in_array($request->query('sort'), ['newest', 'oldest', 'title', 'agency'], true)
                ? (string) $request->query('sort')
                : 'newest',
            'page' => max(1, (int) $request->query('page', 1)),
            'perPage' => max(1, min(50, (int) $request->query('per_page', 5))),
        ];
    }

    /**
     * @return list<string>
     */
    private function arrayQuery(Request $request, string $key): array
    {
        $value = $request->query($key, '');
        $items = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_filter(array_map('trim', $items), fn (string $item): bool => $item !== ''));
    }

    private function filterRecords($records, array $query)
    {
        return $records->filter(function (Research $record) use ($query): bool {
            $agency = $record->agency?->short_name ?: $record->agency?->name ?: '';
            $sdgs = $record->sdgs ?? [];
            $keywords = $record->keywords ?? [];
            $authors = $record->authors ?? [];
            $year = (int) $record->publication_year;

            $haystack = strtolower(implode(' ', [
                $record->title,
                $record->abstract,
                implode(' ', $authors),
                $agency,
                $record->category,
                implode(' ', $sdgs),
                implode(' ', $keywords),
                (string) $year,
            ]));

            return ($query['search'] === '' || str_contains($haystack, strtolower($query['search'])))
                && ($query['agencies'] === [] || in_array($agency, $query['agencies'], true))
                && ($query['categories'] === [] || in_array($record->category, $query['categories'], true))
                && ($query['sdgs'] === [] || array_intersect($query['sdgs'], $sdgs) !== [])
                && ($query['years'] === [] || in_array($year, $query['years'], true))
                && $year >= $query['yearFrom']
                && $year <= $query['yearTo']
                && ($query['accessLevels'] === [] || in_array($this->publicAccessLevel((string) $record->access_level), $query['accessLevels'], true))
                && ($query['statuses'] === [] || in_array($record->status, $query['statuses'], true));
        });
    }

    private function sortRecords($records, string $sort)
    {
        return match ($sort) {
            'oldest' => $records->sortBy('publication_year'),
            'title' => $records->sortBy('title'),
            'agency' => $records->sortBy(fn (Research $record): string => $record->agency?->short_name ?: $record->agency?->name ?: ''),
            default => $records->sortByDesc(fn (Research $record): string => sprintf('%04d-%s', $record->publication_year, $record->updated_at?->toDateTimeString())),
        };
    }

    private function facets($records): array
    {
        $years = $records->pluck('publication_year')->filter()->unique()->sortDesc()->values();

        return [
            'agencies' => $this->countFacet($records, $records->map(fn (Research $record): string => $record->agency?->short_name ?: $record->agency?->name ?: '')->filter()->unique()->sort()->values(), 'agency'),
            'categories' => $this->countFacet($records, $records->pluck('category')->filter()->unique()->sort()->values(), 'category'),
            'sdgs' => $this->countFacet($records, collect(range(1, 17))->map(fn (int $number): string => "SDG {$number}"), 'sdg'),
            'years' => $this->countFacet($records, $years->map(fn ($year): string => (string) $year), 'year'),
            'accessLevels' => $this->countFacet($records, collect(['public', 'restricted', 'embargo', 'external']), 'access'),
            'statuses' => $this->countFacet($records, collect(['published', 'archived']), 'status'),
            'minYear' => (int) ($years->min() ?: now()->year),
            'maxYear' => (int) ($years->max() ?: now()->year),
        ];
    }

    private function countFacet($records, $values, string $field)
    {
        return $values->map(function (string $value) use ($records, $field): array {
            return [
                'label' => $value,
                'value' => $value,
                'count' => $records->filter(function (Research $record) use ($field, $value): bool {
                    return match ($field) {
                        'agency' => ($record->agency?->short_name ?: $record->agency?->name ?: '') === $value,
                        'category' => $record->category === $value,
                        'sdg' => in_array($value, $record->sdgs ?? [], true),
                        'year' => (string) $record->publication_year === $value,
                        'access' => $this->publicAccessLevel((string) $record->access_level) === $value,
                        'status' => $record->status === $value,
                        default => false,
                    };
                })->count(),
                'color' => self::SDG_COLORS[$value] ?? null,
            ];
        })->values();
    }

    private function publicAccessLevel(string $accessLevel): string
    {
        return match ($accessLevel) {
            'request_required', 'private' => 'restricted',
            'embargoed' => 'embargo',
            default => $accessLevel,
        };
    }
}
