<?php

namespace App\Policies;

use App\Models\ResearchFile;
use App\Models\User;

class ResearchFilePolicy
{
    public function delete(User $user, ResearchFile $researchFile): bool
    {
        return $user->isAgencyAdmin()
            && $user->agency_id !== null
            && (int) $researchFile->agency_id === (int) $user->agency_id
            && $researchFile->archived_at === null;
    }
}
