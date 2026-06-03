<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

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
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'notification_preferences' => 'array',
            'security_preferences' => 'array',
            'deactivation_requested_at' => 'datetime',
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
        return $this->status === 'active';
    }

    public function hasRole(string $role): bool
    {
        $normalizedRole = str($role)->lower()->replace(' ', '_')->toString();

        if ($this->role === $normalizedRole) {
            return true;
        }

        $roles = $this->relationLoaded('roles')
            ? $this->roles
            : $this->roles()->get(['roles.id', 'roles.slug', 'roles.name']);

        return $roles->contains(function (Role $assignedRole) use ($normalizedRole): bool {
            return $assignedRole->slug === $normalizedRole
                || str($assignedRole->name)->lower()->replace(' ', '_')->toString() === $normalizedRole;
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

        $directPermissions = $this->relationLoaded('directPermissions')
            ? $this->directPermissions
            : $this->directPermissions()->get(['permissions.id', 'permissions.slug', 'permissions.name']);

        if ($directPermissions->contains(fn (Permission $directPermission): bool => $this->permissionMatches($directPermission, $normalizedPermission))) {
            return true;
        }

        $roles = $this->relationLoaded('roles')
            ? $this->roles
            : $this->roles()->with('permissions:id,slug,name')->get(['roles.id', 'roles.slug', 'roles.name']);

        return $roles->contains(function (Role $role) use ($normalizedPermission): bool {
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

    private function permissionMatches(Permission $permission, string $normalizedPermission): bool
    {
        return $permission->slug === $normalizedPermission
            || str($permission->name)->lower()->replace(' ', '_')->toString() === $normalizedPermission;
    }
}
