<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('research', function (Blueprint $table): void {
            $table->string('research_owner_name')->nullable();
            $table->string('research_owner_email')->nullable();
            $table->boolean('notify_owner_access_requests')->default(true);
            $table->boolean('notify_owner_research_inquiries')->default(false);
            $table->boolean('send_owner_copy_to_admin')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('research', function (Blueprint $table): void {
            $table->dropColumn([
                'research_owner_name',
                'research_owner_email',
                'notify_owner_access_requests',
                'notify_owner_research_inquiries',
                'send_owner_copy_to_admin',
            ]);
        });
    }
};
