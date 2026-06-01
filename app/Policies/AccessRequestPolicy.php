<?php

namespace App\Policies;

use App\Models\AccessRequest;
use App\Models\User;
use App\Support\Statuses;

class AccessRequestPolicy
{
    public function decide(User $user, AccessRequest $accessRequest): bool
    {
        return $user->isAgencyAdmin()
            && $user->agency_id !== null
            && $accessRequest->status === Statuses::ACCESS_REQUEST_PENDING
            && $accessRequest->research !== null
            && (int) $accessRequest->research->agency_id === (int) $user->agency_id;
    }
}
