# ClamAV deployment preparation

RIKMS scans quarantined uploads through the clamd TCP `INSTREAM` protocol. Uploads fail closed: an unavailable scanner, timeout, invalid response, or stream-size mismatch prevents promotion into private storage.

## Host preparation (Ubuntu)

Install the distribution packages on the application host or on a private service host:

```bash
sudo apt update
sudo apt install clamav-daemon clamav-freshclam
```

Configure the clamd daemon with a private listener. For a same-host deployment, use loopback:

```text
TCPSocket 3310
TCPAddr 127.0.0.1
StreamMaxLength 100M
```

Do not expose port `3310` to the public internet. When clamd runs on another host or container, allow the port only between the application and scanner network identities.

Enable signature updates and the daemon, then check their status:

```bash
sudo systemctl enable --now clamav-freshclam clamav-daemon
sudo systemctl status clamav-freshclam clamav-daemon
```

Package service names and configuration-file locations can differ by Linux distribution.

## Application configuration

Set these values in the deployment secret/environment configuration:

```dotenv
MALWARE_SCANNER=clamav
CLAMAV_HOST=127.0.0.1
CLAMAV_PORT=3310
CLAMAV_TIMEOUT_SECONDS=10
CLAMAV_STREAM_MAX_LENGTH_MB=100
```

`CLAMAV_STREAM_MAX_LENGTH_MB` must equal clamd `StreamMaxLength` and must be at least the effective maximum shown by the readiness command. After changing environment values, rebuild Laravel's configuration cache.

## Verification

Run:

```bash
php artisan config:cache
php artisan rikms:clamav-check
```

The check verifies that scanning is enabled, endpoint values are valid, the configured stream capacity covers the application upload limit, clamd responds to `PING`, and `VERSION` returns the engine/signature version.

Before pilot sign-off, upload one known-clean PDF and use the standard harmless antivirus test-file procedure in an isolated staging environment. Confirm the clean PDF is promoted, the test marker is rejected, the quarantine copy is removed, and no scanner error exposes a file.

## Operations

- Run `php artisan rikms:clamav-check` from deployment and monitoring automation.
- Alert on a non-zero exit code, stopped `clamav-daemon`/`clamav-freshclam`, or stale signature updates.
- Re-run the check after daemon upgrades, configuration changes, firewall changes, and upload-limit changes.
- Keep `MALWARE_SCANNER=none` restricted to local development. Pilot, staging, and production boot validation requires `clamav`.
