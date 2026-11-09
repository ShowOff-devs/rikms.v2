<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Models\User;
use App\Support\AuditLogger;
use App\Support\Statuses;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $wasPendingActivation = $user->status === Statuses::USER_PENDING_ACTIVATION;
        $oldValues = $wasPendingActivation ? $user->only(['status', 'email_verified_at']) : null;

        $user->forceFill([
            'password' => $input['password'],
            'status' => $wasPendingActivation ? Statuses::USER_ACTIVE : $user->status,
            'email_verified_at' => $wasPendingActivation ? now() : $user->email_verified_at,
        ])->save();

        if ($wasPendingActivation) {
            AuditLogger::record(
                request(),
                'admin_user.invitation_accepted',
                $user,
                $oldValues,
                $user->only(['status', 'email_verified_at']),
            );
        }
    }
}
