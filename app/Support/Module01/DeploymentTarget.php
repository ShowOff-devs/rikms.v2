<?php

namespace App\Support\Module01;

use InvalidArgumentException;

final class DeploymentTarget
{
    private array $cookies = [];

    private array $setCookies = [];

    private function __construct(
        public readonly string $baseUrl,
        public readonly string $ip,
        public readonly string $mode,
        private readonly ?string $caFile,
        private readonly int $timeoutSeconds,
        private readonly int $httpPort,
        private readonly int $httpsPort,
    ) {}

    public static function enabled(): bool
    {
        if (! filter_var(getenv('RIKMS_QA_LIVE_ENABLED') ?: false, FILTER_VALIDATE_BOOL)) {
            return false;
        }

        $arguments = $_SERVER['argv'] ?? [];

        foreach ($arguments as $index => $argument) {
            if ($argument === '--group=module01-live'
                || ($argument === '--group' && ($arguments[$index + 1] ?? null) === 'module01-live')) {
                return true;
            }
        }

        return false;
    }

    public static function fromEnvironment(): self
    {
        $baseUrl = trim((string) getenv('RIKMS_QA_BASE_URL'));
        $mode = strtolower(trim((string) getenv('RIKMS_QA_TRANSPORT_MODE')));
        $parts = parse_url($baseUrl);
        $host = is_array($parts) ? trim((string) ($parts['host'] ?? ''), '[]') : '';

        if (! is_array($parts) || ! in_array($mode, ['https', 'restricted_http'], true)) {
            throw new InvalidArgumentException('RIKMS_QA_BASE_URL and RIKMS_QA_TRANSPORT_MODE are required.');
        }

        if (filter_var($host, FILTER_VALIDATE_IP) === false) {
            throw new InvalidArgumentException('RIKMS_QA_BASE_URL must use the assigned IP address.');
        }

        if (isset($parts['user']) || isset($parts['pass']) || isset($parts['query']) || isset($parts['fragment'])) {
            throw new InvalidArgumentException('RIKMS_QA_BASE_URL cannot contain credentials, a query, or a fragment.');
        }

        if (! in_array($parts['path'] ?? '', ['', '/'], true)) {
            throw new InvalidArgumentException('RIKMS_QA_BASE_URL must target the application root.');
        }

        $expectedScheme = $mode === 'https' ? 'https' : 'http';

        if (strtolower((string) ($parts['scheme'] ?? '')) !== $expectedScheme) {
            throw new InvalidArgumentException("The base URL scheme must match transport mode [{$mode}].");
        }

        $caFile = trim((string) getenv('RIKMS_QA_TLS_CA_FILE'));

        if ($caFile !== '' && ! is_file($caFile)) {
            throw new InvalidArgumentException('RIKMS_QA_TLS_CA_FILE does not identify a readable CA bundle.');
        }

        $baseUrl = rtrim($baseUrl, '/');
        $timeout = filter_var(getenv('RIKMS_QA_TIMEOUT_SECONDS') ?: '8', FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 20],
        ]);
        $basePort = (int) ($parts['port'] ?? ($expectedScheme === 'https' ? 443 : 80));
        $httpPort = self::readPort('RIKMS_QA_HTTP_PORT', $expectedScheme === 'http' ? $basePort : 80);
        $httpsPort = self::readPort('RIKMS_QA_HTTPS_PORT', $expectedScheme === 'https' ? $basePort : 443);

        if (($expectedScheme === 'http' && $httpPort !== $basePort)
            || ($expectedScheme === 'https' && $httpsPort !== $basePort)) {
            throw new InvalidArgumentException('The base URL port must match its configured transport port.');
        }

        return new self($baseUrl, $host, $mode, $caFile === '' ? null : $caFile, $timeout ?: 8, $httpPort, $httpsPort);
    }

    public function urlFor(string $path): string
    {
        return $this->baseUrl.'/'.ltrim($path, '/');
    }

    public function httpUrl(): string
    {
        return 'http://'.$this->formatIp().($this->httpPort === 80 ? '' : ':'.$this->httpPort);
    }

    public function get(string $path): array
    {
        return $this->request($this->urlFor($path));
    }

    /** @return array{response: array, history: array<int, string>, final_url: string, error: ?string} */
    public function getFollowingRedirects(string $url, int $maximum = 6): array
    {
        $visited = [];
        $history = [];

        for ($step = 0; $step <= $maximum; $step++) {
            if (! $this->isSameIpUrl($url)) {
                return ['response' => ['status' => 0], 'history' => $history, 'final_url' => $url, 'error' => 'Redirect left the configured server IP.'];
            }

            if (isset($visited[$url])) {
                return ['response' => ['status' => 0], 'history' => $history, 'final_url' => $url, 'error' => 'Redirect loop detected.'];
            }

            $visited[$url] = true;
            $response = $this->request($url);

            if (isset($response['error'])) {
                return ['response' => $response, 'history' => $history, 'final_url' => $url, 'error' => $response['error']];
            }

            $location = $response['headers']['location'][0] ?? null;

            if (! in_array($response['status'], [301, 302, 303, 307, 308], true) || ! is_string($location)) {
                return ['response' => $response, 'history' => $history, 'final_url' => $url, 'error' => null];
            }

            $next = $this->resolveLocation($url, $location);

            if (str_starts_with(strtolower($url), 'https://') && str_starts_with(strtolower($next), 'http://')) {
                return ['response' => $response, 'history' => $history, 'final_url' => $url, 'error' => 'HTTPS redirect attempted to downgrade to HTTP.'];
            }

            $history[] = $response['status'];
            $url = $next;
        }

        return ['response' => ['status' => 0], 'history' => $history, 'final_url' => $url, 'error' => 'Redirect limit exceeded.'];
    }

    public function request(string $url, string $method = 'GET', string $body = '', array $headers = []): array
    {
        if (! $this->isSameIpUrl($url)) {
            return ['status' => 0, 'headers' => [], 'body' => '', 'error' => 'Refusing a request outside the configured IP address.'];
        }

        $cookieHeader = $this->cookieHeader();

        if ($cookieHeader !== '') {
            $headers[] = 'Cookie: '.$cookieHeader;
        }

        $httpOptions = [
            'method' => strtoupper($method),
            'header' => implode("\r\n", $headers),
            'timeout' => $this->timeoutSeconds,
            'ignore_errors' => true,
            'follow_location' => 0,
            'max_redirects' => 0,
            'protocol_version' => 1.1,
            'connection' => 'close',
        ];

        if ($body !== '') {
            $httpOptions['content'] = $body;
        }

        $sslOptions = [
            'verify_peer' => true,
            'verify_peer_name' => true,
            'allow_self_signed' => false,
            'capture_peer_cert' => true,
            'peer_name' => $this->ip,
        ];

        if ($this->caFile !== null) {
            $sslOptions['cafile'] = $this->caFile;
        }

        $context = stream_context_create(['http' => $httpOptions, 'ssl' => $sslOptions]);
        $stream = @fopen($url, 'rb', false, $context);

        if ($stream === false) {
            return [
                'status' => 0,
                'headers' => [],
                'body' => '',
                'error' => 'Verified HTTP connection failed; review address, policy, and TLS evidence.',
            ];
        }

        $metadata = stream_get_meta_data($stream);
        $rawHeaders = is_array($metadata['wrapper_data'] ?? null) ? $metadata['wrapper_data'] : [];
        $responseHeaders = $this->parseHeaders($rawHeaders);
        $responseBody = stream_get_contents($stream, 524288) ?: '';
        fclose($stream);

        foreach ($responseHeaders['set-cookie'] ?? [] as $setCookie) {
            $this->setCookies[] = $setCookie;
            $pair = trim(explode(';', $setCookie, 2)[0]);
            [$name, $value] = array_pad(explode('=', $pair, 2), 2, '');

            if ($name !== '') {
                $this->cookies[$name] = $value;
            }
        }

        $parameters = stream_context_get_params($context);
        $certificate = $parameters['options']['ssl']['peer_certificate'] ?? null;

        return [
            'status' => $this->statusCode($rawHeaders),
            'headers' => $responseHeaders,
            'body' => $responseBody,
            'certificate' => $certificate !== null ? openssl_x509_parse($certificate) : null,
        ];
    }

    /** @return array<int, string> */
    public function setCookies(): array
    {
        return $this->setCookies;
    }

    public function socketAvailable(int $port, float $timeout = 1.5): bool
    {
        $host = str_contains($this->ip, ':') ? '['.$this->ip.']' : $this->ip;
        $socket = @stream_socket_client('tcp://'.$host.':'.$port, $errorCode, $errorMessage, $timeout, STREAM_CLIENT_CONNECT);

        if (is_resource($socket)) {
            fclose($socket);

            return true;
        }

        return false;
    }

    public function isSameIpUrl(string $url): bool
    {
        $parts = parse_url($url);
        $host = is_array($parts) ? trim((string) ($parts['host'] ?? ''), '[]') : '';

        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        $port = (int) ($parts['port'] ?? ($scheme === 'https' ? 443 : 80));
        $allowedPort = $scheme === 'https' ? $this->httpsPort : $this->httpPort;

        return is_array($parts)
            && in_array($scheme, ['http', 'https'], true)
            && ! isset($parts['user'])
            && ! isset($parts['pass'])
            && $port === $allowedPort
            && filter_var($host, FILTER_VALIDATE_IP) !== false
            && inet_pton($host) === inet_pton($this->ip);
    }

    private static function readPort(string $environmentKey, int $default): int
    {
        $configured = trim((string) getenv($environmentKey));

        if ($configured === '') {
            return $default;
        }

        $port = filter_var($configured, FILTER_VALIDATE_INT, [
            'options' => ['min_range' => 1, 'max_range' => 65535],
        ]);

        if ($port === false) {
            throw new InvalidArgumentException("{$environmentKey} must be a valid TCP port.");
        }

        return $port;
    }

    public function ip(): string
    {
        return $this->ip;
    }

    private function formatIp(): string
    {
        return str_contains($this->ip, ':') ? '['.$this->ip.']' : $this->ip;
    }

    private function cookieHeader(): string
    {
        return implode('; ', array_map(
            static fn (string $name, string $value): string => $name.'='.$value,
            array_keys($this->cookies),
            array_values($this->cookies),
        ));
    }

    private function resolveLocation(string $current, string $location): string
    {
        if (preg_match('/^https?:\/\//i', $location)) {
            return $location;
        }

        $parts = parse_url($current) ?: [];
        $origin = strtolower((string) ($parts['scheme'] ?? 'http')).'://'.$this->formatIp();

        if (isset($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }

        if (str_starts_with($location, '//')) {
            return strtolower((string) ($parts['scheme'] ?? 'http')).':'.$location;
        }

        if (str_starts_with($location, '/')) {
            return $origin.$location;
        }

        $directory = rtrim(dirname((string) ($parts['path'] ?? '/')), '/');

        return $origin.($directory === '' ? '' : $directory.'/').$location;
    }

    /** @param array<int, string> $headers
     * @return array<string, array<int, string>>
     */
    private function parseHeaders(array $headers): array
    {
        $parsed = [];

        foreach ($headers as $header) {
            if (str_starts_with($header, 'HTTP/')) {
                continue;
            }

            $separator = strpos($header, ':');

            if ($separator === false) {
                continue;
            }

            $name = strtolower(trim(substr($header, 0, $separator)));
            $value = trim(substr($header, $separator + 1));
            $parsed[$name][] = $value;
        }

        return $parsed;
    }

    /** @param array<int, string> $headers */
    private function statusCode(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\d(?:\.\d)?\s+(\d{3})/', $header, $matches)) {
                return (int) $matches[1];
            }
        }

        return 0;
    }
}
