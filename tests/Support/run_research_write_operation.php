<?php

use App\Exceptions\UploadConstraintException;
use App\Http\Controllers\Api\AgencyResearchWriteController;
use App\Http\Requests\Agency\UpdateAgencyResearchRequest;
use App\Models\Research;
use App\Models\User;
use App\Services\ResearchUploadCommitService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;
use Illuminate\Routing\Redirector;
use Illuminate\Routing\Route;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[, $operation, $encodedPayload, $userId, $readyPath, $goPath, $resultPath] = $argv;
$payload = json_decode(base64_decode($encodedPayload, true), true, flags: JSON_THROW_ON_ERROR);
$user = User::query()->findOrFail((int) $userId);
$research = Research::query()->findOrFail((int) $payload['research_id']);

file_put_contents($readyPath, 'ready');
$deadline = microtime(true) + 20;

while (! file_exists($goPath)) {
    if (microtime(true) >= $deadline) {
        file_put_contents($resultPath, json_encode(['outcome' => 'error', 'message' => 'Barrier timeout.']));
        exit(2);
    }

    usleep(10_000);
    clearstatcache(true, $goPath);
}

try {
    $request = Request::create('/phase-2-concurrency', 'POST', []);
    $request->setUserResolver(fn (): User => $user);

    if ($operation === 'draft_save') {
        $request = UpdateAgencyResearchRequest::create('/phase-2-concurrency', 'PATCH', [
            'title' => $payload['title'],
            'expected_draft_version' => $payload['expected_draft_version'],
            'report_details' => ['last_wizard_step' => 'details'],
        ]);
        $request->setContainer($app);
        $request->setRedirector($app->make(Redirector::class));
        $request->setUserResolver(fn (): User => $user);
        $route = new Route(['PATCH'], '/phase-2-concurrency', fn () => null);
        $route->bind($request);
        $route->setParameter('research', $research);
        $request->setRouteResolver(fn (): Route => $route);
        $request->validateResolved();
        $response = $app->make(AgencyResearchWriteController::class)->update($request, $research);
        $body = json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $result = [
            'outcome' => $response->getStatusCode() < 300 ? 'success' : 'conflict',
            'http_status' => $response->getStatusCode(),
            'title' => $body['data']['title'] ?? null,
        ];
    } elseif ($operation === 'create_revision') {
        $response = $app->make(AgencyResearchWriteController::class)->createRevision($request, $research);
        $body = json_decode($response->getContent(), true, flags: JSON_THROW_ON_ERROR);
        $result = [
            'outcome' => $response->getStatusCode() < 300 ? 'success' : 'conflict',
            'http_status' => $response->getStatusCode(),
            'research_id' => $body['data']['id'] ?? null,
        ];
    } else {
        config()->set('rikms.uploads.agency_quota_mb', (int) ($payload['quota_mb'] ?? 10240));
        $attributes = [
            'original_name' => $payload['original_name'],
            'stored_name' => $payload['stored_name'],
            'disk' => 'local',
            'path' => $payload['path'],
            'mime_type' => 'application/pdf',
            'extension' => 'pdf',
            'size_bytes' => $payload['size_bytes'],
            'checksum' => $payload['checksum'],
            'file_type' => $operation === 'commit_supporting' ? 'report-highlight-supporting' : 'research_document',
            'visibility' => 'private',
            'access_level' => 'restricted',
            'status' => 'active',
            'metadata' => ['security_scan' => ['status' => 'passed', 'engine' => 'test']],
            'uploaded_at' => now(),
        ];
        $service = $app->make(ResearchUploadCommitService::class);
        $file = $operation === 'commit_supporting'
            ? $service->commitSupporting(
                $request,
                (int) $research->id,
                (int) $payload['highlight_id'],
                (int) $payload['maximum_files'],
                $attributes,
            )
            : $service->commitMain($request, (int) $research->id, $attributes);
        $result = ['outcome' => 'success', 'file_id' => $file->id];
    }
} catch (UploadConstraintException $exception) {
    $result = [
        'outcome' => 'rejected',
        'http_status' => $exception->statusCode,
        'message' => $exception->getMessage(),
    ];
} catch (Throwable $exception) {
    $result = ['outcome' => 'error', 'message' => $exception->getMessage(), 'class' => $exception::class];
}

file_put_contents($resultPath, json_encode($result, JSON_THROW_ON_ERROR));
