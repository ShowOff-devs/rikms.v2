<?php

use App\Models\Agency;
use App\Models\AuditLog;
use App\Models\Research;
use App\Models\User;
use Illuminate\Support\Facades\DB;

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('profile.edit'));

    $response->assertOk();
});

test('profile information can be updated', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    $user->refresh();

    expect($user->name)->toBe('Test User');
    expect($user->email)->toBe('test@example.com');
    expect($user->email_verified_at)->toBeNull();
});

test('email verification status is unchanged when the email address is unchanged', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->patch(route('profile.update'), [
            'name' => 'Test User',
            'email' => $user->email,
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email_verified_at)->not->toBeNull();
});

test('user can delete their account', function () {
    $user = User::factory()->create();

    DB::table('sessions')->insert([
        'id' => 'profile-delete-other-session',
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'RIKMS test browser',
        'payload' => 'test-payload',
        'last_activity' => now()->timestamp,
    ]);

    $response = $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ]);

    $response
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('home'));

    $this->assertGuest();

    $this->assertSoftDeleted('users', [
        'id' => $user->id,
    ]);
    $this->assertDatabaseHas('users', [
        'id' => $user->id,
        'status' => 'archived',
    ]);
    $this->assertDatabaseMissing('sessions', [
        'id' => 'profile-delete-other-session',
    ]);

    $deletedUser = User::withTrashed()->findOrFail($user->id);

    expect($deletedUser->deleted_at)->not->toBeNull()
        ->and($deletedUser->archived_at)->not->toBeNull()
        ->and($deletedUser->archived_by)->toBe($user->id)
        ->and($deletedUser->archive_reason)->toBe('Self-service account deletion.')
        ->and(User::query()->whereKey($user->id)->exists())->toBeFalse()
        ->and(User::onlyTrashed()->whereKey($user->id)->exists())->toBeTrue();

    $this->post(route('login.store'), [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'user.account_deleted',
        'auditable_type' => (new User)->getMorphClass(),
        'auditable_id' => $user->id,
    ]);

    $superAdmin = User::factory()->withTwoFactor()->create([
        'role' => 'super_admin',
        'status' => 'active',
    ]);

    $activeUserIds = collect($this->actingAs($superAdmin)
        ->getJson('/api/admin/users')
        ->assertOk()
        ->json('data'))
        ->pluck('id');
    $archivedUserIds = collect($this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/users')
        ->assertOk()
        ->json('data'))
        ->pluck('id');

    expect($activeUserIds)->not->toContain($user->id)
        ->and($archivedUserIds)->toContain($user->id);
});

test('correct password must be provided to delete account', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), [
            'password' => 'wrong-password',
        ]);

    $response
        ->assertSessionHasErrors('password')
        ->assertRedirect(route('profile.edit'));

    expect($user->fresh())->not->toBeNull();
});

test('account deletion preserves related research and audit history', function () {
    $agency = Agency::create([
        'slug' => 'profile-delete-history-'.str()->random(6),
        'name' => 'Profile Delete History Agency',
        'short_name' => 'PDH',
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);
    $research = Research::create([
        'slug' => 'profile-delete-history-'.str()->random(6),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Profile Delete History Research',
        'abstract' => 'A retained research record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['retention'],
        'status' => 'published',
        'access_level' => 'public',
    ]);
    $auditLog = AuditLog::create([
        'user_id' => $user->id,
        'agency_id' => $agency->id,
        'event' => 'test.history_retained',
        'auditable_type' => $research->getMorphClass(),
        'auditable_id' => $research->id,
        'metadata' => ['purpose' => 'account deletion history test'],
        'created_at' => now(),
    ]);

    $this
        ->actingAs($user)
        ->delete(route('profile.destroy'), [
            'password' => 'password',
        ])
        ->assertSessionHasNoErrors();

    expect(Research::withTrashed()->whereKey($research->id)->exists())->toBeTrue()
        ->and(AuditLog::query()->whereKey($auditLog->id)->exists())->toBeTrue()
        ->and(User::withTrashed()->findOrFail($user->id)->researchUploads()->withTrashed()->whereKey($research->id)->exists())->toBeTrue();
});
