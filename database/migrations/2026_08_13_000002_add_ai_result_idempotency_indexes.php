<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (! filled(config('database.connections.mongodb.dsn'))) {
            return;
        }

        foreach ($this->collections() as $collection) {
            DB::connection('mongodb')
                ->getCollection($collection)
                ->createIndex(
                    ['idempotency_key' => 1],
                    ['name' => $collection.'_idempotency_key_unique', 'unique' => true, 'sparse' => true],
                );
        }
    }

    public function down(): void
    {
        if (! filled(config('database.connections.mongodb.dsn'))) {
            return;
        }

        foreach ($this->collections() as $collection) {
            DB::connection('mongodb')
                ->getCollection($collection)
                ->dropIndex($collection.'_idempotency_key_unique');
        }
    }

    /** @return array<int, string> */
    private function collections(): array
    {
        return ['pdf_parsing_results', 'ai_metadata', 'sdg_classifications'];
    }
};
