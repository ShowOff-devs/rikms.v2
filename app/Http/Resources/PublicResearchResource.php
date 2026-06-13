<?php

namespace App\Http\Resources;

use App\Support\PublicMetadata;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicResearchResource extends JsonResource
{
    private const SDG_COLORS = [
        'SDG 1' => '#e5243b',
        'SDG 2' => '#dda63a',
        'SDG 3' => '#4c9f38',
        'SDG 4' => '#c5192d',
        'SDG 5' => '#ff3a21',
        'SDG 6' => '#26bde2',
        'SDG 7' => '#fcc30b',
        'SDG 8' => '#a21942',
        'SDG 9' => '#fd6925',
        'SDG 10' => '#dd1367',
        'SDG 11' => '#fd9d24',
        'SDG 12' => '#bf8b2e',
        'SDG 13' => '#3f7e44',
        'SDG 14' => '#0a97d9',
        'SDG 15' => '#56c02b',
        'SDG 16' => '#00689d',
        'SDG 17' => '#19486a',
    ];

    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $sdgs = $this->sdgs ?? [];
        $category = $this->category ?: 'Uncategorized';
        $hasPublicMetadataConfig = $this->hasPublicMetadataConfig();
        $publicMetadataFields = $this->publicMetadataFields($hasPublicMetadataConfig);
        $publicMetadata = $this->publicMetadata($publicMetadataFields, $hasPublicMetadataConfig);
        $accessLevel = $this->publicAccessLevel((string) $this->access_level);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'public_identifier' => $this->slug ?: (string) $this->id,
            'title' => $this->title,
            'abstract' => $this->publicFieldIsVisible('abstract', $publicMetadataFields, $hasPublicMetadataConfig) ? ($this->abstract ?: '') : '',
            'methodology' => $this->publicMetadataValue('methodology', $publicMetadata) ?? '',
            'authors' => $this->publicFieldIsVisible('authors', $publicMetadataFields, $hasPublicMetadataConfig) ? ($this->authors ?? []) : [],
            'agency' => $this->agency?->short_name ?: $this->agency?->name ?: '',
            'publicationYear' => (int) $this->publication_year,
            'category' => $category,
            'sdgs' => $sdgs,
            'tags' => [
                ...array_map(fn (string $sdg): array => [
                    'label' => $sdg,
                    'color' => self::SDG_COLORS[$sdg] ?? '#1e3a8a',
                    'type' => 'sdg',
                ], $sdgs),
                [
                    'label' => $category,
                    'color' => '#f3f4f6',
                    'type' => 'category',
                ],
            ],
            'accessLevel' => $accessLevel,
            'embargoUntil' => $this->embargo_until?->toDateString(),
            'externalUrl' => $this->external_url,
            'status' => $this->status,
            'downloads' => (int) $this->downloads,
            'updatedAt' => $this->updated_at?->toDateString(),
            'keywords' => $this->publicFieldIsVisible('keywords', $publicMetadataFields, $hasPublicMetadataConfig) ? ($this->keywords ?? []) : [],
            'publicMetadata' => $publicMetadata,
            'publicMetadataFields' => $publicMetadataFields,
            'public_metadata' => $publicMetadata,
            'public_metadata_fields' => $publicMetadataFields,
        ];
    }

    private function hasPublicMetadataConfig(): bool
    {
        return is_array($this->public_metadata_fields) || is_array($this->public_metadata);
    }

    /**
     * @return list<string>
     */
    private function publicMetadataFields(bool $hasPublicMetadataConfig): array
    {
        if (! $hasPublicMetadataConfig) {
            return ['title', 'abstract', 'authors', 'keywords'];
        }

        $fields = PublicMetadata::normalizeFieldList($this->public_metadata_fields);

        if ($fields !== []) {
            return $fields;
        }

        return PublicMetadata::fieldListFromMetadata($this->public_metadata);
    }

    private function publicFieldIsVisible(string $key, array $publicMetadataFields, bool $hasPublicMetadataConfig): bool
    {
        if (! $hasPublicMetadataConfig) {
            return true;
        }

        return in_array($key, $publicMetadataFields, true);
    }

    /**
     * @param  list<string>  $publicMetadataFields
     * @return list<array{key: string, label: string, value: string}>
     */
    private function publicMetadata(array $publicMetadataFields, bool $hasPublicMetadataConfig): array
    {
        $storedMetadata = collect(PublicMetadata::normalizeMetadataEntries($this->public_metadata))
            ->keyBy('key');
        $fields = $hasPublicMetadataConfig
            ? $publicMetadataFields
            : ['title', 'abstract', 'authors', 'keywords'];

        return collect($fields)
            ->map(function (string $key) use ($storedMetadata): array {
                $storedField = $storedMetadata->get($key);

                return [
                    'key' => $key,
                    'label' => PublicMetadata::FIELD_LABELS[$key],
                    'value' => $storedField['value'] ?? $this->recordMetadataValue($key),
                ];
            })
            ->filter(fn (array $field): bool => trim($field['value']) !== '')
            ->values()
            ->all();
    }

    private function publicMetadataValue(string $key, array $publicMetadata): ?string
    {
        $field = collect($publicMetadata)->firstWhere('key', $key);

        return is_array($field) ? $field['value'] : null;
    }

    private function recordMetadataValue(string $key): string
    {
        return match ($key) {
            'title' => (string) $this->title,
            'abstract' => (string) $this->abstract,
            'authors' => implode(', ', $this->authors ?? []),
            'keywords' => implode(', ', $this->keywords ?? []),
            'publication_year' => (string) $this->publication_year,
            'implementing_agency' => $this->agency?->short_name ?: $this->agency?->name ?: '',
            'sdg_tags' => implode(', ', $this->sdgs ?? []),
            default => '',
        };
    }

    private function publicAccessLevel(string $accessLevel): string
    {
        return match ($accessLevel) {
            'request_required', 'private' => 'restricted',
            'embargoed' => 'embargo',
            default => $accessLevel,
        };
    }
}
