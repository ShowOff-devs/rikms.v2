<?php

use App\Support\Module01\DeploymentTarget;

test('TEST 01-07 P0: configured infrastructure and administrative ports are closed externally', function () {
    if (! DeploymentTarget::enabled()) {
        $this->markTestSkipped('Blocked: live checks require RIKMS_QA_LIVE_ENABLED=true.');
    }

    $externalConfirmed = filter_var(getenv('RIKMS_QA_EXTERNAL_PROBE_CONFIRMED') ?: false, FILTER_VALIDATE_BOOL);
    $sourceReference = trim((string) getenv('RIKMS_QA_EXTERNAL_SOURCE_REFERENCE'));
    $portsText = trim((string) getenv('RIKMS_QA_EXPOSURE_PORTS'));

    if (! $externalConfirmed || $sourceReference === '' || $portsText === '') {
        $this->markTestIncomplete('Blocked: define the authorized external probe source and explicit bounded service/admin port list.');
    }

    $ports = array_values(array_unique(array_filter(array_map('intval', explode(',', $portsText)))));

    if (count($ports) > 16 || $ports === [] || collect($ports)->contains(fn (int $port): bool => $port < 1 || $port > 65535)) {
        throw new InvalidArgumentException('RIKMS_QA_EXPOSURE_PORTS must contain 1 to 16 valid TCP ports.');
    }

    $target = DeploymentTarget::fromEnvironment();
    $openPorts = [];

    foreach ($ports as $port) {
        if ($target->socketAvailable($port)) {
            $openPorts[] = $port;
        }
    }

    expect($openPorts)->toBeEmpty('Public TCP connectivity succeeded on restricted service/admin port(s): '.implode(', ', $openPorts));
})->group('module01', 'module01-live');
