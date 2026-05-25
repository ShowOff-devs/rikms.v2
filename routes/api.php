<?php

use App\Models\Research;
use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use Illuminate\Support\Facades\Route;

Route::get('/test-mongodb-ai-records', function () {
    $research = Research::first();

    if (! $research) {
        return response()->json([
            'message' => 'No research record found in SQLite. Create a research record first.',
        ], 404);
    }

    try {
        $aiMetadata = AiMetadata::create([
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'title' => $research->title,
            'abstract' => $research->abstract,
            'authors' => [
                'Juan Dela Cruz',
                'Maria Santos',
            ],
            'keywords' => [
                'RIKMS',
                'AI Metadata',
                'MongoDB',
            ],
            'detected_language' => 'English',
            'confidence_score' => 0.94,
            'extraction_source' => 'test_route',
            'raw_ai_response' => [
                'source' => 'manual_test',
                'message' => 'AI metadata test successful.',
            ],
            'review_status' => 'pending_review',
        ]);

        $sdgClassification = SdgClassification::create([
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'primary_sdg' => 'SDG 4',
            'primary_sdg_label' => 'Quality Education',
            'sdg_results' => [
                [
                    'sdg' => 'SDG 4',
                    'label' => 'Quality Education',
                    'confidence' => 0.92,
                ],
                [
                    'sdg' => 'SDG 9',
                    'label' => 'Industry, Innovation and Infrastructure',
                    'confidence' => 0.81,
                ],
            ],
            'confidence_score' => 0.92,
            'classification_source' => 'test_route',
            'raw_ai_response' => [
                'source' => 'manual_test',
                'message' => 'SDG classification test successful.',
            ],
            'review_status' => 'pending_review',
        ]);

        $pdfParsingResult = PdfParsingResult::create([
            'research_id' => $research->id,
            'agency_id' => $research->agency_id,
            'file_name' => 'sample-research.pdf',
            'file_path' => 'uploads/research/sample-research.pdf',
            'file_mime_type' => 'application/pdf',
            'file_size' => 102400,
            'page_count' => 12,
            'extracted_text' => 'This is a sample extracted text from the uploaded PDF.',
            'sections' => [
                [
                    'title' => 'Abstract',
                    'content' => 'This is a sample abstract section.',
                ],
                [
                    'title' => 'Introduction',
                    'content' => 'This is a sample introduction section.',
                ],
            ],
            'tables' => [],
            'figures' => [],
            'parser_version' => 'v1',
            'processing_status' => 'completed',
            'processing_errors' => [],
            'processed_at' => now(),
        ]);
    } catch (\Throwable $exception) {
        return response()->json([
            'message' => 'Unable to create MongoDB AI records.',
            'sqlite_research_reference' => [
                'id' => $research->id,
                'title' => $research->title,
                'agency_id' => $research->agency_id,
            ],
            'mongodb_connection' => config('database.connections.mongodb.database'),
            'error' => $exception->getMessage(),
        ], 503);
    }

    return response()->json([
        'message' => 'MongoDB AI records created successfully.',
        'sqlite_research_reference' => [
            'id' => $research->id,
            'title' => $research->title,
            'agency_id' => $research->agency_id,
        ],
        'mongodb' => [
            'ai_metadata' => $aiMetadata,
            'sdg_classification' => $sdgClassification,
            'pdf_parsing_result' => $pdfParsingResult,
        ],
    ]);
});
