<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminRbacController extends Controller
{
    use RespondsWithApiPagination;

    public function roles(Request $request): JsonResponse
    {
        $roles = Role::query()
            ->with(['permissions:id,slug,name,module,display_name,description'])
            ->withCount('users')
            ->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => $this->rolePayload($role));

        return ApiResponse::success('RBAC roles retrieved.', $roles);
    }

    public function role(Request $request, Role $role): JsonResponse
    {
        $role->load(['permissions:id,slug,name,module,display_name,description', 'users.agency'])
            ->loadCount('users');

        return ApiResponse::success('RBAC role retrieved.', $this->rolePayload($role));
    }

    public function permissions(): JsonResponse
    {
        $permissions = Permission::query()
            ->orderBy('module')
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission): array => $this->permissionPayload($permission));

        return ApiResponse::success('RBAC permissions retrieved.', $permissions);
    }

    public function userRoles(Request $request, User $user): JsonResponse
    {
        return ApiResponse::success('User roles retrieved.', [
            'user' => $this->userAssignmentPayload($user->load(['agency', 'roles'])),
            'roles' => $user->roles->map(fn (Role $role): array => $this->rolePayload($role))->values(),
        ]);
    }

    public function users(Request $request): JsonResponse
    {
        $query = User::query()
            ->with(['agency', 'roles'])
            ->withMax(['securityEvents as last_login_at' => fn ($query) => $query->where('event_type', 'login.success')], 'created_at')
            ->when($request->boolean('active_only'), fn ($query) => $query->where('status', 'active'))
            ->when($request->filled('query'), function ($query) use ($request): void {
                $keyword = '%'.$request->string('query')->trim()->toString().'%';
                $query->where(function ($query) use ($keyword): void {
                    $query->where('name', 'like', $keyword)
                        ->orWhere('email', 'like', $keyword)
                        ->orWhere('status', 'like', $keyword)
                        ->orWhereHas('agency', fn ($query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword))
                        ->orWhereHas('roles', fn ($query) => $query->where('name', 'like', $keyword));
                });
            })
            ->orderBy('name')
            ->orderBy('id');

        $paginator = $query->paginate($this->perPage($request));
        $users = $paginator->getCollection()
            ->map(fn (User $user): array => $this->userAssignmentPayload($user));

        return ApiResponse::success('RBAC user role assignments retrieved.', $users, [
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
            ],
        ]);
    }

    public function createAdminUser(Request $request): JsonResponse
    {
        $request->merge([
            'email' => str((string) $request->input('email'))->lower()->trim()->toString(),
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'agency_id' => ['nullable', 'integer', Rule::exists('agencies', 'id')->where(fn ($query) => $query
                ->whereNull('deleted_at')
                ->whereNull('archived_at')
                ->where('status', 'active'))],
            'mfa_required' => ['sometimes', 'boolean'],
            'role_id' => [
                'required',
                'integer',
                Rule::exists('roles', 'id')->where(fn ($query) => $query
                    ->whereNull('deleted_at')
                    ->where('is_active', true)
                    ->where('is_system', false)
                    ->whereNotIn('slug', ['agency_admin', 'super_admin'])),
            ],
        ]);

        $user = DB::transaction(function () use ($request, $validated): User {
            $role = Role::query()
                ->where('is_active', true)
                ->where('is_system', false)
                ->whereNotIn('slug', ['agency_admin', 'super_admin'])
                ->lockForUpdate()
                ->findOrFail($validated['role_id']);

            if (! $role->permissions()->whereIn('slug', array_keys(User::ADMIN_PORTAL_DESTINATIONS))->exists()) {
                throw ValidationException::withMessages([
                    'role_id' => ['Choose a role with permission to view at least one admin page.'],
                ]);
            }

            $this->assertScopeSupportsPermissions(
                (string) $role->access_scope,
                $role->permissions()->pluck('permissions.id')->all(),
            );
            $this->assertCanAssignRole($request, $role);

            $agencyId = $role->access_scope === 'agency'
                ? ($validated['agency_id'] ?? null)
                : null;

            if ($role->access_scope === 'agency' && ! $agencyId) {
                throw ValidationException::withMessages([
                    'agency_id' => ['An active agency is required for an agency-scoped role.'],
                ]);
            }

            $name = trim($validated['name']);
            $nameParts = preg_split('/\s+/', $name, 2) ?: [];
            $user = User::query()->create([
                'agency_id' => $agencyId,
                'first_name' => $nameParts[0] ?? null,
                'last_name' => $nameParts[1] ?? null,
                'name' => $name,
                'email' => str($validated['email'])->lower()->trim()->toString(),
                'password' => Hash::make(Str::random(64)),
                'role' => $role->slug,
                'status' => Statuses::USER_PENDING_ACTIVATION,
                'mfa_required' => $validated['mfa_required'] ?? true,
            ]);
            $user->roles()->attach($role->id, [
                'assigned_by' => $request->user()->id,
                'assigned_at' => now(),
            ]);

            AuditLogger::record(
                $request,
                'admin_user.created',
                $user,
                null,
                $user->only(['id', 'agency_id', 'name', 'email', 'role', 'status', 'mfa_required']),
                ['role_id' => $role->id, 'role_slug' => $role->slug],
            );

            return $user;
        });

        [$inviteSent, $inviteMessage] = $this->sendAdminInvitation($request, $user, 'admin_user.invitation_sent');

        return ApiResponse::success(
            $inviteSent
                ? 'Admin account created and invitation queued.'
                : 'Admin account created, but the invitation could not be sent.',
            $this->userAssignmentPayload($user->fresh(['agency', 'roles'])),
            ['invite_sent' => $inviteSent, 'invite_message' => $inviteMessage],
            status: 201,
        );
    }

    public function resendAdminInvitation(Request $request, User $user): JsonResponse
    {
        $this->assertCustomAdminUser($request, $user);

        if ($user->status !== Statuses::USER_PENDING_ACTIVATION) {
            throw ValidationException::withMessages([
                'user' => ['Invitations can only be resent to accounts pending activation.'],
            ]);
        }

        [$sent, $message] = $this->sendAdminInvitation($request, $user, 'admin_user.invitation_resent');

        if (! $sent) {
            return ApiResponse::error('Unable to resend the invitation.', [
                'email' => [$message ?? 'Invitation email could not be delivered.'],
            ], 422);
        }

        return ApiResponse::success('Admin account invitation queued.', [
            'id' => (string) $user->id,
            'sent_at' => now()->toISOString(),
        ]);
    }

    public function suspendAdminUser(Request $request, User $user): JsonResponse
    {
        $this->assertCustomAdminUser($request, $user);
        abort_if($request->user()->is($user), 422, 'You cannot suspend your own account.');

        $updatedUser = DB::transaction(function () use ($request, $user): User {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $this->assertCustomAdminUser($request, $lockedUser);
            $oldValues = $lockedUser->only(['status']);
            $lockedUser->forceFill(['status' => 'suspended'])->save();
            DB::table('sessions')->where('user_id', $lockedUser->id)->delete();
            AuditLogger::record($request, 'admin_user.suspended', $lockedUser, $oldValues, $lockedUser->only(['status']));

            return $lockedUser;
        });

        return ApiResponse::success('Admin account suspended and active sessions revoked.', $this->userAssignmentPayload($updatedUser->fresh(['agency', 'roles'])));
    }

    public function reactivateAdminUser(Request $request, User $user): JsonResponse
    {
        $this->assertCustomAdminUser($request, $user);

        $updatedUser = DB::transaction(function () use ($request, $user): User {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $this->assertCustomAdminUser($request, $lockedUser);
            $oldValues = $lockedUser->only(['status']);
            $status = $lockedUser->email_verified_at
                ? Statuses::USER_ACTIVE
                : Statuses::USER_PENDING_ACTIVATION;
            $lockedUser->forceFill(['status' => $status])->save();
            AuditLogger::record($request, 'admin_user.reactivated', $lockedUser, $oldValues, $lockedUser->only(['status']));

            return $lockedUser;
        });

        return ApiResponse::success('Admin account reactivated.', $this->userAssignmentPayload($updatedUser->fresh(['agency', 'roles'])));
    }

    public function revokeAdminUserSessions(Request $request, User $user): JsonResponse
    {
        $this->assertCustomAdminUser($request, $user);
        abort_if($request->user()->is($user), 422, 'Use the account security page to revoke your own other sessions.');

        $revoked = DB::table('sessions')->where('user_id', $user->id)->delete();
        AuditLogger::record($request, 'admin_user.sessions_revoked', $user, null, ['revoked_sessions' => $revoked]);

        return ApiResponse::success('Admin account sessions revoked.', [
            'id' => (string) $user->id,
            'revoked_sessions' => $revoked,
        ]);
    }

    public function history(): JsonResponse
    {
        $logs = AuditLog::query()
            ->with('user:id,name,email')
            ->whereIn('event', [
                'rbac.role.assigned',
                'rbac.role.removed',
                'rbac.permissions.updated',
                'rbac.role.created',
                'rbac.role.updated',
                'rbac.role.deactivated',
                'rbac.role.reactivated',
                'rbac.role.deleted',
            ])
            ->latest('created_at')
            ->latest('id')
            ->limit(50)
            ->get();

        $roleIds = $logs
            ->flatMap(fn (AuditLog $log): array => [
                $log->auditable_type === (new Role)->getMorphClass() ? $log->auditable_id : null,
                data_get($log->old_values, 'role_id'),
                data_get($log->new_values, 'role_id'),
            ])
            ->filter()
            ->unique()
            ->values();

        $rolesById = Role::withTrashed()
            ->whereIn('id', $roleIds)
            ->get()
            ->keyBy('id');

        $permissionsById = Permission::query()
            ->whereIn(
                'id',
                $logs
                    ->flatMap(fn (AuditLog $log): array => [
                        ...((array) data_get($log->old_values, 'permission_ids', [])),
                        ...((array) data_get($log->new_values, 'permission_ids', [])),
                    ])
                    ->filter()
                    ->unique()
                    ->values(),
            )
            ->get()
            ->keyBy('id');

        $history = $logs->map(fn (AuditLog $log): array => $this->historyPayload($log, $rolesById, $permissionsById));

        return ApiResponse::success('RBAC change history retrieved.', $history);
    }

    public function assignUserRole(Request $request, User $user): JsonResponse
    {
        return $this->replaceUserRole($request, $user);
    }

    public function replaceUserRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')->where(fn ($query) => $query
                ->whereNull('deleted_at')
                ->where('is_active', true))],
        ]);

        $updatedUser = DB::transaction(function () use ($request, $user, $validated): User {
            $lockedUser = User::query()->lockForUpdate()->findOrFail($user->id);
            $role = Role::query()->where('is_active', true)->lockForUpdate()->findOrFail($validated['role_id']);
            $this->assertCanManageUser($request, $lockedUser);
            $this->assertCanAssignRole($request, $role);

            if ($role->access_scope === 'agency' && ! $lockedUser->agency_id) {
                throw ValidationException::withMessages([
                    'role_id' => ['Assign an agency to this account before applying an agency-scoped role.'],
                ]);
            }
            $currentRole = $lockedUser->roles()->lockForUpdate()->first();

            if ($currentRole?->slug === 'super_admin' && $role->slug !== 'super_admin') {
                $activeSuperAdminCount = User::query()
                    ->where('status', 'active')
                    ->whereNull('archived_at')
                    ->whereHas('roles', fn ($query) => $query
                        ->where('roles.slug', 'super_admin')
                        ->where('roles.is_active', true))
                    ->lockForUpdate()
                    ->count();

                if ($activeSuperAdminCount <= 1) {
                    throw ValidationException::withMessages([
                        'role' => ['Cannot replace the last active super admin role.'],
                    ]);
                }
            }

            $oldRole = $currentRole ? ['role_id' => $currentRole->id, 'role_slug' => $currentRole->slug] : null;

            $lockedUser->roles()->sync([
                $role->id => [
                    'assigned_by' => $request->user()->id,
                    'assigned_at' => now(),
                ],
            ]);
            $lockedUser->forceFill(['role' => $role->slug])->save();

            AuditLogger::record(
                $request,
                'rbac.role.assigned',
                $lockedUser,
                $oldRole,
                ['role_id' => $role->id, 'role_slug' => $role->slug],
            );

            return $lockedUser;
        });

        return ApiResponse::success('User role replaced.', $this->userAssignmentPayload($updatedUser->fresh(['agency', 'roles'])));
    }

    public function removeUserRole(Request $request, User $user, Role $role): JsonResponse
    {
        throw ValidationException::withMessages([
            'role' => ['A user must retain one primary role. Use the role replacement endpoint.'],
        ]);
    }

    public function deleteRole(Request $request, Role $role): JsonResponse
    {
        $oldValues = DB::transaction(function () use ($request, $role): array {
            $lockedRole = Role::query()->lockForUpdate()->findOrFail($role->id);
            if ($lockedRole->is_system) {
                throw ValidationException::withMessages([
                    'role' => ['Protected system roles cannot be deleted.'],
                ]);
            }
            $this->assertCanManageRole($request, $lockedRole);
            if ($lockedRole->users()->exists()) {
                throw ValidationException::withMessages([
                    'role' => ['Reassign every user before deleting this role.'],
                ]);
            }
            $values = [
                ...$lockedRole->only(['id', 'name', 'slug', 'display_name', 'description']),
                'permission_ids' => $lockedRole->permissions()->pluck('permissions.id')->sort()->values()->all(),
                'user_ids' => [],
            ];
            $lockedRole->permissions()->detach();
            $lockedRole->delete();

            return $values;
        });

        AuditLogger::record(
            $request,
            'rbac.role.deleted',
            $role,
            $oldValues,
            null,
        );

        return ApiResponse::success('Role deleted.');
    }

    public function updateRolePermissions(Request $request, Role $role): JsonResponse
    {
        if ($role->is_system) {
            throw ValidationException::withMessages([
                'role' => ['System role permissions are protected and cannot be modified during pilot.'],
            ]);
        }

        $this->assertCanManageRole($request, $role);

        $validated = $request->validate([
            'permission_ids' => ['required', 'array', 'min:1'],
            'permission_ids.*' => ['integer', 'distinct', Rule::exists('permissions', 'id')],
            'name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/[a-z0-9]/i'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'access_scope' => ['sometimes', 'required', Rule::in(['system', 'agency'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $this->assertCanGrantPermissions($request, $validated['permission_ids']);
        $this->assertScopeSupportsPermissions(
            $validated['access_scope'] ?? (string) $role->access_scope,
            $validated['permission_ids'],
        );

        [$role, $oldValues, $newValues] = DB::transaction(function () use ($request, $role, $validated): array {
            $lockedRole = Role::query()->lockForUpdate()->findOrFail($role->id);
            $this->assertCanManageRole($request, $lockedRole);
            $oldValues = [
                ...$lockedRole->only(['name', 'display_name', 'description', 'access_scope', 'is_active']),
                'permission_ids' => $lockedRole->permissions()->pluck('permissions.id')->sort()->values()->all(),
            ];
            if (array_key_exists('name', $validated)) {
                $lockedRole->forceFill([
                    'name' => $validated['name'],
                    'display_name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                    'access_scope' => $validated['access_scope'] ?? $lockedRole->access_scope,
                    'is_active' => $validated['is_active'] ?? $lockedRole->is_active,
                ])->save();
            }
            $lockedRole->permissions()->sync($validated['permission_ids']);
            $lockedRole->touch();
            $updatedRole = $lockedRole->fresh(['permissions', 'users']);
            $newValues = [
                ...$updatedRole->only(['name', 'display_name', 'description', 'access_scope', 'is_active']),
                'permission_ids' => $updatedRole->permissions->pluck('id')->sort()->values()->all(),
            ];

            return [$updatedRole, $oldValues, $newValues];
        });

        AuditLogger::record(
            $request,
            'rbac.permissions.updated',
            $role,
            $oldValues,
            $newValues,
        );

        if (($oldValues['is_active'] ?? true) !== ($newValues['is_active'] ?? true)) {
            AuditLogger::record(
                $request,
                $newValues['is_active'] ? 'rbac.role.reactivated' : 'rbac.role.deactivated',
                $role,
                ['is_active' => $oldValues['is_active']],
                ['is_active' => $newValues['is_active']],
            );
        }

        return ApiResponse::success('Role updated.', $this->rolePayload($role));
    }

    public function createRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/[a-z0-9]/i'],
            'slug' => ['sometimes', 'required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_]*$/', Rule::unique('roles', 'slug')],
            'description' => ['nullable', 'string', 'max:1000'],
            'access_scope' => ['sometimes', 'required', Rule::in(['system', 'agency'])],
            'is_active' => ['sometimes', 'boolean'],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', 'distinct', Rule::exists('permissions', 'id')],
        ]);
        $this->assertCanGrantPermissions($request, $validated['permission_ids'] ?? []);
        $this->assertScopeSupportsPermissions(
            $validated['access_scope'] ?? 'system',
            $validated['permission_ids'] ?? [],
        );

        $role = DB::transaction(function () use ($validated): Role {
            $slug = $validated['slug'] ?? str($validated['name'])->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString();

            if (Role::withTrashed()->where('slug', $slug)->exists()) {
                throw ValidationException::withMessages([
                    'slug' => ['A role with this identifier already exists.'],
                ]);
            }

            $role = Role::query()->create([
                'name' => $validated['name'],
                'slug' => $slug,
                'display_name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'access_scope' => $validated['access_scope'] ?? 'system',
                'is_system' => false,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            $role->permissions()->sync($validated['permission_ids'] ?? []);

            return $role;
        });

        AuditLogger::record(
            $request,
            'rbac.role.created',
            $role,
            null,
            [
                ...$role->only(['id', 'name', 'slug', 'display_name', 'description', 'access_scope', 'is_active']),
                'permission_ids' => $role->permissions()->pluck('permissions.id')->sort()->values()->all(),
            ],
        );

        return ApiResponse::success('Role created.', $this->rolePayload($role->load(['permissions', 'users'])), status: 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        $this->assertCanManageRole($request, $role);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'access_scope' => ['sometimes', 'required', Rule::in(['system', 'agency'])],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $this->assertScopeSupportsPermissions(
            $validated['access_scope'] ?? (string) $role->access_scope,
            $role->permissions()->pluck('permissions.id')->all(),
        );

        $oldValues = $role->only(['name', 'display_name', 'description', 'access_scope', 'is_active']);

        $role->forceFill([
            'name' => $role->is_system ? $role->name : $validated['name'],
            'display_name' => $role->is_system ? $role->display_name : $validated['name'],
            'description' => $validated['description'] ?? null,
            'access_scope' => $role->is_system ? $role->access_scope : ($validated['access_scope'] ?? $role->access_scope),
            'is_active' => $role->is_system ? $role->is_active : ($validated['is_active'] ?? $role->is_active),
        ])->save();

        $event = $oldValues['is_active'] !== $role->is_active
            ? ($role->is_active ? 'rbac.role.reactivated' : 'rbac.role.deactivated')
            : 'rbac.role.updated';

        AuditLogger::record(
            $request,
            $event,
            $role,
            $oldValues,
            $role->only(['name', 'display_name', 'description', 'access_scope', 'is_active']),
        );

        return ApiResponse::success('Role updated.', $this->rolePayload($role->fresh(['permissions', 'users'])));
    }

    private function rolePayload(Role $role): array
    {
        return [
            'id' => (string) $role->id,
            'name' => $role->display_name ?: $role->name,
            'slug' => $role->slug,
            'description' => $role->description ?? '',
            'accessScope' => $role->access_scope ?? 'system',
            'isSystemRole' => (bool) $role->is_system,
            'isActive' => (bool) $role->is_active,
            'userCount' => (int) ($role->users_count ?? $role->users()->count()),
            'permissionIds' => $role->relationLoaded('permissions')
                ? $role->permissions->pluck('id')->map(fn ($id): string => (string) $id)->values()->all()
                : [],
            'createdAt' => $role->created_at?->toISOString(),
            'updatedAt' => $role->updated_at?->toISOString(),
            'assignedUsers' => $role->relationLoaded('users')
                ? $role->users->map(fn (User $user): array => [
                    'id' => (string) $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'agency' => $user->agency?->short_name ?: $user->agency?->name,
                ])->values()->all()
                : [],
        ];
    }

    private function historyPayload(AuditLog $log, $rolesById, $permissionsById): array
    {
        $roleId = $log->auditable_type === (new Role)->getMorphClass()
            ? $log->auditable_id
            : (data_get($log->new_values, 'role_id') ?? data_get($log->old_values, 'role_id'));

        $role = $roleId ? $rolesById->get($roleId) : null;
        $roleName = data_get($log->new_values, 'display_name')
            ?? data_get($log->new_values, 'name')
            ?? data_get($log->old_values, 'display_name')
            ?? data_get($log->old_values, 'name')
            ?? data_get($log->new_values, 'role_slug')
            ?? data_get($log->old_values, 'role_slug')
            ?? $role?->display_name
            ?? $role?->name
            ?? 'Unknown role';

        return [
            'id' => (string) $log->id,
            'roleId' => $roleId ? (string) $roleId : '',
            'roleName' => $roleName,
            'changedBy' => $log->user?->name ?? 'System',
            'changeType' => $this->historyChangeType($log->event),
            'date' => $log->created_at?->toISOString(),
            'before' => $this->permissionKeyDiff((array) data_get($log->old_values, 'permission_ids', []), $permissionsById),
            'after' => $this->permissionKeyDiff((array) data_get($log->new_values, 'permission_ids', []), $permissionsById),
            'summary' => $this->historySummary($log, $roleName),
        ];
    }

    private function historyChangeType(string $event): string
    {
        return match ($event) {
            'rbac.permissions.updated' => 'permission-updated',
            'rbac.role.created' => 'role-created',
            'rbac.role.deleted' => 'role-deleted',
            default => 'role-modified',
        };
    }

    private function historySummary(AuditLog $log, string $roleName): string
    {
        return match ($log->event) {
            'rbac.role.assigned' => $roleName.' was assigned to a user.',
            'rbac.role.removed' => $roleName.' was removed from a user.',
            'rbac.permissions.updated' => $roleName.' permissions were updated.',
            'rbac.role.created' => $roleName.' was created.',
            'rbac.role.deleted' => $roleName.' was deleted.',
            'rbac.role.updated' => $roleName.' details were updated.',
            'rbac.role.deactivated' => $roleName.' was deactivated.',
            'rbac.role.reactivated' => $roleName.' was reactivated.',
            default => 'RBAC settings were updated.',
        };
    }

    private function permissionKeyDiff(array $permissionIds, $permissionsById): array
    {
        return collect($permissionIds)
            ->map(fn ($id) => $permissionsById->get($id)?->slug)
            ->filter()
            ->values()
            ->all();
    }

    private function permissionPayload(Permission $permission): array
    {
        return [
            'id' => (string) $permission->id,
            'key' => $permission->slug,
            'name' => $permission->display_name ?: $permission->name,
            'description' => $permission->description ?? '',
            'module' => str($permission->module)->replace('_', '-')->toString(),
        ];
    }

    private function userAssignmentPayload(User $user): array
    {
        $role = $user->roles->first();

        return [
            'id' => (string) $user->id,
            'userName' => $user->name,
            'email' => $user->email,
            'agency' => $user->agency?->short_name ?: $user->agency?->name,
            'roleId' => $role ? (string) $role->id : '',
            'role' => $role ? [
                'id' => (string) $role->id,
                'name' => $role->slug,
                'display_name' => $role->display_name ?: $role->name,
            ] : null,
            'roles' => $user->roles->map(fn (Role $assignedRole): array => [
                'id' => (string) $assignedRole->id,
                'name' => $assignedRole->slug,
                'display_name' => $assignedRole->display_name ?: $assignedRole->name,
            ])->values()->all(),
            'status' => $user->status,
            'mfaRequired' => (bool) $user->mfa_required,
            'mfaEnabled' => $user->hasEnabledTwoFactorAuthentication(),
            'lastLogin' => $user->last_login_at?->toISOString(),
            'createdAt' => $user->created_at?->toISOString(),
            'accessScope' => $role?->access_scope ?? 'system',
        ];
    }

    /**
     * @return array{0: bool, 1: string|null}
     */
    private function sendAdminInvitation(Request $request, User $user, string $event): array
    {
        try {
            $status = Password::broker('users')->sendResetLink(['email' => $user->email]);
            $sent = $status === Password::RESET_LINK_SENT;
            $message = $sent ? null : __($status);
        } catch (Throwable $exception) {
            report($exception);
            $sent = false;
            $message = 'Invitation email could not be delivered.';
        }

        if ($sent) {
            AuditLogger::record($request, $event, $user, null, [
                'email' => $user->email,
                'sent_at' => now()->toISOString(),
            ]);
        }

        return [$sent, $message];
    }

    private function assertCustomAdminUser(Request $request, User $user): void
    {
        $this->assertCanManageUser($request, $user);

        if ($user->isSuperAdmin() || $user->isAgencyAdmin() || ! $user->canAccessAdminPortal()) {
            abort(404);
        }
    }

    private function assertCanGrantPermissions(Request $request, array $permissionIds): void
    {
        if ($request->user()->isSuperAdmin()) {
            return;
        }

        $unauthorized = Permission::query()
            ->whereIn('id', $permissionIds)
            ->get(['id', 'slug'])
            ->first(fn (Permission $permission): bool => ! $request->user()->hasPermission($permission->slug));

        if ($unauthorized) {
            throw ValidationException::withMessages([
                'permission_ids' => ['You cannot grant permissions that you do not currently hold.'],
            ]);
        }
    }

    private function assertScopeSupportsPermissions(string $accessScope, array $permissionIds): void
    {
        if ($accessScope !== 'agency' || $permissionIds === []) {
            return;
        }

        $unsupported = Permission::query()
            ->whereIn('id', $permissionIds)
            ->whereNotIn('slug', User::AGENCY_SCOPED_ADMIN_PERMISSIONS)
            ->orderBy('slug')
            ->pluck('slug')
            ->all();

        if ($unsupported !== []) {
            throw ValidationException::withMessages([
                'permission_ids' => [
                    'Agency-scoped roles may only use agency and research moderation permissions. Unsupported: '.implode(', ', $unsupported).'.',
                ],
            ]);
        }
    }

    private function assertCanAssignRole(Request $request, Role $role): void
    {
        if ($role->slug === 'super_admin' && ! $request->user()->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role_id' => ['Only a super admin can assign the super admin role.'],
            ]);
        }

        $this->assertCanGrantPermissions($request, $role->permissions()->pluck('permissions.id')->all());
    }

    private function assertCanManageRole(Request $request, Role $role): void
    {
        $this->assertCanGrantPermissions($request, $role->permissions()->pluck('permissions.id')->all());
    }

    private function assertCanManageUser(Request $request, User $user): void
    {
        if ($user->isSuperAdmin() && ! $request->user()->isSuperAdmin()) {
            throw ValidationException::withMessages([
                'role_id' => ['Only a super admin can change a super admin account.'],
            ]);
        }

        if ($request->user()->isSuperAdmin()) {
            return;
        }

        $permissionIds = $user->roles()
            ->with('permissions:id')
            ->get()
            ->flatMap(fn (Role $role) => $role->permissions->pluck('id'))
            ->unique()
            ->all();

        $this->assertCanGrantPermissions($request, $permissionIds);
    }
}
