<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_user_states', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('notification_id')->constrained('notifications')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('hidden_at')->nullable();
            $table->timestamps();

            $table->unique(['notification_id', 'user_id'], 'notification_user_states_unique');
            $table->index(['user_id', 'hidden_at'], 'notification_user_states_visibility_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_user_states');
    }
};
