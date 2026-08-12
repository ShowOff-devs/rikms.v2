<?php

namespace App\Providers;

use App\Contracts\MalwareScanner;
use App\Models\User;
use App\Services\MalwareScanner\ClamAvMalwareScanner;
use App\Services\MalwareScanner\FakeMalwareScanner;
use App\Services\MalwareScanner\NullMalwareScanner;
use App\Support\SecurityEventLogger;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(MalwareScanner::class, function () {
            return match ((string) config('rikms.uploads.malware_scanner', 'none')) {
                'none' => new NullMalwareScanner,
                'clamav' => new ClamAvMalwareScanner,
                'fake' => app()->environment('testing')
                    ? new FakeMalwareScanner
                    : throw new RuntimeException('The fake malware scanner is restricted to testing.'),
                default => throw new RuntimeException('Unsupported MALWARE_SCANNER configuration.'),
            };
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->enforceProductionSecurityConfiguration();
        $this->configureAuthenticationEventLogging();
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        $this->configureRateLimiters();

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }

    protected function enforceProductionSecurityConfiguration(): void
    {
        if (! app()->environment(['local', 'testing', 'pilot', 'staging', 'production'])
            && config('rikms.public_access_requests.captcha.enabled') !== true) {
            throw new RuntimeException('Unsafe environment configuration: CAPTCHA may be disabled only in local or testing.');
        }

        if (! app()->environment(['pilot', 'staging', 'production'])) {
            return;
        }

        $violations = [];

        if (config('app.debug')) {
            $violations[] = 'APP_DEBUG must be false';
        }

        if (! config('session.encrypt')) {
            $violations[] = 'SESSION_ENCRYPT must be true';
        }

        if (config('session.secure') !== true) {
            $violations[] = 'SESSION_SECURE_COOKIE must be true';
        }

        if (! str_starts_with((string) config('app.url'), 'https://')) {
            $violations[] = 'APP_URL must use HTTPS';
        }

        if (! in_array((string) config('rikms.security.log_level'), ['warning', 'error', 'critical'], true)) {
            $violations[] = 'LOG_LEVEL must be warning, error, or critical';
        }

        $cspMode = (string) config('security_headers.csp.mode');

        if (app()->environment(['pilot', 'staging']) && $cspMode !== 'report-only') {
            $violations[] = 'CSP_MODE must be report-only in pilot and staging';
        }

        if (app()->environment('production') && $cspMode !== 'enforce') {
            $violations[] = 'CSP_MODE must be enforce in production';
        }

        if (app()->environment('production') && config('security_headers.csp.production_validated') !== true) {
            $violations[] = 'CSP_PRODUCTION_VALIDATED must be true before production enforcement';
        }

        $cspReportUri = trim((string) config('security_headers.csp.report_uri'));

        if ($cspReportUri === '') {
            $violations[] = 'CSP_REPORT_URI must be configured';
        }

        if (str_starts_with($cspReportUri, '/api/security/csp-reports')
            && config('security_headers.csp.collector.enabled') !== true) {
            $violations[] = 'CSP_REPORT_COLLECTOR_ENABLED must be true for the internal report URI';
        }

        if (! config('rikms.security.force_super_admin_mfa')) {
            $violations[] = 'RIKMS_FORCE_SUPER_ADMIN_MFA must be true';
        }

        if (config('rikms.dev_seed_accounts.enabled') || config('rikms.security.dev_seed_accounts_requested')) {
            $violations[] = 'RIKMS_ALLOW_DEV_SEED_ACCOUNTS must be false';
        }

        if (config('trustedproxy.hosts', []) === []) {
            $violations[] = 'TRUSTED_HOSTS must be configured';
        }

        if (config('queue.default') === 'sync') {
            $violations[] = 'QUEUE_CONNECTION must not be sync';
        }

        if (config('queue.default') !== 'database') {
            $violations[] = 'QUEUE_CONNECTION must be database for the pilot runtime';
        }

        if (config('rikms.uploads.malware_scanner') !== 'clamav') {
            $violations[] = 'MALWARE_SCANNER must be clamav';
        }

        if (trim((string) config('rikms.uploads.clamav_host')) === '') {
            $violations[] = 'CLAMAV_HOST must be configured';
        }

        $clamavPort = (int) config('rikms.uploads.clamav_port');

        if ($clamavPort < 1 || $clamavPort > 65535) {
            $violations[] = 'CLAMAV_PORT must be between 1 and 65535';
        }

        if ((float) config('rikms.uploads.clamav_timeout_seconds') <= 0) {
            $violations[] = 'CLAMAV_TIMEOUT_SECONDS must be greater than zero';
        }

        if ((int) config('rikms.uploads.clamav_stream_max_length_mb') <= 0) {
            $violations[] = 'CLAMAV_STREAM_MAX_LENGTH_MB must be greater than zero';
        }

        $quarantineDisk = (string) config('rikms.uploads.quarantine_disk');
        $storageDisk = (string) config('rikms.uploads.storage_disk');

        if ($quarantineDisk === $storageDisk) {
            $violations[] = 'UPLOAD_QUARANTINE_DISK and UPLOAD_STORAGE_DISK must be separate';
        }

        foreach ([$quarantineDisk, $storageDisk] as $uploadDisk) {
            $diskConfig = config("filesystems.disks.{$uploadDisk}");

            if (! is_array($diskConfig)) {
                $violations[] = "Upload disk [{$uploadDisk}] must be configured";

                continue;
            }

            if ($uploadDisk === 'public' || ($diskConfig['visibility'] ?? null) === 'public') {
                $violations[] = "Upload disk [{$uploadDisk}] must not be public";
            }

            if (($diskConfig['driver'] ?? null) === 'local' && ($diskConfig['serve'] ?? false) === true) {
                $violations[] = "Local upload disk [{$uploadDisk}] must disable file serving";
            }

            if (($diskConfig['driver'] ?? null) === 'local') {
                $root = str_replace('\\', '/', rtrim((string) ($diskConfig['root'] ?? ''), '\\/'));
                $publicRoot = str_replace('\\', '/', rtrim(public_path(), '\\/'));

                if ($root === '' || $root === $publicRoot || str_starts_with($root, $publicRoot.'/')) {
                    $violations[] = "Local upload disk [{$uploadDisk}] must be outside the public directory";
                }
            }
        }

        $captchaEnabled = config('rikms.public_access_requests.captcha.enabled') === true;
        $frontendCaptchaEnabled = config('rikms.public_access_requests.captcha.frontend_enabled') === true;

        if (! $captchaEnabled) {
            $violations[] = 'PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED must be true';
        }

        if ($frontendCaptchaEnabled !== $captchaEnabled) {
            $violations[] = 'VITE_PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED must match PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED';
        }

        if (config('rikms.public_access_requests.captcha.provider') !== 'turnstile') {
            $violations[] = 'CAPTCHA_PROVIDER must be turnstile';
        }

        if (trim((string) config('rikms.public_access_requests.captcha.site_key')) === '') {
            $violations[] = 'VITE_CAPTCHA_SITE_KEY must be configured';
        }

        if (trim((string) config('rikms.public_access_requests.captcha.secret_key')) === '') {
            $violations[] = 'CAPTCHA_SECRET_KEY must be configured';
        }

        if ((float) config('rikms.public_access_requests.captcha.timeout_seconds') <= 0) {
            $violations[] = 'CAPTCHA_VERIFY_TIMEOUT_SECONDS must be greater than zero';
        }

        $captchaHostnames = config('rikms.public_access_requests.captcha.allowed_hostnames', []);

        if (! is_array($captchaHostnames) || $captchaHostnames === []) {
            $violations[] = 'CAPTCHA_ALLOWED_HOSTNAMES must contain at least one hostname';
        } else {
            foreach ($captchaHostnames as $captchaHostname) {
                if (! is_string($captchaHostname)
                    || filter_var($captchaHostname, FILTER_VALIDATE_DOMAIN, FILTER_FLAG_HOSTNAME) === false) {
                    $violations[] = 'CAPTCHA_ALLOWED_HOSTNAMES must contain only valid hostnames';
                    break;
                }
            }
        }

        if (config('monitoring.alerts_enabled')) {
            $alertEmails = config('monitoring.alert_emails', []);
            $validAlertEmails = is_array($alertEmails)
                && $alertEmails !== []
                && collect($alertEmails)->every(fn (mixed $email): bool => is_string($email)
                    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false);
            $alertWebhook = trim((string) config('monitoring.alert_webhook_url'));
            $validAlertWebhook = $alertWebhook !== ''
                && filter_var($alertWebhook, FILTER_VALIDATE_URL) !== false
                && str_starts_with($alertWebhook, 'https://');

            if (! $validAlertEmails && ! $validAlertWebhook) {
                $violations[] = 'Monitoring alerts require a valid email recipient or HTTPS webhook';
            }

            if ((float) config('monitoring.alert_timeout_seconds') <= 0) {
                $violations[] = 'MONITORING_ALERT_TIMEOUT_SECONDS must be greater than zero';
            }

            if ((int) config('monitoring.alert_cooldown_minutes') <= 0) {
                $violations[] = 'MONITORING_ALERT_COOLDOWN_MINUTES must be greater than zero';
            }
        }

        if (config('rikms.dev_seed_accounts.allow_outside_safe_environments')) {
            $violations[] = 'RIKMS_ALLOW_DEV_SEED_ACCOUNTS must be false';
        }

        if ($violations !== []) {
            throw new RuntimeException('Unsafe production configuration: '.implode('; ', $violations).'.');
        }
    }

    protected function configureRateLimiters(): void
    {
        RateLimiter::for('public-api', fn (Request $request): Limit => Limit::perMinute(
            max(1, (int) config('rikms.security.public_api_per_minute', 60)),
        )->by('public-api:'.hash('sha256', (string) $request->ip())));

        RateLimiter::for('public-downloads', fn (Request $request): Limit => Limit::perMinute(
            max(1, (int) config('rikms.security.public_downloads_per_minute', 20)),
        )->by('public-downloads:'.hash('sha256', (string) $request->ip())));

        RateLimiter::for('approved-access', function (Request $request): array {
            $limit = max(1, (int) config('rikms.security.approved_access_per_minute', 10));
            $ip = hash('sha256', (string) $request->ip());
            $token = hash('sha256', (string) $request->route('token'));

            return [
                Limit::perMinute($limit)->by('approved-access:ip:'.$ip),
                Limit::perMinute($limit)->by('approved-access:token:'.$ip.':'.$token),
            ];
        });

        RateLimiter::for('csp-reports', fn (Request $request): Limit => Limit::perMinute(
            max(1, (int) config('security_headers.csp.collector.rate_limit_per_minute', 120)),
        )->by('csp-report:'.hash('sha256', (string) $request->ip())));

        RateLimiter::for('public-access-requests', function (Request $request): array {
            $ipKey = hash('sha256', (string) $request->ip());
            $limits = config('rikms.public_access_requests.limits');
            $response = fn (Request $request, array $headers): JsonResponse => response()
                ->json([
                    'message' => 'Too many access requests have been submitted. Please wait before trying again.',
                    'errors' => [],
                ], 429)
                ->withHeaders($headers);

            $configuredLimits = [
                Limit::perMinute((int) ($limits['per_minute'] ?? 5))
                    ->by('public-access-request:ip-minute:'.$ipKey)
                    ->response($response),
                Limit::perHour((int) ($limits['per_hour'] ?? 20))
                    ->by('public-access-request:ip-hour:'.$ipKey)
                    ->response($response),
            ];

            $email = mb_strtolower(trim((string) $request->input('requester_email')));

            if ($email !== '') {
                $configuredLimits[] = Limit::perHour((int) ($limits['email_per_hour'] ?? 3))
                    ->by('public-access-request:email-hour:'.hash('sha256', $email))
                    ->response($response);
            }

            return $configuredLimits;
        });
    }

    protected function configureAuthenticationEventLogging(): void
    {
        Event::listen(Login::class, function (Login $event): void {
            $user = $event->user instanceof User ? $event->user : null;

            SecurityEventLogger::record(request(), 'login.success', $user, 'low', [
                'remember' => $event->remember,
                'guard' => $event->guard,
            ]);
        });

        Event::listen(Failed::class, function (Failed $event): void {
            $email = mb_strtolower(trim((string) ($event->credentials['email'] ?? '')));
            $user = $event->user instanceof User ? $event->user : null;

            SecurityEventLogger::record(request(), 'login.failed', $user, 'medium', [
                'email' => $email,
                'guard' => $event->guard,
            ]);
        });

        Event::listen(Logout::class, function (Logout $event): void {
            $user = $event->user instanceof User ? $event->user : null;

            SecurityEventLogger::record(request(), 'logout', $user, 'low', [
                'guard' => $event->guard,
            ]);
        });
    }
}
