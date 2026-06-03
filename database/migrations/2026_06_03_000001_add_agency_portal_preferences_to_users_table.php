<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('profile_photo_path')->nullable()->after('status');
            $table->json('notification_preferences')->nullable()->after('profile_photo_path');
            $table->json('security_preferences')->nullable()->after('notification_preferences');
            $table->timestamp('deactivation_requested_at')->nullable()->after('security_preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'profile_photo_path',
                'notification_preferences',
                'security_preferences',
                'deactivation_requested_at',
            ]);
        });
    }
};
