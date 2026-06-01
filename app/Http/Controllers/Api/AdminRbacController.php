<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
    public function roles(Request $request): JsonResponse
    {
        $roles = Role::query()
            ->with(['permissions:id,slug,name,module,display_name,description', 'users.agency'])
            ->withCount('users')
            ->orderBy('is_system', 'desc')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role): array => $this->rolePayload($role));

        return ApiResponse::success('RBAC roles retrieved.', $roles);
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
        $users = User::query()
            ->with(['agency', 'roles'])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user): array => $this->userAssignmentPayload($user));

        return ApiResponse::success('RBAC user role assignments retrieved.', $users);
    }

    public function assignUserRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role_id' => ['required', 'integer', Rule::exists('roles', 'id')->whereNull('deleted_at')],
        ]);

        $role = Role::query()->findOrFail($validated['role_id']);

        DB::transaction(function () use ($request, $user, $role): void {
            $user->roles()->syncWithoutDetaching([
                $role->id => [
                    'assigned_by' => $request->user()->id,
                    'assigned_at' => now(),
                ],
            ]);

            $user->forceFill(['role' => $role->slug])->save();
        });

        AuditLogger::record(
            $request,
            'rbac.role.assigned',
            $user,
            null,
            ['role_id' => $role->id, 'role_slug' => $role->slug],
        );

        return ApiResponse::success('Role assigned to user.', $this->userAssignmentPayload($user->fresh(['agency', 'roles'])));
    }

    public function removeUserRole(Request $request, User $user, Role $role): JsonResponse
    {
        $this->abortIfRemovingLastSuperAdmin($request, $user, $role);

        DB::transaction(function () use ($user, $role): void {
            $user->roles()->detach($role->id);

            if ($user->role === $role->slug) {
                $replacementRole = $user->roles()->orderBy('roles.name')->first();
                $user->forceFill(['role' => $replacementRole?->slug ?? ''])->save();
            }
        });

        AuditLogger::record(
            $request,
            'rbac.role.removed',
            $user,
            ['role_id' => $role->id, 'role_slug' => $role->slug],
            null,
        );

        return ApiResponse::success('Role removed from user.', $this->userAssignmentPayload($user->fresh(['agency', 'roles'])));
    }

    public function updateRolePermissions(Request $request, Role $role): JsonResponse
    {
        $validated = $request->validate([
            'permission_ids' => ['required', 'array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ]);

        $oldPermissionIds = $role->permissions()->pluck('permissions.id')->sort()->values()->all();

        DB::transaction(function () use ($role, $validated): void {
            $role->permissions()->sync($validated['permission_ids']);
            $role->touch();
        });

        $newPermissionIds = $role->fresh()->permissions()->pluck('permissions.id')->sort()->values()->all();

        AuditLogger::record(
            $request,
            'rbac.permissions.updated',
            $role,
            ['permission_ids' => $oldPermissionIds],
            ['permission_ids' => $newPermissionIds],
        );

        return ApiResponse::success('Role permissions updated.', $this->rolePayload($role->fresh(['permissions', 'users'])));
    }

    public function createRole(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'permission_ids' => ['array'],
            'permission_ids.*' => ['integer', Rule::exists('permissions', 'id')],
        ]);

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
            $role->only(['id', 'name', 'slug', 'description']),
        );

        return ApiResponse::success('Role created.', $this->rolePayload($role->load(['permissions', 'users'])), status: 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
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

    private function abortIfRemovingLastSuperAdmin(Request $request, User $user, Role $role): void
    {
        if ($role->slug !== 'super_admin') {
            return;
        }

        $superAdminRoleId = $role->id;
        $otherSuperAdmins = User::query()
            ->whereKeyNot($user->id)
            ->where('status', 'active')
            ->whereHas('roles', fn ($query) => $query->where('roles.id', $superAdminRoleId))
            ->count();

        if ($otherSuperAdmins === 0) {
            throw ValidationException::withMessages([
                'role' => ['Cannot remove the last active super admin role.'],
            ]);
        }

        if ($request->user()->is($user) && ! $request->boolean('confirm_self_removal')) {
            throw ValidationException::withMessages([
                'role' => ['Confirm before removing your own super admin access.'],
            ]);
        }
    }

    private function rolePayload(Role $role): array
    {
        return [
            'id' => (string) $role->id,
            'name' => $role->display_name ?: $role->name,
            'slug' => $role->slug,
            'description' => $role->description ?? '',
            'isSystemRole' => (bool) $role->is_system,
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
            'status' => $user->status === 'active' ? 'active' : 'inactive',
        ];
    }
}
