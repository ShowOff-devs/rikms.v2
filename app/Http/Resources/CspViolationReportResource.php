<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CspViolationReportResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'document_uri' => $this->document_uri,
            'blocked_uri' => $this->blocked_uri,
            'effective_directive' => $this->effective_directive,
            'violated_directive' => $this->violated_directive,
            'source_file' => $this->source_file,
            'line_number' => $this->line_number,
            'column_number' => $this->column_number,
            'status_code' => $this->status_code,
            'disposition' => $this->disposition,
            'browser' => $this->browser,
            'occurrence_count' => $this->occurrence_count,
            'first_seen_at' => $this->first_seen_at?->toISOString(),
            'last_seen_at' => $this->last_seen_at?->toISOString(),
        ];
    }
}
