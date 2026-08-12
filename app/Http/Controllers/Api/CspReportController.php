<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\RespondsWithApiPagination;
use App\Http\Controllers\Controller;
use App\Http\Resources\CspViolationReportResource;
use App\Models\CspViolationReport;
use App\Services\CspReportNormalizer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use JsonException;

class CspReportController extends Controller
{
    use RespondsWithApiPagination;

    public function store(Request $request, CspReportNormalizer $normalizer): Response|JsonResponse
    {
        abort_unless(config('security_headers.csp.collector.enabled'), 404);

        $contentType = mb_strtolower(trim(strtok((string) $request->header('Content-Type'), ';') ?: ''));
        $allowedTypes = ['application/csp-report', 'application/reports+json', 'application/json'];

        if (! in_array($contentType, $allowedTypes, true)) {
            return response()->json(['message' => 'Unsupported CSP report content type.'], 415);
        }

        $content = $request->getContent();
        $maxBytes = max(1024, (int) config('security_headers.csp.collector.max_payload_bytes', 65536));

        if (strlen($content) > $maxBytes) {
            return response()->json(['message' => 'CSP report payload is too large.'], 413);
        }

        try {
            $payload = json_decode($content, true, 32, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            return response()->json(['message' => 'Invalid CSP report payload.'], 400);
        }

        $reports = $this->reports($payload);
        $maxReports = max(1, (int) config('security_headers.csp.collector.max_reports_per_request', 20));

        if ($reports === [] || count($reports) > $maxReports) {
            return response()->json(['message' => 'Invalid CSP report payload.'], 400);
        }

        foreach ($reports as $report) {
            $this->persist($normalizer->normalize($report, $request->userAgent()));
        }

        return response()->noContent()->withHeaders([
            'Cache-Control' => 'no-store, private',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = CspViolationReport::query()
            ->when($request->filled('directive'), fn (Builder $query) => $query->where('effective_directive', $request->string('directive')->trim()->limit(100)))
            ->when($request->filled('browser'), fn (Builder $query) => $query->where('browser', $request->string('browser')->trim()->limit(30)))
            ->when($request->filled('document'), fn (Builder $query) => $query->where('document_uri', 'like', '%'.$request->string('document')->trim()->limit(255).'%'))
            ->orderByDesc('last_seen_at');

        return $this->paginatedResponse(
            'CSP violation reports retrieved.',
            $query->paginate($this->perPage($request)),
            CspViolationReportResource::class,
            $request,
        );
    }

    /** @return list<array<string, mixed>> */
    private function reports(mixed $payload): array
    {
        if (! is_array($payload)) {
            return [];
        }

        if (isset($payload['csp-report']) && is_array($payload['csp-report'])) {
            return [$payload['csp-report']];
        }

        if (! array_is_list($payload)) {
            return [$payload];
        }

        return collect($payload)
            ->filter(fn (mixed $report): bool => is_array($report)
                && ($report['type'] ?? 'csp-violation') === 'csp-violation'
                && is_array($report['body'] ?? null))
            ->map(fn (array $report): array => $report['body'])
            ->values()
            ->all();
    }

    /** @param array<string, int|string|null> $normalized */
    private function persist(array $normalized): void
    {
        try {
            DB::transaction(function () use ($normalized): void {
                $existing = CspViolationReport::query()
                    ->where('fingerprint', $normalized['fingerprint'])
                    ->lockForUpdate()
                    ->first();

                if ($existing) {
                    $existing->increment('occurrence_count', 1, ['last_seen_at' => now()]);

                    return;
                }

                CspViolationReport::query()->create([
                    ...$normalized,
                    'occurrence_count' => 1,
                    'first_seen_at' => now(),
                    'last_seen_at' => now(),
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            CspViolationReport::query()
                ->where('fingerprint', $normalized['fingerprint'])
                ->increment('occurrence_count', 1, ['last_seen_at' => now()]);
        }
    }
}
