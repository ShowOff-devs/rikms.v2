<?php

namespace App\Support;

use App\Models\Research;
use App\Models\ResearchAnalyticsEvent;
use App\Models\ResearchFile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class ResearchAnalyticsTracker
{
    public static function recordView(Request $request, Research $research, string $source): void
    {
        self::record($request, $research, 'view', $source);
    }

    public static function recordDownload(Request $request, Research $research, ?ResearchFile $file = null, string $source = 'public'): void
    {
        self::record($request, $research, 'download', $source, $file);
    }

    private static function record(Request $request, Research $research, string $eventType, string $source, ?ResearchFile $file = null): void
    {
        try {
            ResearchAnalyticsEvent::create([
                'research_id' => $research->id,
                'agency_id' => $research->agency_id,
                'user_id' => $request->user()?->id,
                'research_file_id' => $file?->id,
                'event_type' => $eventType,
                'source' => $source,
                'session_hash' => self::sessionHash($request),
                'ip_hash' => self::hashValue($request->ip()),
                'metadata' => [
                    'user_agent' => str($request->userAgent() ?? '')->limit(255)->toString(),
                ],
                'occurred_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Research analytics event write failed.', [
                'research_id' => $research->id,
                'event_type' => $eventType,
                'source' => $source,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private static function sessionHash(Request $request): ?string
    {
        if (! $request->hasSession()) {
            return null;
        }

        return self::hashValue($request->session()->getId());
    }

    private static function hashValue(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        return hash_hmac('sha256', $value, (string) config('app.key'));
    }
}
