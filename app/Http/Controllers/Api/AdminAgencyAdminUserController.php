<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Agency;
use App\Models\Role;
use App\Models\User;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Throwable;

class AdminAgencyAdminUserController extends Controller
{
    use RespondsWithApiPagination;

    public function index(Request $request): JsonResponse
    {
        $agencyAdminScope = fn (Builder $query) => $query
            ->whereNull('archived_at')
            ->where(function (Builder $query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
            });
        $summaryQuery = $agencyAdminScope(User::query());
        $summary = [
            'total_users' => (clone $summaryQuery)->count(),
            'active_users' => (clone $summaryQuery)->where('status', 'active')->count(),
            'inactive_users' => (clone $summaryQuery)->where('status', 'inactive')->count(),
            'recently_created' => (clone $summaryQuery)->where('created_at', '>=', now()->subDays(30))->count(),
        ];
        $query = $agencyAdminScope(User::query()
            ->with(['agency', 'roles'])
            ->withMax([
                'securityEvents as last_login_at' => fn (Builder $query) => $query->where('event_type', 'login.success'),
            ], 'created_at'))
            ->when($request->filled('agency_id'), fn (Builder $query) => $query->where('agency_id', $request->integer('agency_id')))
            ->when($request->filled('status'), fn (Builder $query) => $query->where('status', $request->string('status')))
            ->when($request->filled('keyword'), function (Builder $query) use ($request): void {
                $keywords = preg_split('/\s+/', $request->string('keyword')->trim()->toString()) ?: [];

                foreach ($keywords as $value) {
                    $keyword = '%'.$value.'%';

                    $query->where(function (Builder $query) use ($keyword): void {
                        $query->where('name', 'like', $keyword)
                            ->orWhere('first_name', 'like', $keyword)
                            ->orWhere('last_name', 'like', $keyword)
                            ->orWhere('email', 'like', $keyword)
                            ->orWhereHas('agency', fn (Builder $query) => $query->where('name', 'like', $keyword)->orWhere('short_name', 'like', $keyword));
                    });
                }
            })
            ->orderBy('created_at', $this->sortDirection($request));

        $paginator = $query->paginate($this->perPage($request));

        return ApiResponse::success(
            'Agency admin users retrieved.',
            UserResource::collection($paginator->getCollection())->resolve($request),
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

    public function show(Request $request, User $user): JsonResponse
    {
        $this->abortUnlessAgencyAdmin($user);
        $user->setAttribute(
            'last_login_at',
            $user->securityEvents()->where('event_type', 'login.success')->max('created_at'),
        );

        return ApiResponse::success(
            'Agency admin user retrieved.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
        );
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'agency_id' => ['required', 'integer', $this->activeAgencyRule()],
            'status' => ['required', Rule::in(['active', 'inactive'])],
            'temporary_password' => [
                Rule::requiredIf(! $request->boolean('send_invite')),
                'nullable',
                'string',
                'min:8',
                'max:255',
            ],
            'send_invite' => ['sometimes', 'boolean'],
        ]);

        $user = DB::transaction(function () use ($request, $validated): User {
            Agency::query()->whereKey($validated['agency_id'])->whereNull('archived_at')->where('status', 'active')->lockForUpdate()->firstOrFail();
            [$firstName, $lastName] = $this->splitName($validated['full_name']);
            $role = $this->agencyAdminRole();
            $user = User::query()->create([
                'agency_id' => $validated['agency_id'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => trim($validated['full_name']),
                'email' => str($validated['email'])->lower()->toString(),
                'password' => Hash::make($validated['temporary_password'] ?? Str::random(24)),
                'role' => 'agency_admin',
                'status' => $validated['status'],
            ]);

            $user->roles()->syncWithoutDetaching([
                $role->id => [
                    'assigned_by' => $request->user()?->id,
                    'assigned_at' => now(),
                ],
            ]);

            AuditLogger::record($request, 'agency_admin_user.created', $user, null, $user->only([
                'id', 'agency_id', 'name', 'email', 'role', 'status',
            ]));

            return $user;
        });

        $inviteSent = false;
        $inviteMessage = null;

        if ($request->boolean('send_invite')) {
            try {
                $status = Password::broker('users')->sendResetLink(['email' => $user->email]);
                $inviteSent = $status === Password::RESET_LINK_SENT;
                $inviteMessage = $inviteSent ? null : __($status);
            } catch (Throwable) {
                $inviteMessage = 'Invitation email could not be delivered.';
            }
        }

        return ApiResponse::success(
            $inviteMessage
                ? 'Agency admin user created, but the invitation email could not be sent.'
                : 'Agency admin user created.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
            [
                'invite_sent' => $inviteSent,
                'invite_message' => $inviteMessage,
            ],
            201,
        );
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->abortUnlessAgencyAdmin($user);

        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'agency_id' => ['required', 'integer', $this->activeAgencyRule()],
            'status' => ['required', Rule::in(['active', 'inactive'])],
        ]);

