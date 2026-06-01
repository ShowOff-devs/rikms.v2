<?php

namespace App\Policies;

use App\Models\ResearchApproval;
use App\Models\User;

class ResearchApprovalPolicy
{
    public function view(User $user, ResearchApproval $researchApproval): bool
    {
        return $user->isSuperAdmin()
            || ($user->isAgencyAdmin() && (int) $researchApproval->research?->agency_id === (int) $user->agency_id);
    }
}
