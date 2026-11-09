<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StorePublicContactRequest;
use App\Notifications\PublicContactInquiryNotification;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;
use Throwable;

class PublicContactController extends Controller
{
    public function store(StorePublicContactRequest $request): JsonResponse
    {
        $supportEmail = trim((string) config('rikms.public_contact.support_email'));

        if (! config('rikms.public_contact.enabled') || $supportEmail === '') {
            return ApiResponse::error(
                'Public inquiry submissions are currently unavailable.',
                ['code' => 'PUBLIC_CONTACT_UNAVAILABLE'],
                503,
            );
        }

        $inquiry = $request->safe()->except(['website', 'captcha_token']);

        try {
            Notification::route('mail', $supportEmail)
                ->notify(new PublicContactInquiryNotification($inquiry));
        } catch (Throwable $exception) {
            Log::warning('Public contact inquiry could not be queued.', [
                'exception_class' => $exception::class,
                'ip_hash' => hash('sha256', (string) $request->ip()),
            ]);

            return ApiResponse::error(
                'We could not submit your inquiry at this time. Please try again later.',
                [],
                503,
            );
        }

        return ApiResponse::success(
            'Your inquiry has been submitted successfully.',
            null,
            [],
            201,
        );
    }
}
