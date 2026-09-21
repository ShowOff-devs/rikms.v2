<?php

use App\Exceptions\ResearchModerationTransitionException;
use App\Models\Research;
use App\Models\User;
use App\Services\ResearchModerationTransitionService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Http\Request;

require dirname(__DIR__, 2).'/vendor/autoload.php';

$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

[, $researchId, $userId, $action, $readyPath, $goPath, $resultPath] = $argv;
$research = Research::query()->findOrFail((int) $researchId);
$user = User::query()->findOrFail((int) $userId);
$input = $action === ResearchModerationTransitionService::REJECT
    ? ['notes' => 'Concurrent rejection with complete revision guidance.']
    : ['notes' => 'Concurrent approval after complete moderation review.'];
$request = Request::create('/concurrent-moderation-test', 'POST', $input);
$request->setUserResolver(fn (): User => $user);

file_put_contents($readyPath, 'ready');
$deadline = microtime(true) + 15;

while (! file_exists($goPath)) {
    if (microtime(true) >= $deadline) {
        file_put_contents($resultPath, json_encode(['outcome' => 'error', 'message' => 'Barrier timeout.']));
        exit(2);
    }

    usleep(10_000);
    clearstatcache(true, $goPath);
}

try {
    $updated = $app->make(ResearchModerationTransitionService::class)->transition($request, $research, $action);
    $result = ['outcome' => 'success', 'status' => $updated->status];
} catch (ResearchModerationTransitionException $exception) {
    $result = [
        'outcome' => $exception->stale ? 'conflict' : 'invalid',
        'status' => $exception->currentStatus,
        'http_status' => $exception->statusCode(),
    ];
} catch (Throwable $exception) {
    $result = ['outcome' => 'error', 'message' => $exception->getMessage()];
}

file_put_contents($resultPath, json_encode($result, JSON_THROW_ON_ERROR));
