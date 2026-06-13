<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request): RedirectResponse
    {
        $user = $request->user();
        $oldValues = $user->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']);

        DB::transaction(function () use ($request, $user, $oldValues): void {
            $user->forceFill([
                'status' => Statuses::USER_ARCHIVED,
                'archived_at' => now(),
                'archived_by' => $user->id,
                'archive_reason' => 'Self-service account deletion.',
                'restored_at' => null,
                'restored_by' => null,
            ])->save();

            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }

            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $user->id)->delete();
            }

            $user->delete();

            $deletedUser = User::withTrashed()->find($user->id);

            AuditLogger::record(
                $request,
                'user.account_deleted',
                $user,
                $oldValues,
                $deletedUser?->only(['agency_id', 'role', 'status', 'archived_at', 'archived_by', 'archive_reason', 'deleted_at']),
                [
                    'user_id' => $user->id,
                    'agency_id' => $user->agency_id,
                    'performed_by' => $user->id,
                    'reason' => 'self_service',
                    'timestamp' => now()->toISOString(),
                ],
            );
        });

        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
