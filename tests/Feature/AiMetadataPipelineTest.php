<?php

use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Agency;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\AI\OpenAiResearchMetadataExtractor;
use App\Services\AI\PdfTextExtractionService;
use App\Services\AiPipelineResultWriter;
use Illuminate\Support\Facades\Storage;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Testing\ClientFake;

function createAiPipelineRole(string $slug): Role
{
    return Role::updateOrCreate(
        ['slug' => $slug],
        [
            'name' => str($slug)->replace('_', ' ')->title()->toString(),
            'display_name' => str($slug)->replace('_', ' ')->title()->toString(),
            'is_system' => true,
            'is_active' => true,
        ],
    );
}

function createAiPipelineAgency(string $slug = 'ai-pipeline-agency'): Agency
{
    return Agency::create([
        'slug' => $slug,
        'name' => str($slug)->replace('-', ' ')->title()->toString(),
        'short_name' => str($slug)->upper()->limit(12, '')->toString(),
        'type' => 'Government Agency',
        'status' => 'active',
    ]);
}

function createAiPipelineUser(Agency $agency): User
{
    $user = User::factory()->create([
        'agency_id' => $agency->id,
        'role' => 'agency_admin',
        'status' => 'active',
    ]);

    $user->roles()->syncWithoutDetaching([
        createAiPipelineRole('agency_admin')->id => ['assigned_at' => now()],
    ]);

    return $user;
}

function createAiPipelineResearch(Agency $agency, User $user): Research
{
    return Research::create([
        'slug' => 'ai-pipeline-'.str()->random(8),
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'title' => 'AI Pipeline Research',
        'abstract' => 'A metadata pipeline test record.',
        'authors' => ['RIKMS Tester'],
        'publication_year' => 2026,
        'category' => 'Testing',
        'sdgs' => ['SDG 16'],
        'keywords' => ['ai'],
        'status' => 'draft',
        'access_level' => 'restricted',
    ]);
}

function createAiPipelineFile(Research $research, Agency $agency, User $user, string $path = 'research/ai-pipeline.pdf'): ResearchFile
{
    return ResearchFile::create([
        'research_id' => $research->id,
        'agency_id' => $agency->id,
        'uploaded_by' => $user->id,
        'original_name' => 'ai-pipeline.pdf',
        'stored_name' => 'ai-pipeline.pdf',
        'disk' => 'local',
        'path' => $path,
        'mime_type' => 'application/pdf',
        'extension' => 'pdf',
        'size_bytes' => 1024,
        'checksum' => hash('sha256', 'ai-pipeline'),
        'file_type' => 'research_document',
        'visibility' => 'private',
        'access_level' => 'restricted',
        'status' => 'active',
        'metadata' => ['ai_processing' => 'queued'],
        'uploaded_at' => now(),
    ]);
}

test('parser job saves pdf parsing result through writer', function () {
    Storage::fake('local');

    $agency = createAiPipelineAgency('ai-parser-success');
    $user = createAiPipelineUser($agency);
    $research = createAiPipelineResearch($agency, $user);
    $file = createAiPipelineFile($research, $agency, $user);

    Storage::disk('local')->put($file->path, 'placeholder');

    $parserResult = [
        'success' => true,
        'text' => 'Extracted research text.',
        'method' => 'smalot/pdfparser',
        'error' => null,
        'page_count' => 3,
    ];

    $extractor = Mockery::mock(PdfTextExtractionService::class);
    $extractor->shouldReceive('extract')
        ->once()
        ->with(Mockery::type('string'))
        ->andReturn($parserResult);

    $writer = Mockery::mock(AiPipelineResultWriter::class);
    $writer->shouldReceive('writePdfParsingResult')
        ->once()
        ->with($research->id, $file->id, $agency->id, $user->id, $parserResult);

    (new ParsePdfDocumentJob($research->id, $file->id, $agency->id, $user->id))->handle($writer, $extractor);
});

test('failed pdf parsing produces failed parser result payload', function () {
    Storage::fake('local');

    $agency = createAiPipelineAgency('ai-parser-failed');
    $user = createAiPipelineUser($agency);
    $research = createAiPipelineResearch($agency, $user);
    $file = createAiPipelineFile($research, $agency, $user);

    $parserResult = [
        'success' => false,
        'text' => '',
        'method' => 'smalot/pdfparser',
        'error' => 'No extractable text was found. The PDF may be scanned or image-only.',
        'page_count' => null,
    ];

    $extractor = Mockery::mock(PdfTextExtractionService::class);
    $extractor->shouldReceive('extract')->once()->andReturn($parserResult);

    $writer = Mockery::mock(AiPipelineResultWriter::class);
    $writer->shouldReceive('writePdfParsingResult')
        ->once()
        ->withArgs(fn (int $researchId, int $fileId, ?int $agencyId, ?int $userId, array $result): bool => $researchId === $research->id
            && $fileId === $file->id
            && $agencyId === $agency->id
            && $userId === $user->id
            && $result['success'] === false
            && $result['error'] === $parserResult['error']);

    (new ParsePdfDocumentJob($research->id, $file->id, $agency->id, $user->id))->handle($writer, $extractor);
});

