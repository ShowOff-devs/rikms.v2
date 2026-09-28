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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
        ]);
        $this->assertCanGrantPermissions($request, $validated['permission_ids']);

        [$role, $oldValues, $newValues] = DB::transaction(function () use ($request, $role, $validated): array {
            $lockedRole = Role::query()->lockForUpdate()->findOrFail($role->id);
            $this->assertCanManageRole($request, $lockedRole);
            $oldValues = [
                ...$lockedRole->only(['name', 'display_name', 'description']),
                'permission_ids' => $lockedRole->permissions()->pluck('permissions.id')->sort()->values()->all(),
            ];
            if (array_key_exists('name', $validated)) {
                $lockedRole->forceFill([
                    'name' => $validated['name'],
                    'display_name' => $validated['name'],
                    'description' => $validated['description'] ?? null,
                ])->save();
            }
            $lockedRole->permissions()->sync($validated['permission_ids']);
            $lockedRole->touch();
            $updatedRole = $lockedRole->fresh(['permissions', 'users']);
            $newValues = [
                ...$updatedRole->only(['name', 'display_name', 'description']),
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

        return ApiResponse::success('Role updated.', $this->rolePayload($role));
    }

    public function createRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', 'regex:/[a-z0-9]/i'],
            'description' => ['nullable', 'string', 'max:1000'],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', 'distinct', Rule::exists('permissions', 'id')],
        ]);
        $this->assertCanGrantPermissions($request, $validated['permission_ids'] ?? []);

        $role = DB::transaction(function () use ($validated): Role {
            $slug = str($validated['name'])->lower()->replaceMatches('/[^a-z0-9]+/', '_')->trim('_')->toString();

            if (Role::withTrashed()->where('slug', $slug)->exists()) {
                throw ValidationException::withMessages([
                    'name' => ['A role with this name already exists.'],
                ]);
            }

            $role = Role::query()->create([
                'name' => $validated['name'],
                'slug' => $slug,
                'display_name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'is_system' => false,
                'is_active' => true,
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
                ...$role->only(['id', 'name', 'slug', 'display_name', 'description']),
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
        ]);

        $oldValues = $role->only(['name', 'display_name', 'description']);

        $role->forceFill([
            'name' => $role->is_system ? $role->name : $validated['name'],
            'display_name' => $role->is_system ? $role->display_name : $validated['name'],
            'description' => $validated['description'] ?? null,
        ])->save();

        AuditLogger::record(
            $request,
            'rbac.role.updated',
            $role,
            $oldValues,
            $role->only(['name', 'display_name', 'description']),
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
            'status' => $user->status === 'active' ? 'active' : 'inactive',
        ];
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
