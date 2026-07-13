<?php

namespace App\Exceptions;

use RuntimeException;

class DuplicatePublicAccessRequestException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('An active access request already exists for this research record.');
    }
}
