import { Head, Link, router } from '@inertiajs/react';
import {
    BarChart3,
    BookOpen,
    ChevronLeft,
    ChevronRight,
    ChevronsUpDown,
    Clock3,
    Database,
    FileText,
    Filter,
    Grid2X2,
    Home,
    Layers3,
    List,
    LockKeyhole,
    Search,
    ShieldCheck,
    Sparkles,
    Tag,
    Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import AgencyAdminLayout from '@/components/agency/AgencyAdminLayout';
import { ArchiveResearchModal } from '@/components/repository/ArchiveResearchModal';
import { RepositoryCardActions } from '@/components/repository/RepositoryCardActions';
import { ResearchViewModal } from '@/components/repository/ResearchViewModal';
import {
    repositoryAccessTypeLabels,
    repositoryCategoryColors,
    repositoryDocumentTypeColors,
    repositoryDocumentTypeLabels,
    repositorySdgColors,
    repositoryStatusLabels,
} from '@/data/mock-repository';
import { getAgencySession } from '@/lib/auth/agency-auth';
import {
    archiveRepositoryItem,
    getRepositoryFacets,
    searchRepository,
} from '@/lib/repository/repository-service';
import { cn } from '@/lib/utils';
import type { AgencyAuthSession } from '@/types/auth';
import type {
    RepositoryAccessType,
    RepositoryAnalytics,
    RepositoryFacetOption,
    RepositoryItem,
    RepositoryQuery,
    RepositorySearchResult,
    RepositorySortKey,
    RepositoryStatus,
    RepositoryViewMode,
} from '@/types/repository';

const perPage = 6;
const facets = getRepositoryFacets();

const defaultQuery: RepositoryQuery = {
    search: '',
    documentType: 'all',
    year: 'all',
    status: 'all',
    sdg: 'all',
    accessType: 'all',
    category: 'all',
    sort: 'newest',
    page: 1,
    perPage,
};

function getInitialRepositoryQuery(): RepositoryQuery {
    if (typeof window === 'undefined') {
        return defaultQuery;
    }

    const search = new URLSearchParams(window.location.search).get('search');

    return {
        ...defaultQuery,
        search: search ?? '',
    };
}

const sortOptions: Array<{ label: string; value: RepositorySortKey }> = [
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Title A-Z', value: 'title-asc' },
    { label: 'Title Z-A', value: 'title-desc' },
    { label: 'Status', value: 'status' },
    { label: 'Document type', value: 'document-type' },
];

const statusStyles: Record<RepositoryStatus, string> = {
    draft: 'border-[#fee685] bg-[#fffbeb] text-[#bb4d00]',
    published: 'border-[#b9f8cf] bg-[#dcfce7] text-[#008236]',
    pending: 'border-[#bedbff] bg-[#eff6ff] text-[#1447e6]',
    restricted: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
    archived: 'border-[#e5e7eb] bg-[#f8fafc] text-[#4a5565]',
};

const accessStyles: Record<RepositoryAccessType, string> = {
    public: 'border-[#b9f8cf] bg-[#f0fdf4] text-[#008236]',
    restricted: 'border-[#ffc9c9] bg-[#fef2f2] text-[#e7000b]',
    'request-access': 'border-[#bedbff] bg-[#eff6ff] text-[#1447e6]',
    embargo: 'border-[#ffd6a8] bg-[#fff7ed] text-[#ca3500]',
    'external-link': 'border-[#dbeafe] bg-[#eff6ff] text-[#1d4ed8]',
};

function updateQueryPage(
    current: RepositoryQuery,
    nextQuery: Partial<RepositoryQuery>,
) {
    return {
        ...current,
        ...nextQuery,
        page: nextQuery.page ?? 1,
    };
}

export default function AgencyResearchRepositoryPage() {
    const session = useMemo<AgencyAuthSession | null>(
        () => getAgencySession(),
        [],
    );
    const analyticsRef = useRef<HTMLElement | null>(null);
    const [query, setQuery] = useState<RepositoryQuery>(
        getInitialRepositoryQuery,
    );
    const [result, setResult] = useState<RepositorySearchResult | null>(null);
    const [viewMode, setViewMode] = useState<RepositoryViewMode>('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedItem, setSelectedItem] = useState<RepositoryItem | null>(
        null,
    );
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
    const [isArchiving, setIsArchiving] = useState(false);
    const [toast, setToast] = useState<string | null>(null);

    useEffect(() => {
        if (!session) {
            router.visit('/agency/login');
        }
    }, [session]);

    useEffect(() => {
        let isCurrent = true;

        searchRepository(query).then((nextResult) => {
            if (!isCurrent) {
                return;
            }

            setResult(nextResult);
            setIsLoading(false);
        });

        return () => {
            isCurrent = false;
        };
    }, [query, refreshKey]);

    const hasActiveFilters = useMemo(
        () =>
            Boolean(
                query.search.trim() ||
                query.documentType !== 'all' ||
                query.year !== 'all' ||
                query.status !== 'all' ||
                query.sdg !== 'all' ||
                query.accessType !== 'all' ||
                query.category !== 'all',
            ),
        [query],
    );

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] text-[#6a7282]">
                Preparing your agency workspace...
            </div>
        );
    }

    const items = result?.items ?? [];
    const total = result?.total ?? 0;
    const page = result?.page ?? query.page;
    const totalPages = result?.totalPages ?? 1;
    const analytics = result?.analytics;
    const start = total === 0 ? 0 : (page - 1) * perPage + 1;
    const end = Math.min(page * perPage, total);

    const updateQuery = (nextQuery: Partial<RepositoryQuery>) => {
        setIsLoading(true);
        setQuery((current) => updateQueryPage(current, nextQuery));
    };

    const clearFilters = () => {
        setIsLoading(true);
        setQuery(defaultQuery);
    };

    const handleAnalyticsAction = () => {
        setShowAnalytics(true);
        window.setTimeout(() => {
            analyticsRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        }, 0);
    };

    const openViewModal = (item: RepositoryItem) => {
        setSelectedItem(item);
        setIsViewModalOpen(true);
    };

    const openArchiveModal = (item: RepositoryItem) => {
        setSelectedItem(item);
        setIsArchiveModalOpen(true);
    };

    const handleArchiveConfirm = async () => {
        if (!selectedItem) {
            return;
        }

        setIsArchiving(true);
        const archived = await archiveRepositoryItem(selectedItem.id);

        if (archived) {
            setToast('Research moved to the Archive module.');
            setRefreshKey((current) => current + 1);
        }

        setIsArchiving(false);
        setIsArchiveModalOpen(false);
        setSelectedItem(null);
    };

    return (
        <>
            <Head title="Research Repository" />

            <AgencyAdminLayout
                session={session}
                search={query.search}
                onSearchChange={(search) => updateQuery({ search })}
            >
                <main className="px-4 py-8 lg:px-[47px]">
                    <div className="mx-auto max-w-[1200px]">
                        <PageHeader
                            totalDocuments={facets.documentTypes.reduce(
                                (sum, option) => sum + option.count,
                                0,
                            )}
                            onAnalytics={handleAnalyticsAction}
                        />

                        {toast ? (
                            <div className="mt-5 rounded-[12px] border border-[#b9f8cf] bg-[#f0fdf4] px-4 py-3 text-sm font-semibold text-[#008236]">
                                {toast}
                            </div>
                        ) : null}

                        <section className="relative mt-5 h-[46px]">
                            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-[#99a1af]" />
                            <input
                                value={query.search}
                                onChange={(event) =>
                                    updateQuery({ search: event.target.value })
                                }
                                className="h-full w-full rounded-[10px] border border-[#e5e7eb] bg-white pr-4 pl-11 text-sm text-[#1e2939] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#99a1af] focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
                                placeholder="Search by title, author, keyword, agency, or document type..."
                            />
                        </section>

                        <FilterBar
                            query={query}
                            hasActiveFilters={hasActiveFilters}
                            viewMode={viewMode}
                            onQueryChange={updateQuery}
                            onClearFilters={clearFilters}
                            onViewModeChange={setViewMode}
                        />

                        <section className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,920px)_260px]">
                            <div className="min-w-0">
                                <div className="flex h-5 items-center justify-between">
                                    <p className="text-sm leading-5 font-medium text-[#4a5565]">
                                        {isLoading
                                            ? 'Loading documents...'
                                            : total === 0
                                              ? 'No documents found'
                                              : `Showing ${start}-${end} of ${total} documents`}
                                    </p>
                                </div>

                                <div
                                    className={cn(
                                        'mt-4',
                                        viewMode === 'grid'
                                            ? 'grid gap-4 md:grid-cols-2 xl:grid-cols-3'
                                            : 'space-y-3',
                                    )}
                                >
                                    {isLoading
                                        ? Array.from(
                                              { length: perPage },
                                              (_, index) => (
                                                  <div
                                                      key={index}
                                                      className={cn(
                                                          'animate-pulse rounded-[16px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]',
                                                          viewMode === 'grid'
                                                              ? 'h-[530px]'
                                                              : 'h-[190px]',
                                                      )}
                                                  />
                                              ),
                                          )
                                        : null}

                                    {!isLoading && items.length === 0 ? (
                                        <RepositoryEmptyState
                                            onClearFilters={clearFilters}
                                        />
                                    ) : null}

                                    {!isLoading &&
                                        items.map((item) =>
                                            viewMode === 'grid' ? (
                                                <RepositoryCard
                                                    key={item.id}
                                                    item={item}
                                                    onView={openViewModal}
                                                    onEdit={(record) =>
                                                        router.visit(
                                                            `/agency/research/${record.id}`,
                                                        )
                                                    }
                                                    onArchive={openArchiveModal}
                                                />
                                            ) : (
                                                <RepositoryListItem
                                                    key={item.id}
                                                    item={item}
                                                    onView={openViewModal}
                                                    onEdit={(record) =>
                                                        router.visit(
                                                            `/agency/research/${record.id}`,
                                                        )
                                                    }
                                                    onArchive={openArchiveModal}
                                                />
                                            ),
                                        )}
                                </div>

                                {!isLoading && total > 0 ? (
                                    <Pagination
                                        page={page}
                                        totalPages={totalPages}
                                        onPageChange={(nextPage) =>
                                            updateQuery({ page: nextPage })
                                        }
                                    />
                                ) : null}
                            </div>

                            {showAnalytics && analytics ? (
                                <AnalyticsPanel
                                    ref={analyticsRef}
                                    analytics={analytics}
                                />
                            ) : null}
                        </section>
                    </div>
                </main>
                <ResearchViewModal
                    item={selectedItem}
                    open={isViewModalOpen}
                    onOpenChange={(open) => {
                        setIsViewModalOpen(open);

                        if (!open) {
                            setSelectedItem(null);
                        }
                    }}
                />
                <ArchiveResearchModal
                    item={selectedItem}
                    open={isArchiveModalOpen}
                    isArchiving={isArchiving}
                    onOpenChange={(open) => {
                        setIsArchiveModalOpen(open);

                        if (!open) {
                            setSelectedItem(null);
                        }
                    }}
                    onConfirm={handleArchiveConfirm}
                />
            </AgencyAdminLayout>
        </>
    );
}

