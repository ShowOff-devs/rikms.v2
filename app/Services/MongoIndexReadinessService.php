<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class MongoIndexReadinessService
{
    /**
     * @return array{
     *     ready: bool,
     *     missing: array<int, string>,
     *     mismatched: array<int, string>,
     *     created: array<int, string>
     * }
     */
    public function inspect(bool $createMissing = false): array
    {
        $missing = [];
        $mismatched = [];
        $created = [];

        foreach ($this->definitions() as $collection => $indexes) {
            $existing = $this->existingIndexes($collection);

            foreach ($indexes as $name => $keys) {
                $identifier = $collection.'.'.$name;

                if (! array_key_exists($name, $existing)) {
                    if ($createMissing) {
                        $this->createIndex($collection, $name, $keys);
                        $created[] = $identifier;
                    } else {
                        $missing[] = $identifier;
                    }

                    continue;
                }

                if ($existing[$name] !== $keys) {
                    $mismatched[] = $identifier;
                }
            }
        }

        return [
            'ready' => $missing === [] && $mismatched === [],
            'missing' => $missing,
            'mismatched' => $mismatched,
            'created' => $created,
        ];
    }

    /** @return array<string, array<string, array<string, int>>> */
    public function definitions(): array
    {
        return [
            'ai_metadata' => $this->collectionIndexes('ai_metadata'),
            'pdf_parsing_results' => $this->collectionIndexes('pdf_parsing_results'),
            'sdg_classifications' => $this->collectionIndexes('sdg_classifications'),
        ];
    }

    /** @return array<string, array<string, int>> */
    private function collectionIndexes(string $prefix): array
    {
        return [
            $prefix.'_research_agency_processed_at_index' => [
                'research_id' => 1,
                'agency_id' => 1,
                'processed_at' => -1,
                'created_at' => -1,
            ],
            $prefix.'_research_file_processed_at_index' => [
                'research_id' => 1,
                'file_id' => 1,
                'processed_at' => -1,
                'created_at' => -1,
            ],
        ];
    }

    /** @return array<string, array<string, int>> */
    protected function existingIndexes(string $collection): array
    {
        $indexes = [];

        foreach (DB::connection('mongodb')->getCollection($collection)->listIndexes() as $index) {
            $name = $index->getName();

            if ($name === '_id_') {
                continue;
            }

            $indexes[$name] = $index->getKey();
        }

        return $indexes;
    }

    /** @param array<string, int> $keys */
    protected function createIndex(string $collection, string $name, array $keys): void
    {
        DB::connection('mongodb')
            ->getCollection($collection)
            ->createIndex($keys, ['name' => $name]);
    }
}
