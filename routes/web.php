<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');
Route::inertia('/browse-research', 'browse-research')->name('browse-research');
Route::get('/browse-research/{research}', fn (string $research) => Inertia::render('research/show', [
    'researchId' => $research,
]))->name('research.show');
Route::get('/research/{research}', fn (string $research) => redirect()->route('research.show', $research));
Route::inertia('/about', 'about')->name('about');
Route::inertia('/agencies', 'agencies')->name('agencies');
Route::get('/agencies/{slug}', fn (string $slug) => Inertia::render('agencies/show', [
    'agencySlug' => $slug,
]))->name('agencies.show');
Route::inertia('/contact', 'contact')->name('contact');
Route::get('/privacy-policy', fn () => Inertia::render('public-policy', [
    'pageKey' => 'privacy-policy',
]))->name('privacy-policy');
Route::get('/terms-of-use', fn () => Inertia::render('public-policy', [
    'pageKey' => 'terms-of-use',
]))->name('terms-of-use');
Route::get('/open-access-policy', fn () => Inertia::render('public-policy', [
    'pageKey' => 'open-access-policy',
]))->name('open-access-policy');
Route::get('/submission-guidelines', fn () => Inertia::render('public-policy', [
    'pageKey' => 'submission-guidelines',
]))->name('submission-guidelines');
Route::get('/login', function () {
    return redirect()->route('agency.login');
})->name('login');
Route::inertia('/agency/login', 'agency/login')->name('agency.login');
Route::inertia('/agency/forgot-password', 'agency/forgot-password')->name('agency.forgot-password');
Route::inertia('/agency/dashboard', 'agency/dashboard')->name('agency.dashboard');
Route::inertia('/agency/research-repository', 'agency/research-repository')->name('agency.research-repository');
Route::get('/agency/research-repository/{repository}/edit', fn (string $repository) => Inertia::render('agency/research-repository/edit', [
    'repositoryId' => $repository,
]))->name('agency.research-repository.edit');
Route::inertia('/agency/archive', 'agency/archive')->name('agency.archive');
Route::inertia('/agency/access-requests', 'agency/access-requests')->name('agency.access-requests');
Route::inertia('/agency/analytics', 'agency/analytics')->name('agency.analytics');
Route::inertia('/agency/notifications', 'agency/notifications')->name('agency.notifications');
Route::inertia('/agency/profile', 'agency/profile')->name('agency.profile');
Route::inertia('/agency/settings', 'agency/settings')->name('agency.settings');
Route::inertia('/agency/upload', 'agency/upload')->name('agency.upload');
Route::inertia('/agency/upload/research', 'agency/upload/research')->name('agency.upload.research');
Route::inertia('/agency/upload/terminal-report', 'agency/upload/terminal-report')->name('agency.upload.terminal-report');
Route::inertia('/agency/upload/project-accomplishment', 'agency/upload/project-accomplishment')->name('agency.upload.project-accomplishment');

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', fn () => Inertia::render('admin/login'))->name('login');
    Route::inertia('/dashboard', 'admin/dashboard')->name('dashboard');
    Route::inertia('/agencies', 'admin/agencies')->name('agencies');
    Route::inertia('/agency-admin-users', 'admin/agency-admin-users')->name('agency-admin-users');
    Route::inertia('/system-research', 'admin/system-research')->name('system-research');
    Route::get('/system-research/{research}', fn (string $research) => Inertia::render('admin/system-research/show', [
        'recordId' => $research,
    ]))->name('system-research.show');
    Route::inertia('/research-moderation', 'admin/research-moderation')->name('research-moderation');
    Route::inertia('/access-request-monitor', 'admin/access-request-monitor')->name('access-request-monitor');
    Route::inertia('/analytics', 'admin/analytics')->name('analytics');
    Route::inertia('/system-activity', 'admin/system-activity')->name('system-activity');
    Route::inertia('/rbac', 'admin/rbac')->name('rbac');
    Route::inertia('/security-center', 'admin/security-center')->name('security-center');
    Route::inertia('/archive', 'admin/archive')->name('archive');
    Route::inertia('/platform-settings', 'admin/platform-settings')->name('platform-settings');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
