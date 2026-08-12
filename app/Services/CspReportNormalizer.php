<?php

namespace App\Services;

class CspReportNormalizer
{
    /** @return array<string, int|string|null> */
    public function normalize(array $report, ?string $userAgent): array
    {
        $documentUri = $this->sanitizeUrl($this->value($report, 'document-uri', 'documentURL', 'documentUrl'), true);
        $blockedUri = $this->sanitizeUrl($this->value($report, 'blocked-uri', 'blockedURL', 'blockedUrl'), false);
        $sourceFile = $this->sanitizeUrl($this->value($report, 'source-file', 'sourceFile'), true, true);
        $effectiveDirective = $this->token($this->value($report, 'effective-directive', 'effectiveDirective'), 100) ?: 'unknown';
        $violatedDirective = $this->token($this->value($report, 'violated-directive', 'violatedDirective'), 255, true);
        $originalPolicy = $this->value($report, 'original-policy', 'originalPolicy');

        $normalized = [
            'document_uri' => $documentUri ?: '[unknown]',
            'blocked_uri' => $blockedUri ?: '[unknown]',
            'effective_directive' => $effectiveDirective,
            'violated_directive' => $violatedDirective,
            'source_file' => $sourceFile,
            'line_number' => $this->integer($this->value($report, 'line-number', 'lineNumber')),
            'column_number' => $this->integer($this->value($report, 'column-number', 'columnNumber')),
            'status_code' => $this->integer($this->value($report, 'status-code', 'statusCode'), 999),
            'disposition' => $this->token($this->value($report, 'disposition'), 20, true),
            'browser' => $this->browser($userAgent),
            'policy_hash' => is_string($originalPolicy) && $originalPolicy !== '' ? hash('sha256', $originalPolicy) : null,
        ];

        $normalized['fingerprint'] = hash('sha256', json_encode($normalized, JSON_THROW_ON_ERROR));

        return $normalized;
    }

    private function value(array $report, string ...$keys): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $report)) {
                return $report[$key];
            }
        }

        return null;
    }

    private function sanitizeUrl(mixed $value, bool $includePath, bool $nullable = false): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return $nullable ? null : '[unknown]';
        }

        $value = trim($value);
        $special = ['inline', 'eval', 'self', 'data', 'blob', 'about', 'wasm-eval'];

        if (in_array(mb_strtolower($value), $special, true)) {
            return mb_strtolower($value);
        }

        $parts = parse_url(mb_substr($value, 0, 4096));

        if (! is_array($parts) || ! isset($parts['scheme'], $parts['host'])) {
            return '[invalid-url]';
        }

        $scheme = mb_strtolower((string) $parts['scheme']);

        if (! in_array($scheme, ['http', 'https'], true)) {
            return '['.$scheme.']';
        }

        $origin = $scheme.'://'.mb_strtolower((string) $parts['host']);

        if (isset($parts['port'])) {
            $origin .= ':'.(int) $parts['port'];
        }

        if (! $includePath) {
            return mb_substr($origin, 0, 1024);
        }

        $path = isset($parts['path']) ? '/'.ltrim((string) $parts['path'], '/') : '/';

        return mb_substr($origin.$path, 0, 2048);
    }

    private function token(mixed $value, int $maxLength, bool $nullable = false): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return $nullable ? null : '';
        }

        return mb_substr(preg_replace('/[^a-zA-Z0-9_\- ;:\/\.]/', '', trim($value)) ?? '', 0, $maxLength);
    }

    private function integer(mixed $value, int $maximum = 4294967295): ?int
    {
        if (! is_numeric($value)) {
            return null;
        }

        return min($maximum, max(0, (int) $value));
    }

    private function browser(?string $userAgent): string
    {
        return match (true) {
            str_contains((string) $userAgent, 'Edg/') => 'Edge',
            str_contains((string) $userAgent, 'Firefox/') => 'Firefox',
            str_contains((string) $userAgent, 'Chrome/'), str_contains((string) $userAgent, 'Chromium/') => 'Chrome',
            str_contains((string) $userAgent, 'Safari/') => 'Safari',
            default => 'Other',
        };
    }
}
