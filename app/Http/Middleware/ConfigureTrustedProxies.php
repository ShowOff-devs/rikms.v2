<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;

class ConfigureTrustedProxies extends TrustProxies
{
    protected function proxies(): array|string|null
    {
        return config('trustedproxy.proxies', []);
    }

    protected function headers(): int
    {
        return (int) config(
            'trustedproxy.headers',
            Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_PROTO | Request::HEADER_X_FORWARDED_HOST,
        );
    }
}
