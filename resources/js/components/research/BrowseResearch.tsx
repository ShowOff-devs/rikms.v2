import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ResearchCard from '@/components/research/ResearchCard';
import ResearchEmptyState from '@/components/research/ResearchEmptyState';
import ResearchFilters from '@/components/research/ResearchFilters';
import ResearchSearchBar from '@/components/research/ResearchSearchBar';
import {
    getResearchFacets,
    searchResearch,
} from '@/lib/research/research-service';
import type {
    ResearchAccessLevel,
    ResearchFilters as ResearchFiltersType,
    ResearchQuery,
    ResearchSearchResult,
    ResearchSortKey,
    ResearchStatus,
} from '@/types/research';

const perPage = 5;
const facets = getResearchFacets();

const defaultFilters: ResearchFiltersType = {
    search: '',
    agencies: [],
    categories: [],
    sdgs: [],
    years: [],
    accessLevels: [],
    statuses: [],
    yearFrom: facets.minYear,
    yearTo: facets.maxYear,
};

const defaultQuery: ResearchQuery = {
    ...defaultFilters,
    sort: 'newest',
    page: 1,
    perPage,
};

const arrayFromParam = (params: URLSearchParams, key: string) =>
    (params.get(key) ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

const numberArrayFromParam = (params: URLSearchParams, key: string) =>
    arrayFromParam(params, key)
        .map(Number)
        .filter((value) => Number.isFinite(value));

function readQueryFromUrl(): ResearchQuery {
    if (typeof window === 'undefined') {
        return defaultQuery;
    }

    const params = new URLSearchParams(window.location.search);
    const search = params.get('search') ?? params.get('q') ?? '';
    const sort = (params.get('sort') ?? 'newest') as ResearchSortKey;
    const page = Number(params.get('page') ?? 1);

    return {
        search,
        agencies: arrayFromParam(params, 'agency'),
        categories: arrayFromParam(params, 'category'),
        sdgs: arrayFromParam(params, 'sdg'),
        years: numberArrayFromParam(params, 'year'),
        accessLevels: arrayFromParam(params, 'access') as ResearchAccessLevel[],
        statuses: arrayFromParam(params, 'status') as ResearchStatus[],
        yearFrom: Number(params.get('from') ?? facets.minYear),
        yearTo: Number(params.get('to') ?? facets.maxYear),
        sort: ['newest', 'oldest', 'title', 'agency'].includes(sort)
            ? sort
            : 'newest',
        page: Number.isFinite(page) && page > 0 ? page : 1,
        perPage,
    };
}

function writeQueryToUrl(query: ResearchQuery) {
    if (typeof window === 'undefined') {
        return;
    }

    const params = new URLSearchParams();

    if (query.search.trim()) {
        params.set('search', query.search.trim());
    }

    if (query.agencies.length) {
        params.set('agency', query.agencies.join(','));
    }

    if (query.categories.length) {
        params.set('category', query.categories.join(','));
    }

    if (query.sdgs.length) {
        params.set('sdg', query.sdgs.join(','));
    }

    if (query.years.length) {
        params.set('year', query.years.join(','));
    }

    if (query.accessLevels.length) {
        params.set('access', query.accessLevels.join(','));
    }

    if (query.statuses.length) {
        params.set('status', query.statuses.join(','));
    }

    if (query.yearFrom !== facets.minYear) {
        params.set('from', String(query.yearFrom));
    }

    if (query.yearTo !== facets.maxYear) {
        params.set('to', String(query.yearTo));
    }

    if (query.sort !== 'newest') {
        params.set('sort', query.sort);
    }

    if (query.page > 1) {
        params.set('page', String(query.page));
    }

    const nextUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;

    window.history.replaceState({}, '', nextUrl);
}

function toggleArrayValue<T extends string | number>(items: T[], value: T) {
    return items.includes(value)
        ? items.filter((item) => item !== value)
        : [...items, value];
}

export default function BrowseResearch() {
    const [query, setQuery] = useState<ResearchQuery>(() => readQueryFromUrl());
    const [result, setResult] = useState<ResearchSearchResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const hasActiveFilters = useMemo(
        () =>
            Boolean(
                query.search.trim() ||
                query.agencies.length ||
                query.categories.length ||
                query.sdgs.length ||
                query.years.length ||
                query.accessLevels.length ||
                query.statuses.length ||
                query.yearFrom !== facets.minYear ||
                query.yearTo !== facets.maxYear,
            ),
        [query],
    );

    useEffect(() => {
        let isCurrent = true;

        writeQueryToUrl(query);

        searchResearch(query)
            .then((nextResult) => {
                if (!isCurrent) {
                    return;
                }

                setResult(nextResult);
            })
            .catch((nextError: unknown) => {
                if (!isCurrent) {
                    return;
                }

                setError(
                    nextError instanceof Error
                        ? nextError.message
                        : 'Unable to load research records.',
                );
            })
            .finally(() => {
                if (isCurrent) {
                    setIsLoading(false);
                }
            });

        return () => {
            isCurrent = false;
        };
    }, [query]);

    const prepareForSearch = () => {
        setIsLoading(true);
        setError(null);
    };

    const updateQuery = (nextQuery: Partial<ResearchQuery>) => {
        prepareForSearch();
        setQuery((current) => ({
            ...current,
            ...nextQuery,
            page: nextQuery.page ?? 1,
        }));
    };

    const toggleFilter = (
        field: keyof Pick<
            ResearchFiltersType,
            | 'agencies'
            | 'categories'
            | 'sdgs'
            | 'years'
            | 'accessLevels'
            | 'statuses'
        >,
        value: string | number,
    ) => {
        prepareForSearch();
        setQuery((current) => {
            const nextValues = toggleArrayValue(
                current[field] as Array<string | number>,
                value,
            );

            return {
                ...current,
                [field]: nextValues,
                page: 1,
            };
        });
    };

    const clearFilters = () => {
        prepareForSearch();
        setQuery({ ...defaultQuery });
    };

    const items = result?.items ?? [];
    const total = result?.total ?? 0;
    const totalPages = result?.totalPages ?? 1;
    const page = result?.page ?? query.page;

    return (
        <main className="mx-auto w-full max-w-[1200px] px-4 pt-8 pb-16 sm:px-6">
            <div>
                <h1 className="text-[24px] leading-8 font-bold text-[#1e3a8a]">
                    Browse Research
                </h1>
                <p className="mt-1 text-base leading-6 text-[#6b7280]">
                    Discover and explore research publications from
                    participating agencies
                </p>
            </div>

            <div className="mt-6 flex flex-col items-start gap-6 lg:flex-row lg:gap-8">
                <ResearchFilters
                    filters={query}
                    facets={facets}
                    hasActiveFilters={hasActiveFilters}
                    onToggleFilter={toggleFilter}
                    onYearRangeChange={(field, value) => {
                        const clampedValue = Math.min(
                            Math.max(value, facets.minYear),
                            facets.maxYear,
                        );

                        updateQuery(
                            field === 'yearFrom'
                                ? {
                                      yearFrom: clampedValue,
                                      yearTo: Math.max(
                                          query.yearTo,
                                          clampedValue,
                                      ),
                                  }
                                : {
                                      yearFrom: Math.min(
                                          query.yearFrom,
                                          clampedValue,
                                      ),
                                      yearTo: clampedValue,
                                  },
                        );
                    }}
                    onClearFilters={clearFilters}
                />

                <section className="min-w-0 flex-1">
                    <ResearchSearchBar
                        search={query.search}
                        sort={query.sort}
                        total={total}
                        isLoading={isLoading}
                        onSearchChange={(search) => updateQuery({ search })}
                        onSortChange={(sort) => updateQuery({ sort })}
                    />

                    <div className="mt-4 space-y-4">
                        {error ? (
                            <ResearchEmptyState
                                tone="error"
                                title="Research records could not be loaded"
                                description={error}
                                actionLabel="Try again"
                                onAction={() => {
                                    prepareForSearch();
                                    setQuery((current) => ({ ...current }));
                                }}
                            />
                        ) : null}

                        {!error && isLoading
                            ? Array.from({ length: 3 }, (_, index) => (
                                  <div
                                      key={index}
                                      className="h-[249px] animate-pulse rounded-[14px] border border-[#f3f4f6] bg-white shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)]"
                                  />
                              ))
                            : null}

                        {!error && !isLoading && items.length === 0 ? (
                            <ResearchEmptyState
                                title="No research records found"
                                description="Try adjusting your search terms or clearing filters to discover more research outputs."
                                actionLabel="Clear filters"
                                onAction={clearFilters}
                            />
                        ) : null}

                        {!error && !isLoading
                            ? items.map((research) => (
                                  <ResearchCard
                                      key={research.id}
                                      research={research}
                                  />
                              ))
                            : null}
                    </div>

                    {!error && !isLoading && total > perPage ? (
                        <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-[14px] border border-[#f3f4f6] bg-white px-4 py-3 text-sm text-[#6b7280] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] sm:flex-row">
                            <span>
                                Page {page} of {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={page <= 1}
                                    onClick={() =>
                                        updateQuery({
                                            page: Math.max(1, page - 1),
                                        })
                                    }
                                    className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-[#e5e7eb] px-3 font-medium text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    <ChevronLeft className="size-4" />
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={page >= totalPages}
                                    onClick={() =>
                                        updateQuery({
                                            page: Math.min(
                                                totalPages,
                                                page + 1,
                                            ),
                                        })
                                    }
                                    className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-[#e5e7eb] px-3 font-medium text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    Next
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                    ) : null}
                </section>
            </div>
        </main>
    );
}