        $user = DB::transaction(function () use ($request, $validated, $user): User {
            Agency::query()->whereKey($validated['agency_id'])->whereNull('archived_at')->where('status', 'active')->lockForUpdate()->firstOrFail();
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $oldValues = $user->only(['agency_id', 'name', 'email', 'status']);
            [$firstName, $lastName] = $this->splitName($validated['full_name']);

            $user->forceFill([
                'agency_id' => $validated['agency_id'],
                'first_name' => $firstName,
                'last_name' => $lastName,
                'name' => trim($validated['full_name']),
                'email' => str($validated['email'])->lower()->toString(),
                'role' => 'agency_admin',
                'status' => $validated['status'],
            ])->save();

            $user->roles()->syncWithoutDetaching([
                $this->agencyAdminRole()->id => [
                    'assigned_by' => $request->user()?->id,
                    'assigned_at' => now(),
                ],
            ]);

            AuditLogger::record($request, 'agency_admin_user.updated', $user, $oldValues, $user->only([
                'agency_id', 'name', 'email', 'status',
            ]));

            return $user;
        });

        return ApiResponse::success(
            'Agency admin user updated.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
        );
    }

    public function activate(Request $request, User $user): JsonResponse
    {
        return $this->updateStatus($request, $user, 'active');
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        return $this->updateStatus($request, $user, 'inactive');
    }

    public function sendPasswordReset(Request $request, User $user): JsonResponse
    {
        $this->abortUnlessAgencyAdmin($user);
        abort_unless($user->isActive(), 404);

        try {
            $status = Password::broker('users')->sendResetLink(['email' => $user->email]);
        } catch (Throwable) {
            return ApiResponse::error('Unable to send password reset instructions.', [
                'email' => ['Password reset email could not be delivered.'],
            ], 422);
        }

        if ($status !== Password::RESET_LINK_SENT) {
            return ApiResponse::error('Unable to send password reset instructions.', [
                'email' => [__($status)],
            ], 422);
        }

        AuditLogger::record($request, 'agency_admin_user.password_reset_sent', $user);

        return ApiResponse::success('Password reset instructions sent.', [
            'id' => $user->id,
            'sent_to' => $user->email,
            'sent_at' => now()->toISOString(),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $this->abortUnlessAgencyAdmin($user);

        $user = DB::transaction(function () use ($request, $user): User {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $this->abortUnlessAgencyAdmin($user);
            $oldValues = $user->only(['agency_id', 'name', 'email', 'role', 'status']);
            $role = Role::query()->where('slug', 'agency_admin')->first();

            if ($role) {
                $user->roles()->detach($role->id);
            }

            $user->forceFill([
                'agency_id' => null,
                'role' => 'archived_agency_admin',
                'status' => 'inactive',
                'archived_at' => now(),
                'archived_by' => $request->user()?->id,
                'archive_reason' => 'Removed from Agency Admin Users by super admin.',
            ])->save();

            AuditLogger::record(
                $request,
                'agency_admin_user.removed',
                $user,
                $oldValues,
                $user->only(['agency_id', 'name', 'email', 'role', 'status', 'archived_at']),
            );

            return $user;
        });

        return ApiResponse::success('Agency admin user removed.', [
            'id' => $user->id,
            'removed_at' => $user->archived_at?->toISOString(),
        ]);
    }

    private function updateStatus(Request $request, User $user, string $status): JsonResponse
    {
        $this->abortUnlessAgencyAdmin($user);

        $user = DB::transaction(function () use ($request, $status, $user): User {
            $user = User::query()->lockForUpdate()->findOrFail($user->id);
            $this->abortUnlessAgencyAdmin($user);
            $oldValues = $user->only(['status', 'deactivation_requested_at']);
            $user->forceFill([
                'status' => $status,
                'deactivation_requested_at' => null,
            ])->save();

            AuditLogger::record(
                $request,
                'agency_admin_user.status_updated',
                $user,
                $oldValues,
                $user->only(['status', 'deactivation_requested_at']),
            );

            return $user;
        });

        return ApiResponse::success(
            'Agency admin user status updated.',
            (new UserResource($user->load(['agency', 'roles'])))->resolve($request),
        );
    }

    private function agencyAdminRole(): Role
    {
        return Role::query()->firstOrCreate(
            ['slug' => 'agency_admin'],
            [
                'name' => 'Agency Admin',
                'display_name' => 'Agency Admin',
                'description' => 'Agency-level administrator for research uploads and access requests.',
                'is_system' => true,
                'is_active' => true,
            ],
        );
    }

    private function activeAgencyRule(): Exists
    {
        return Rule::exists('agencies', 'id')
            ->whereNull('deleted_at')
            ->whereNull('archived_at')
            ->where('status', 'active');
    }

    /**
     * @return array{0: string|null, 1: string|null}
     */
    private function splitName(string $fullName): array
    {
        $parts = preg_split('/\s+/', trim($fullName)) ?: [];

        return [
            $parts[0] ?? null,
            count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : null,
        ];
    }

    private function abortUnlessAgencyAdmin(User $user): void
    {
        abort_unless($user->isAgencyAdmin() && $user->archived_at === null, 404);
    }
}
