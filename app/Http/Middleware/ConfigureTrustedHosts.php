<?php

namespace App\Http\Middleware;

use Illuminate\Http\Middleware\TrustHosts;

class ConfigureTrustedHosts extends TrustHosts
{
    /**
     * @return array<int, string>
     */
    public function hosts(): array
    {
        return config('trustedproxy.hosts', []);
    }
}
