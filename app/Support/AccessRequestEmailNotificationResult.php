<?php

namespace App\Support;

class AccessRequestEmailNotificationResult
{
    public function __construct(
        public string $status,
    ) {}
}
