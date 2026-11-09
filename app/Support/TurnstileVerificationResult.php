<?php

namespace App\Support;

final readonly class TurnstileVerificationResult
{
    /**
     * @param  array<int, string>  $errorCodes
     */
    public function __construct(
        public bool $valid,
        public string $reason,
        public array $errorCodes = [],
    ) {}

    public static function valid(): self
    {
        return new self(true, 'verified');
    }

    /**
     * @param  array<int, string>  $errorCodes
     */
    public static function invalid(string $reason, array $errorCodes = []): self
    {
        return new self(false, $reason, $errorCodes);
    }
}
