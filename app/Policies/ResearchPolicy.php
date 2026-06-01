<?php

namespace App\Policies;

use App\Models\Research;
use App\Models\User;
use App\Support\Statuses;

class ResearchPolicy
{
    public function createAgencyDraft(User $user): bool
    {
        return $user->isAgencyAdmin() && $user->agency_id !== null;
    }

    public function updateAgencyDraft(User $user, Research $research): bool
    {
        return $this->ownsAgencyResearch($user, $research)
            && in_array($research->status, [Statuses::RESEARCH_DRAFT, 'rejected'], true)
            && $research->archived_at === null;
    }

    public function submit(User $user, Research $research): bool
    {
        return $this->ownsAgencyResearch($user, $research)
            && in_array($research->status, [Statuses::RESEARCH_DRAFT, 'rejected'], true)
            && $research->archived_at === null;
    }

    public function uploadFile(User $user, Research $research): bool
    {
        return $this->ownsAgencyResearch($user, $research)
            && in_array($research->status, [Statuses::RESEARCH_DRAFT, 'rejected', Statuses::RESEARCH_SUBMITTED], true)
            && $research->archived_at === null;
    }

    public function moderate(User $user, Research $research): bool
    {
        return $user->isSuperAdmin() && $research->archived_at === null;
    }

    public function restore(User $user, Research $research): bool
    {
        return $user->isSuperAdmin() && $research->archived_at !== null;
    }

    private function ownsAgencyResearch(User $user, Research $research): bool
    {
        return $user->isAgencyAdmin()
            && $user->agency_id !== null
            && (int) $research->agency_id === (int) $user->agency_id;
    }
}
