<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! $this->mongodbConfigured()) {
            return;
        }

        foreach ($this->collections() as $collection => $indexes) {
            foreach ($indexes as $name => $keys) {
                try {
                    DB::connection('mongodb')
                        ->getCollection($collection)
                        ->createIndex($keys, ['name' => $name, 'background' => true]);
                } catch (Throwable $exception) {
                    Log::warning('Unable to create MongoDB AI result index.', [
                        'collection' => $collection,
                        'index' => $name,
                        'error' => $exception->getMessage(),
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! $this->mongodbConfigured()) {
            return;
        }

        foreach ($this->collections() as $collection => $indexes) {
            foreach (array_keys($indexes) as $name) {
                try {
                    DB::connection('mongodb')
                        ->getCollection($collection)
                        ->dropIndex($name);
                } catch (Throwable) {
                    // The index may not exist in local or partially migrated environments.
                }
            }
        }
    }

    /**
     * @return array<string, array<string, array<string, int>>>
     */
    private function collections(): array
    {
        return [
            'ai_metadata' => [
                'ai_metadata_research_agency_processed_at_index' => [
                    'research_id' => 1,
                    'agency_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
                'ai_metadata_research_file_processed_at_index' => [
                    'research_id' => 1,
                    'file_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
            ],
            'pdf_parsing_results' => [
                'pdf_parsing_results_research_agency_processed_at_index' => [
                    'research_id' => 1,
                    'agency_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
                'pdf_parsing_results_research_file_processed_at_index' => [
                    'research_id' => 1,
                    'file_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
            ],
            'sdg_classifications' => [
                'sdg_classifications_research_agency_processed_at_index' => [
                    'research_id' => 1,
                    'agency_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
                'sdg_classifications_research_file_processed_at_index' => [
                    'research_id' => 1,
                    'file_id' => 1,
                    'processed_at' => -1,
                    'created_at' => -1,
                ],
            ],
        ];
    }

    private function mongodbConfigured(): bool
    {
        return filled(config('database.connections.mongodb.dsn'))
            || filled(config('database.connections.mongodb.database'))
            || filled(env('MONGODB_URI'));
    }
};
