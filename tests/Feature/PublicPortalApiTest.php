<?php

use App\Models\Agency;
use App\Models\Research;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createPublicPortalResearch(string $slug = 'climate-change-davao-gulf'): array
{
    $agency = Agency::create([
        'slug' => 'smaarrdec',
        'name' => 'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        'short_name' => 'SMAARRDEC',
        'full_name' => 'Southern Mindanao Agriculture Aquatic and Natural Resources Research and Development Consortium',
        'type' => 'Research Consortium',
        'email' => 'secretariat@smaarrdec.example.gov.ph',
        'website' => 'https://smaarrdec.example.gov.ph',
        'address' => 'Southern Mindanao',
        'description' => 'Promotes agriculture, aquatic, and natural resources research.',
        'status' => 'active',
    ]);

    $user = User::factory()->create([
        'agency_id' => $agency->id,
    ]);

    $research = Research::create([
        'slug' => $slug,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'Impact of Climate Change on Coastal Communities in the Davao Gulf',
        'abstract' => 'This study examines the socioeconomic impact of climate change on coastal communities.',
        'authors' => ['Dr. Maria Santos', 'Dr. Juan Dela Cruz'],
        'publication_year' => 2025,
        'category' => 'Environmental Science',
        'sdgs' => ['SDG 13', 'SDG 14'],
        'keywords' => ['climate adaptation', 'coastal communities'],
        'status' => 'published',
        'access_level' => 'public',
        'downloads' => 12,
        'submitted_at' => now(),
        'approved_at' => now(),
        'approved_by' => $user->id,
    ]);

    return [$agency, $research];
}

test('public agencies are served from the database', function () {
    createPublicPortalResearch();

    $response = $this->getJson('/api/public/agencies');

    $response
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'smaarrdec');
});

test('public research search is served from the database', function () {
    createPublicPortalResearch();

    $response = $this->getJson('/api/public/research?search=climate');

    $response
        ->assertOk()
        ->assertJsonPath('total', 1)
        ->assertJsonPath('items.0.id', 'climate-change-davao-gulf')
        ->assertJsonPath('items.0.agency', 'SMAARRDEC');
});

test('public agency profile includes database backed research', function () {
    createPublicPortalResearch();

    $agency = $this->getJson('/api/public/agencies/smaarrdec');
    $research = $this->getJson('/api/public/agencies/smaarrdec/research');

    $agency
        ->assertOk()
        ->assertJsonPath('data.slug', 'smaarrdec')
        ->assertJsonPath('data.publications', 1);

    $research
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

test('public portal can start empty', function () {
    $this->getJson('/api/public/agencies')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->getJson('/api/public/research')
        ->assertOk()
        ->assertJsonPath('total', 0)
        ->assertJsonCount(0, 'items');
});
