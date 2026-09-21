<?php

namespace App\Services;

use App\Jobs\ClassifyResearchSdgJob;
use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\ResearchFile;
use Illuminate\Support\Facades\Bus;

class AiPipelineDispatcher
{
    public function dispatch(ResearchFile $file): void
    {
        $agencyId = $file->agency_id === null ? null : (int) $file->agency_id;
        $uploadedByUserId = $file->uploaded_by === null ? null : (int) $file->uploaded_by;

        Bus::chain([
            new ParsePdfDocumentJob((int) $file->research_id, (int) $file->id, $agencyId, $uploadedByUserId),
            new ExtractResearchMetadataJob((int) $file->research_id, (int) $file->id, $agencyId, $uploadedByUserId),
            new ClassifyResearchSdgJob((int) $file->research_id, (int) $file->id, $agencyId, $uploadedByUserId),
        ])->dispatch();
    }
}
