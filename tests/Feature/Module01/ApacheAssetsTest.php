<?php

test('TEST 01-04 P0: Laravel front controller, rewrite rules, and built Vite assets exist', function () {
    $rewriteRules = file_get_contents(public_path('.htaccess'));
    $manifestPath = public_path('build/manifest.json');
    $manifest = json_decode((string) file_get_contents($manifestPath), true, flags: JSON_THROW_ON_ERROR);

    expect(is_file(public_path('index.php')))->toBeTrue()
        ->and($rewriteRules)->toContain('RewriteEngine On')
        ->and($rewriteRules)->toContain('RewriteRule ^ index.php [L]')
        ->and($manifest)->toHaveKey('resources/js/app.tsx');

    foreach ($manifest as $entry) {
        foreach (array_merge([$entry['file'] ?? null], $entry['css'] ?? [], $entry['assets'] ?? []) as $asset) {
            if (! is_string($asset) || $asset === '') {
                continue;
            }

            expect(str_contains($asset, '..'))->toBeFalse("Unsafe Vite manifest path: {$asset}")
                ->and(is_file(public_path('build/'.$asset)))->toBeTrue("Missing Vite build asset: {$asset}");
        }
    }

    $this->get('/browse-research')->assertOk();
})->group('module01', 'module01-app');
