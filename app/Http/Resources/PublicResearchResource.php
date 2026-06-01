<?php

namespace App\Http\Resources;

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

        $accessLevel = $this->publicAccessLevel((string) $this->access_level);

        return [
            'id' => $this->slug ?: (string) $this->id,
            'title' => $this->title,
            'abstract' => $this->abstract ?: '',
            'authors' => $this->authors ?? [],
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
            'keywords' => $this->keywords ?? [],
        ];
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
