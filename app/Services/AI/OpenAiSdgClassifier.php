<?php

namespace App\Services\AI;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use OpenAI\Contracts\ClientContract;
use RuntimeException;
use Throwable;

class OpenAiSdgClassifier
{
    private const SDGS = [
        1 => 'No Poverty',
        2 => 'Zero Hunger',
        3 => 'Good Health and Well-being',
        4 => 'Quality Education',
        5 => 'Gender Equality',
        6 => 'Clean Water and Sanitation',
        7 => 'Affordable and Clean Energy',
        8 => 'Decent Work and Economic Growth',
        9 => 'Industry, Innovation and Infrastructure',
        10 => 'Reduced Inequalities',
        11 => 'Sustainable Cities and Communities',
        12 => 'Responsible Consumption and Production',
        13 => 'Climate Action',
        14 => 'Life Below Water',
        15 => 'Life on Land',
        16 => 'Peace, Justice and Strong Institutions',
        17 => 'Partnerships for the Goals',
    ];

    public function __construct(
        private ?ClientContract $client = null,
    ) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{
     *     primary_sdg: array<string, mixed>|null,
     *     suggested_sdgs: array<int, array<string, mixed>>,
     *     overall_confidence: float,
     *     evidence_keywords: array<int, string>,
     *     warnings: array<int, string>,
     *     model: string,
     *     raw_response: array<string, mixed>
     * }
     */
    public function classify(array $payload): array
    {
        $apiKey = trim((string) config('services.openai.api_key'));

        if (blank($apiKey)) {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $model = (string) config('services.openai.model', 'gpt-4o-mini');

        try {
            $response = $this->client()->chat()->create([
                'model' => $model,
                'temperature' => 0.1,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => implode(' ', [
                            'You classify research documents into UN Sustainable Development Goals.',
                            'Use only the supported SDG list provided by the user.',
                            'Base the classification on explicit evidence from the metadata and PDF text excerpt.',
                            'Do not invent unsupported SDGs or infer broad SDGs without clear topical evidence.',
                            'Return one primary SDG and up to three secondary SDGs when supported.',
                            'If no SDG is clear, return primary_sdg as null, suggested_sdgs as an empty array, low confidence, and a concise warning.',
                        ]),
                    ],
                    [
                        'role' => 'user',
                        'content' => json_encode([
                            'supported_sdgs' => $this->supportedSdgs(),
                            'document' => $this->documentPayload($payload),
                        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                    ],
                ],
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => 'research_sdg_classification',
                        'strict' => true,
                        'schema' => $this->schema(),
                    ],
                ],
            ]);
        } catch (Throwable $exception) {
            throw new RuntimeException('OpenAI SDG classification failed: '.$exception->getMessage(), previous: $exception);
        }

