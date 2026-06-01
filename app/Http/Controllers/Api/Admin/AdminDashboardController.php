<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AccessRequest;
use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Research;
use App\Models\ResearchApproval;
use App\Models\ResearchFile;
use App\Models\SecurityEvent;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\Statuses;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $agencies = $this->query(Agency::class);
        $users = $this->query(User::class);
        $research = $this->query(Research::class);
        $researchApprovals = $this->query(ResearchApproval::class);
        $accessRequests = $this->query(AccessRequest::class);
        $researchFiles = $this->query(ResearchFile::class);
        $notifications = $this->query(Notification::class);
        $auditLogs = $this->query(AuditLog::class);
        $securityEvents = $this->query(SecurityEvent::class);

        $submittedResearch = $this->countWhere($research, 'status', Statuses::RESEARCH_SUBMITTED);
        $underReviewResearch = $this->countWhere($research, 'status', Statuses::RESEARCH_UNDER_REVIEW);
        $pendingApprovals = $this->countWhere($researchApprovals, 'status', 'pending');

        return ApiResponse::success('Admin dashboard loaded successfully.', [
            'metrics' => [
                'total_agencies' => $this->count($agencies),
                'active_agencies' => $this->countWhere($agencies, 'status', 'active'),
                'inactive_agencies' => $this->countWhere($agencies, 'status', 'inactive'),
                'total_users' => $this->count($users),
                'active_users' => $this->countWhere($users, 'status', 'active'),
                'agency_admin_users' => $this->userRoleCount('agency_admin'),
                'super_admin_users' => $this->userRoleCount('super_admin'),
                'total_research' => $this->count($research),
                'draft_research' => $this->countWhere($research, 'status', Statuses::RESEARCH_DRAFT),
                'submitted_research' => $submittedResearch,
                'under_review_research' => $underReviewResearch,
                'approved_research' => $this->countWhere($research, 'status', 'approved'),
                'published_research' => $this->countWhere($research, 'status', Statuses::RESEARCH_PUBLISHED),
                'archived_research' => $this->countWhere($research, 'status', Statuses::RESEARCH_ARCHIVED),
                'pending_research_approvals' => $pendingApprovals,
                'total_access_requests' => $this->count($accessRequests),
                'approved_access_requests' => $this->countWhere($accessRequests, 'status', 'approved'),
                'denied_access_requests' => $this->countWhere($accessRequests, 'status', 'denied'),
                'pending_access_requests' => $this->countWhere($accessRequests, 'status', Statuses::ACCESS_REQUEST_PENDING),
                'pending_moderation_count' => $submittedResearch + $underReviewResearch + $pendingApprovals,
                'total_uploads' => $this->count($researchFiles),
                'total_files' => $this->count($researchFiles),
                'unread_notifications_count' => $this->unreadNotificationsCount($notifications),
                'total_security_events' => $this->count($securityEvents),
                'unresolved_security_events' => $this->countWhereNull($securityEvents, 'resolved_at'),
                'recent_failed_logins' => $this->countWhere($securityEvents, 'event_type', 'login.failed'),
                'locked_accounts' => $this->countWhere($securityEvents, 'event_type', 'account.locked'),
                'mfa_enabled_users' => $this->countWhereNotNull($users, 'two_factor_confirmed_at'),
                'mfa_eligible_users' => $this->count($users),
            ],
            'recent_research' => $this->recentResearch($request),
            'recent_agencies' => $this->recentAgencies(),
            'recent_audit_logs' => $this->recentAuditLogs(),
            'recent_security_events' => $this->recentSecurityEvents(),
            'pending_moderation_items' => $this->pendingModerationItems(),
            'research_by_agency' => $this->researchByAgency(),
            'research_uploads_by_year' => $this->researchUploadsByYear(),
            'security_status' => [
                'mfa_enabled_accounts' => $this->countWhereNotNull($users, 'two_factor_confirmed_at'),
                'mfa_eligible_accounts' => $this->count($users),
                'recent_failed_logins' => $this->countWhere($securityEvents, 'event_type', 'login.failed'),
                'locked_accounts' => $this->countWhere($securityEvents, 'event_type', 'account.locked'),
                'security_alerts' => $this->countWhereNull($securityEvents, 'resolved_at'),
            ],
        ]);
    }

    /**
     * @param  class-string<Model>  $model
     */
    private function query(string $model): ?Builder
    {
        $instance = new $model;

        if (! Schema::hasTable($instance->getTable())) {
            return null;
        }

        return $model::query();
    }

    private function count(?Builder $query): int
    {
        return $query ? (clone $query)->count() : 0;
    }

    private function countWhere(?Builder $query, string $column, mixed $value): int
    {
        if (! $this->hasColumn($query, $column)) {
            return 0;
        }

        return (clone $query)->where($column, $value)->count();
    }

    private function countWhereNull(?Builder $query, string $column): int
    {
        if (! $this->hasColumn($query, $column)) {
            return 0;
        }

        return (clone $query)->whereNull($column)->count();
    }

    private function countWhereNotNull(?Builder $query, string $column): int
    {
        if (! $this->hasColumn($query, $column)) {
            return 0;
        }

        return (clone $query)->whereNotNull($column)->count();
    }

    private function hasColumn(?Builder $query, string $column): bool
    {
        if (! $query) {
            return false;
        }

        return Schema::hasColumn($query->getModel()->getTable(), $column);
    }

    private function userRoleCount(string $role): int
    {
        $users = $this->query(User::class);

        if (! $users || ! Schema::hasColumn('users', 'role')) {
            return 0;
        }

        return $users
            ->where(function (Builder $query) use ($role): void {
                $query->where('role', $role);

                if (Schema::hasTable('roles') && Schema::hasTable('role_user')) {
                    $query->orWhereHas('roles', fn (Builder $query) => $query->where('slug', $role));
                }
            })
            ->count();
    }

    private function unreadNotificationsCount(?Builder $notifications): int
    {
        if (! $notifications) {
            return 0;
        }

        if (Schema::hasColumn('notifications', 'read_at')) {
            return (clone $notifications)->whereNull('read_at')->count();
        }

        return $this->countWhere($notifications, 'status', Statuses::NOTIFICATION_UNREAD);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentResearch(Request $request): array
    {
        $query = $this->query(Research::class);

        if (! $query) {
            return [];
        }

        return $query
            ->with('agency:id,name,short_name,slug,status,created_at')
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Research $research): array => [
                'id' => $research->id,
                'title' => $research->title,
                'status' => $research->status,
                'agency_id' => $research->agency_id,
                'agency' => $research->agency ? [
                    'id' => $research->agency->id,
                    'name' => $research->agency->name,
                    'short_name' => $research->agency->short_name,
                    'slug' => $research->agency->slug,
                    'status' => $research->agency->status,
                    'created_at' => $research->agency->created_at?->toISOString(),
                ] : null,
                'publication_year' => $research->publication_year,
                'access_level' => $research->access_level,
                'created_at' => $research->created_at?->toISOString(),
                'published_at' => $research->published_at?->toISOString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentAgencies(): array
    {
        $query = $this->query(Agency::class);

        if (! $query) {
            return [];
        }

        return $query
            ->latest()
            ->limit(5)
            ->get(['id', 'name', 'short_name', 'slug', 'status', 'created_at'])
            ->map(fn (Agency $agency): array => [
                'id' => $agency->id,
                'name' => $agency->name,
                'acronym' => $agency->short_name,
                'short_name' => $agency->short_name,
                'slug' => $agency->slug,
                'status' => $agency->status,
                'created_at' => $agency->created_at?->toISOString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentAuditLogs(): array
    {
        $query = $this->query(AuditLog::class);

        if (! $query) {
            return [];
        }

        return $query
            ->with(['user:id,name,email,status,agency_id,created_at', 'agency:id,name,short_name,slug,status,created_at'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (AuditLog $log): array => [
                'id' => $log->id,
                'event' => $log->event,
                'user_id' => $log->user_id,
                'agency_id' => $log->agency_id,
                'auditable_type' => $log->auditable_type,
                'auditable_id' => $log->auditable_id,
                'target' => $log->metadata['target'] ?? class_basename((string) $log->auditable_type ?: 'System record'),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                    'status' => $log->user->status,
                    'agency_id' => $log->user->agency_id,
                    'created_at' => $log->user->created_at?->toISOString(),
                ] : null,
                'agency' => $log->agency ? [
                    'id' => $log->agency->id,
                    'name' => $log->agency->name,
                    'short_name' => $log->agency->short_name,
                    'slug' => $log->agency->slug,
                    'status' => $log->agency->status,
                    'created_at' => $log->agency->created_at?->toISOString(),
                ] : null,
                'created_at' => $log->created_at?->toISOString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentSecurityEvents(): array
    {
        $query = $this->query(SecurityEvent::class);

        if (! $query) {
            return [];
        }

        return $query
            ->with(['user:id,name,email,status,agency_id,created_at', 'agency:id,name,short_name,slug,status,created_at'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn (SecurityEvent $event): array => [
                'id' => $event->id,
                'event_type' => $event->event_type,
                'severity' => $event->severity,
                'user_id' => $event->user_id,
                'agency_id' => $event->agency_id,
                'resolved_at' => $event->resolved_at?->toISOString(),
                'user' => $event->user ? [
                    'id' => $event->user->id,
                    'name' => $event->user->name,
                    'email' => $event->user->email,
                    'status' => $event->user->status,
                    'agency_id' => $event->user->agency_id,
                    'created_at' => $event->user->created_at?->toISOString(),
                ] : null,
                'agency' => $event->agency ? [
                    'id' => $event->agency->id,
                    'name' => $event->agency->name,
                    'short_name' => $event->agency->short_name,
                    'slug' => $event->agency->slug,
                    'status' => $event->agency->status,
                    'created_at' => $event->agency->created_at?->toISOString(),
                ] : null,
                'created_at' => $event->created_at?->toISOString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function pendingModerationItems(): array
    {
        $query = $this->query(Research::class);

        if (! $query) {
            return [];
        }

        return $query
            ->with('agency:id,name,short_name')
            ->whereIn('status', [Statuses::RESEARCH_SUBMITTED, Statuses::RESEARCH_UNDER_REVIEW])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Research $research): array => [
                'id' => 'research-'.$research->id,
                'title' => $research->title,
                'agency' => $research->agency?->short_name ?: $research->agency?->name ?: 'Unassigned agency',
                'issue_type' => 'research-review',
                'severity' => $research->status === Statuses::RESEARCH_UNDER_REVIEW ? 'high' : 'medium',
                'status_label' => str($research->status)->replace('_', ' ')->title()->toString(),
            ])
            ->all();
    }

    /**
     * @return array<int, array{agency: string, count: int}>
     */
    private function researchByAgency(): array
    {
        $query = $this->query(Agency::class);

        if (! $query || ! Schema::hasTable('research')) {
            return [];
        }

        return $query
            ->withCount('research')
            ->orderByDesc('research_count')
            ->limit(8)
            ->get()
            ->map(fn (Agency $agency): array => [
                'agency' => $agency->short_name ?: $agency->name,
                'count' => (int) $agency->research_count,
            ])
            ->all();
    }

    /**
     * @return array<int, array{year: int, count: int}>
     */
    private function researchUploadsByYear(): array
    {
        $query = $this->query(Research::class);

        if (! $query || ! Schema::hasColumn('research', 'publication_year')) {
            return [];
        }

        return $query
            ->whereNotNull('publication_year')
            ->selectRaw('publication_year, count(*) as aggregate')
            ->groupBy('publication_year')
            ->orderBy('publication_year')
            ->get()
            ->map(fn (Research $record): array => [
                'year' => (int) $record->publication_year,
                'count' => (int) $record->aggregate,
            ])
            ->all();
    }
}
