<?php

namespace App\Http\Middleware;

use App\Services\PlatformSettingsService;
use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnforcePlatformMaintenanceMode
{
    public function __construct(private readonly PlatformSettingsService $settings) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->settings->maintenanceEnabled() || $this->isAllowedDuringMaintenance($request)) {
            return $next($request);
        }

        $message = $this->settings->string(
            PlatformSettingsService::MAINTENANCE_NOTICE_TEXT,
            'RIKMS is temporarily unavailable while maintenance is in progress.',
        );

        if ($request->is('api/*') || $request->expectsJson()) {
            return ApiResponse::error($message, [
                'code' => 'PLATFORM_MAINTENANCE',
            ], 503)->withHeaders(['Retry-After' => '300']);
        }

        return response($this->maintenanceHtml($message), 503)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Retry-After', '300');
    }

    private function isAllowedDuringMaintenance(Request $request): bool
    {
        if ($request->is('up')
            || $request->is('favicon.ico')
            || $request->is('favicon.svg')
            || $request->is('robots.txt')
            || $request->is('build/*')
            || $request->is('assets/*')
            || $request->is('storage/*')
            || $request->is('admin/login')
            || $request->is('login')
            || $request->is('logout')
            || $request->is('two-factor-challenge')
            || $request->is('user/two-factor-*')
            || $request->is('settings/two-factor')
            || $request->is('api/admin/platform-settings')
            || $request->is('api/admin/platform-settings/*')
            || $request->is('admin/settings')
            || $request->is('admin/platform-settings')) {
            return true;
        }

        return false;
    }

    private function maintenanceHtml(string $message): string
    {
        $safeMessage = e($message);

        return <<<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>RIKMS Maintenance</title>
    <style>
        body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #111827; }
        main { max-width: 560px; padding: 32px; }
        h1 { margin: 0 0 12px; font-size: 30px; line-height: 1.2; }
        p { margin: 0; color: #475569; font-size: 16px; line-height: 1.6; }
    </style>
</head>
<body>
    <main>
        <h1>RIKMS is under maintenance</h1>
        <p>{$safeMessage}</p>
    </main>
</body>
</html>
HTML;
    }
}
