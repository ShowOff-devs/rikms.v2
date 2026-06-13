<?php

namespace App\Http\Responses;

use Laravel\Fortify\Contracts\TwoFactorLoginResponse as TwoFactorLoginResponseContract;

class TwoFactorLoginResponse implements TwoFactorLoginResponseContract
{
    public function toResponse($request)
    {
        $user = $request->user();
        $redirectTo = $this->redirectPath($user);

        if ($request->wantsJson()) {
            return response()->json([
                'redirect' => $redirectTo,
            ]);
        }

        return redirect()->intended($redirectTo);
    }

    private function redirectPath(?object $user): string
    {
        if ($user?->isSuperAdmin()) {
            return route('admin.dashboard', absolute: false);
        }

        if ($user?->isAgencyAdmin()) {
            return route('agency.dashboard', absolute: false);
        }

        return route('home', absolute: false);
    }
}
