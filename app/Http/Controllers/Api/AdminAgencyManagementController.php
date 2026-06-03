<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AgencyResource;
use App\Models\Agency;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminAgencyManagementController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('agencies', 'name')->whereNull('deleted_at')],
            'short_name' => ['required', 'string', 'max:255', Rule::unique('agencies', 'short_name')->whereNull('deleted_at')],
            'type' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'agency_admin_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        $agency = Agency::query()->create([
            'slug' => $this->uniqueSlug($validated['short_name'] ?: $validated['name']),
            'name' => trim($validated['name']),
            'short_name' => trim($validated['short_name']),
            'full_name' => trim($validated['name']),
            'type' => $this->displayType($validated['type']),
            'description' => $validated['description'] ?? null,
            'website' => $validated['website'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'],
        ]);

        if (! empty($validated['agency_admin_id'])) {
            $this->assignAdminToAgency($request, $agency, (int) $validated['agency_admin_id']);
        }

        AuditLogger::record($request, 'agency.created', $agency, null, $agency->only([
            'id', 'name', 'short_name', 'type', 'status',
        ]));

        return ApiResponse::success(
            'Agency created.',
            $this->agencyResource($request, $agency),
            [],
            201,
        );
    }

    public function update(Request $request, Agency $agency): JsonResponse
    {
        abort_if($agency->archived_at !== null, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('agencies', 'name')->ignore($agency->id)->whereNull('deleted_at')],
            'short_name' => ['required', 'string', 'max:255', Rule::unique('agencies', 'short_name')->ignore($agency->id)->whereNull('deleted_at')],
            'type' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'website' => ['nullable', 'url', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'agency_admin_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
        ]);

        $oldValues = $agency->only(['name', 'short_name', 'type', 'description', 'website', 'email', 'address', 'status']);

        $agency->forceFill([
            'name' => trim($validated['name']),
            'short_name' => trim($validated['short_name']),
            'full_name' => trim($validated['name']),
            'type' => $this->displayType($validated['type']),
            'description' => $validated['description'] ?? null,
            'website' => $validated['website'] ?? null,
            'email' => $validated['email'] ?? null,
            'address' => $validated['address'] ?? null,
            'status' => $validated['status'],
        ])->save();

        User::query()
            ->where('agency_id', $agency->id)
            ->where(function (Builder $query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
            })
            ->update(['agency_id' => null]);

        if (! empty($validated['agency_admin_id'])) {
            $this->assignAdminToAgency($request, $agency, (int) $validated['agency_admin_id']);
        }

        AuditLogger::record($request, 'agency.updated', $agency, $oldValues, $agency->only([
            'name', 'short_name', 'type', 'description', 'website', 'email', 'address', 'status',
        ]));

        return ApiResponse::success('Agency updated.', $this->agencyResource($request, $agency));
    }

    public function activate(Request $request, Agency $agency): JsonResponse
    {
        return $this->updateStatus($request, $agency, 'active');
    }

    public function deactivate(Request $request, Agency $agency): JsonResponse
    {
        return $this->updateStatus($request, $agency, 'inactive');
    }

    public function archive(Request $request, Agency $agency): JsonResponse
    {
        abort_if($agency->archived_at !== null, 404);

        $agency->forceFill([
            'status' => 'inactive',
            'archived_at' => now(),
            'archived_by' => $request->user()?->id,
            'archive_reason' => $request->string('reason')->toString() ?: 'Archived by super admin.',
        ])->save();

        User::query()
            ->where('agency_id', $agency->id)
            ->where(function (Builder $query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
            })
            ->update(['agency_id' => null]);

        AuditLogger::record($request, 'agency.archived', $agency, null, [
            'archived_at' => $agency->archived_at?->toISOString(),
            'reason' => $agency->archive_reason,
        ]);

        return ApiResponse::success('Agency archived.', [
            'id' => $agency->id,
            'archived_at' => $agency->archived_at?->toISOString(),
        ]);
    }

    public function assignAdmin(Request $request, Agency $agency): JsonResponse
    {
        $validated = $request->validate([
            'admin_user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ]);

        $this->assignAdminToAgency($request, $agency, (int) $validated['admin_user_id']);

        return ApiResponse::success(
            'Agency admin assigned.',
            $this->agencyResource($request, $agency),
        );
    }

    private function assignAdminToAgency(Request $request, Agency $agency, int $adminUserId): void
    {
        $admin = User::query()
            ->with('roles')
            ->whereKey($adminUserId)
            ->firstOrFail();

        if (! $admin->isAgencyAdmin() || $admin->status !== 'active' || $admin->archived_at !== null) {
            abort(response()->json([
                'message' => 'Selected user is not an active agency admin.',
                'errors' => [
                    'admin_user_id' => ['Selected user is not an active agency admin.'],
                ],
            ], 422));
        }

        $oldAdmins = User::query()
            ->with('roles')
            ->where('agency_id', $agency->id)
            ->whereKeyNot($admin->id)
            ->where(function (Builder $query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
            })
            ->get();

        User::query()
            ->whereKey($oldAdmins->pluck('id'))
            ->update(['agency_id' => null]);

        $admin->forceFill([
            'agency_id' => $agency->id,
            'role' => 'agency_admin',
        ])->save();

        $role = Role::query()->where('slug', 'agency_admin')->first();

        if ($role) {
            $admin->roles()->syncWithoutDetaching([
                $role->id => [
                    'assigned_by' => $request->user()?->id,
                    'assigned_at' => now(),
                ],
            ]);
        }

        AuditLogger::record(
            $request,
            'agency.admin_assigned',
            $agency,
            [
                'agency_admin_ids' => $oldAdmins->pluck('id')->values()->all(),
            ],
            [
                'agency_admin_id' => $admin->id,
            ],
        );
    }

    private function updateStatus(Request $request, Agency $agency, string $status): JsonResponse
    {
        abort_if($agency->archived_at !== null, 404);

        $oldValues = $agency->only(['status']);
        $agency->forceFill(['status' => $status])->save();

        AuditLogger::record($request, 'agency.status_updated', $agency, $oldValues, ['status' => $status]);

        return ApiResponse::success('Agency status updated.', $this->agencyResource($request, $agency));
    }

    private function agencyResource(Request $request, Agency $agency): array
    {
        return (new AgencyResource($agency->fresh()->load(['users.roles'])->loadCount('research')))->resolve($request);
    }

    private function uniqueSlug(string $value): string
    {
        $baseSlug = Str::slug($value) ?: 'agency';
        $slug = $baseSlug;
        $suffix = 2;

        while (Agency::query()->withTrashed()->where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function displayType(string $type): string
    {
        return match ($type) {
            'government-agency' => 'Government Agency',
            'higher-education-institution' => 'Higher Education Institution',
            'research-consortium' => 'Research Consortium',
            'industry-partner' => 'Industry Partner',
            default => 'Other',
        };
    }
}