test('metadata job saves openai metadata through writer', function () {
    $agency = createAiPipelineAgency('ai-metadata-success');
    $user = createAiPipelineUser($agency);
    $research = createAiPipelineResearch($agency, $user);
    $file = createAiPipelineFile($research, $agency, $user);

    $metadata = [
        'title' => 'Water Security in Davao Region',
        'authors' => ['Ana Santos'],
        'abstract' => 'This study evaluates water security policy.',
        'keywords' => ['water security', 'policy'],
        'publication_year' => 2026,
        'research_category' => 'Environment',
        'confidence_score' => 0.91,
        'warnings' => [],
        'raw_response' => ['id' => 'chatcmpl-test'],
    ];

    $writer = Mockery::mock(AiPipelineResultWriter::class);
    $writer->shouldReceive('latestExtractedPdfText')
        ->once()
        ->with($research->id, $file->id, $agency->id)
        ->andReturn('Extracted PDF text with metadata.');
    $writer->shouldReceive('writeAiMetadataResult')
        ->once()
        ->with($research->id, $file->id, $agency->id, $user->id, $metadata);

    $extractor = Mockery::mock(OpenAiResearchMetadataExtractor::class);
    $extractor->shouldReceive('extract')
        ->once()
        ->with('Extracted PDF text with metadata.')
        ->andReturn($metadata);

    (new ExtractResearchMetadataJob($research->id, $file->id, $agency->id, $user->id))->handle($writer, $extractor);
});

test('metadata job writes failed result when extracted text is missing', function () {
    $agency = createAiPipelineAgency('ai-metadata-missing-text');
    $user = createAiPipelineUser($agency);
    $research = createAiPipelineResearch($agency, $user);
    $file = createAiPipelineFile($research, $agency, $user);

    $writer = Mockery::mock(AiPipelineResultWriter::class);
    $writer->shouldReceive('latestExtractedPdfText')
        ->once()
        ->with($research->id, $file->id, $agency->id)
        ->andReturn(null);
    $writer->shouldReceive('writeAiMetadataFailure')
        ->once()
        ->with($research->id, $file->id, $agency->id, $user->id, 'No extracted PDF text is available for metadata extraction.');

    $extractor = Mockery::mock(OpenAiResearchMetadataExtractor::class);
    $extractor->shouldNotReceive('extract');

    (new ExtractResearchMetadataJob($research->id, $file->id, $agency->id, $user->id))->handle($writer, $extractor);
});

test('openai metadata extractor requests strict json schema response format', function () {
    config([
        'services.openai.api_key' => 'test-key',
        'services.openai.model' => 'gpt-test',
        'services.openai.metadata_max_chars' => 1200,
    ]);

    $content = json_encode([
        'title' => 'Water Security in Davao Region',
        'authors' => ['Ana Santos'],
        'abstract' => 'This study evaluates water security policy.',
        'keywords' => ['water security', 'policy'],
        'publication_year' => 2026,
        'research_category' => 'Environment',
        'confidence_score' => 0.91,
        'warnings' => [],
    ], JSON_THROW_ON_ERROR);

    $client = new ClientFake([
        CreateResponse::fake([
            'model' => 'gpt-test',
            'choices' => [
                [
                    'index' => 0,
                    'message' => [
                        'role' => 'assistant',
                        'content' => $content,
                        'function_call' => null,
                        'tool_calls' => [],
                    ],
                    'logprobs' => null,
                    'finish_reason' => 'stop',
                ],
            ],
        ]),
    ]);

    $result = (new OpenAiResearchMetadataExtractor($client))->extract(str_repeat('Research text. ', 200));

    expect($result['title'])->toBe('Water Security in Davao Region')
        ->and($result['publication_year'])->toBe(2026)
        ->and($result['confidence_score'])->toBe(0.91);

    $client->chat()->assertSent(function (string $method, array $parameters): bool {
        return $method === 'create'
            && $parameters['model'] === 'gpt-test'
            && $parameters['response_format']['type'] === 'json_schema'
            && $parameters['response_format']['json_schema']['strict'] === true
            && in_array('research_category', $parameters['response_format']['json_schema']['schema']['required'], true);
    });
});
