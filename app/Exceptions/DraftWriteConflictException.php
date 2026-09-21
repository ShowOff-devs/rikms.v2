<?php

namespace App\Exceptions;

use RuntimeException;

class DraftWriteConflictException extends RuntimeException
{
    public function __construct(public readonly string $field)
    {
        parent::__construct('This draft was updated in another session. Reload it before saving again.');
    }
}
