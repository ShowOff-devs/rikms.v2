<?php

use App\Services\MongoIndexReadinessService;

test('mongo index readiness creates every missing required index', function () {
    $service = new class extends MongoIndexReadinessService
    {
        /** @var array<string, array<string, array<string, int>>> */
        public array $indexes = [];

        /** @var array<int, string> */
        public array $created = [];

        protected function existingIndexes(string $collection): array
        {
            return $this->indexes[$collection] ?? [];
        }

        protected function createIndex(string $collection, string $name, array $keys): void
        {
            $this->indexes[$collection][$name] = $keys;
            $this->created[] = $collection.'.'.$name;
        }
    };

    $before = $service->inspect();
    $after = $service->inspect(true);

    expect($before['ready'])->toBeFalse()
        ->and($before['missing'])->toHaveCount(6)
        ->and($after['ready'])->toBeTrue()
        ->and($after['created'])->toHaveCount(6)
        ->and($service->created)->toHaveCount(6);
});

test('mongo index readiness fails closed on a conflicting index definition', function () {
    $service = new class extends MongoIndexReadinessService
    {
        /** @var array<string, array<string, array<string, int>>> */
        public array $indexes = [];

        protected function existingIndexes(string $collection): array
        {
            return $this->indexes[$collection] ?? [];
        }

        protected function createIndex(string $collection, string $name, array $keys): void
        {
            $this->indexes[$collection][$name] = $keys;
        }
    };

    $service->inspect(true);
    $service->indexes['ai_metadata']['ai_metadata_research_agency_processed_at_index'] = ['research_id' => -1];

    $status = $service->inspect(true);

    expect($status['ready'])->toBeFalse()
        ->and($status['mismatched'])->toBe([
            'ai_metadata.ai_metadata_research_agency_processed_at_index',
        ]);
});
