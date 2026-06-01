<?php

namespace App\Http\Responses;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    public function toResponse($request)
    {
        $user = $request->user();

        if (! $user) {
            return $this->failedResponse($request, 'Authentication is required.');
        }

        if ($request->is('admin/login') && ! $user->isSuperAdmin()) {
            $this->logout($request);

            return $this->failedResponse($request, 'These credentials are not authorized for the Super Admin portal.');
        }

        if ($request->is('agency/login') && ! $user->isAgencyAdmin()) {
            $this->logout($request);

            return $this->failedResponse($request, 'These credentials are not authorized for the Agency Admin portal.');
        }

        $redirectTo = $this->redirectPath($user);

        if ($request->wantsJson()) {
            return response()->json([
                'two_factor' => false,
                'redirect' => $redirectTo,
            ]);
        }

        return $this->shouldUseIntendedRedirect($request)
            ? redirect()->intended($redirectTo)
            : redirect($redirectTo);
    }

    private function redirectPath(object $user): string
    {
        if ($user->isSuperAdmin()) {
            return route('admin.dashboard', absolute: false);
        }

        if ($user->isAgencyAdmin()) {
            return route('agency.dashboard', absolute: false);
        }

        return route('home', absolute: false);
    }

    private function shouldUseIntendedRedirect(Request $request): bool
    {
        return ! $request->is('admin/login') && ! $request->is('agency/login');
    }

    private function failedResponse(Request $request, string $message)
    {
        if ($request->wantsJson()) {
            return response()->json([
                'message' => $message,
                'errors' => [
                    'email' => [$message],
                ],
            ], 422);
        }

        return back()->withErrors([
            'email' => $message,
        ]);
    }

    private function logout(Request $request): void
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }
    }
}
