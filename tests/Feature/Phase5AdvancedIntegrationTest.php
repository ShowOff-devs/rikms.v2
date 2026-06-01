<?php

use App\Models\Agency;
use App\Models\ArchiveRecord;
use App\Models\Notification;
use App\Models\Research;
use App\Models\Role;
use App\Models\User;

function createPhase5Agency(string $slug): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createPhase5Role(string $slug): Role
{
    return Role::updateOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function createPhase5User(string $role, ?Agency $agency = null): User
{
    $user = User::factory()->create([
        'agency_id' => $agency?->id,
        'role' => $role,
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createPhase5Role($role)->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createPhase5Research(Agency $agency, User $uploader, string $status = 'draft'): Research
{
    return Research::create([
        'slug' => 'phase-5-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $uploader->id,
        'title' => 'Phase 5 Research',
        'abstract' => 'A Phase 5 integration record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Governance',
        'sdgs' => ['SDG 16'],
        'keywords' => ['phase 5'],
        'status' => $status,
        'access_level' => 'request_required',
    ]);
}

test('agency and admin AI result endpoints enforce scope and return graceful empty states', function () {
    $ownAgency = createPhase5Agency('phase-five-ai-own');
    $otherAgency = createPhase5Agency('phase-five-ai-other');
    $agencyAdmin = createPhase5User('agency_admin', $ownAgency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $superAdmin = createPhase5User('super_admin');
    $ownResearch = createPhase5Research($ownAgency, $agencyAdmin, 'submitted');
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$ownResearch->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.research_id', $ownResearch->id)
        ->assertJsonPath('data.ai_metadata.status', 'not_available')
        ->assertJsonMissingPath('data.ai_metadata.raw_payload');

    $this->actingAs($agencyAdmin)
        ->getJson("/api/agency/research/{$otherResearch->id}/ai-results")
        ->assertForbidden();

    $this->actingAs($superAdmin)
        ->getJson("/api/admin/research/{$otherResearch->id}/ai-results")
        ->assertOk()
        ->assertJsonPath('data.research_id', $otherResearch->id);
});

test('agency admin can archive list and restore own non published research only', function () {
    $agency = createPhase5Agency('phase-five-archive-agency');
    $otherAgency = createPhase5Agency('phase-five-archive-other');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $otherAdmin = createPhase5User('agency_admin', $otherAgency);
    $research = createPhase5Research($agency, $agencyAdmin, 'submitted');
    $publishedResearch = createPhase5Research($agency, $agencyAdmin, 'published');
    $otherResearch = createPhase5Research($otherAgency, $otherAdmin, 'submitted');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$publishedResearch->id}/archive", [
            'reason' => 'Agency tried to archive published record.',
        ])
        ->assertUnprocessable();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$otherResearch->id}/archive", [
            'reason' => 'Cross agency archive attempt.',
        ])
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/archive", [
            'reason' => 'Superseded draft.',
        ])
        ->assertOk()
        ->assertJsonPath('data.status', 'archived');

    $this->actingAs($agencyAdmin)
        ->getJson('/api/agency/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'submitted');

    $this->assertDatabaseHas('audit_logs', ['event' => 'agency.research.archived']);
    $this->assertDatabaseHas('audit_logs', ['event' => 'agency.research.restored']);
});

test('admin can list archived research and restore records', function () {
    $agency = createPhase5Agency('phase-five-admin-archive');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $superAdmin = createPhase5User('super_admin');
    $research = createPhase5Research($agency, $agencyAdmin, 'archived');

    $research->update([
        'archived_at' => now(),
        'archived_by' => $superAdmin->id,
        'archive_reason' => 'Admin archive listing test.',
    ]);

    ArchiveRecord::create([
        'archivable_type' => $research->getMorphClass(),
        'archivable_id' => $research->id,
        'archived_by' => $superAdmin->id,
        'reason' => 'Admin archive listing test.',
        'metadata' => ['previous_status' => 'published'],
        'archived_at' => now(),
    ]);

    $this->actingAs($superAdmin)
        ->getJson('/api/admin/archive/research')
        ->assertOk()
        ->assertJsonPath('meta.pagination.total', 1)
        ->assertJsonPath('data.0.archive_reason', 'Admin archive listing test.');

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/research/{$research->id}/restore")
        ->assertOk()
        ->assertJsonPath('data.status', 'published');
});

test('notification mark read endpoints only update notifications in scope', function () {
    $agency = createPhase5Agency('phase-five-notifications');
    $agencyAdmin = createPhase5User('agency_admin', $agency);
    $otherUser = createPhase5User('public_user');
    $superAdmin = createPhase5User('super_admin');
    $ownNotification = Notification::create([
        'user_id' => $agencyAdmin->id,
        'type' => 'research.submitted',
        'title' => 'Own notification',
        'message' => 'A notification for the agency admin.',
        'status' => 'unread',
    ]);
    $agencyNotification = Notification::create([
        'agency_id' => $agency->id,
        'type' => 'research.archived',
        'title' => 'Agency notification',
        'message' => 'A notification for the agency.',
        'status' => 'unread',
    ]);
    $otherNotification = Notification::create([
        'user_id' => $otherUser->id,
        'type' => 'private',
        'title' => 'Other notification',
        'message' => 'A notification for another user.',
        'status' => 'unread',
    ]);
    $systemNotification = Notification::create([
        'type' => 'system',
        'title' => 'System notification',
        'message' => 'A notification for admins.',
        'status' => 'unread',
    ]);

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$ownNotification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'read');

    $this->actingAs($agencyAdmin)
        ->postJson("/api/agency/notifications/{$otherNotification->id}/read")
        ->assertForbidden();

    $this->actingAs($agencyAdmin)
        ->postJson('/api/agency/notifications/read-all')
        ->assertOk()
        ->assertJsonPath('data.unread_count', 0);

    $this->assertDatabaseHas('notifications', [
        'id' => $agencyNotification->id,
        'status' => 'read',
    ]);

    $this->actingAs($superAdmin)
        ->postJson("/api/admin/notifications/{$systemNotification->id}/read")
        ->assertOk()
        ->assertJsonPath('data.notification.status', 'read');
});
