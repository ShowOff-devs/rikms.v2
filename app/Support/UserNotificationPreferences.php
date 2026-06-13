<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class UserNotificationPreferences
{
    public static function wants(User $user, string $preference, bool $default = true): bool
    {
        $preferences = $user->notification_preferences ?? [];

        return array_key_exists($preference, $preferences)
            ? (bool) $preferences[$preference]
            : $default;
    }

    /**
     * @return Collection<int, User>
     */
    public static function agencyAdmins(int $agencyId, string $preference, bool $default = true): Collection
    {
        return User::query()
            ->where('agency_id', $agencyId)
            ->where('status', 'active')
            ->where(function (Builder $query): void {
                $query->where('role', 'agency_admin')
                    ->orWhereHas('roles', fn (Builder $query) => $query->where('slug', 'agency_admin'));
            })
            ->get()
            ->filter(fn (User $user): bool => self::wants($user, $preference, $default))
            ->values();
    }
}
