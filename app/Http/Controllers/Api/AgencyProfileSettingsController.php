<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Research;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;

class AgencyProfileSettingsController extends Controller
{
    public function profile(Request $request): JsonResponse
    {
        return ApiResponse::success('Agency profile retrieved.', $this->profilePayload($request));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $agency = $request->user()->agency;

        $validated = $request->validate([
            'agencyName' => ['required', 'string', 'max:255'],
            'agencyShortName' => ['required', 'string', 'max:255'],
            'agencyDescription' => ['required', 'string', 'max:1000'],
            'agencyWebsite' => ['required', 'url', 'max:255'],
            'agencyContactEmail' => ['required', 'email', 'max:255'],
            'agencyOfficeAddress' => ['required', 'string', 'max:1000'],
            'logoUrl' => ['nullable', 'string', 'max:2048'],
        ]);

        $oldValues = $agency->only(['name', 'short_name', 'description', 'website', 'email', 'address', 'logo_path']);

        $agency->update([
            'name' => $validated['agencyName'],
            'short_name' => $validated['agencyShortName'],
            'description' => $validated['agencyDescription'],
            'website' => $validated['agencyWebsite'],
            'email' => $validated['agencyContactEmail'],
            'address' => $validated['agencyOfficeAddress'],
            'logo_path' => $validated['logoUrl'] ?? $agency->logo_path,
        ]);

        AuditLogger::record(
            $request,
            'agency.profile.updated',
            $agency,
            $oldValues,
            $agency->fresh()->only(array_keys($oldValues)),
        );

        return ApiResponse::success('Agency profile updated.', $this->profilePayload($request));
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => ['required', 'file', 'mimes:png,jpg,jpeg,svg', 'max:5120'],
        ]);

        $path = $validated['logo']->store('agency-logos', 'public');
        $request->user()->agency->update(['logo_path' => Storage::disk('public')->url($path)]);

        return ApiResponse::success('Agency logo uploaded.', [
            'logoUrl' => Storage::disk('public')->url($path),
            'fileName' => $validated['logo']->getClientOriginalName(),
            'uploadedAt' => now()->toISOString(),
        ], [], 201);
    }

    public function removeLogo(Request $request): JsonResponse
    {
        $request->user()->agency->update(['logo_path' => null]);

        return ApiResponse::success('Agency logo removed.', ['success' => true]);
    }

    public function settings(Request $request): JsonResponse
    {
        return ApiResponse::success('Agency settings retrieved.', $this->settingsPayload($request));
    }

    public function updateAccount(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fullName' => ['required', 'string', 'max:255'],
            'emailAddress' => ['required', 'email', 'max:255', 'unique:users,email,'.$request->user()->id],
        ]);

        $user = $request->user();
        $oldValues = $user->only(['name', 'email']);

        $user->update([
            'name' => $validated['fullName'],
            'email' => $validated['emailAddress'],
        ]);

        AuditLogger::record($request, 'agency.account.updated', $user, $oldValues, $user->fresh()->only(array_keys($oldValues)));

        return ApiResponse::success('Agency account settings updated.', $this->settingsPayload($request)['account']);
    }

    public function updateNotifications(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'notifyNewAccessRequests' => ['required', 'boolean'],
            'notifyRequestApprovalsDenials' => ['required', 'boolean'],
            'notifyNewResearchUploads' => ['required', 'boolean'],
            'browserNotifications' => ['required', 'boolean'],
            'weeklyDigest' => ['required', 'boolean'],
            'monthlyAnalyticsReport' => ['required', 'boolean'],
        ]);

        $request->user()->update(['notification_preferences' => $validated]);

        return ApiResponse::success('Agency notification settings updated.', $validated);
    }

    public function updateSecurity(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'twoFactorEnabled' => ['required', 'boolean'],
            'sessionTimeout' => ['nullable', 'integer', 'min:5', 'max:240'],
        ]);

        $request->user()->update([
            'security_preferences' => [
                'twoFactorEnabled' => $validated['twoFactorEnabled'],
                'sessionTimeout' => $validated['sessionTimeout'] ?? 30,
            ],
        ]);

        return ApiResponse::success('Agency security settings updated.', $this->settingsPayload($request)['security']);
    }

    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'file', 'mimes:png,jpg,jpeg,svg', 'max:5120'],
        ]);

        $path = $validated['photo']->store('profile-photos', 'public');
        $request->user()->update(['profile_photo_path' => Storage::disk('public')->url($path)]);

        return ApiResponse::success('Profile photo uploaded.', [
            'profilePhotoUrl' => Storage::disk('public')->url($path),
            'fileName' => $validated['photo']->getClientOriginalName(),
            'uploadedAt' => now()->toISOString(),
        ], [], 201);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'currentPassword' => ['required', 'current_password:web'],
            'newPassword' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['newPassword']),
        ]);

        return ApiResponse::success('Agency account password changed.', [
            'success' => true,
            'changedAt' => now()->toISOString(),
        ]);
    }

    public function requestDeactivation(Request $request): JsonResponse
    {
        $request->user()->update(['deactivation_requested_at' => now()]);

        return ApiResponse::success('Agency account deactivation requested.', [
            'status' => 'submitted',
            'requestedAt' => $request->user()->fresh()->deactivation_requested_at?->toISOString(),
        ]);
    }

    private function profilePayload(Request $request): array
    {
        $agency = $request->user()->agency;

        return [
            'id' => (string) $agency->id,
            'name' => $agency->name,
            'shortName' => $agency->short_name ?: $agency->name,
            'description' => $agency->description ?: '',
            'website' => $agency->website ?: '',
            'contactEmail' => $agency->email ?: '',
            'officeAddress' => $agency->address ?: '',
            'logoUrl' => $agency->logo_path ?: null,
            'slug' => $agency->slug,
            'researchSummary' => $this->researchSummary($request),
            'updatedAt' => $agency->updated_at?->toISOString(),
        ];
    }

    private function settingsPayload(Request $request): array
    {
        $user = $request->user()->loadMissing('agency');
        $notifications = array_merge($this->defaultNotificationPreferences(), $user->notification_preferences ?? []);
        $security = array_merge($this->defaultSecurityPreferences($user), $user->security_preferences ?? []);

        return [
            'account' => [
                'fullName' => $user->name,
                'emailAddress' => $user->email,
                'role' => $user->role,
                'agency' => $user->agency?->short_name ?? $user->agency?->name ?? '',
                'profilePhotoUrl' => $user->profile_photo_path,
            ],
            'notifications' => $notifications,
            'security' => [
                'twoFactorEnabled' => (bool) $security['twoFactorEnabled'],
                'sessionTimeout' => (int) $security['sessionTimeout'],
                'activeSessions' => $this->activeSessions($request),
            ],
        ];
    }

    private function researchSummary(Request $request): array
    {
        $query = Research::query()
            ->where('agency_id', $request->user()->agency_id)
            ->whereNull('archived_at');

        return [
            'totalResearchPublications' => (clone $query)->count(),
            'publishedResearch' => (clone $query)->where('status', Statuses::RESEARCH_PUBLISHED)->count(),
            'draftResearch' => (clone $query)->where('status', Statuses::RESEARCH_DRAFT)->count(),
        ];
    }

    private function activeSessions(Request $request): array
    {
        $sessions = config('session.driver') === 'database'
            ? \DB::table(config('session.table', 'sessions'))
                ->where('user_id', $request->user()->id)
                ->orderByDesc('last_activity')
                ->get()
            : collect();

        return $sessions->map(fn ($session): array => [
            'id' => (string) $session->id,
            'device' => 'Browser session',
            'browser' => $this->browserFromUserAgent((string) $session->user_agent),
            'operatingSystem' => $this->operatingSystemFromUserAgent((string) $session->user_agent),
            'location' => $session->ip_address ?: 'Unknown location',
            'isCurrent' => (string) $session->id === $request->session()->getId(),
            'status' => 'active',
        ])->values()->all();
    }

    private function defaultNotificationPreferences(): array
    {
        return [
            'notifyNewAccessRequests' => true,
            'notifyRequestApprovalsDenials' => true,
            'notifyNewResearchUploads' => true,
            'browserNotifications' => false,
            'weeklyDigest' => true,
            'monthlyAnalyticsReport' => true,
        ];
    }

    private function defaultSecurityPreferences($user): array
    {
        return [
            'twoFactorEnabled' => $user->two_factor_confirmed_at !== null,
            'sessionTimeout' => 30,
        ];
    }

    private function browserFromUserAgent(string $userAgent): string
    {
        return str($userAgent)->contains('Firefox') ? 'Firefox'
            : (str($userAgent)->contains('Edg') ? 'Microsoft Edge'
            : (str($userAgent)->contains('Chrome') ? 'Chrome'
            : (str($userAgent)->contains('Safari') ? 'Safari' : 'Unknown browser')));
    }

    private function operatingSystemFromUserAgent(string $userAgent): string
    {
        return str($userAgent)->contains('Windows') ? 'Windows'
            : (str($userAgent)->contains('Mac OS') ? 'macOS'
            : (str($userAgent)->contains('Linux') ? 'Linux'
            : (str($userAgent)->contains('Android') ? 'Android'
            : (str($userAgent)->contains('iPhone') || str($userAgent)->contains('iPad') ? 'iOS' : 'Unknown OS'))));
    }
}
