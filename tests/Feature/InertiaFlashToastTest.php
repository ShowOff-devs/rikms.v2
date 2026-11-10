<?php

use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;

test('redirect flash messages are shared with the next inertia page', function () {
    Route::middleware('web')->get('/_test/toast-redirect', fn () => redirect('/')
        ->with('success', [
            'title' => 'Research submitted successfully',
            'description' => 'Your research is now pending moderation.',
        ]));

    $this->get('/_test/toast-redirect')->assertRedirect('/');

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('flash.success.title', 'Research submitted successfully')
            ->where('flash.success.description', 'Your research is now pending moderation.')
            ->where('flash.error', null));
});
