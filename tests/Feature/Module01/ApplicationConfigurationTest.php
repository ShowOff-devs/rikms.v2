<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

test('TEST 01-05 P0: IP-hosted URL and session cookies remain consistent across requests', function () {
    $cookieName = (string) config('session.cookie');

    expect($cookieName)->not->toBe('')
        ->and(config('session.path'))->toBe('/')
        ->and(config('session.domain'))->toBeNull()
        ->and(config('session.secure'))->toBeTrue()
        ->and(config('session.http_only'))->toBeTrue()
        ->and(config('session.same_site'))->toBeIn(['lax', 'strict'])
        ->and(parse_url(URL::to('/api/public/platform-settings'), PHP_URL_HOST))->toBe(parse_url((string) config('app.url'), PHP_URL_HOST))
        ->and(parse_url(URL::to('/api/public/platform-settings'), PHP_URL_SCHEME))->toBe(parse_url((string) config('app.url'), PHP_URL_SCHEME));

    Route::middleware('web')->get('/__module01_session_continuity', function (Request $request) {
        $value = $request->session()->get('module01_qa_nonce');

        if (! is_string($value)) {
            $value = (string) Str::uuid();
            $request->session()->put('module01_qa_nonce', $value);
        }

        return response($value);
    });

    $first = $this->get('/__module01_session_continuity')->assertOk();
    $sessionCookie = collect($first->headers->getCookies())->first(
        fn ($cookie) => $cookie->getName() === $cookieName,
    );

    $cookieAttributesAreSecure = $sessionCookie !== null
        && $sessionCookie->isSecure()
        && $sessionCookie->isHttpOnly()
        && $sessionCookie->getPath() === '/'
        && $sessionCookie->getDomain() === null
        && strtolower((string) $sessionCookie->getSameSite()) === 'lax';
    expect($cookieAttributesAreSecure)->toBeTrue('The test session cookie flags do not match the secure IP-hosted policy.');

    $second = $this->get('/__module01_session_continuity')->assertOk();

    expect($second->getContent())->toBe($first->getContent());

    $webMiddleware = app('router')->getMiddlewareGroups()['web'] ?? [];
    expect(collect($webMiddleware)->contains(fn ($middleware) => str_ends_with(
        is_string($middleware) ? $middleware : $middleware::class,
        'ValidateCsrfToken',
    )))->toBeTrue();
})->group('module01', 'module01-app');
