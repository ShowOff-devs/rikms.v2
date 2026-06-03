<?php

namespace App\Services\AI;

use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use OpenAI\Contracts\ClientContract;
use RuntimeException;
use Throwable;

class OpenAiResearchMetadataExtractor
{
    public function __construct(
        private ?ClientContract $client = null,
    ) {}

    /**
     * @return array{
     *     title: ?string,
     *     authors: array<int, string>,
     *     abstract: ?string,
     *     keywords: array<int, string>,
     *     publication_year: ?int,
     *     research_category: ?string,
     *     confidence_score: float,
     *     warnings: array<int, string>,
     *     raw_response: array<string, mixed>
     * }
     */
    public function extract(string $text): array
    {
        $apiKey = (string) config('services.openai.api_key');

        if ($apiKey === '') {
            throw new RuntimeException('OPENAI_API_KEY is not configured.');
        }

        $model = (string) config('services.openai.model', 'gpt-4o-mini');
        $maxChars = max(1000, (int) config('services.openai.metadata_max_chars', 20000));
        $input = Str::limit($text, $maxChars, '');

        try {
            $response = $this->client()->chat()->create([
                'model' => $model,
                'temperature' => 0.1,
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => implode(' ', [
                            'Extract bibliographic metadata from research PDF text.',
                            'Use only information explicitly present in the text.',
                            'Do not invent missing data; return null or empty arrays when uncertain.',
                            'Keep warnings concise and factual.',
                        ]),
                    ],
                    [
                        'role' => 'user',
                        'content' => "PDF text:\n\n".$input,
                    ],
                ],
                'response_format' => [
                    'type' => 'json_schema',
                    'json_schema' => [
                        'name' => 'research_metadata_extraction',
                        'strict' => true,
                        'schema' => $this->schema(),
                    ],
                ],
            ]);
        } catch (Throwable $exception) {
            throw new RuntimeException('OpenAI metadata extraction failed: '.$exception->getMessage(), previous: $exception);
        }

        $content = $response->choices[0]->message->content ?? null;

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('OpenAI returned an empty metadata response.');
        }

        try {
            $decoded = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
        } catch (Throwable $exception) {
            throw new RuntimeException('OpenAI returned invalid metadata JSON: '.$exception->getMessage(), previous: $exception);
        }

        return $this->normalizeResult($decoded, $response->toArray());
    }

    private function client(): ClientContract
    {
        if ($this->client) {
            return $this->client;
        }

        return $this->client = \OpenAI::client((string) config('services.openai.api_key'));
    }

    /**
     * @return array<string, mixed>
     */
    private function schema(): array
    {
        return [
            'type' => 'object',
            'additionalProperties' => false,
            'required' => [
                'title',
                'authors',
                'abstract',
                'keywords',
                'publication_year',
                'research_category',
                'confidence_score',
                'warnings',
            ],
            'properties' => [
                'title' => ['type' => ['string', 'null']],
                'authors' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'abstract' => ['type' => ['string', 'null']],
                'keywords' => [
                    'type' => 'array',
                    'items' => ['type' => 'string'],
                ],
                'publication_year' => ['type' => ['integer', 'null']],
                'research_category' => ['type' => ['string', 'null']],
                'confidence_score' => [
                    'type' => 'number',
                    'minimum' => 0,
                    'maximum' => 1,
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
    private function normalizeResult(array $decoded, array $rawResponse): array
    {
        return [
            'title' => $this->nullableString($decoded['title'] ?? null),
            'authors' => $this->stringList($decoded['authors'] ?? []),
            'abstract' => $this->nullableString($decoded['abstract'] ?? null),
            'keywords' => $this->stringList($decoded['keywords'] ?? []),
            'publication_year' => $this->nullableYear($decoded['publication_year'] ?? null),
            'research_category' => $this->nullableString($decoded['research_category'] ?? null),
            'confidence_score' => min(1.0, max(0.0, (float) ($decoded['confidence_score'] ?? 0))),
            'warnings' => $this->stringList($decoded['warnings'] ?? []),
            'raw_response' => $rawResponse,
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

    private function nullableYear(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }

        $year = filter_var($value, FILTER_VALIDATE_INT);

        if ($year === false || $year < 1500 || $year > ((int) date('Y') + 1)) {
            return null;
        }

        return $year;
    }
}
