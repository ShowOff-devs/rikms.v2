<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Agency;
use App\Models\Research;
use App\Support\ApiResponse;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Throwable;

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
        ]);

        $oldValues = $agency->only(['name', 'short_name', 'description', 'website', 'email', 'address', 'logo_path']);

        $agency->update([
            'name' => $validated['agencyName'],
            'short_name' => $validated['agencyShortName'],
            'description' => $validated['agencyDescription'],
            'website' => $validated['agencyWebsite'],
            'email' => $validated['agencyContactEmail'],
            'address' => $validated['agencyOfficeAddress'],
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
            'logo' => ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'],
        ]);

        $agency = $request->user()->agency;
        $oldLogoPath = $agency->logo_path;
        $path = $validated['logo']->store("agency-logos/{$agency->id}", 'public');

        if (! is_string($path) || $path === '') {
            return ApiResponse::error('Unable to store agency logo.', [
                'logo' => ['The logo could not be saved. Please try again.'],
            ], 500);
        }

        try {
            DB::transaction(function () use ($agency, $oldLogoPath, $path, $request, $validated): void {
                $agency->update(['logo_path' => $path]);

                AuditLogger::record(
                    $request,
                    'agency.logo_uploaded',
                    $agency,
                    ['logo_path' => $oldLogoPath],
                    ['logo_path' => $path],
                    [
                        'file_name' => $validated['logo']->getClientOriginalName(),
                        'path' => $path,
                        'size_bytes' => $validated['logo']->getSize(),
                    ],
                );
            });
        } catch (Throwable $exception) {
            Storage::disk('public')->delete($path);

            throw $exception;
        }

        $agency->refresh();
        $this->deletePublicDiskFile($oldLogoPath, ['agency-logos/']);

        return ApiResponse::success('Agency logo uploaded.', [
            ...$this->profilePayloadForAgency($agency, $request),
            'fileName' => $validated['logo']->getClientOriginalName(),
            'uploadedAt' => now()->toISOString(),
        ], [], 201);
    }

    public function removeLogo(Request $request): JsonResponse
    {
        $agency = $request->user()->agency;
        $oldLogoPath = $agency->logo_path;

        DB::transaction(function () use ($agency, $oldLogoPath, $request): void {
            $agency->update(['logo_path' => null]);

            AuditLogger::record(
                $request,
                'agency.logo_removed',
                $agency,
                ['logo_path' => $oldLogoPath],
                ['logo_path' => null],
            );
        });

        $agency->refresh();
        $this->deletePublicDiskFile($oldLogoPath, ['agency-logos/']);

        return ApiResponse::success('Agency logo removed.', [
            ...$this->profilePayloadForAgency($agency, $request),
            'success' => true,
        ]);
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
            'sessionTimeout' => ['nullable', 'integer', 'min:5', 'max:240'],
        ]);

        $oldValues = $request->user()->only(['security_preferences']);

        $request->user()->update([
            'security_preferences' => [
                'sessionTimeout' => $validated['sessionTimeout'] ?? 30,
            ],
        ]);

        AuditLogger::record(
            $request,
            'agency.security_settings.updated',
            $request->user(),
            $oldValues,
            $request->user()->fresh()->only(['security_preferences']),
        );

        return ApiResponse::success('Agency security settings updated.', $this->settingsPayload($request)['security']);
    }

    public function revokeSession(Request $request, string $sessionId): JsonResponse
    {
        if (config('session.driver') !== 'database') {
            return ApiResponse::error('Session revocation requires the database session driver.', [], 409);
        }

        if ($request->hasSession() && $sessionId === $request->session()->getId()) {
            return ApiResponse::error('The current session cannot be revoked from this panel.', [
                'session' => ['Sign out to end your current session.'],
            ], 422);
        }

        $deleted = DB::table(config('session.table', 'sessions'))
            ->where('id', $sessionId)
            ->where('user_id', $request->user()->id)
            ->delete();

        if (! $deleted) {
            return ApiResponse::error('Session was not found.', [], 404);
        }

        AuditLogger::record($request, 'agency_session.revoked', null, null, [
            'session_id' => $sessionId,
        ]);

        return ApiResponse::success('Agency session revoked.', [
            'id' => $sessionId,
            'revokedAt' => now()->toISOString(),
        ]);
    }

    public function uploadProfilePhoto(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'file', 'mimes:png,jpg,jpeg,svg', 'max:5120'],
        ]);

        $user = $request->user();
        $oldPhotoPath = $user->profile_photo_path;
        $path = $validated['photo']->store('profile-photos', 'public');
        $photoUrl = Storage::disk('public')->url($path);

        $user->update(['profile_photo_path' => $photoUrl]);
        $this->deletePublicDiskFile($oldPhotoPath, ['profile-photos/']);

        AuditLogger::record(
            $request,
            'agency.profile_photo_uploaded',
            $user,
            ['profile_photo_path' => $oldPhotoPath],
            ['profile_photo_path' => $photoUrl],
            [
                'file_name' => $validated['photo']->getClientOriginalName(),
                'path' => $path,
                'size_bytes' => $validated['photo']->getSize(),
            ],
        );

        return ApiResponse::success('Profile photo uploaded.', [
            'profilePhotoUrl' => $photoUrl,
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
        if ($request->user()->deactivation_requested_at !== null) {
            return ApiResponse::success('Agency account deactivation request is already pending.', [
                'status' => 'submitted',
                'requestedAt' => $request->user()->deactivation_requested_at?->toISOString(),
            ]);
        }

        $oldValues = $request->user()->only(['deactivation_requested_at']);

        $request->user()->update(['deactivation_requested_at' => now()]);

        AuditLogger::record(
            $request,
            'agency.deactivation_requested',
            $request->user(),
            $oldValues,
            $request->user()->fresh()->only(['deactivation_requested_at']),
        );

        return ApiResponse::success('Agency account deactivation requested.', [
            'status' => 'submitted',
            'requestedAt' => $request->user()->fresh()->deactivation_requested_at?->toISOString(),
        ]);
    }

    private function profilePayload(Request $request): array
    {
        return $this->profilePayloadForAgency($request->user()->agency, $request);
    }

    private function profilePayloadForAgency(Agency $agency, Request $request): array
    {
        return [
            'id' => (string) $agency->id,
            'name' => $agency->name,
            'shortName' => $agency->short_name ?: $agency->name,
            'description' => $agency->description ?: '',
            'website' => $agency->website ?: '',
            'contactEmail' => $agency->email ?: '',
            'officeAddress' => $agency->address ?: '',
            'logoPath' => $agency->logo_path,
            'logoUrl' => $agency->logo_url,
            'logo_path' => $agency->logo_path,
            'logo_url' => $agency->logo_url,
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
                'twoFactorEnabled' => $user->hasEnabledTwoFactorAuthentication(),
                'sessionTimeout' => (int) $security['sessionTimeout'],
                'sessionManagementAvailable' => config('session.driver') === 'database',
                'activeSessions' => $this->activeSessions($request),
                'deactivationRequested' => $user->deactivation_requested_at !== null,
                'deactivationRequestedAt' => $user->deactivation_requested_at?->toISOString(),
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

        $timeout = (int) (($request->user()->security_preferences['sessionTimeout'] ?? null) ?: config('session.lifetime', 120));

        $currentSessionId = $request->hasSession() ? $request->session()->getId() : null;

        return $sessions->map(function ($session) use ($currentSessionId, $timeout): array {
            $lastActivity = now()->setTimestamp((int) $session->last_activity);

            return [
                'id' => (string) $session->id,
                'device' => 'Browser session',
                'browser' => $this->browserFromUserAgent((string) $session->user_agent),
                'operatingSystem' => $this->operatingSystemFromUserAgent((string) $session->user_agent),
                'location' => $session->ip_address ?: 'Unknown location',
                'isCurrent' => $currentSessionId !== null && (string) $session->id === $currentSessionId,
                'status' => $lastActivity->diffInMinutes(now()) > $timeout ? 'expired' : 'active',
            ];
        })->values()->all();
    }

    private function defaultNotificationPreferences(): array
    {
        return [
            'notifyNewAccessRequests' => true,
            'notifyRequestApprovalsDenials' => true,
            'notifyNewResearchUploads' => true,
            'browserNotifications' => false,
            'weeklyDigest' => false,
            'monthlyAnalyticsReport' => false,
        ];
    }

    private function defaultSecurityPreferences($user): array
    {
        return [
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

    /**
     * @param  list<string>  $allowedDirectories
     */
    private function deletePublicDiskFile(?string $storedValue, array $allowedDirectories): void
    {
        if (! $storedValue) {
            return;
        }

        $path = $storedValue;

        if (Str::startsWith($storedValue, ['http://', 'https://', '/storage/'])) {
            $path = parse_url($storedValue, PHP_URL_PATH);

            if (! is_string($path) || ! Str::contains($path, '/storage/')) {
                return;
            }

            $path = ltrim(Str::after($path, '/storage/'), '/');
        }

        $relativePath = ltrim((string) $path, '/');

        if ($relativePath !== '' && Str::startsWith($relativePath, $allowedDirectories)) {
            Storage::disk('public')->delete($relativePath);
        }
    }
}
