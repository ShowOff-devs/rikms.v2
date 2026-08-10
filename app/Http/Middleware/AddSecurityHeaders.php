<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $nonce = Str::random(40);
        Vite::useCspNonce($nonce);

        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', (string) config('security_headers.referrer_policy'));
        $response->headers->set('Permissions-Policy', (string) config('security_headers.permissions_policy'));
        $response->headers->set('X-Frame-Options', (string) config('security_headers.frame_options'));

        $mode = (string) config('security_headers.csp.mode', 'off');
        $response->headers->remove('Content-Security-Policy');
        $response->headers->remove('Content-Security-Policy-Report-Only');

        if (in_array($mode, ['report-only', 'enforce'], true)) {
            $header = $mode === 'enforce'
                ? 'Content-Security-Policy'
                : 'Content-Security-Policy-Report-Only';

            $response->headers->set($header, $this->contentSecurityPolicy($nonce));
        }

        if (config('app.env') === 'production' && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', (string) config('security_headers.hsts.value'));
        }

        return $response;
    }

    private function contentSecurityPolicy(string $nonce): string
    {
        $directives = config('security_headers.csp.directives', []);
        $directives['script-src'][] = "'nonce-{$nonce}'";
        $directives['style-src-elem'][] = "'nonce-{$nonce}'";

        $reportUri = trim((string) config('security_headers.csp.report_uri'));

        if ($reportUri !== '') {
            $directives['report-uri'] = [$reportUri];
        }

        return collect($directives)
            ->map(fn (array $sources, string $directive): string => $directive.' '.implode(' ', $sources))
            ->implode('; ');
    }
}
