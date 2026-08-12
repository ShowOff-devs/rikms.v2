<?php

namespace App\Http\Controllers;

use App\Models\AccessRequest;
use App\Models\ResearchFile;
use App\Support\AuditLogger;
use App\Support\ResearchAnalyticsTracker;
use App\Support\Statuses;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ApprovedAccessController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        [$accessRequest, $state, $file] = $this->resolve($token);

        if (! $accessRequest || $state !== 'valid' || ! $file) {
            $this->auditFailure($request, $accessRequest, $token, $state);

            return Inertia::render('approved-access', [
                'state' => $state,
            ])->toResponse($request)->setStatusCode(403);
        }

        AuditLogger::record($request, 'access_request.approved_access_viewed', $accessRequest, metadata: [
            'access_request_id' => $accessRequest->id,
            'research_id' => $accessRequest->research_id,
            'agency_id' => $accessRequest->agency_id,
            'token_fingerprint' => hash('sha256', $token),
        ]);

        return Inertia::render('approved-access', [
            'state' => 'valid',
            'researchTitle' => $accessRequest->research->title,
            'agencyName' => $accessRequest->research->agency?->short_name
                ?: $accessRequest->research->agency?->name
                ?: 'Responsible agency',
            'expiresAt' => $accessRequest->access_expires_at?->toISOString(),
            'downloadUrl' => route('approved-access.download', ['token' => $token]),
        ])->toResponse($request);
    }

    public function download(Request $request, string $token): Response
    {
        [$accessRequest, $state, $file] = $this->resolve($token);

        if (! $accessRequest || $state !== 'valid' || ! $file) {
            $this->auditFailure($request, $accessRequest, $token, $state);

            abort(403, 'This access link is invalid or no longer available.');
        }

        $accessRequest->forceFill(['access_token_last_used_at' => now()])->save();
        $accessRequest->research->increment('downloads');
        ResearchAnalyticsTracker::recordDownload($request, $accessRequest->research, $file, 'approved_access');

        AuditLogger::record($request, 'access_request.approved_file_downloaded', $accessRequest, metadata: [
            'access_request_id' => $accessRequest->id,
            'research_id' => $accessRequest->research_id,
            'file_id' => $file->id,
            'agency_id' => $accessRequest->agency_id,
            'requester_email' => $this->maskedEmail((string) $accessRequest->requester_email),
            'token_fingerprint' => hash('sha256', $token),
            'result' => 'success',
        ]);

        return Storage::disk($file->disk)->download($file->path, $file->original_name);
    }

    /**
     * @return array{0: AccessRequest|null, 1: string, 2: ResearchFile|null}
     */
    private function resolve(string $token): array
    {
        if (! preg_match('/^[A-Za-z0-9]{64}$/', $token)) {
            return [null, 'invalid', null];
        }

        $accessRequest = AccessRequest::query()
            ->with(['research.agency'])
            ->where('access_token_hash', hash('sha256', $token))
            ->first();

        if (! $accessRequest || ! filter_var($accessRequest->requester_email, FILTER_VALIDATE_EMAIL)) {
            return [$accessRequest, 'invalid', null];
        }

        if ($accessRequest->access_revoked_at || $accessRequest->archived_at) {
            return [$accessRequest, 'revoked', null];
        }

        if ($accessRequest->status !== Statuses::ACCESS_REQUEST_APPROVED) {
            return [$accessRequest, 'invalid', null];
        }

        if ($accessRequest->access_expires_at?->isPast()) {
            return [$accessRequest, 'expired', null];
        }

        $research = $accessRequest->research;

        if (! $research
            || $research->status !== Statuses::RESEARCH_PUBLISHED
            || $research->archived_at
            || $research->superseded_by_id) {
            return [$accessRequest, 'invalid', null];
        }

        $file = $research->files()
            ->whereNull('archived_at')
            ->where('status', 'active')
            ->where(function ($query): void {
                $query->where('mime_type', 'application/pdf')->orWhere('extension', 'pdf');
            })
            ->orderByDesc('uploaded_at')
            ->orderByDesc('id')
            ->first();

        if (! $file || ! Storage::disk($file->disk)->exists($file->path)) {
            return [$accessRequest, 'invalid', null];
        }

        return [$accessRequest, 'valid', $file];
    }

    private function auditFailure(Request $request, ?AccessRequest $accessRequest, string $token, string $state): void
    {
        AuditLogger::record($request, 'access_request.approved_access_denied', $accessRequest, metadata: [
            'access_request_id' => $accessRequest?->id,
            'research_id' => $accessRequest?->research_id,
            'agency_id' => $accessRequest?->agency_id,
            'token_fingerprint' => hash('sha256', $token),
            'result' => $state,
        ]);
    }

    private function maskedEmail(string $email): ?string
    {
        if (! str_contains($email, '@')) {
            return null;
        }

        [$local, $domain] = explode('@', $email, 2);

        return mb_substr($local, 0, 1).'***@'.$domain;
    }
}
