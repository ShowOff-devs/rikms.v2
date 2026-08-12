<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\VerifyEmailResponse as VerifyEmailResponseContract;
use Laravel\Fortify\Fortify;

class VerifyEmailResponse implements VerifyEmailResponseContract
{
    public function toResponse($request)
    {
        if ($request->wantsJson()) {
            return response()->noContent();
        }

        $user = $request->user();

        if ($user?->isAgencyAdmin()) {
            return redirect(route('agency.dashboard', absolute: false).'?verified=1');
        }

        if ($user?->isSuperAdmin()) {
            return redirect(route('admin.dashboard', absolute: false).'?verified=1');
        }

        return redirect()->intended(Fortify::redirects('email-verification').'?verified=1');
    }
}
