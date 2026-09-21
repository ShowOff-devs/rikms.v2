<?php

use Inertia\Testing\AssertableInertia as Assert;

test('public policy pages are available to anonymous visitors', function (string $routeName, string $component) {
    $this->get(route($routeName))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    'privacy policy' => ['privacy-policy', 'policies/privacy-policy'],
    'terms of use' => ['terms-of-use', 'policies/terms-of-use'],
    'open access policy' => ['open-access-policy', 'policies/open-access-policy'],
    'submission guidelines' => ['submission-guidelines', 'policies/submission-guidelines'],
]);

test('portal footer links to every public policy route', function () {
    $footer = file_get_contents(resource_path('js/components/layout/portal-footer.tsx'));

    expect($footer)
        ->toContain('href="/privacy-policy"')
        ->toContain('href="/terms-of-use"')
        ->toContain('href="/open-access-policy"')
        ->toContain('href="/submission-guidelines"');
});
