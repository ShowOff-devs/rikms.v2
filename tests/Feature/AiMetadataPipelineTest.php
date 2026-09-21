<?php

use App\Jobs\ExtractResearchMetadataJob;
use App\Jobs\ParsePdfDocumentJob;
use App\Models\Agency;
use App\Models\PlatformSetting;
use App\Models\Research;
use App\Models\ResearchFile;
use App\Models\Role;
use App\Models\User;
use App\Services\AI\OpenAiResearchMetadataExtractor;
use App\Services\AI\PdfTextExtractionService;
use App\Services\AiPipelineResultWriter;
use App\Services\PlatformSettingsService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use OpenAI\Responses\Chat\CreateResponse;
use OpenAI\Testing\ClientFake;

beforeEach(function () {
    $service = app(PlatformSettingsService::class);
    $definition = $service->definition(PlatformSettingsService::AI_PROCESSING_ENABLED);

    PlatformSetting::updateOrCreate(
        ['key' => PlatformSettingsService::AI_PROCESSING_ENABLED],
        [
            'value' => 'true',
            'type' => 'boolean',
            'group' => $definition['group'] ?? 'ai',
            'label' => $definition['label'] ?? 'AI Processing Enabled',
            'is_public' => false,
            'is_encrypted' => false,
        ],
    );

    $service->forgetCache();
});

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
    Storage::disk('local')->put($file->path, '%PDF-1.4 test document %%EOF');

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

test('parser materializes non-local storage objects into a temporary workspace', function () {
    Storage::fake('remote-documents');
    config()->set('filesystems.disks.remote-documents.driver', 's3');
    $agency = createAiPipelineAgency('ai-parser-remote');
    $user = createAiPipelineUser($agency);
    $research = createAiPipelineResearch($agency, $user);
    $file = createAiPipelineFile($research, $agency, $user);
    $file->forceFill(['disk' => 'remote-documents'])->save();
    Storage::disk('remote-documents')->put($file->path, '%PDF-1.4 remote document %%EOF');
    $parserResult = [
        'success' => true,
        'text' => 'Remote document text',
        'method' => 'smalot/pdfparser',
        'error' => null,
        'page_count' => 1,
    ];

    $extractor = Mockery::mock(PdfTextExtractionService::class);
    $extractor->shouldReceive('extract')
        ->once()
        ->withArgs(fn (string $path): bool => is_file($path)
            && file_get_contents($path) === '%PDF-1.4 remote document %%EOF')
        ->andReturn($parserResult);
    $writer = Mockery::mock(AiPipelineResultWriter::class);
    $writer->shouldReceive('writePdfParsingResult')
        ->once()
        ->with($research->id, $file->id, $agency->id, $user->id, $parserResult);

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
        'methodology' => 'The study used policy document review and key informant interviews.',
        'review_of_related_literature' => null,
        'theoretical_framework' => null,
        'results_and_discussion' => null,
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

test('ai pipeline writer sanitizes malformed utf8 recursively for mongo payloads', function () {
    $writer = new AiPipelineResultWriter;
    $method = new ReflectionMethod($writer, 'sanitizeForMongo');
    $method->setAccessible(true);

    $sanitized = $method->invoke($writer, [
        'text' => "Valid text \xC3\x28 with \x00 bad bytes",
        'nested' => [
            'errors' => ["Broken \xF0\x28\x8C\x28 error"],
        ],
    ]);

    expect($sanitized['text'])->toBeString()
        ->and(preg_match('//u', $sanitized['text']))->toBe(1)
        ->and($sanitized['text'])->not->toContain("\x00")
        ->and($sanitized['nested']['errors'][0])->toBeString()
        ->and(preg_match('//u', $sanitized['nested']['errors'][0]))->toBe(1);
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
        'methodology' => 'The study used policy document review and key informant interviews.',
        'review_of_related_literature' => null,
        'theoretical_framework' => null,
        'results_and_discussion' => null,
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

    Log::spy();

    $result = (new OpenAiResearchMetadataExtractor($client))->extract(str_repeat('Research text. ', 200));

    expect($result['title'])->toBe('Water Security in Davao Region')
        ->and($result['methodology'])->toBe('The study used policy document review and key informant interviews.')
        ->and($result['review_of_related_literature'])->toBeNull()
        ->and($result['publication_year'])->toBe(2026)
        ->and($result['confidence_score'])->toBe(0.91);

    Log::shouldNotHaveReceived('debug');

    $client->chat()->assertSent(function (string $method, array $parameters): bool {
        return $method === 'create'
            && $parameters['model'] === 'gpt-test'
            && $parameters['response_format']['type'] === 'json_schema'
            && $parameters['response_format']['json_schema']['strict'] === true
            && in_array('research_category', $parameters['response_format']['json_schema']['schema']['required'], true)
            && in_array('methodology', $parameters['response_format']['json_schema']['schema']['required'], true)
            && in_array('review_of_related_literature', $parameters['response_format']['json_schema']['schema']['required'], true)
            && in_array('theoretical_framework', $parameters['response_format']['json_schema']['schema']['required'], true)
            && in_array('results_and_discussion', $parameters['response_format']['json_schema']['schema']['required'], true);
    });
});
