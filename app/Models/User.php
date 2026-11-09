<?php

namespace App\Models;

use App\Notifications\AdminAccountInvitation;
use App\Support\Statuses;
use Database\Factories\UserFactory;
use Illuminate\Auth\Notifications\ResetPassword as ResetPasswordNotification;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    public const ADMIN_PORTAL_DESTINATIONS = [
        'dashboard.view' => '/admin/dashboard',
        'agencies.view' => '/admin/agencies',
        'users.view' => '/admin/users',
        'research_moderation.view' => '/admin/research',
        'access_monitoring.view' => '/admin/access-requests',
        'analytics.view' => '/admin/analytics',
        'audit_logs.view' => '/admin/audit-logs',
        'rbac.view' => '/admin/rbac',
        'security.view' => '/admin/security',
        'archive.view' => '/admin/archive',
        'platform_settings.view' => '/admin/settings',
    ];

    /**
     * Permissions whose underlying records are constrained by agency scope.
     * System-wide modules are intentionally excluded until their queries are
     * implemented with equivalent tenant boundaries.
     */
    public const AGENCY_SCOPED_ADMIN_PERMISSIONS = [
        'agencies.view',
        'research_moderation.view',
        'research_moderation.manage',
    ];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, SoftDeletes, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'agency_id',
        'first_name',
        'last_name',
        'name',
        'email',
        'password',
        'role',
        'status',
        'mfa_required',
        'profile_photo_path',
        'notification_preferences',
        'security_preferences',
        'deactivation_requested_at',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'mfa_required' => 'boolean',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'notification_preferences' => 'array',
            'security_preferences' => 'array',
            'deactivation_requested_at' => 'datetime',
            'last_login_at' => 'datetime',
            'archived_at' => 'datetime',
            'restored_at' => 'datetime',
        ];
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function researchUploads()
    {
        return $this->hasMany(Research::class, 'uploaded_by');
    }

    public function approvedResearch()
    {
        return $this->hasMany(Research::class, 'approved_by');
    }

    public function accessRequests()
    {
        return $this->hasMany(AccessRequest::class, 'requested_by');
    }

    public function reviewedAccessRequests()
    {
        return $this->hasMany(AccessRequest::class, 'reviewed_by');
    }

    public function researchApprovals()
    {
        return $this->hasMany(ResearchApproval::class, 'reviewed_by');
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class)
            ->withPivot(['assigned_by', 'assigned_at'])
            ->withTimestamps();
    }

    public function directPermissions()
    {
        return $this->belongsToMany(Permission::class, 'permission_user')
            ->withPivot(['granted_by', 'granted_at', 'expires_at'])
            ->withTimestamps();
    }

    public function researchFiles()
    {
        return $this->hasMany(ResearchFile::class, 'uploaded_by');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function archivedBy()
    {
        return $this->belongsTo(self::class, 'archived_by');
    }

    public function restoredBy()
    {
        return $this->belongsTo(self::class, 'restored_by');
    }

    public function securityEvents()
    {
        return $this->hasMany(SecurityEvent::class);
    }

    public function archivedRecords()
    {
        return $this->hasMany(ArchiveRecord::class, 'archived_by');
    }

    public function restoredRecords()
    {
        return $this->hasMany(ArchiveRecord::class, 'restored_by');
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole('super_admin');
    }

    public function isAgencyAdmin(): bool
    {
        return $this->hasRole('agency_admin');
    }

    public function isActive(): bool
    {
        return $this->status === Statuses::USER_ACTIVE
            && $this->archived_at === null
            && ! $this->trashed();
    }

    public function hasRole(string $role): bool
    {
        $normalizedRole = str($role)->lower()->replace(' ', '_')->toString();

        if (! $this->relationLoaded('roles')) {
            $this->setRelation(
                'roles',
                $this->roles()->get(['roles.id', 'roles.slug', 'roles.name', 'roles.is_active', 'roles.access_scope']),
            );
        }

        $roles = $this->roles;

        return $roles->contains(function (Role $assignedRole) use ($normalizedRole): bool {
            return $assignedRole->is_active && ($assignedRole->slug === $normalizedRole
                || str($assignedRole->name)->lower()->replace(' ', '_')->toString() === $normalizedRole);
        });
    }

    /**
     * @param  array<int, string>  $roles
     */
    public function hasAnyRole(array $roles): bool
    {
        return collect($roles)->contains(fn (string $role): bool => $this->hasRole($role));
    }

    public function hasPermission(string $permission): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        $normalizedPermission = str($permission)->lower()->replace(' ', '_')->toString();

        if (! $this->isAgencyAdmin()
            && $this->adminAccessScope() === 'agency'
            && ! in_array($normalizedPermission, self::AGENCY_SCOPED_ADMIN_PERMISSIONS, true)) {
            return false;
        }

        $directPermissions = $this->directPermissions()
            ->where(function ($query): void {
                $query->whereNull('permission_user.expires_at')
                    ->orWhere('permission_user.expires_at', '>', now());
            })
            ->get(['permissions.id', 'permissions.slug', 'permissions.name']);

        if ($directPermissions->contains(fn (Permission $directPermission): bool => $this->permissionMatches($directPermission, $normalizedPermission))) {
            return true;
        }

        $roles = $this->relationLoaded('roles')
            ? $this->roles
            : $this->roles()->with('permissions:id,slug,name')->get(['roles.id', 'roles.slug', 'roles.name', 'roles.is_active', 'roles.access_scope']);

        return $roles->contains(function (Role $role) use ($normalizedPermission): bool {
            if (! $role->is_active) {
                return false;
            }

            $permissions = $role->relationLoaded('permissions')
                ? $role->permissions
                : $role->permissions()->get(['permissions.id', 'permissions.slug', 'permissions.name']);

            return $permissions->contains(fn (Permission $permission): bool => $this->permissionMatches($permission, $normalizedPermission));
        });
    }

    /**
     * @param  array<int, string>  $permissions
     */
    public function hasAnyPermission(array $permissions): bool
    {
        return collect($permissions)->contains(fn (string $permission): bool => $this->hasPermission($permission));
    }

    public function canAccessAdminPortal(): bool
    {
        if ($this->isSuperAdmin()) {
            return true;
        }

        return ! $this->isAgencyAdmin()
            && $this->hasAnyPermission(array_keys(self::ADMIN_PORTAL_DESTINATIONS));
    }

    public function adminLandingPath(): string
    {
        foreach (self::ADMIN_PORTAL_DESTINATIONS as $permission => $path) {
            if ($this->hasPermission($permission)) {
                return $path;
            }
        }

        return '/admin/dashboard';
    }

    public function requiresAdminMfa(): bool
    {
        return $this->isSuperAdmin() || (bool) $this->mfa_required;
    }

    public function adminAccessScope(): string
    {
        if ($this->isSuperAdmin()) {
            return 'system';
        }

        if (! $this->relationLoaded('roles')) {
            $this->setRelation(
                'roles',
                $this->roles()->get(['roles.id', 'roles.slug', 'roles.name', 'roles.is_active', 'roles.access_scope']),
            );
        }

        $activeRoles = $this->roles->where('is_active', true);

        return $activeRoles->contains(fn (Role $role): bool => $role->access_scope === 'system')
            ? 'system'
            : (string) ($activeRoles->first()?->access_scope ?? 'system');
    }

    public function canAccessAgency(?int $agencyId): bool
    {
        if ($this->isSuperAdmin() || $this->adminAccessScope() === 'system') {
            return true;
        }

        return $agencyId !== null && (int) $this->agency_id === $agencyId;
    }

    public function sendPasswordResetNotification($token): void
    {
        if ($this->status === Statuses::USER_PENDING_ACTIVATION && ! $this->isAgencyAdmin()) {
            $this->notify(new AdminAccountInvitation($token));

            return;
        }

        $this->notify(new ResetPasswordNotification($token));
    }

    private function permissionMatches(Permission $permission, string $normalizedPermission): bool
    {
        return $permission->slug === $normalizedPermission
            || str($permission->name)->lower()->replace(' ', '_')->toString() === $normalizedPermission;
    }
}