        $content = $response->choices[0]->message->content ?? null;

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('OpenAI returned an empty SDG classification response.');
        }

        try {
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            throw new RuntimeException('OpenAI returned invalid SDG classification JSON: '.$exception->getMessage(), previous: $exception);
        }

        return $this->normalizeResult($decoded, $response->toArray(), $model);
    }

    private function client(): ClientContract
    {
        if ($this->client) {
            return $this->client;
        }

        return $this->client = \OpenAI::client((string) config('services.openai.api_key'));
    }

    /**
     * @return array<int, array{sdg_number: int, sdg_name: string}>
     */
    private function supportedSdgs(): array
    {
        return collect(self::SDGS)
            ->map(fn (string $name, int $number): array => [
                'sdg_number' => $number,
                'sdg_name' => $name,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function documentPayload(array $payload): array
    {
        return [
            'document_type' => $this->nullableString($payload['document_type'] ?? null),
            'title' => $this->nullableString($payload['title'] ?? null),
            'abstract' => $this->nullableString($payload['abstract'] ?? null),
            'keywords' => $this->stringList($payload['keywords'] ?? []),
            'methodology' => $this->nullableString($payload['methodology'] ?? null),
            'results_and_discussion' => $this->nullableString($payload['results_and_discussion'] ?? null),
            'research_category' => $this->nullableString($payload['research_category'] ?? null),
            'pdf_text_excerpt' => Str::limit((string) ($payload['pdf_text_excerpt'] ?? ''), 12000, ''),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function schema(): array
    {
        $sdg = [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => ['sdg_number', 'sdg_name', 'confidence_score', 'reason'],
            'properties' => [
                'sdg_number' => [
                    'type' => 'integer',
                    'minimum' => 1,
                    'maximum' => 17,
                ],
                'sdg_name' => [
                    'type' => 'string',
                    'enum' => array_values(self::SDGS),
                ],
                'confidence_score' => [
                    'type' => 'number',
                    'minimum' => 0,
                    'maximum' => 1,
                ],
                'reason' => ['type' => 'string'],
            ],
        ];

        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => [
                'primary_sdg',
                'suggested_sdgs',
                'overall_confidence',
                'evidence_keywords',
                'warnings',
            ],
            'properties' => [
                'primary_sdg' => [
                    'anyOf' => [
                        $sdg,
                        ['type' => 'null'],
                    ],
                ],
                'suggested_sdgs' => [
                    'type' => 'array',
                    'maxItems' => 4,
                    'items' => $sdg,
                ],
                'overall_confidence' => [
                    'type' => 'number',
                    'minimum' => 0,
                    'maximum' => 1,
                ],
                'evidence_keywords' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'warnings' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $decoded
     * @param  array<string, mixed>  $rawResponse
     * @return array<string, mixed>
     */
    private function normalizeResult(array $decoded, array $rawResponse, string $model): array
    {
        $suggestedSdgs = collect(Arr::wrap($decoded['suggested_sdgs'] ?? []))
            ->map(fn (mixed $item): ?array => $this->normalizeSdg($item))
            ->filter()
            ->unique('sdg_number')
            ->take(4)
            ->values()
            ->all();
        $primarySdg = $this->normalizeSdg($decoded['primary_sdg'] ?? null);

        if ($primarySdg !== null && collect($suggestedSdgs)->where('sdg_number', $primarySdg['sdg_number'])->isEmpty()) {
            array_unshift($suggestedSdgs, $primarySdg);
            $suggestedSdgs = array_slice($suggestedSdgs, 0, 4);
        }

        if ($primarySdg === null && $suggestedSdgs !== []) {
            $primarySdg = $suggestedSdgs[0];
        }

        $warnings = $this->stringList($decoded['warnings'] ?? []);

        if ($suggestedSdgs === [] && $warnings === []) {
            $warnings[] = 'No clear SDG alignment was found from the supplied document evidence.';
        }

        return [
            'primary_sdg' => $primarySdg,
            'suggested_sdgs' => $suggestedSdgs,
            'overall_confidence' => min(1.0, max(0.0, (float) ($decoded['overall_confidence'] ?? 0))),
            'evidence_keywords' => $this->stringList($decoded['evidence_keywords'] ?? []),
            'warnings' => $warnings,
            'model' => $model,
            'raw_response' => $rawResponse,
        ];
    }

    /**
     * @return array{sdg_number: int, sdg_name: string, confidence_score: float, reason: string}|null
     */
    private function normalizeSdg(mixed $value): ?array
    {
        if (! is_array($value)) {
            return null;
        }

        $number = filter_var($value['sdg_number'] ?? null, FILTER_VALIDATE_INT);

        if ($number === false || ! isset(self::SDGS[$number])) {
            return null;
        }

        $name = $this->nullableString($value['sdg_name'] ?? null);

        if ($name !== self::SDGS[$number]) {
            return null;
        }

        return [
            'sdg_number' => $number,
            'sdg_name' => self::SDGS[$number],
            'confidence_score' => min(1.0, max(0.0, (float) ($value['confidence_score'] ?? 0))),
            'reason' => $this->nullableString($value['reason'] ?? null) ?? '',
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        if (! is_string($value)) {
            return null;
        }

        $value = trim($value);

        return $value === '' ? null : $value;
    }

    /**
     * @return array<int, string>
     */
    private function stringList(mixed $value): array
    {
        return collect(Arr::wrap($value))
            ->filter(fn (mixed $item): bool => is_string($item) && trim($item) !== '')
            ->map(fn (string $item): string => trim($item))
            ->values()
            ->all();
    }
}
