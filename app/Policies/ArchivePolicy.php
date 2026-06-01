<?php

namespace App\Policies;

use App\Models\User;

class ArchivePolicy
{
    public function restoreResearch(User $user): bool
    {
        return $user->isSuperAdmin();
    }
}
