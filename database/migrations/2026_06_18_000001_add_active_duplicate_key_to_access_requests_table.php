<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->string('active_duplicate_key', 64)->nullable()->after('status');
        });

        $seenKeys = [];

        DB::table('access_requests')
            ->where('status', 'pending')
            ->whereNotNull('requester_email')
            ->orderBy('id')
            ->select(['id', 'research_id', 'requester_email'])
            ->chunkById(200, function ($requests) use (&$seenKeys): void {
                foreach ($requests as $request) {
                    $normalizedEmail = mb_strtolower(trim((string) $request->requester_email));

                    if ($normalizedEmail === '' || $request->research_id === null) {
                        continue;
                    }

                    $key = hash('sha256', $request->research_id.':'.$normalizedEmail);

                    if (isset($seenKeys[$key])) {
                        continue;
                    }

                    $seenKeys[$key] = true;

                    DB::table('access_requests')
                        ->where('id', $request->id)
                        ->update(['active_duplicate_key' => $key]);
                }
            });

        Schema::table('access_requests', function (Blueprint $table): void {
            $table->unique('active_duplicate_key', 'access_requests_active_duplicate_key_unique');
        });
    }

    public function down(): void
    {
        Schema::table('access_requests', function (Blueprint $table): void {
            $table->dropUnique('access_requests_active_duplicate_key_unique');
            $table->dropColumn('active_duplicate_key');
        });
    }
};
