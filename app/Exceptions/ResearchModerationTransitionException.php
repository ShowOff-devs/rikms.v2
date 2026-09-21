<?php

namespace App\Exceptions;

use RuntimeException;

class ResearchModerationTransitionException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $currentStatus,
        public readonly bool $stale = false,
    ) {
        parent::__construct($message);
    }

    public function statusCode(): int
    {
        return $this->stale ? 409 : 422;
    }
}
