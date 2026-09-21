<?php

use App\Notifications\PublicContactInquiryNotification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;

function publicContactPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Public Researcher',
        'email' => 'researcher@example.test',
        'organization' => 'Regional Research Office',
        'concern_type' => 'metadata_correction',
        'research_reference' => 'Research record RIKMS-101',
        'subject' => 'Incorrect publication year',
        'message' => 'The publication year shown on this research record appears to be incorrect.',
        'website' => '',
    ], $overrides);
}

beforeEach(function () {
    config()->set([
        'rikms.public_contact.enabled' => true,
        'rikms.public_contact.support_email' => 'support@example.test',
        'rikms.public_contact.limits.submissions_per_ten_minutes' => 5,
        'rikms.public_contact.captcha.enabled' => false,
    ]);
});

test('help and support page is publicly accessible and exposes only configured public settings', function () {
    $this->get('/help')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('contact')
            ->where('contactEnabled', true)
            ->where('supportEmail', 'support@example.test'));
});

test('legacy contact page permanently redirects to the canonical help page', function () {
    $this->get('/contact')
        ->assertStatus(301)
        ->assertRedirect('/help');
});

test('public footer contains one combined help and support link', function () {
    $footer = file_get_contents(resource_path('js/components/layout/portal-footer.tsx'));

    expect($footer)
        ->toContain('href="/help"')
        ->toContain('Help &amp; Support')
        ->not->toContain('href="/contact"');
});

test('help and support page has the requested title and contact anchor', function () {
    $helpPage = file_get_contents(resource_path('js/pages/contact.tsx'));

    expect($helpPage)
        ->toContain('<Head title="Help & Support | RIKMS">')
        ->toContain('id="contact-support"');
});

test('valid public inquiry is queued to the configured support address', function () {
    Notification::fake();

    $this->postJson('/api/public/contact', publicContactPayload())
        ->assertCreated()
        ->assertJsonPath('message', 'Your inquiry has been submitted successfully.')
        ->assertJsonPath('data', null);

    Notification::assertSentOnDemand(
        PublicContactInquiryNotification::class,
        function (PublicContactInquiryNotification $notification, array $channels, object $notifiable): bool {
            $mail = $notification->toMail($notifiable);

            return $channels === ['mail']
                && $notifiable->routeNotificationFor('mail') === 'support@example.test'
                && $notification instanceof ShouldQueue
                && $notification->inquiry['email'] === 'researcher@example.test'
                && $notification->inquiry['concern_type'] === 'metadata_correction'
                && $mail->attachments === []
                && $mail->rawAttachments === [];
        },
    );
});

test('public inquiry requires all mandatory values', function () {
    $this->postJson('/api/public/contact', [])->assertUnprocessable()
        ->assertJsonValidationErrors([
            'name',
            'email',
            'concern_type',
            'subject',
            'message',
        ]);
});

test('public inquiry rejects invalid field values', function (array $overrides, string $field) {
    $this->postJson('/api/public/contact', publicContactPayload($overrides))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'invalid email' => [['email' => 'not-an-email'], 'email'],
    'invalid concern type' => [['concern_type' => 'unsupported'], 'concern_type'],
    'short message' => [['message' => 'Too short'], 'message'],
    'oversized message' => [['message' => str_repeat('a', 5001)], 'message'],
]);

test('public inquiry honeypot rejects automated submissions', function () {
    $this->postJson('/api/public/contact', publicContactPayload([
        'website' => 'https://spam.example.test',
    ]))->assertUnprocessable()->assertJsonValidationErrors('website');
});

test('public inquiry is unavailable until an official support destination is configured', function () {
    config()->set([
        'rikms.public_contact.enabled' => false,
        'rikms.public_contact.support_email' => '',
    ]);

    $this->postJson('/api/public/contact', publicContactPayload())
        ->assertServiceUnavailable()
        ->assertJsonPath('errors.code', 'PUBLIC_CONTACT_UNAVAILABLE');
});

test('public inquiry uses the existing turnstile verifier with a contact-specific action', function () {
    config()->set([
        'rikms.public_contact.captcha.enabled' => true,
        'rikms.public_contact.captcha.provider' => 'turnstile',
        'rikms.public_contact.captcha.secret_key' => 'test-secret',
        'rikms.public_contact.captcha.timeout_seconds' => 3,
        'rikms.public_contact.captcha.allowed_hostnames' => ['rikms.example.test'],
        'rikms.public_contact.captcha.expected_action' => 'public_contact',
    ]);

    $this->postJson('/api/public/contact', publicContactPayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('captcha_token');

    Notification::fake();
    Http::fake([
        'https://challenges.cloudflare.com/turnstile/v0/siteverify' => Http::response([
            'success' => true,
            'hostname' => 'rikms.example.test',
            'action' => 'public_contact',
        ]),
    ]);

    $this->postJson('/api/public/contact', publicContactPayload([
        'captcha_token' => 'verified-contact-token',
    ]))->assertCreated();
});

test('public inquiry submissions are rate limited per ip', function () {
    Notification::fake();
    $key = 'public-contact:'.hash('sha256', '127.0.0.1');
    RateLimiter::clear($key);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/public/contact', publicContactPayload([
            'email' => "researcher{$attempt}@example.test",
        ]))->assertCreated();
    }

    $this->postJson('/api/public/contact', publicContactPayload([
        'email' => 'rate-limited@example.test',
    ]))->assertTooManyRequests();

    RateLimiter::clear($key);
});

test('contact page links to the public privacy policy', function () {
    $contactPage = file_get_contents(resource_path('js/pages/contact.tsx'));

    expect($contactPage)->toContain('href="/privacy-policy"');
    $this->get('/privacy-policy')->assertOk();
});
