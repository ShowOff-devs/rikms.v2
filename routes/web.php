<?php

use App\Models\Agency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use Laravel\Fortify\Http\Controllers\AuthenticatedSessionController;

$agencyLoginOptions = fn (): array => Agency::query()
    ->where('status', 'active')
    ->orderBy('name')
    ->get(['slug', 'name', 'short_name', 'full_name'])
    ->map(fn (Agency $agency): array => [
        'id' => $agency->slug,
        'shortName' => $agency->short_name ?: $agency->name,
        'fullName' => $agency->full_name ?: $agency->name,
    ])
    ->all();

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');
Route::inertia('/browse-research', 'browse-research')->name('browse-research');
Route::redirect('/browse', '/browse-research')->name('browse');
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
Route::get('/agency/login', function (Request $request) use ($agencyLoginOptions) {
    $user = $request->user();

    if ($user?->isAgencyAdmin()) {
        return redirect('/agency/dashboard');
    }

    if ($user?->isSuperAdmin()) {
        return redirect('/admin/dashboard');
    }

    return Inertia::render('agency/login', [
        'agencies' => $agencyLoginOptions(),
    ]);
})->name('agency.login');
Route::post('/agency/login', [AuthenticatedSessionController::class, 'store'])->name('agency.login.store');
Route::get('/agency/forgot-password', fn () => Inertia::render('agency/forgot-password', [
    'agencies' => $agencyLoginOptions(),
]))->name('agency.forgot-password');
Route::middleware(['auth', 'role:agency_admin'])->group(function () {
    Route::inertia('/agency/dashboard', 'agency/dashboard')->name('agency.dashboard');
    Route::inertia('/agency/research', 'agency/research-repository')->name('agency.research');
    Route::inertia('/agency/research/create', 'agency/upload/research')->name('agency.research.create');
    Route::get('/agency/research/{research}', fn (string $research) => Inertia::render('agency/research-repository/edit', [
        'repositoryId' => $research,
    ]))->name('agency.research.show');
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
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', function (Request $request) {
        $user = $request->user();

        if ($user?->isSuperAdmin()) {
            return redirect('/admin/dashboard');
        }

        if ($user) {
            return redirect('/agency/dashboard');
        }

        return Inertia::render('admin/login');
    })->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])->name('login.store');

    Route::middleware(['auth', 'role:super_admin'])->group(function () {
        Route::inertia('/dashboard', 'admin/dashboard')->name('dashboard');
        Route::inertia('/agencies', 'admin/agencies')->name('agencies');
        Route::inertia('/users', 'admin/agency-admin-users')->name('users');
        Route::inertia('/agency-admin-users', 'admin/agency-admin-users')->name('agency-admin-users');
        Route::inertia('/research', 'admin/system-research')->name('research');
        Route::get('/research/{research}', fn (string $research) => Inertia::render('admin/system-research/show', [
            'recordId' => $research,
        ]))->name('research.show');
        Route::inertia('/system-research', 'admin/system-research')->name('system-research');
        Route::get('/system-research/{research}', fn (string $research) => Inertia::render('admin/system-research/show', [
            'recordId' => $research,
        ]))->name('system-research.show');
        Route::inertia('/moderation', 'admin/research-moderation')->name('moderation');
        Route::inertia('/research-moderation', 'admin/research-moderation')->name('research-moderation');
        Route::inertia('/access-requests', 'admin/access-request-monitor')->name('access-requests');
        Route::inertia('/access-request-monitor', 'admin/access-request-monitor')->name('access-request-monitor');
        Route::inertia('/analytics', 'admin/analytics')->name('analytics');
        Route::inertia('/audit-logs', 'admin/system-activity')->name('audit-logs');
        Route::inertia('/system-activity', 'admin/system-activity')->name('system-activity');
        Route::inertia('/rbac', 'admin/rbac')->name('rbac');
        Route::inertia('/security', 'admin/security-center')->name('security');
        Route::inertia('/security-center', 'admin/security-center')->name('security-center');
        Route::inertia('/archive', 'admin/archive')->name('archive');
        Route::inertia('/settings', 'admin/platform-settings')->name('settings');
        Route::inertia('/platform-settings', 'admin/platform-settings')->name('platform-settings');
    });
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
