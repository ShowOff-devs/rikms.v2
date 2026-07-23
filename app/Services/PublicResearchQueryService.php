<?php

namespace App\Services;

use App\Http\Resources\PublicResearchResource;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PublicResearchQueryService
{
    public const DEFAULT_PER_PAGE = 12;

    public const MAX_PER_PAGE = 50;

    private const ALLOWED_SORTS = [
        'newest',
        'oldest',
        'title',
        'agency',
        'publication_year',
        'published_at',
        'created_at',
    ];

    public function parameters(Request $request): array
    {
        $sort = (string) $request->query('sort', 'newest');

        if (! in_array($sort, self::ALLOWED_SORTS, true)) {
            throw ValidationException::withMessages(['sort' => ['The selected sort is invalid.']]);
        }

        return [
            'search' => mb_substr(trim((string) $request->query('search', '')), 0, 200),
            'agencies' => $this->arrayParameter($request, 'agency'),
            'categories' => $this->arrayParameter($request, 'category'),
            'documentTypes' => $this->arrayParameter($request, 'document_type'),
            'sdgs' => $this->arrayParameter($request, 'sdg'),
            'years' => array_values(array_filter(array_map('intval', $this->arrayParameter($request, 'year')))),
            'accessLevels' => $this->arrayParameter($request, 'access'),
            'yearFrom' => max(0, (int) $request->query('from', 0)),
            'yearTo' => min(9999, max(0, (int) $request->query('to', 9999))),
            'sort' => $sort,
            'page' => max(1, (int) $request->query('page', 1)),
            'perPage' => max(1, min(self::MAX_PER_PAGE, (int) $request->query('per_page', self::DEFAULT_PER_PAGE))),
        ];
    }

    public function listing(array $parameters, Request $request): array
    {
        $query = $this->applyFilters($this->baseQuery()->with('agency'), $parameters);
        $this->applySort($query, $parameters['sort']);
        $paginator = $query->paginate($parameters['perPage'], ['research.*'], 'page', $parameters['page']);

        return [
            'items' => PublicResearchResource::collection($paginator->getCollection())->resolve($request),
            'total' => $paginator->total(),
            'page' => $paginator->currentPage(),
            'perPage' => $paginator->perPage(),
            'totalPages' => max(1, $paginator->lastPage()),
            'facets' => $this->facets(),
        ];
    }

    public function summary(Request $request, array $sdgColors): array
    {
        $base = $this->baseQuery();
        $latestYear = (clone $base)->whereNotNull('publication_year')->max('publication_year');
        $latestCount = $latestYear ? (clone $base)->where('publication_year', $latestYear)->count() : 0;
        $sdgCards = collect(range(1, 17))->map(function (int $number) use ($base, $sdgColors): array {
            $label = "SDG {$number}";

            return [
                'number' => (string) $number,
                'label' => $label,
                'color' => $sdgColors[$label],
                'count' => (clone $base)->whereJsonContains('sdgs', $label)->count(),
            ];
        })->values()->all();

        $featured = (clone $base)
            ->with('agency')
            ->orderByDesc('publication_year')
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get();

        return [
            'researchCount' => (clone $base)->count(),
            'agencyCount' => Agency::query()->where('status', 'active')->whereNull('archived_at')->count(),
            'representedSdgCount' => collect($sdgCards)->where('count', '>', 0)->count(),
            'latestPublicationYear' => $latestYear ? (int) $latestYear : null,
            'latestPublicationCount' => $latestCount,
            'recentPublicationCount' => $latestCount,
            'sdgCards' => $sdgCards,
            'featuredResearch' => PublicResearchResource::collection($featured)->resolve($request),
        ];
    }

    public function facets(): array
    {
        $base = $this->baseQuery();
        $years = (clone $base)
            ->whereNotNull('publication_year')
            ->select('publication_year', DB::raw('count(*) as aggregate'))
            ->groupBy('publication_year')
            ->orderByDesc('publication_year')
            ->get();

        return [
            'agencies' => (clone $base)
                ->join('agencies', 'agencies.id', '=', 'research.agency_id')
                ->selectRaw("coalesce(nullif(agencies.short_name, ''), agencies.name) as label, count(*) as aggregate")
                ->groupBy('agencies.id', 'agencies.short_name', 'agencies.name')
                ->orderBy('label')
                ->get()->map(fn ($row): array => $this->facet((string) $row->label, (int) $row->aggregate))->all(),
            'categories' => $this->groupedFacet($base, 'category'),
            'documentTypes' => ResearchFile::query()
                ->where('status', 'active')
                ->whereNull('archived_at')
                ->whereHas('research', fn (Builder $query) => $query->publiclyVisible())
                ->select('file_type', DB::raw('count(distinct research_id) as aggregate'))
                ->groupBy('file_type')->orderBy('file_type')->get()
                ->map(fn ($row): array => $this->facet((string) $row->file_type, (int) $row->aggregate))->all(),
            'sdgs' => collect(range(1, 17))->map(function (int $number) use ($base): array {
                $label = "SDG {$number}";

                return $this->facet($label, (clone $base)->whereJsonContains('sdgs', $label)->count());
            })->all(),
            'years' => $years->map(fn ($row): array => $this->facet((string) $row->publication_year, (int) $row->aggregate))->all(),
            'accessLevels' => collect(['public', 'restricted', 'embargo', 'external'])->map(fn (string $level): array => $this->facet(
                $level,
                $this->accessLevelCount($base, $level),
            ))->all(),
            'statuses' => [$this->facet(Statuses::RESEARCH_PUBLISHED, (clone $base)->count())],
            'minYear' => (int) ($years->min('publication_year') ?: now()->year),
            'maxYear' => (int) ($years->max('publication_year') ?: now()->year),
        ];
    }

    public function baseQuery(): Builder
    {
        return Research::query()->publiclyVisible();
    }

    private function applyFilters(Builder $query, array $parameters): Builder
    {
        $search = $parameters['search'];

        return $query
            ->when($search !== '', function (Builder $query) use ($search): void {
                $like = "%{$search}%";
                $query->where(function (Builder $query) use ($like): void {
                    $query->where('title', 'like', $like)
                        ->orWhere('category', 'like', $like)
                        ->orWhere('publication_year', 'like', $like)
                        ->orWhereHas('agency', function (Builder $query) use ($like): void {
                            $query->where('name', 'like', $like)
                                ->orWhere('short_name', 'like', $like)
                                ->orWhere('full_name', 'like', $like);
                        })
                        ->orWhere(function (Builder $query) use ($like): void {
                            $query->whereNull('public_metadata_fields')
                                ->whereNull('public_metadata')
                                ->where(function (Builder $query) use ($like): void {
                                    $query->where('abstract', 'like', $like)
                                        ->orWhere('authors', 'like', $like)
                                        ->orWhere('keywords', 'like', $like);
                                });
                        });

                    $this->applyPublicMetadataSearch($query, $like);
                });
            })
            ->when($parameters['agencies'] !== [], function (Builder $query) use ($parameters): void {
                $query->whereHas('agency', function (Builder $query) use ($parameters): void {
                    $query->whereIn('slug', $parameters['agencies'])
                        ->orWhereIn('short_name', $parameters['agencies'])
                        ->orWhereIn('name', $parameters['agencies']);
                });
            })
            ->when($parameters['categories'] !== [], fn (Builder $query) => $query->whereIn('category', $parameters['categories']))
            ->when($parameters['documentTypes'] !== [], fn (Builder $query) => $query->whereHas(
                'files',
                fn (Builder $query) => $query->whereIn('file_type', $parameters['documentTypes'])->where('status', 'active')->whereNull('archived_at'),
            ))
            ->when($parameters['sdgs'] !== [], function (Builder $query) use ($parameters): void {
                $query->where(function (Builder $query) use ($parameters): void {
                    foreach ($parameters['sdgs'] as $sdg) {
                        $query->orWhereJsonContains('sdgs', $sdg);
                    }
                });
            })
            ->when($parameters['years'] !== [], fn (Builder $query) => $query->whereIn('publication_year', $parameters['years']))
            ->whereBetween('publication_year', [$parameters['yearFrom'], $parameters['yearTo']])
            ->when($parameters['accessLevels'] !== [], function (Builder $query) use ($parameters): void {
                $stored = collect($parameters['accessLevels'])->flatMap(fn (string $level): array => match ($level) {
                    'restricted' => ['restricted', 'request_required'],
                    'embargo' => ['embargo', 'embargoed'],
                    default => [$level],
                })->unique()->all();
                $query->whereIn('access_level', $stored);
            });
    }

    private function applySort(Builder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->orderBy('publication_year')->orderBy('id'),
            'title' => $query->orderBy('title')->orderBy('id'),
            'agency' => $query->orderBy(
                Agency::query()->selectRaw("coalesce(nullif(short_name, ''), name)")->whereColumn('agencies.id', 'research.agency_id'),
            )->orderBy('id'),
            'publication_year' => $query->orderByDesc('publication_year')->orderByDesc('id'),
            'published_at' => $query->orderByDesc('published_at')->orderByDesc('id'),
            'created_at' => $query->orderByDesc('created_at')->orderByDesc('id'),
            default => $query->orderByDesc('publication_year')->orderByDesc('updated_at')->orderByDesc('id'),
        };
    }

    private function groupedFacet(Builder $base, string $column): array
    {
        return (clone $base)->whereNotNull($column)->where($column, '!=', '')
            ->select($column, DB::raw('count(*) as aggregate'))->groupBy($column)->orderBy($column)->get()
            ->map(fn ($row): array => $this->facet((string) $row->{$column}, (int) $row->aggregate))->all();
    }

    private function applyPublicMetadataSearch(Builder $query, string $like): void
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'sqlite') {
            $query->orWhereRaw(
                <<<'SQL'
                exists (
                    select 1
                    from json_each(research.public_metadata) as metadata
                    join json_each(research.public_metadata_fields) as fields
                      on json_extract(metadata.value, '$.key') = fields.value
                    where cast(json_extract(metadata.value, '$.value') as text) like ?
                )
                SQL,
                [$like],
            );

            return;
        }

        if ($driver === 'mysql') {
            $query->orWhereRaw(
                <<<'SQL'
                exists (
                    select 1
                    from json_table(research.public_metadata, '$[*]' columns(
                        meta_key varchar(100) path '$.key',
                        meta_value text path '$.value'
                    )) as metadata
                    join json_table(research.public_metadata_fields, '$[*]' columns(
                        field_key varchar(100) path '$'
                    )) as fields on metadata.meta_key = fields.field_key
                    where metadata.meta_value like ?
                )
                SQL,
                [$like],
            );
        }
    }

    private function accessLevelCount(Builder $base, string $level): int
    {
        return match ($level) {
            'restricted' => (clone $base)->whereIn('access_level', ['restricted', 'request_required'])->count(),
            'embargo' => (clone $base)->whereIn('access_level', ['embargo', 'embargoed'])->count(),
            default => (clone $base)->where('access_level', $level)->count(),
        };
    }

    private function facet(string $label, int $count): array
    {
        return ['label' => $label, 'value' => $label, 'count' => $count, 'color' => null];
    }

    private function arrayParameter(Request $request, string $key): array
    {
        $value = $request->query($key, '');
        $items = is_array($value) ? $value : explode(',', (string) $value);

        return array_values(array_unique(array_filter(array_map(
            fn (mixed $item): string => mb_substr(trim((string) $item), 0, 100),
            $items,
        ))));
    }
}
