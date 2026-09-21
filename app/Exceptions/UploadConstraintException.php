<?php

namespace App\Exceptions;

use RuntimeException;

class UploadConstraintException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $field = 'file',
        public readonly int $statusCode = 422,
    ) {
        parent::__construct($message);
    }
}
