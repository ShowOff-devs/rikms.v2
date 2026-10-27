<?php

namespace App\Support\Module01;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;
use Throwable;

final class ReadOnlyInfrastructureAudit
{
    private const SERVICE_CONNECT_TIMEOUT_SECONDS = 5;

    public function run(): array
    {
        return [
            'checked_at' => now()->utc()->toIso8601String(),
            'cases' => [
                '01-04' => $this->apacheCase(),
                '01-07' => $this->serviceCase(),
                '01-08' => $this->operationsCase(),
            ],
        ];
    }

    public function postReboot(): array
    {
        if (! filter_var(getenv('RIKMS_QA_POST_REBOOT_ENABLED') ?: false, FILTER_VALIDATE_BOOL)) {
            return $this->caseResult('blocked', 'Post-reboot verification was not explicitly enabled.', [], 'Set RIKMS_QA_POST_REBOOT_ENABLED=true after an authorized reboot.');
        }

        if (PHP_OS_FAMILY !== 'Linux') {
            return $this->caseResult('blocked', 'Post-reboot verification must run on the deployed Linux host.', [], 'Run this command on the Ubuntu application host.');
        }

        $previousBootId = trim((string) getenv('RIKMS_QA_PRE_REBOOT_BOOT_ID'));
        $bootIdPath = '/proc/sys/kernel/random/boot_id';
        $currentBootId = is_readable($bootIdPath) ? trim((string) file_get_contents($bootIdPath)) : '';

        if (! preg_match('/^[a-f0-9-]{36}$/i', $previousBootId) || $currentBootId === '') {
            return $this->caseResult('blocked', 'A captured pre-reboot boot ID and current Linux boot ID are required.', [], 'Capture /proc/sys/kernel/random/boot_id before reboot, then provide it as RIKMS_QA_PRE_REBOOT_BOOT_ID.');
        }

        if (hash_equals($previousBootId, $currentBootId)) {
            return $this->caseResult('fail', 'The host is still on the recorded pre-reboot boot ID.', ['Current boot ID matches the pre-reboot evidence.'], 'Complete the authorized reboot, capture the changed boot ID, and rerun the post-reboot smoke check.');
        }

        $active = $this->command(['systemctl', 'is-active', 'apache2']);

        if ($active['status'] !== 'pass') {
            return $this->caseResult('fail', 'Apache is not active after the recorded reboot.', ['The post-reboot service check failed.'], 'Review Apache startup configuration and service logs, then rerun the smoke check.');
        }

        $url = trim((string) getenv('RIKMS_QA_BASE_URL'));

        if ($url === '') {
            return $this->caseResult('blocked', 'The post-reboot HTTP smoke check has no configured IP base URL.', ['Apache is active and the boot ID changed.'], 'Set RIKMS_QA_BASE_URL to the deployed IP URL and rerun.');
        }

        $probe = $this->verifiedHealthRequest($url);

        if ($probe['status'] !== 'pass') {
            return $this->caseResult('fail', 'The application health route did not respond successfully after reboot.', ['Apache is active and the boot ID changed.', $probe['evidence']], 'Review application and Apache logs, correct the health response, and rerun.');
        }

        return $this->caseResult('pass', 'A new boot ID, active Apache service, and HTTP health response were verified.', [
            'The current boot ID differs from the recorded pre-reboot ID.',
            'Apache is active.',
            'The configured IP health route returned HTTP 200 with verified TLS when HTTPS is configured.',
        ]);
    }

