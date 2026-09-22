<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\AccessRequestResource;
use App\Http\Resources\AgencyResource;
use App\Http\Resources\AuditLogResource;
use App\Http\Resources\PlatformSettingResource;
use App\Http\Resources\ResearchResource;
use App\Http\Resources\SecurityEventResource;
use App\Http\Resources\UserResource;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchApproval;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReadController extends Controller
{
    use RespondsWithApiPagination;

    public function dashboard(Request $request): JsonResponse
    {
        return ApiResponse::success('Admin dashboard retrieved.', [
            'metrics' => [
                'total_agencies' => Agency::query()->count(),
                'active_agencies' => Agency::query()->where('status', 'active')->count(),
                'total_users' => User::query()->count(),
                'total_research' => Research::query()->count(),
                'published_research' => Research::query()->where('status', Statuses::RESEARCH_PUBLISHED)->count(),
                'pending_research_approvals' => ResearchApproval::query()->where('status', 'pending')->count(),
                'access_requests' => AccessRequest::query()->count(),
                'pending_access_requests' => AccessRequest::query()->where('status', Statuses::ACCESS_REQUEST_PENDING)->count(),
                'security_events' => SecurityEvent::query()->count(),
                'unresolved_security_events' => SecurityEvent::query()->whereNull('resolved_at')->count(),
            ],
            'recent_audit_logs' => AuditLogResource::collection(
                AuditLog::query()->with(['user', 'agency'])->latest('created_at')->limit(5)->get(),
            )->resolve($request),
            'recent_security_events' => SecurityEventResource::collection(
                SecurityEvent::query()->with(['user', 'agency'])->latest('created_at')->limit(5)->get(),
            )->resolve($request),
            'research_by_agency' => Agency::query()
                ->withCount('research')
                ->orderByDesc('research_count')
                ->limit(8)
                ->get()
                ->map(fn (Agency $agency): array => [
                    'agency' => $agency->short_name ?: $agency->name,
                    'count' => (int) $agency->research_count,
                ]),
            'research_uploads_by_year' => Research::query()
                ->whereNotNull('publication_year')
                ->selectRaw('publication_year, count(*) as aggregate')
                ->groupBy('publication_year')
                ->orderBy('publication_year')
                ->get()
                ->map(fn (Research $record): array => [
                    'year' => (int) $record->publication_year,
                    'count' => (int) $record->aggregate,
                ]),
        ]);
    }

    public function agencies(Request $request): JsonResponse
    {
        $summaryQuery = Agency::query()->whereNull('archived_at');
        $summary = [
            'total_agencies' => (clone $summaryQuery)->count(),
            'active_agencies' => (clone $summaryQuery)->where('status', 'active')->count(),
            'inactive_agencies' => (clone $summaryQuery)->where('status', 'inactive')->count(),
            'total_research_records' => Research::query()
                ->whereIn('agency_id', (clone $summaryQuery)->select('id'))
                ->count(),
        ];

        $query = Agency::query()
            ->whereNull('archived_at')
            ->with(['users' => function ($query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'))
                    ->with('roles');
            }])
            ->withCount('research')
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('type'), function (Builder $query) use ($request): void {
                $type = match ($request->string('type')->toString()) {
                    'government-agency' => 'Government Agency',
                    'higher-education-institution' => 'Higher Education Institution',
                    'research-consortium' => 'Research Consortium',
                    'industry-partner' => 'Industry Partner',
                    'other' => 'Other',
                    default => null,
                };

                if ($type !== null) {
                    $query->where('type', $type);
                }
            })
            ->when($request->integer('updated_days') > 0, fn (Builder $query) => $query->where('updated_at', '>=', now()->subDays(min(3650, $request->integer('updated_days')))))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('keyword')->trim()->toString()) ?: [];

                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';

                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('name', 'like', $keyword)
                            ->orWhere('short_name', 'like', $keyword)
                            ->orWhere('full_name', 'like', $keyword)
                            ->orWhere('email', 'like', $keyword)
                            ->orWhereHas('users', function (Builder $query) use ($keyword): void {
                                $query->where(function (Builder $query) use ($keyword): void {
                                    $query->where('name', 'like', $keyword)
                                        ->orWhere('email', 'like', $keyword);
                                })->where(function (Builder $query): void {
                                    $query->where('role', 'agency_admin')
                                        ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
                                });
                            });
                    });
                }
            })
            ->orderBy('created_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return ApiResponse::success(
            'Admin agencies retrieved.',
            AgencyResource::collection($paginator->getCollection())->resolve($request),
            [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'summary' => $summary,
            ],
        );
    }

    public function agencyShow(Request $request, Agency $agency): JsonResponse
    {
        return ApiResponse::success(
            'Admin agency detail retrieved.',
            (new AgencyResource($agency->load(['users.roles'])->loadCount('research')))->resolve($request),
        );
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()
            ->with(['agency', 'roles'])
            ->when($request->filled('role'), function (Builder $query) use ($request): void {
                $role = $request->string('role')->toString();

                $query->where(function (Builder $query) use ($role): void {
                    $query->where('role', $role)
                        ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', $role));
                });
            })
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keyword = '%'.$request->string('keyword')->trim().'%';

                $query->where(function (Builder $query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('first_name', 'like', $keyword)
                        ->orWhere('last_name', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword);
                });
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin users retrieved.',
            $query->paginate($this->perPage($request)),
            UserResource::class,
            $request,
        );
    }

    public function userShow(Request $request, User $user): JsonResponse
    {
        return ApiResponse::success(
            'Admin user detail retrieved.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
        );
    }

    public function research(Request $request): JsonResponse
    {
        $filteredQuery = $this->applyAdminResearchFilters(Research::query(), $request);
        $filteredIds = (clone $filteredQuery)->select('research.id');
        $summary = $request->boolean('moderation')
            ? [
                'flagged_research_records' => (clone $filteredQuery)->where(function (Builder $query): void {
                    $query->whereIn('status', ['submitted', 'under_review', 'rejected'])
                        ->orWhereHas('latestModerationDecision', fn (Builder $query) => $query->where('status', 'flagged'));
                })->count(),
                'pending_review' => (clone $filteredQuery)->where('status', 'submitted')->count(),
                'resolved_issues' => (clone $filteredQuery)->where('status', 'approved')->count(),
            ]
            : [
                'total_records' => (clone $filteredQuery)->count(),
                'published' => (clone $filteredQuery)->where('status', 'published')->count(),
                'under_review' => (clone $filteredQuery)->whereIn('status', ['submitted', 'under_review'])->count(),
                'total_views' => ResearchAnalyticsEvent::query()
                    ->whereIn('research_id', $filteredIds)
                    ->where('event_type', 'view')
                    ->count(),
            ];
        $query = $filteredQuery
            ->with(['agency', 'uploader', 'latestModerationDecision', 'files', 'reportDetail', 'performanceItems'])
            ->withCount(['analyticsEvents as views_count' => fn (Builder $query) => $query->where('event_type', 'view')])
            ->orderBy('created_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return ApiResponse::success(
            'Admin research retrieved.',
            ResearchResource::collection($paginator->getCollection())->resolve($request),
            [
                'pagination' => [
                    'current_page' => $paginator->currentPage(),
                    'per_page' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'last_page' => $paginator->lastPage(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'summary' => $summary,
                'filter_options' => $this->adminResearchFilterOptions(),
            ],
        );
    }

    public function researchShow(Request $request, Research $research): JsonResponse
    {
        return ApiResponse::success(
            'Admin research detail retrieved.',
            (new ResearchResource($research
                ->load(['agency', 'uploader', 'latestModerationDecision', 'files', 'reportDetail', 'performanceItems'])
                ->loadCount(['analyticsEvents as views_count' => fn (Builder $query) => $query->where('event_type', 'view')])))->resolve($request),
        );
    }

    private function applyAdminResearchFilters(Builder $query, Request $request): Builder
    {
        $agency = $request->query('agency_id', $request->query('agency'));
        $year = $request->query('publication_year', $request->query('year'));
        $category = $request->query('category');
        $documentType = $request->query('document_type');

        return $query
            ->when($request->boolean('moderation'), function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->whereIn('status', ['submitted', 'under_review', 'approved', 'rejected'])
                        ->orWhereHas('latestModerationDecision', fn (Builder $query) => $query->where('status', 'flagged'));
                });
            })
            ->when($agency !== null && $agency !== '' && $agency !== 'all', function (Builder $query) use ($agency): void {
                if (is_numeric($agency)) {
                    $query->where('agency_id', (int) $agency);
                } else {
                    $query->whereHas('agency', fn (Builder $query) => $query->where('short_name', $agency)->orWhere('name', $agency));
                }
            })
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', str_replace('-', '_', $request->string('status')->toString())))
            ->when($request->filled('moderation_status'), function (Builder $query) use ($request): void {
                $moderationStatus = $request->string('moderation_status')->toString();
                $statuses = match ($moderationStatus) {
                    'pending-review' => ['submitted'],
                    'needs-review' => ['under_review'],
                    'flagged' => [],
                    'resolved' => ['approved'],
                    default => [],
                };

                if ($moderationStatus === 'flagged') {
                    $query->where(function (Builder $query): void {
                        $query->where('status', 'rejected')
                            ->orWhereHas('latestModerationDecision', fn (Builder $query) => $query->where('status', 'flagged'));
                    });
                } elseif ($statuses !== []) {
                    $query->whereIn('status', $statuses);
                }
            })
            ->when($request->filled('issue_type'), fn (Builder $query) => $this->applyModerationIssueType($query, $request->string('issue_type')->toString()))
            ->when($year !== null && $year !== '' && $year !== 'all', fn (Builder $query) => $query->where('publication_year', (int) $year))
            ->when($category !== null && $category !== '' && $category !== 'all', fn (Builder $query) => $query->where('category', $category))
            ->when($request->filled('sdg') && $request->query('sdg') !== 'all', fn (Builder $query) => $query->whereJsonContains('sdgs', $request->string('sdg')->toString()))
            ->when($request->filled('access_level'), fn (Builder $query) => $query->where('access_level', $request->string('access_level')))
            ->when($documentType !== null && $documentType !== '' && $documentType !== 'all', fn (Builder $query) => $this->applyAdminResearchDocumentType($query, (string) $documentType))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('keyword')->trim()->toString()) ?: [];

                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';
                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('title', 'like', $keyword)
                            ->orWhere('abstract', 'like', $keyword)
                            ->orWhere('authors', 'like', $keyword)
                            ->orWhere('category', 'like', $keyword)
                            ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                    });
                }
            });
    }

    private function applyModerationIssueType(Builder $query, string $issueType): void
    {
        if ($issueType === 'incomplete_metadata') {
            $query->where(function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->where('status', 'rejected')
                        ->whereHas('latestModerationDecision', fn (Builder $query) => $query->where('issue_type', 'incomplete_metadata'));
                })->orWhere(function (Builder $query): void {
                    $query->where('status', '!=', 'rejected')
                        ->where(function (Builder $query): void {
                            $query->whereNull('abstract')
                                ->orWhere('abstract', '')
                                ->orWhereNull('publication_year')
                                ->orWhereNull('category')
                                ->orWhere('category', '')
                                ->orWhereNull('authors')
                                ->orWhere('authors', '[]')
                                ->orWhereNull('keywords')
                                ->orWhere('keywords', '[]');
                        });
                });
            });

            return;
        }

        if ($issueType === 'other_manual_review') {
            $query->where(function (Builder $query): void {
                $query->where(function (Builder $query): void {
                    $query->where('status', 'rejected')
                        ->whereHas('latestModerationDecision', fn (Builder $query) => $query->where('issue_type', 'other_manual_review'));
                })->orWhere(function (Builder $query): void {
                    $query->where('status', '!=', 'rejected')
                        ->whereNotNull('abstract')->where('abstract', '!=', '')
                        ->whereNotNull('publication_year')
                        ->whereNotNull('category')->where('category', '!=', '')
                        ->whereNotNull('authors')->where('authors', '!=', '[]')
                        ->whereNotNull('keywords')->where('keywords', '!=', '[]');
                });
            });

            return;
        }

        $query->whereHas('latestModerationDecision', function (Builder $query) use ($issueType): void {
            $query->where('issue_type', $issueType)
                ->whereIn('status', ['rejected', 'flagged']);
        });
    }

    private function applyAdminResearchDocumentType(Builder $query, string $documentType): void
    {
        if (in_array($documentType, ['terminal-report', 'project-accomplishment'], true)) {
            $query->where(function (Builder $query) use ($documentType): void {
                $query->whereHas('files', fn (Builder $query) => $query->where('file_type', $documentType)->where('status', '!=', 'deleted')->whereNull('archived_at'))
                    ->orWhere('category', 'like', $documentType === 'terminal-report' ? '%terminal report%' : '%project accomplishment%');
            });

            return;
        }

        if ($documentType === 'research-study') {
            $query->whereDoesntHave('files', fn (Builder $query) => $query->whereIn('file_type', ['terminal-report', 'project-accomplishment'])->where('status', '!=', 'deleted')->whereNull('archived_at'))
                ->where(function (Builder $query): void {
                    $query->whereNull('category')
                        ->orWhere(function (Builder $query): void {
                            $query->where('category', 'not like', '%terminal report%')
                                ->where('category', 'not like', '%project accomplishment%');
                        });
                });
        }
    }

    private function adminResearchFilterOptions(): array
    {
        $sdgs = [];
        Research::query()->whereNotNull('sdgs')->select(['id', 'sdgs'])->chunk(200, function ($records) use (&$sdgs): void {
            foreach ($records as $record) {
                foreach (($record->sdgs ?? []) as $sdg) {
                    $value = is_array($sdg) ? ($sdg['sdg'] ?? $sdg['value'] ?? null) : $sdg;

                    if (is_string($value) && trim($value) !== '') {
                        $sdgs[$value] = $value;
                    }
                }
            }
        });
        ksort($sdgs);

        return [
            'agencies' => Agency::query()->whereNull('archived_at')->orderBy('short_name')->pluck('short_name')->filter()->values()->all(),
            'years' => Research::query()->whereNotNull('publication_year')->distinct()->orderByDesc('publication_year')->pluck('publication_year')->map(fn ($year): string => (string) $year)->all(),
            'categories' => Research::query()->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->all(),
            'sdgs' => array_values($sdgs),
        ];
    }

    public function accessRequests(Request $request): JsonResponse
    {
        $query = AccessRequest::query()
            ->with(['research.agency', 'requester', 'reviewer'])
            ->when($request->filled('agency_id'), function (Builder $query) use ($request): void {
                $agencyId = $request->integer('agency_id');

                $query->where(function (Builder $query) use ($agencyId): void {
                    $query->where('agency_id', $agencyId)
                        ->orWhereHas('research', fn (Builder $query) => $query->where('agency_id', $agencyId));
                });
            })
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('research_id'), fn (Builder $query) => $query->where('research_id', $request->integer('research_id')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin access requests retrieved.',
            $query->paginate($this->perPage($request)),
            AccessRequestResource::class,
            $request,
        );
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event'), fn (Builder $query) => $query->where('event', $request->string('event')))
            ->when($request->filled('user_id'), fn (Builder $query) => $query->where('user_id', $request->integer('user_id')))
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('date'), fn (Builder $query) => $query->whereDate('created_at', $request->date('date')))
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin audit logs retrieved.',
            $query->paginate($this->perPage($request)),
            AuditLogResource::class,
            $request,
        );
    }

    public function securityEvents(Request $request): JsonResponse
    {
        $query = SecurityEvent::query()
            ->with(['user', 'agency'])
            ->when($request->filled('event_type'), fn (Builder $query) => $query->where('event_type', $request->string('event_type')))
            ->when($request->filled('severity'), fn (Builder $query) => $query->where('severity', $request->string('severity')))
            ->when($request->has('resolved'), function (Builder $query) use ($request): void {
                $request->boolean('resolved')
                    ? $query->whereNotNull('resolved_at')
                    : $query->whereNull('resolved_at');
            })
            ->orderBy('created_at', $this->sortDirection($request));

        return $this->paginatedResponse(
            'Admin security events retrieved.',
            $query->paginate($this->perPage($request)),
            SecurityEventResource::class,
            $request,
        );
    }

    public function platformSettings(Request $request): JsonResponse
    {
        $query = PlatformSetting::query()
            ->when($request->filled('group'), fn (Builder $query) => $query->where('group', $request->string('group')))
            ->when($request->has('public'), fn (Builder $query) => $query->where('is_public', $request->boolean('public')))
            ->orderBy('group')
            ->orderBy('key');

        return $this->paginatedResponse(
            'Admin platform settings retrieved.',
            $query->paginate($this->perPage($request)),
            PlatformSettingResource::class,
            $request,
        );
    }
}
