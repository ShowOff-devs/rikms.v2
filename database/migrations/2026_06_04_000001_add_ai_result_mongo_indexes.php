<?php

use App\Services\MongoIndexReadinessService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

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

        $status = app(MongoIndexReadinessService::class)->inspect(true);

        if (! $status['ready']) {
            throw new RuntimeException('MongoDB AI result indexes do not match the required definitions.');
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

        foreach (app(MongoIndexReadinessService::class)->definitions() as $collection => $indexes) {
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

    private function mongodbConfigured(): bool
    {
        return filled(config('database.connections.mongodb.dsn'));
    }
};