    private function apacheCase(): array
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return $this->caseResult('blocked', 'Apache checks require the deployed Linux host.', [], 'Run the infrastructure group on Ubuntu with Apache installed.');
        }

        $apache = $this->findExecutable(['apache2ctl', 'apachectl']);

        if ($apache === null) {
            return $this->caseResult('blocked', 'Apache control utility is unavailable to this user.', [], 'Run with a deployment account that can read Apache configuration and execute apache2ctl -t.');
        }

        $syntax = $this->command([$apache, '-t']);
        $modules = $this->command([$apache, '-M']);
        $rootConfigured = $this->apacheDocumentRootConfigured();
        $rewriteEnabled = str_contains(strtolower($modules['output'] ?? ''), 'rewrite_module');
        $rewriteRules = is_file(base_path('public/.htaccess'))
            ? (string) file_get_contents(base_path('public/.htaccess'))
            : '';
        $frontControllerRule = str_contains($rewriteRules, 'RewriteEngine On')
            && str_contains($rewriteRules, 'RewriteRule ^ index.php [L]');
        $allowOverride = $this->apacheAllowsRewriteOverride();
        $checks = [
            'Apache syntax is valid' => $syntax['status'] === 'pass',
            'An enabled virtual host points at this release public directory' => $rootConfigured,
            'Apache rewrite module is loaded' => $rewriteEnabled,
            'Laravel front-controller rewrite rules are present' => $frontControllerRule,
            'The active Apache directory configuration permits rewrite rules' => $allowOverride,
        ];

        $failed = array_keys(array_filter($checks, static fn (bool $passed): bool => ! $passed));

        if ($failed !== []) {
            return $this->caseResult('fail', 'One or more Apache, virtual-host, or rewrite checks failed.', array_map(
                static fn (string $name): string => $name.': failed',
                $failed,
            ), 'Correct the active virtual host, DocumentRoot, rewrite module, or AllowOverride policy; then rerun apache2ctl -t and the live route checks.');
        }

        return $this->caseResult('pass', 'Apache syntax, application public root, rewrite module, and Laravel rewrite rules are configured.', array_map(
            static fn (string $name): string => $name.': passed',
            array_keys($checks),
        ));
    }

    private function serviceCase(): array
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return $this->caseResult('blocked', 'Service and listener checks require the deployed Linux host.', [], 'Run infrastructure checks on the Ubuntu application host.');
        }

        $evidence = [];
        $failed = [];
        $configuredPorts = $this->configuredServicePorts();
        $evidence[] = $configuredPorts === []
            ? 'No configured data-service TCP ports were found.'
            : 'Configured data-service TCP port(s): '.implode(', ', $configuredPorts).'.';
        $driver = (string) config('database.default');
        $this->configureBoundedServiceTimeouts($driver);

        if (! in_array($driver, ['mysql', 'mariadb'], true)) {
            $failed[] = 'The active relational connection is not MySQL/MariaDB.';
        } else {
            try {
                DB::connection()->selectOne('select 1 as rikms_qa_probe');
                $evidence[] = 'Configured relational database accepted a read-only connectivity query.';
            } catch (Throwable) {
                $failed[] = 'The configured relational database connection failed.';
            }
        }

        $mongoUri = trim((string) config('database.connections.mongodb.dsn'));
        $mongoRequired = (bool) config('infrastructure.require_mongodb');

        if ($mongoUri === '') {
            $evidence[] = $mongoRequired
                ? 'MongoDB is required but has no configured connection.'
                : 'N/A: MongoDB is optional and not configured.';

            if ($mongoRequired) {
                $failed[] = 'Required MongoDB is not configured.';
            }
        } else {
            try {
                DB::connection('mongodb')->getDatabase()->command(['ping' => 1])->toArray();
                $evidence[] = 'Configured MongoDB accepted a read-only ping.';
            } catch (Throwable) {
                $failed[] = 'Configured MongoDB connectivity failed.';
            }
        }

        $redisConnections = $this->configuredRedisConnections();

        if ($redisConnections === []) {
            $evidence[] = 'N/A: Redis is not selected by the configured queue, cache, or session driver.';
        } else {
            foreach ($redisConnections as $connection) {
                try {
                    Redis::connection($connection)->ping();
                    $evidence[] = 'Configured Redis connection "'.$connection.'" accepted a read-only ping.';
                } catch (Throwable) {
                    $failed[] = 'Configured Redis connection "'.$connection.'" connectivity failed.';
                }
            }
        }

        $listeners = $this->command(['ss', '-lnt']);

        if ($listeners['status'] !== 'pass') {
            $failed[] = 'The read-only listening-socket inventory could not be collected.';
        } else {
            $publicServiceListeners = $this->publicServiceListeners($listeners['output']);

            if ($publicServiceListeners !== []) {
                $failed[] = 'One or more configured data services listen on a public interface.';
                $evidence[] = count($publicServiceListeners).' configured service listener(s) bind to public or wildcard addresses.';
            } else {
                $evidence[] = 'No configured database, MongoDB, or Redis listener binds to a public or wildcard address.';
            }
        }

        if ($failed !== []) {
            return $this->caseResult('fail', 'A required service is unavailable or a data service listener is exposed.', array_merge($evidence, $failed), 'Correct service connectivity or bind/firewall configuration. Keep credentials in the deployment secret store and rerun read-only checks.');
        }

        return $this->caseResult('pass', 'Required configured services are reachable and local data-service listeners are restricted.', $evidence);
    }

    private function operationsCase(): array
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return $this->caseResult('blocked', 'Firewall, systemd, and Linux log checks require the deployed Ubuntu host.', [], 'Run the infrastructure check on Ubuntu with read access to firewall, systemd, and logs.');
        }

        $evidence = [];
        $failures = [];
        $firewall = $this->firewallCheck();

        if ($firewall['status'] === 'fail') {
            $failures[] = $firewall['summary'];
        }
        $evidence[] = $firewall['summary'];
        $evidence = array_merge($evidence, $firewall['evidence']);

        $serviceNames = ['apache2'];
        $databaseDriver = (string) config('database.default');
        $databaseEndpoint = $this->databaseEndpoint();
        if (in_array($databaseDriver, ['mysql', 'mariadb'], true)
            && ($this->isLocalHost($databaseEndpoint['host']) || trim((string) config('database.connections.'.$databaseDriver.'.unix_socket')) !== '')) {
            $serviceNames[] = trim((string) getenv('RIKMS_QA_MYSQL_UNIT')) ?: 'mysql';
        }

        $mongoUri = trim((string) config('database.connections.mongodb.dsn'));
        $mongoEndpoint = parse_url($mongoUri);
        if ($mongoUri !== '' && is_array($mongoEndpoint) && $this->isLocalHost((string) ($mongoEndpoint['host'] ?? ''))) {
            $serviceNames[] = trim((string) getenv('RIKMS_QA_MONGODB_UNIT')) ?: 'mongod';
        }

        foreach ($this->configuredRedisConnections() as $connection) {
            $redis = config('database.redis.'.$connection, []);
            $redisUrl = parse_url((string) ($redis['url'] ?? ''));
            $redisHost = (string) ($redisUrl['host'] ?? $redis['host'] ?? '127.0.0.1');

            if ($this->isLocalHost($redisHost)) {
                $serviceNames[] = trim((string) getenv('RIKMS_QA_REDIS_UNIT')) ?: 'redis-server';
                break;
            }
        }

        $queueDriver = config('queue.connections.'.config('queue.default').'.driver');
        if ($queueDriver !== 'sync') {
            $serviceNames[] = trim((string) getenv('RIKMS_QA_QUEUE_UNIT')) ?: 'rikms-queue';
        } else {
            $evidence[] = 'N/A: Queue driver is sync; a persistent queue worker is not required.';
        }
        $serviceNames[] = trim((string) getenv('RIKMS_QA_SCHEDULER_TIMER')) ?: 'rikms-scheduler.timer';
        $serviceNames[] = trim((string) getenv('RIKMS_QA_MONITOR_TIMER')) ?: 'rikms-monitor.timer';

        foreach (array_unique($serviceNames) as $service) {
            $active = $this->command(['systemctl', 'is-active', $service]);
            $enabled = $this->command(['systemctl', 'is-enabled', $service]);
            $passed = $active['status'] === 'pass' && trim($enabled['output']) === 'enabled';
            $evidence[] = $passed ? "{$service} is active and enabled." : "{$service} active/startup check failed.";

            if (! $passed) {
                $failures[] = "{$service} is not active and enabled.";
            }
        }

        $logs = $this->inspectLogs(array_values(array_unique($serviceNames)));
        $evidence = array_merge($evidence, $logs['evidence']);

        if ($logs['status'] === 'fail') {
            $failures[] = $logs['summary'];
        }

        if ($failures !== []) {
            return $this->caseResult('fail', 'Firewall, service startup, or recent error-log checks need attention.', array_merge($evidence, $failures), 'Review the named service status and firewall rule evidence, resolve critical errors, and rerun without restarting or changing services through this check.');
        }

        if ($firewall['status'] === 'blocked' || $logs['status'] === 'blocked') {
            return $this->caseResult('blocked', 'Some firewall or log evidence could not be read by this account.', $evidence, 'Run the same read-only checks with an authorized operations account or attach an approved external firewall evidence reference.');
        }

        return $this->caseResult('pass', 'Firewall evidence, active startup services, and recent logs were reviewed.', $evidence);
    }

    private function firewallCheck(): array
    {
        $ufw = (new ExecutableFinder)->find('ufw');
        $configuredPorts = trim((string) getenv('RIKMS_QA_ALLOWED_INBOUND_PORTS'));
        $portTokens = array_values(array_filter(array_map('trim', explode(',', $configuredPorts)), static fn (string $port): bool => $port !== ''));
        $expectedPorts = [];

        foreach ($portTokens as $portToken) {
            $port = filter_var($portToken, FILTER_VALIDATE_INT);

            if ($port === false || $port < 1 || $port > 65535) {
                return $this->caseResult('blocked', 'The declared inbound port policy contains an invalid TCP/UDP port.', [], 'Set RIKMS_QA_ALLOWED_INBOUND_PORTS to a comma-separated list of ports from 1 through 65535.');
            }

            $expectedPorts[] = $port;
        }
        $expectedPorts = array_values(array_unique($expectedPorts));

        if ($ufw === null) {
            $externalEvidence = trim((string) getenv('RIKMS_QA_FIREWALL_EVIDENCE'));
            $externalConfirmed = filter_var(getenv('RIKMS_QA_FIREWALL_EXTERNAL') ?: false, FILTER_VALIDATE_BOOL);

            if ($externalConfirmed && $externalEvidence !== '') {
                return $this->caseResult('n_a', 'N/A: host UFW is not used; authorized external firewall evidence is documented.', [
                    'Evidence reference: '.preg_replace('/[^A-Za-z0-9_.:#-]/', '', substr($externalEvidence, 0, 120)),
                ]);
            }

            return $this->caseResult('blocked', 'UFW is unavailable and no external firewall evidence was supplied.', [], 'Provide the authorized firewall policy evidence reference or install/use the approved host firewall inspection tool.');
        }

        if ($expectedPorts === []) {
            return $this->caseResult('blocked', 'The allowed inbound port policy has not been supplied.', [], 'Set RIKMS_QA_ALLOWED_INBOUND_PORTS to the reviewed port allowlist for this host.');
        }

        $result = $this->command([$ufw, 'status', 'verbose']);

        if ($result['status'] !== 'pass') {
            return $this->caseResult('blocked', 'UFW status could not be read by the current account.', [], 'Run the read-only firewall inspection with an authorized operations account.');
        }

        if (! preg_match('/^Status:\s+active\s*$/mi', $result['output'])) {
            return $this->caseResult('fail', 'UFW is not active.', [], 'Enable the approved host firewall through the operations change process, then rerun QA.');
        }

        if (! preg_match('/^Default:\s+deny\s+\(incoming\)/mi', $result['output'])) {
            return $this->caseResult('fail', 'UFW default inbound policy is not deny.', [], 'Set the approved default-deny inbound policy through the operations change process, then rerun QA.');
        }

        preg_match_all('/^\s*(?:\[\s*\d+\]\s+)?(\d+)(?:\/(?:tcp|udp))?(?:\s+\(v6\))?\s+ALLOW\s+IN\s+([^\s]+)(?:\s+\(v6\))?/mi', $result['output'], $rules, PREG_SET_ORDER);
        preg_match_all('/^\s*(?:\[\s*\d+\]\s+)?\S+.*\bALLOW\s+IN\b/im', $result['output'], $allAllowRules);

        if (count($allAllowRules[0] ?? []) !== count($rules)) {
            return $this->caseResult('blocked', 'One or more UFW allow rules use a format that this bounded parser cannot verify.', [], 'Review the rule manually and provide a sanitized firewall evidence reference before sign-off.');
        }

        $unapproved = [];
        $observedPorts = [];
        $trustedAdminCidrs = array_filter(array_map('trim', explode(',', (string) getenv('RIKMS_QA_TRUSTED_ADMIN_CIDRS'))));

        foreach ($rules as $rule) {
            $port = (int) $rule[1];
            $source = strtolower($rule[2]);
            $observedPorts[] = $port;

            if (! in_array($port, $expectedPorts, true)) {
                $unapproved[] = $port;

                continue;
            }

            $sourceIsTrusted = in_array($source, array_map('strtolower', $trustedAdminCidrs), true);

            if (! in_array($port, [80, 443], true) && ! $sourceIsTrusted) {
                $unapproved[] = $port;
            }
        }

        if ($unapproved !== []) {
            return $this->caseResult('fail', 'Effective UFW allow rules exceed the approved inbound policy.', [
                count(array_unique($unapproved)).' unapproved or unrestricted administrative rule(s) found.',
            ], 'Restrict administrative rules to the approved source CIDRs and remove unapproved inbound ports through the change process.');
        }

        $missingPorts = array_values(array_diff(array_unique($expectedPorts), array_unique($observedPorts)));

        if ($missingPorts !== []) {
            return $this->caseResult('fail', 'One or more ports required by the declared inbound policy are not permitted.', [
                'Missing expected inbound port(s): '.implode(', ', $missingPorts).'.',
            ], 'Review the approved inbound policy and effective firewall rules; apply any required change through the operations change process.');
        }

        return $this->caseResult('pass', 'UFW is active and observed allow rules are within the declared inbound port policy.', [
            'UFW active status was verified.',
            count($rules).' inbound allow rule(s) were compared with the declared allowlist.',
        ]);
    }

    private function inspectLogs(array $serviceNames): array
    {
        $laravelLogs = glob(storage_path('logs/laravel*.log')) ?: [];
        usort($laravelLogs, static fn (string $left, string $right): int => (filemtime($right) ?: 0) <=> (filemtime($left) ?: 0));
        $logPaths = [
            '/var/log/apache2/error.log',
            $laravelLogs[0] ?? storage_path('logs/laravel.log'),
        ];
        $evidence = [];
        $unreadable = [];
        $errors = 0;

        foreach ($logPaths as $path) {
            if (! is_file($path) || ! is_readable($path)) {
                $unreadable[] = basename(dirname($path)).'/'.basename($path);

                continue;
            }

            $tail = $this->readTail($path, 65536);
            $errors += preg_match_all('/\b(?:CRITICAL|ALERT|EMERGENCY|PHP Fatal error|Uncaught Error)\b/i', $tail);
            $evidence[] = basename(dirname($path)).'/'.basename($path).' was readable; '.$errors.' critical signature(s) found in inspected tails.';
        }

        $journalctl = $this->findExecutable(['journalctl']);

        foreach ($serviceNames as $service) {
            if ($journalctl === null || preg_match('/^[A-Za-z0-9_.@:-]+$/', $service) !== 1) {
                $unreadable[] = 'systemd journal';

                continue;
            }

            $journal = $this->command([$journalctl, '--no-pager', '--unit='.$service, '--lines=200', '--since=24 hours ago']);

            if ($journal['status'] !== 'pass') {
                $unreadable[] = $service.' journal';

                continue;
            }

            $journalErrors = preg_match_all('/\b(?:CRITICAL|ALERT|EMERGENCY|PHP Fatal error|Uncaught Error)\b/i', $journal['output']);
            $errors += $journalErrors;
            $evidence[] = 'systemd journal for '.$service.' was readable; '.$journalErrors.' critical signature(s) found in the inspected 24-hour window.';
        }

        if ($unreadable !== []) {
            $evidence[] = 'Unavailable log source(s): '.implode(', ', array_unique($unreadable)).'.';

            return $this->caseResult('blocked', 'One or more expected service logs are unavailable to this account.', $evidence, 'Provide authorized read access to Apache and Laravel logs or document the approved journald locations.');
        }

        if ($errors > 0) {
            return $this->caseResult('fail', 'Critical error signatures are present in recent log tails.', $evidence, 'Review the restricted logs locally, resolve deployment failures, and retain sanitized evidence only.');
        }

        return $this->caseResult('pass', 'Apache and Laravel logs were readable and no critical error signatures were found in the inspected tails.', $evidence);
    }

    private function apacheDocumentRootConfigured(): bool
    {
        $expected = realpath(base_path('public')) ?: base_path('public');
        $files = array_merge(
            glob('/etc/apache2/apache2.conf') ?: [],
            glob('/etc/apache2/conf-enabled/*') ?: [],
            glob('/etc/apache2/sites-enabled/*') ?: [],
        );

        foreach ($files as $file) {
            if (! is_file($file) || ! is_readable($file)) {
                continue;
            }

            $contents = (string) file_get_contents($file);
            preg_match_all('/^\s*DocumentRoot\s+["\']?([^"\'\s]+)["\']?/mi', $contents, $matches);

            foreach ($matches[1] ?? [] as $documentRoot) {
                $resolved = realpath($documentRoot) ?: $documentRoot;

                if (rtrim($resolved, '/') === rtrim($expected, '/')) {
                    return true;
                }
            }
        }

        return false;
    }

    private function apacheAllowsRewriteOverride(): bool
    {
        $expected = realpath(base_path('public')) ?: base_path('public');
        $files = array_merge(
            glob('/etc/apache2/apache2.conf') ?: [],
            glob('/etc/apache2/conf-enabled/*') ?: [],
            glob('/etc/apache2/sites-enabled/*') ?: [],
        );

        foreach ($files as $file) {
            if (! is_file($file) || ! is_readable($file)) {
                continue;
            }

            $contents = (string) file_get_contents($file);
            preg_match_all('/<Directory\s+["\']?([^"\'>]+)["\']?\s*>(.*?)<\/Directory>/is', $contents, $matches, PREG_SET_ORDER);

            foreach ($matches as $match) {
                $directory = realpath(trim($match[1])) ?: trim($match[1]);
                $coversPublicRoot = rtrim($expected, '/') === rtrim($directory, '/')
                    || str_starts_with(rtrim($expected, '/'), rtrim($directory, '/').'/');
                $allowsRewrite = preg_match('/^\s*AllowOverride\s+(?:All|FileInfo)\b/im', $match[2]) === 1;

                if ($coversPublicRoot && $allowsRewrite) {
                    return true;
                }
            }
        }

        return false;
    }

    private function publicServiceListeners(string $ssOutput): array
    {
        $ports = $this->configuredServicePorts();
        $exposed = [];

        foreach (preg_split('/\R/', $ssOutput) as $line) {
            $columns = preg_split('/\s+/', trim($line));

            if (count($columns) < 5 || ! is_string($columns[3] ?? null)) {
                continue;
            }

            $address = $columns[3];
            $separator = strrpos($address, ':');

            if ($separator === false) {
                continue;
            }

            $port = (int) substr($address, $separator + 1);

            if (! in_array($port, $ports, true)) {
                continue;
            }

            $host = trim(substr($address, 0, $separator), '[]');

            if ($this->isPublicBindAddress($host)) {
                $exposed[] = $port;
            }
        }

        return array_values(array_unique($exposed));
    }

    private function configuredServicePorts(): array
    {
        $ports = [];
        $driver = (string) config('database.default');
        $database = config('database.connections.'.$driver, []);

        if (in_array($driver, ['mysql', 'mariadb'], true)) {
            $ports[] = $this->databaseEndpoint()['port'];
        }

        $mongoUri = (string) config('database.connections.mongodb.dsn');
        $mongo = parse_url($mongoUri);
        if ($mongoUri !== '') {
            $mongoAuthority = (string) ($mongo['host'] ?? '');
            preg_match_all('/:(\d{1,5})(?:,|$)/', $mongoAuthority, $mongoPorts);
            $ports = array_merge($ports, array_map('intval', $mongoPorts[1] ?? []));

            if (($mongoPorts[1] ?? []) === []) {
                $ports[] = 27017;
            }
        }

        foreach ($this->configuredRedisConnections() as $name) {
            $redis = config('database.redis.'.$name, []);
            $redisUrl = parse_url((string) ($redis['url'] ?? ''));
            $ports[] = (int) ($redisUrl['port'] ?? $redis['port'] ?? 6379);
        }

        return array_values(array_unique(array_filter($ports, static fn (int $port): bool => $port > 0)));
    }

    /** @return array{host: string, port: int} */
    private function databaseEndpoint(): array
    {
        $driver = (string) config('database.default');
        $database = config('database.connections.'.$driver, []);
        $url = parse_url((string) ($database['url'] ?? ''));

        return [
            'host' => (string) ($url['host'] ?? $database['host'] ?? '127.0.0.1'),
            'port' => (int) ($url['port'] ?? $database['port'] ?? 3306),
        ];
    }

    /** @return list<string> */
    private function configuredRedisConnections(): array
    {
        $connections = [];
        $queue = config('queue.connections.'.config('queue.default'), []);
        $cache = config('cache.stores.'.config('cache.default'), []);

        if (($queue['driver'] ?? null) === 'redis') {
            $connections[] = (string) ($queue['connection'] ?? 'default');
        }

        if (($cache['driver'] ?? null) === 'redis') {
            $connections[] = (string) ($cache['connection'] ?? 'default');
            $connections[] = (string) ($cache['lock_connection'] ?? 'default');
        }

        if (config('session.driver') === 'redis') {
            $connections[] = (string) (config('session.connection') ?: 'default');
        }

        return array_values(array_unique(array_filter($connections)));
    }

    private function configureBoundedServiceTimeouts(string $databaseDriver): void
    {
        if (in_array($databaseDriver, ['mysql', 'mariadb'], true)) {
            $connection = config('database.connections.'.$databaseDriver, []);
            $options = is_array($connection['options'] ?? null) ? $connection['options'] : [];
            $options[\PDO::ATTR_TIMEOUT] = self::SERVICE_CONNECT_TIMEOUT_SECONDS;
            config(['database.connections.'.$databaseDriver.'.options' => $options]);
        }

        $mongo = config('database.connections.mongodb', []);
        $mongoOptions = is_array($mongo['options'] ?? null) ? $mongo['options'] : [];
        $mongoOptions['serverSelectionTimeoutMS'] = self::SERVICE_CONNECT_TIMEOUT_SECONDS * 1000;
        config(['database.connections.mongodb.options' => $mongoOptions]);

        foreach ($this->configuredRedisConnections() as $name) {
            config([
                'database.redis.'.$name.'.timeout' => self::SERVICE_CONNECT_TIMEOUT_SECONDS,
                'database.redis.'.$name.'.read_timeout' => self::SERVICE_CONNECT_TIMEOUT_SECONDS,
            ]);
        }
    }

    private function isPublicBindAddress(string $host): bool
    {
        if (in_array($host, ['', '*', '0.0.0.0', '::'], true)) {
            return true;
        }

        if (filter_var($host, FILTER_VALIDATE_IP) === false) {
            return true;
        }

        return filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
    }

    private function isLocalHost(string $host): bool
    {
        return in_array(strtolower(trim($host, '[]')), ['localhost', '127.0.0.1', '::1'], true);
    }

    private function verifiedHealthRequest(string $baseUrl): array
    {
        $parts = parse_url($baseUrl);
        $host = is_array($parts) ? trim((string) ($parts['host'] ?? ''), '[]') : '';
        $mode = strtolower(trim((string) getenv('RIKMS_QA_TRANSPORT_MODE')));

        if (! is_array($parts) || filter_var($host, FILTER_VALIDATE_IP) === false || ! in_array($mode, ['https', 'restricted_http'], true)) {
            return ['status' => 'blocked', 'evidence' => 'The post-reboot URL or transport mode is invalid.'];
        }

        if (($mode === 'https' && strtolower((string) ($parts['scheme'] ?? '')) !== 'https')
            || ($mode === 'restricted_http' && strtolower((string) ($parts['scheme'] ?? '')) !== 'http')) {
            return ['status' => 'blocked', 'evidence' => 'The post-reboot URL scheme conflicts with the declared transport mode.'];
        }

        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $url = rtrim($baseUrl, '/').'/up';
        $options = ['http' => [
            'method' => 'GET',
            'timeout' => 8,
            'ignore_errors' => true,
            'follow_location' => 0,
            'max_redirects' => 0,
            'header' => 'Connection: close',
        ]];

        if ($mode === 'https') {
            $ssl = [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'allow_self_signed' => false,
                'peer_name' => $host,
            ];
            $caFile = trim((string) getenv('RIKMS_QA_TLS_CA_FILE'));
            if ($caFile !== '' && is_file($caFile)) {
                $ssl['cafile'] = $caFile;
            }
            $options['ssl'] = $ssl;
        }

        $stream = @fopen($url, 'rb', false, stream_context_create($options));

        if ($stream === false) {
            return ['status' => 'fail', 'evidence' => 'The verified IP health request could not connect after reboot.'];
        }

        $metadata = stream_get_meta_data($stream);
        $headers = is_array($metadata['wrapper_data'] ?? null) ? $metadata['wrapper_data'] : [];
        fclose($stream);

        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\d(?:\.\d)?\s+(\d{3})/', $header, $matches)) {
                return (int) $matches[1] === 200
                    ? ['status' => 'pass', 'evidence' => 'The configured IP health route returned HTTP 200.']
                    : ['status' => 'fail', 'evidence' => 'The configured IP health route returned a non-200 status.'];
            }
        }

        return ['status' => 'fail', 'evidence' => 'The configured IP health route returned no HTTP status.'];
    }

    private function readTail(string $path, int $maximumBytes): string
    {
        $stream = @fopen($path, 'rb');

        if ($stream === false) {
            return '';
        }

        $size = filesize($path) ?: 0;

        if ($size > $maximumBytes) {
            fseek($stream, -$maximumBytes, SEEK_END);
        }

        $contents = stream_get_contents($stream) ?: '';
        fclose($stream);

        return $contents;
    }

    private function findExecutable(array $names): ?string
    {
        $finder = new ExecutableFinder;

        foreach ($names as $name) {
            $path = $finder->find($name);

            if ($path !== null) {
                return $path;
            }
        }

        return null;
    }

    private function command(array $command): array
    {
        if (PHP_OS_FAMILY !== 'Linux') {
            return ['status' => 'blocked', 'output' => ''];
        }

        try {
            $process = new Process($command, base_path());
            $process->setTimeout(8);
            $exitCode = $process->run();

            return [
                'status' => $exitCode === 0 ? 'pass' : 'fail',
                'output' => trim($process->getOutput()),
            ];
        } catch (Throwable) {
            return ['status' => 'blocked', 'output' => ''];
        }
    }

    private function caseResult(string $status, string $summary, array $evidence, string $correctiveAction = ''): array
    {
        return [
            'status' => $status,
            'summary' => $summary,
            'evidence' => array_values($evidence),
            'failure_reason' => in_array($status, ['fail', 'blocked'], true) ? $summary : '',
            'corrective_action' => $correctiveAction,
            'justification' => $status === 'n_a' ? implode(' ', $evidence) : '',
        ];
    }
}
