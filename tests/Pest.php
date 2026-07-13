<?php

use App\Services\PlatformSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

beforeEach(function () {
    if ($this instanceof TestCase && $this->app?->bound(PlatformSettingsService::class)) {
        $this->app->make(PlatformSettingsService::class)->forgetCache();
    }
});

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

function testPdfContent(int $bytes = 131072): string
{
    $header = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<<>>\n";
    $footer = "%%EOF\n";
    $minimum = $header.$footer;

    if ($bytes <= strlen($minimum)) {
        return substr($minimum, 0, max(0, $bytes));
    }

    return $header.str_repeat("\n", $bytes - strlen($header) - strlen($footer)).$footer;
}

function testPdfUpload(string $name = 'document.pdf', int $kilobytes = 128): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, testPdfContent($kilobytes * 1024));
}
