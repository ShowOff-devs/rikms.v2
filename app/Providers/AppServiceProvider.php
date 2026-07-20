<?php

namespace App\Providers;

use App\Models\User;
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
        //
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
        if (! app()->isProduction()) {
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

        if (config('rikms.public_access_requests.enabled') && ! config('rikms.public_access_requests.captcha.enabled')) {
            $violations[] = 'PUBLIC_ACCESS_REQUEST_CAPTCHA_ENABLED must be true while public access requests are enabled';
        }

        if (config('rikms.public_access_requests.enabled') && config('rikms.public_access_requests.captcha.enabled') && ! config('rikms.public_access_requests.captcha.secret_key')) {
            $violations[] = 'CAPTCHA_SECRET_KEY must be set while public access request CAPTCHA is enabled';
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
