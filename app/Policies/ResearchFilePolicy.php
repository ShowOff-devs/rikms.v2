<?php

namespace App\Policies;

use App\Models\ResearchFile;
use App\Models\User;
use App\Support\Statuses;

class ResearchFilePolicy
{
    public function delete(User $user, ResearchFile $researchFile): bool
    {
        $research = $researchFile->research;

        return $user->isAgencyAdmin()
            && $user->agency_id !== null
            && (int) $researchFile->agency_id === (int) $user->agency_id
            && $research !== null
            && (int) $research->agency_id === (int) $user->agency_id
            && in_array($research->status, [Statuses::RESEARCH_DRAFT, 'rejected'], true)
            && $research->archived_at === null
            && $researchFile->archived_at === null;
    }
}
