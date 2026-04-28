<?php

use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');
Route::inertia('/browse-research', 'browse-research')->name('browse-research');
Route::inertia('/about', 'about')->name('about');
Route::inertia('/agencies', 'agencies')->name('agencies');
Route::inertia('/agency/login', 'agency/login')->name('agency.login');
Route::inertia('/agency/forgot-password', 'agency/forgot-password')->name('agency.forgot-password');
Route::inertia('/agency/dashboard', 'agency/dashboard')->name('agency.dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');
});

require __DIR__.'/settings.php';