function PageHeader({
    totalDocuments,
    onAnalytics,
}: {
    totalDocuments: number;
    onAnalytics: () => void;
}) {
    return (
        <section className="flex min-h-[82px] flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="min-w-0">
                <nav className="flex h-4 items-center gap-1.5 text-xs leading-4 text-[#99a1af]">
                    <Link
                        href="/agency/dashboard"
                        className="inline-flex items-center gap-1 font-medium hover:text-[#1e3a8a]"
                    >
                        <Home className="size-3.5" />
                        Dashboard
                    </Link>
                    <ChevronRight className="size-3" />
                    <span className="font-medium text-[#1e3a8a]">
                        Research Repository
                    </span>
                </nav>
                <h1 className="mt-2 text-2xl leading-9 font-bold text-[#1e3a8a]">
                    Research Repository
                </h1>
                <p className="text-sm leading-5 text-[#6a7282]">
                    Explore and manage research documents, reports, and agency
                    knowledge assets.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 text-xs leading-4 font-semibold text-[#1e3a8a]">
                    <FileText className="size-3.5" />
                    {totalDocuments} Documents
                </span>
                <button
                    type="button"
                    onClick={onAnalytics}
                    className="inline-flex h-[30px] items-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white px-3 text-xs leading-4 font-semibold text-[#4a5565] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] hover:text-[#1e3a8a]"
                >
                    <BarChart3 className="size-3.5" />
                    Analytics
                </button>
                <Link
                    href="/agency/upload"
                    className="inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#1e3a8a] px-4 text-sm leading-5 font-semibold text-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] hover:bg-[#172f73]"
                >
                    <Upload className="size-4" />
                    Upload
                </Link>
            </div>
        </section>
    );
}

function FilterBar({
    query,
    hasActiveFilters,
    viewMode,
    onQueryChange,
    onClearFilters,
    onViewModeChange,
}: {
    query: RepositoryQuery;
    hasActiveFilters: boolean;
    viewMode: RepositoryViewMode;
    onQueryChange: (query: Partial<RepositoryQuery>) => void;
    onClearFilters: () => void;
    onViewModeChange: (viewMode: RepositoryViewMode) => void;
}) {
    return (
        <section className="mt-5 rounded-[14px] border border-[#e5e7eb] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex min-h-[60px] flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center">
                <div className="flex shrink-0 items-center gap-1.5 text-xs leading-4 font-semibold text-[#4a5565]">
                    <Filter className="size-3.5" />
                    Filters
                </div>

                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 xl:flex xl:items-center">
                    <FilterSelect
                        ariaLabel="Document type"
                        value={query.documentType}
                        widthClass="xl:w-[133px]"
                        options={[
                            { label: 'Document Type', value: 'all' },
                            ...facets.documentTypes,
                        ]}
                        onChange={(value) =>
                            onQueryChange({
                                documentType:
                                    value as RepositoryQuery['documentType'],
                            })
                        }
                    />
                    <FilterSelect
                        ariaLabel="Year"
                        value={query.year}
                        widthClass="xl:w-[119px]"
                        options={[
                            { label: 'Year', value: 'all' },
                            ...facets.years,
                        ]}
                        onChange={(value) =>
                            onQueryChange({
                                year: value === 'all' ? 'all' : Number(value),
                            })
                        }
                    />
                    <FilterSelect
                        ariaLabel="Status"
                        value={query.status}
                        widthClass="xl:w-[90px]"
                        options={[
                            { label: 'Status', value: 'all' },
                            ...facets.statuses,
                        ]}
                        onChange={(value) =>
                            onQueryChange({
                                status: value as RepositoryQuery['status'],
                            })
                        }
                    />
                    <FilterSelect
                        ariaLabel="SDG"
                        value={query.sdg}
                        widthClass="xl:w-[108px]"
                        options={[
                            { label: 'SDG', value: 'all' },
                            ...facets.sdgs,
                        ]}
                        onChange={(value) => onQueryChange({ sdg: value })}
                    />
                    <FilterSelect
                        ariaLabel="Access type"
                        value={query.accessType}
                        widthClass="xl:w-[135px]"
                        options={[
                            { label: 'Access Type', value: 'all' },
                            ...facets.accessTypes,
                        ]}
                        onChange={(value) =>
                            onQueryChange({
                                accessType:
                                    value as RepositoryQuery['accessType'],
                            })
                        }
                    />
                    <FilterSelect
                        ariaLabel="Category"
                        value={query.category}
                        widthClass="xl:w-[150px]"
                        options={[
                            { label: 'Category', value: 'all' },
                            ...facets.categories,
                        ]}
                        onChange={(value) => onQueryChange({ category: value })}
                    />
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2 xl:ml-auto">
                    <FilterSelect
                        ariaLabel="Sort"
                        value={query.sort}
                        widthClass="w-[150px]"
                        options={sortOptions}
                        onChange={(value) =>
                            onQueryChange({
                                sort: value as RepositorySortKey,
                            })
                        }
                    />
                    <div className="flex h-9 items-center rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb] p-1">
                        <ViewModeButton
                            label="Grid view"
                            icon={Grid2X2}
                            isActive={viewMode === 'grid'}
                            onClick={() => onViewModeChange('grid')}
                        />
                        <ViewModeButton
                            label="List view"
                            icon={List}
                            isActive={viewMode === 'list'}
                            onClick={() => onViewModeChange('list')}
                        />
                    </div>
                    {hasActiveFilters ? (
                        <button
                            type="button"
                            onClick={onClearFilters}
                            className="h-[30px] rounded-[10px] px-3 text-xs font-semibold text-[#e7000b] hover:bg-[#fef2f2]"
                        >
                            Reset
                        </button>
                    ) : null}
                </div>
            </div>
        </section>
    );
}

function FilterSelect<T extends string | number>({
    ariaLabel,
    value,
    options,
    widthClass,
    onChange,
}: {
    ariaLabel: string;
    value: T;
    options: Array<RepositoryFacetOption<T> | { label: string; value: T }>;
    widthClass: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className={cn('relative block', widthClass)}>
            <span className="sr-only">{ariaLabel}</span>
            <select
                value={String(value)}
                onChange={(event) => onChange(event.target.value)}
                className="h-[30px] w-full appearance-none rounded-[10px] border border-[#e5e7eb] bg-white pr-7 pl-3 text-xs leading-4 font-medium text-[#4a5565] outline-none focus:border-[#1e3a8a] focus:ring-2 focus:ring-[#1e3a8a]/10"
            >
                {options.map((option) => (
                    <option
                        key={String(option.value)}
                        value={String(option.value)}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronsUpDown className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-[#99a1af]" />
        </label>
    );
}

function ViewModeButton({
    label,
    icon: Icon,
    isActive,
    onClick,
}: {
    label: string;
    icon: LucideIcon;
    isActive: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            aria-pressed={isActive}
            onClick={onClick}
            className={cn(
                'flex size-7 items-center justify-center rounded-[8px]',
                isActive
                    ? 'bg-white text-[#1e3a8a] shadow-[0px_1px_2px_rgba(0,0,0,0.08)]'
                    : 'text-[#99a1af] hover:text-[#1e3a8a]',
            )}
        >
            <Icon className="size-4" />
        </button>
    );
}

function RepositoryCard({
    item,
    onView,
    onEdit,
    onArchive,
}: {
    item: RepositoryItem;
    onView: (item: RepositoryItem) => void;
    onEdit: (item: RepositoryItem) => void;
    onArchive: (item: RepositoryItem) => void;
}) {
    const typeColor = repositoryDocumentTypeColors[item.documentType];
    const sdgAccent = item.sdgs.map(
        (sdg) => repositorySdgColors[sdg] ?? '#1e3a8a',
    );

    return (
        <article
            className={cn(
                'relative min-h-[530px] overflow-hidden rounded-[16px] border bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]',
                item.accessType === 'restricted' ||
                    item.accessType === 'embargo'
                    ? 'border-[#ffe2e2]'
                    : 'border-[#e5e7eb]',
            )}
        >
            <div
                className="h-1 w-full"
                style={{
                    background: `linear-gradient(90deg, ${sdgAccent[0] ?? typeColor}, ${
                        sdgAccent[1] ?? typeColor
                    }, ${sdgAccent[2] ?? typeColor})`,
                }}
            />
            <div className="flex min-h-[526px] flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap gap-1.5">
                        <span
                            className="inline-flex h-[19px] items-center gap-1 rounded-full px-2 text-[10px] leading-[15px] font-bold"
                            style={{
                                backgroundColor:
                                    item.documentType === 'research-study'
                                        ? '#eff6ff'
                                        : item.documentType ===
                                            'terminal-report'
                                          ? '#f5f3ff'
                                          : '#ecfdf5',
                                color: typeColor,
                            }}
                        >
                            <BookOpen className="size-3" />
                            {repositoryDocumentTypeLabels[item.documentType]}
                        </span>
                        <span className="inline-flex h-[19px] items-center rounded-full bg-[#f3f4f6] px-2 text-[10px] leading-[15px] font-semibold text-[#6a7282]">
                            {item.year}
                        </span>
                    </div>
                    <StatusBadge status={item.status} />
                </div>

                <h3 className="mt-3 text-[14.08px] leading-[19.36px] font-semibold text-[#101828]">
                    {item.title}
                </h3>
                <p className="mt-2 text-xs leading-4 font-medium text-[#99a1af]">
                    {item.authors.map((author) => author.name).join(', ')}
                </p>
                <p className="mt-1 truncate text-[10px] leading-[15px] text-[#99a1af]">
                    {item.agency}
                </p>
                <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#6a7282]">
                    {item.abstract}
                </p>

                <AccessPanel item={item} />
                <QualityPanel item={item} />

                <div className="mt-3 flex flex-wrap gap-1">
                    {item.sdgs.map((sdg) => (
                        <span
                            key={sdg}
                            className="inline-flex h-[17.5px] items-center rounded-[4px] px-1.5 text-[9px] leading-[13.5px] font-bold text-white"
                            style={{
                                backgroundColor:
                                    repositorySdgColors[sdg] ?? '#1e3a8a',
                            }}
                        >
                            {sdg}
                        </span>
                    ))}
                </div>

                <div className="mt-auto flex h-[40px] items-end justify-between border-t border-[#f3f4f6] pt-3">
                    <FooterBadge item={item} />
                    <RepositoryCardActions
                        item={item}
                        onView={onView}
                        onEdit={onEdit}
                        onArchive={onArchive}
                    />
                </div>
            </div>
        </article>
    );
}

function RepositoryListItem({
    item,
    onView,
    onEdit,
    onArchive,
}: {
    item: RepositoryItem;
    onView: (item: RepositoryItem) => void;
    onEdit: (item: RepositoryItem) => void;
    onArchive: (item: RepositoryItem) => void;
}) {
    return (
        <article className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span
                            className="inline-flex h-[21px] items-center gap-1 rounded-full px-2.5 text-[10px] font-bold"
                            style={{
                                backgroundColor: '#eff6ff',
                                color: repositoryDocumentTypeColors[
                                    item.documentType
                                ],
                            }}
                        >
                            <FileText className="size-3" />
                            {repositoryDocumentTypeLabels[item.documentType]}
                        </span>
                        <span className="inline-flex h-[21px] items-center rounded-full bg-[#f3f4f6] px-2.5 text-[10px] font-semibold text-[#6a7282]">
                            {item.year}
                        </span>
                        <StatusBadge status={item.status} />
                        <AccessBadge accessType={item.accessType} />
                    </div>
                    <h3 className="mt-2 text-base leading-6 font-semibold text-[#101828]">
                        {item.title}
                    </h3>
                    <p className="mt-1 text-xs font-medium text-[#99a1af]">
                        {item.authors.map((author) => author.name).join(', ')} -{' '}
                        {item.agency}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-[#6a7282]">
                        {item.abstract}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {item.sdgs.map((sdg) => (
                            <span
                                key={sdg}
                                className="rounded-[4px] px-1.5 py-0.5 text-[9px] font-bold text-white"
                                style={{
                                    backgroundColor:
                                        repositorySdgColors[sdg] ?? '#1e3a8a',
                                }}
                            >
                                {sdg}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="grid min-w-[230px] gap-2">
                    <ProgressRow
                        label="Completion"
                        value={item.metadataCompletion}
                        color="#00c950"
                    />
                    <ProgressRow
                        label="Digital Library"
                        value={item.digitalLibraryScore}
                        color="#1e3a8a"
                    />
                    <div className="mt-1 flex justify-end gap-1">
                        <RepositoryCardActions
                            item={item}
                            onView={onView}
                            onEdit={onEdit}
                            onArchive={onArchive}
                        />
                    </div>
                </div>
            </div>
        </article>
    );
}

function AccessPanel({ item }: { item: RepositoryItem }) {
    const isOpen =
        item.accessType === 'public' || item.accessType === 'external-link';
    const Icon = isOpen ? ShieldCheck : LockKeyhole;

    return (
        <div
            className={cn(
                'mt-4 flex h-[86px] flex-col items-center justify-center gap-2 rounded-[14px] border',
                isOpen
                    ? 'border-[#bbf7d0] bg-[#f0fdf4]'
                    : 'border-dashed border-[#ffc9c9] bg-[rgba(254,242,242,0.6)]',
            )}
        >
            <Icon
                className={cn(
                    'size-5',
                    isOpen ? 'text-[#00a63e]' : 'text-[#ff6467]',
                )}
            />
            <p
                className={cn(
                    'text-xs leading-4 font-medium',
                    isOpen ? 'text-[#008236]' : 'text-[#ff6467]',
                )}
            >
                {repositoryAccessTypeLabels[item.accessType]}
            </p>
            {!isOpen ? (
                <button
                    type="button"
                    className="h-[23px] rounded-full bg-[#ffe2e2] px-3 text-[10px] leading-[15px] font-semibold text-[#e7000b]"
                >
                    Request Access
                </button>
            ) : null}
        </div>
    );
}

function QualityPanel({ item }: { item: RepositoryItem }) {
    return (
        <div className="mt-3 rounded-[14px] bg-[#f9fafb] p-3">
            <div className="flex h-[15px] items-center gap-1.5">
                <Tag className="size-3 text-[#1e3a8a]" />
                <span className="truncate text-[10px] leading-[15px] font-semibold text-[#1e3a8a]">
                    {item.category}
                </span>
                {item.isAiTagged ? (
                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] leading-[15px] font-semibold text-[#7c3aed]">
                        <Sparkles className="size-3" />
                        AI tagged
                    </span>
                ) : (
                    <span className="ml-auto text-[10px] leading-[15px] font-medium text-[#99a1af]">
                        AI pending
                    </span>
                )}
            </div>
            <div className="mt-2 space-y-1.5">
                <ProgressRow
                    label="Completion"
                    value={item.metadataCompletion}
                    color="#00c950"
                />
                <ProgressRow
                    label="Digital Library"
                    value={item.digitalLibraryScore}
                    color="#1e3a8a"
                />
            </div>
        </div>
    );
}

function ProgressRow({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div>
            <div className="flex h-[15px] items-center justify-between text-[10px] leading-[15px]">
                <span className="font-medium text-[#6a7282]">{label}</span>
                <span className="font-bold text-[#6a7282]">{value}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${value}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: RepositoryStatus }) {
    return (
        <span
            className={cn(
                'inline-flex h-[21px] shrink-0 items-center rounded-full border px-2 text-[10px] leading-[15px] font-semibold',
                statusStyles[status],
            )}
        >
            {repositoryStatusLabels[status]}
        </span>
    );
}

function AccessBadge({ accessType }: { accessType: RepositoryAccessType }) {
    return (
        <span
            className={cn(
                'inline-flex h-[21px] items-center gap-1 rounded-full border px-2 text-[10px] leading-[15px] font-semibold',
                accessStyles[accessType],
            )}
        >
            <Clock3 className="size-2.5" />
            {repositoryAccessTypeLabels[accessType]}
        </span>
    );
}

function FooterBadge({ item }: { item: RepositoryItem }) {
    if (item.status === 'draft' || item.status === 'archived') {
        return <StatusBadge status={item.status} />;
    }

    return <AccessBadge accessType={item.accessType} />;
}

const AnalyticsPanel = forwardRef<
    HTMLElement,
    { analytics: RepositoryAnalytics }
>(function AnalyticsPanel({ analytics }, ref) {
    return (
        <aside
            ref={ref}
            className="scroll-mt-24 space-y-4 xl:sticky xl:top-[88px]"
        >
            <div className="grid grid-cols-2 gap-2">
                <AnalyticsMetric
                    value={analytics.totalDocuments}
                    label="Total Docs"
                />
                <AnalyticsMetric
                    value={analytics.publishedDocuments}
                    label="Published"
                />
                <AnalyticsMetric
                    value={analytics.sdgCount}
                    label="SDGs Covered"
                />
                <AnalyticsMetric
                    value={analytics.aiTaggedCount}
                    label="AI Tagged"
                />
            </div>

            <AnalyticsCard title="DOCS PER SDG (TOP 10)">
                <HorizontalBarChart
                    items={analytics.sdgDistribution.slice(0, 10)}
                />
            </AnalyticsCard>

            <AnalyticsCard title="BY DOCUMENT TYPE">
                <DonutChart items={analytics.documentTypeDistribution} />
                <Legend items={analytics.documentTypeDistribution} />
            </AnalyticsCard>

            <AnalyticsCard title="TOP SDGs">
                <RankedBars items={analytics.topSdgs} />
            </AnalyticsCard>

            <AnalyticsCard title="BY CATEGORY">
                <CategoryList items={analytics.categoryBreakdown} />
            </AnalyticsCard>
        </aside>
    );
});

AnalyticsPanel.displayName = 'AnalyticsPanel';

function AnalyticsMetric({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex h-[67px] flex-col items-center justify-center rounded-[10px] border border-[#e5e7eb] bg-white px-3 shadow-[0px_1px_2px_rgba(0,0,0,0.06)]">
            <p className="text-xl leading-7 font-bold text-[#1e3a8a]">
                {value}
            </p>
            <p className="mt-0.5 text-[10px] leading-[15px] text-[#6a7282]">
                {label}
            </p>
        </div>
    );
}

function AnalyticsCard({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[14px] border border-[#e5e7eb] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]">
            <p className="text-[10px] leading-[15px] font-bold text-[#99a1af]">
                {title}
            </p>
            {children}
        </section>
    );
}

function DonutChart({
    items,
}: {
    items: RepositoryAnalytics['documentTypeDistribution'];
}) {
    const total = Math.max(
        1,
        items.reduce((sum, item) => sum + item.value, 0),
    );
    const segments = items.reduce<
        Array<(typeof items)[number] & { dash: number; offset: number }>
    >((nextSegments, item) => {
        const previous = nextSegments[nextSegments.length - 1];
        const dash = (item.value / total) * 100;

        return [
            ...nextSegments,
            {
                ...item,
                dash,
                offset: previous ? previous.offset + previous.dash : 25,
            },
        ];
    }, []);

    return (
        <div className="flex h-[130px] items-center justify-center">
            <svg viewBox="0 0 140 140" className="size-[130px] -rotate-90">
                {segments.map((item) => (
                    <circle
                        key={item.label}
                        cx="70"
                        cy="70"
                        r="42"
                        fill="none"
                        stroke={item.color}
                        strokeWidth="24"
                        strokeDasharray={`${item.dash} ${100 - item.dash}`}
                        strokeDashoffset={-item.offset}
                    />
                ))}
                <circle cx="70" cy="70" r="27" fill="white" />
            </svg>
        </div>
    );
}

function Legend({
    items,
}: {
    items: RepositoryAnalytics['documentTypeDistribution'];
}) {
    return (
        <div className="mt-1 space-y-1.5">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="flex h-[15px] items-center justify-between text-[10px] leading-[15px]"
                >
                    <span className="inline-flex min-w-0 items-center gap-2 text-[#6a7282]">
                        <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="truncate">{item.label}</span>
                    </span>
                    <span className="font-bold text-[#364153]">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function HorizontalBarChart({
    items,
}: {
    items: RepositoryAnalytics['sdgDistribution'];
}) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="mt-3 space-y-1.5">
            {items.map((item) => (
                <div
                    key={item.label}
                    className="grid grid-cols-[42px_1fr_18px] items-center gap-2"
                >
                    <span className="text-[9px] leading-[13px] text-[#6a7282]">
                        {item.label}
                    </span>
                    <div className="h-2 overflow-hidden rounded-full bg-[#f3f4f6]">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${(item.value / max) * 100}%`,
                                backgroundColor: item.color,
                            }}
                        />
                    </div>
                    <span className="text-right text-[10px] font-bold text-[#364153]">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function RankedBars({ items }: { items: RepositoryAnalytics['topSdgs'] }) {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
        <div className="mt-3 space-y-2">
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className="grid h-5 grid-cols-[24px_1fr_18px] items-center gap-2"
                >
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#f3f4f6] text-[10px] font-semibold text-[#6a7282]">
                        {index + 1}
                    </span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#f3f4f6]">
                        <div
                            className="h-full rounded-full"
                            style={{
                                width: `${(item.value / max) * 100}%`,
                                backgroundColor: item.color,
                            }}
                        />
                    </div>
                    <span className="text-right text-[10px] font-bold text-[#364153]">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function CategoryList({
    items,
}: {
    items: RepositoryAnalytics['categoryBreakdown'];
}) {
    return (
        <div className="mt-3 space-y-2">
            {items.slice(0, 5).map((item) => (
                <div
                    key={item.label}
                    className="flex h-5 items-center justify-between text-xs"
                >
                    <span className="inline-flex items-center gap-2 text-[#4a5565]">
                        <span
                            className="flex size-5 items-center justify-center rounded-full text-white"
                            style={{
                                backgroundColor:
                                    repositoryCategoryColors[item.label] ??
                                    '#1e3a8a',
                            }}
                        >
                            <Layers3 className="size-3" />
                        </span>
                        {item.label}
                    </span>
                    <span className="text-[10px] font-bold text-[#364153]">
                        {item.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

function RepositoryEmptyState({
    onClearFilters,
}: {
    onClearFilters: () => void;
}) {
    return (
        <div className="col-span-full flex min-h-[360px] flex-col items-center justify-center rounded-[16px] border border-dashed border-[#d1d5dc] bg-white px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-[14px] bg-[#eff6ff] text-[#1e3a8a]">
                <Database className="size-6" />
            </span>
            <h2 className="mt-4 text-base font-semibold text-[#101828]">
                No research documents found
            </h2>
            <p className="mt-1 max-w-[420px] text-sm leading-5 text-[#6a7282]">
                Try adjusting the search term or clearing the selected filters
                to review all agency repository records.
            </p>
            <button
                type="button"
                onClick={onClearFilters}
                className="mt-4 h-9 rounded-[10px] bg-[#1e3a8a] px-4 text-sm font-semibold text-white"
            >
                Clear filters
            </button>
        </div>
    );
}

function Pagination({
    page,
    totalPages,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}) {
    return (
        <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-[14px] border border-[#e5e7eb] bg-white px-4 py-3 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] sm:flex-row">
            <p className="text-sm leading-5 text-[#6a7282]">
                Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    className="flex h-8 items-center gap-1 rounded-[10px] border border-[#e5e7eb] px-3 text-xs font-semibold text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <ChevronLeft className="size-3.5" />
                    Previous
                </button>
                {Array.from(
                    { length: totalPages },
                    (_, index) => index + 1,
                ).map((pageNumber) => (
                    <button
                        key={pageNumber}
                        type="button"
                        onClick={() => onPageChange(pageNumber)}
                        className={cn(
                            'flex size-8 items-center justify-center rounded-[10px] text-xs font-bold',
                            pageNumber === page
                                ? 'bg-[#1e3a8a] text-white'
                                : 'border border-[#e5e7eb] text-[#6a7282] hover:text-[#1e3a8a]',
                        )}
                    >
                        {pageNumber}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                    className="flex h-8 items-center gap-1 rounded-[10px] border border-[#e5e7eb] px-3 text-xs font-semibold text-[#1e3a8a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                    Next
                    <ChevronRight className="size-3.5" />
                </button>
            </div>
        </div>
    );
}
