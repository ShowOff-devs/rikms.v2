<?php

namespace App\Support;

class PublicMetadata
{
    public const FIELD_LABELS = [
        'title' => 'Title',
        'abstract' => 'Abstract',
        'methodology' => 'Methodology',
        'review_of_related_literature' => 'Review of Related Literature',
        'theoretical_framework' => 'Theoretical Framework',
        'results_and_discussion' => 'Results and Discussion',
        'keywords' => 'Keywords',
        'authors' => 'Authors',
        'publication_year' => 'Publication Year',
        'funding_source' => 'Funding Source',
        'implementing_agency' => 'Implementing Agency',
        'project_leader' => 'Project Leader',
        'study_location' => 'Study Location',
        'sdg_tags' => 'SDG Tags',
    ];

    public const KEY_ALIASES = [
        'method' => 'methodology',
        'reviewRelatedLiterature' => 'review_of_related_literature',
        'reviewOfRelatedLiterature' => 'review_of_related_literature',
        'theoretical' => 'theoretical_framework',
        'theoreticalFramework' => 'theoretical_framework',
        'resultsDiscussion' => 'results_and_discussion',
        'resultsAndDiscussion' => 'results_and_discussion',
        'sdgs' => 'sdg_tags',
    ];

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return array_keys(self::FIELD_LABELS);
    }

    /**
     * @return list<string>
     */
    public static function acceptedKeys(): array
    {
        return array_values(array_unique([
            ...self::keys(),
            ...array_keys(self::KEY_ALIASES),
        ]));
    }

    public static function normalizeKey(mixed $key): ?string
    {
        if (! is_string($key) || trim($key) === '') {
            return null;
        }

        $normalized = self::KEY_ALIASES[$key] ?? $key;

        return array_key_exists($normalized, self::FIELD_LABELS)
            ? $normalized
            : null;
    }

    /**
     * @return list<string>
     */
    public static function normalizeFieldList(mixed $fields): array
    {
        if (! is_array($fields)) {
            return [];
        }

        $normalized = [];

        foreach ($fields as $field) {
            $key = self::normalizeKey($field);

            if ($key !== null && ! in_array($key, $normalized, true)) {
                $normalized[] = $key;
            }
        }

        return $normalized;
    }

    /**
     * @return list<array{key: string, label: string, value: string}>
     */
    public static function normalizeMetadataEntries(mixed $fields): array
    {
        if (! is_array($fields)) {
            return [];
        }

        $normalized = [];

        foreach ($fields as $field) {
            if (! is_array($field)) {
                continue;
            }

            $key = self::normalizeKey($field['key'] ?? null);

            if ($key === null) {
                continue;
            }

            $normalized[$key] = [
                'key' => $key,
                'label' => self::FIELD_LABELS[$key],
                'value' => (string) ($field['value'] ?? ''),
            ];
        }

        return array_values($normalized);
    }

    /**
     * @return list<string>
     */
    public static function fieldListFromMetadata(mixed $fields): array
    {
        return collect(self::normalizeMetadataEntries($fields))
            ->pluck('key')
            ->values()
            ->all();
    }
}
