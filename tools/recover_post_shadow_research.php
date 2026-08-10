<?php

declare(strict_types=1);

use App\Models\Mongo\AiMetadata;
use App\Models\Mongo\PdfParsingResult;
use App\Models\Mongo\SdgClassification;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

require dirname(__DIR__).'/vendor/autoload.php';

$app = require dirname(__DIR__).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apply = in_array('--apply', $argv, true);

// File-backed rows created after the 2026-08-05 local database reset.
$candidates = [
    102 => [90, 'research/102/e79f4955-0924-4967-85e5-c195efde3021.pdf'],
    103 => [91, 'research/103/d3070a25-8acf-4ca7-8e3d-4a49355fe7a2.pdf'],
    104 => [92, 'research/104/67a39815-dee5-451b-b6f0-8d53231483c5.pdf'],
    108 => [93, 'research/108/d103c1a6-e3fe-4562-9e75-b33c64551fdd.pdf'],
    109 => [94, 'research/109/7b9ee885-8281-46b2-9b85-578ea141cb7a.pdf'],
    110 => [95, 'research/110/b42cb58a-6867-4e04-9b9b-82e3945093d5.pdf'],
    111 => [96, 'research/111/6f6dbe5e-7ec0-4415-8b36-fb48a62f0f91.pdf'],
    112 => [97, 'research/112/039bc40f-6b63-457a-a86a-6b3d12aaa54b.PDF'],
    114 => [98, 'research/114/67b79049-f5e7-4b2e-b694-c842386490b4.pdf'],
    115 => [99, 'research/115/e6865efa-a171-4190-88fb-e3214a2ef9e6.pdf'],
    117 => [100, 'research/117/e6d725ff-ce53-41d0-99a5-6ecf2718d6d0.pdf'],
    118 => [101, 'research/118/c7890263-8e70-471b-aff3-63aec78222b8.pdf'],
    120 => [102, 'research/120/ae269517-eac1-48d2-b1e1-748a638beb4c.pdf'],
    121 => [103, 'research/121/a23fdab4-9f84-49c8-8259-c2a104ad0831.pdf'],
    122 => [104, 'research/122/5195034d-4f98-469b-b15a-4a897fdbbd5c.pdf'],
    123 => [105, 'research/123/ac9c84f2-84ef-46c5-9786-fb63cb142ec0.pdf'],
];

$fallback108 = [
    'agency_id' => 11,
    'uploaded_by_user_id' => 19,
    'file_name' => 'Brain-inspired_interpretable_resonant_recurrent_ne.pdf',
    'title' => 'Brain-inspired, interpretable, resonant recurrent neural networks',
    'abstract' => null,
    'authors' => ['Mark A. Kramer'],
    'keywords' => [],
];

// Five rows are proven by malware-rejection logs. ID 116 is proven by the
// surrounding SQLite AUTOINCREMENT sequence, but no file/metadata survived.
$filelessDrafts = [
    105 => [11, 19, '2026-08-05 03:25:02', 'Upload rejected by malware guard'],
    106 => [11, 19, '2026-08-05 03:25:08', 'Upload rejected by malware guard'],
    107 => [11, 19, '2026-08-05 03:25:14', 'Upload rejected by malware guard'],
    113 => [10, 18, '2026-08-05 03:39:53', 'Upload rejected by malware guard'],
    116 => [10, 18, '2026-08-05 03:45:00', 'Metadata unavailable; recovered from ID sequence'],
    119 => [9, 17, '2026-08-05 05:55:57', 'Upload rejected by malware guard'],
];

/** @return list<string> */
$sdgTags = static function (?SdgClassification $classification): array {
    if (! $classification) {
        return [];
    }

    $values = $classification->suggested_sdg_tags ?? [];
    $values = is_array($values) ? $values : [];
    $tags = [];

    foreach ($values as $value) {
        $candidate = is_array($value)
            ? ($value['sdg'] ?? $value['number'] ?? $value['id'] ?? $value['label'] ?? null)
            : $value;

        if (preg_match('/(?:SDG\s*)?(\d{1,2})/i', (string) $candidate, $matches)) {
            $number = (int) $matches[1];

            if ($number >= 1 && $number <= 17) {
                $tags[] = 'SDG '.$number;
            }
        }
    }

    return array_values(array_unique($tags));
};

$rows = [];

foreach ($candidates as $researchId => [$fileId, $path]) {
    $absolutePath = storage_path('app/private/'.$path);

    if (! is_file($absolutePath)) {
        throw new RuntimeException("Missing recovery file: {$absolutePath}");
    }

    $parsing = PdfParsingResult::query()
        ->where('research_id', $researchId)
        ->where('file_id', $fileId)
        ->where('file_path', $path)
        ->orderByDesc('processed_at')
        ->first();
    $metadata = AiMetadata::query()
        ->where('research_id', $researchId)
        ->where('file_id', $fileId)
        ->orderByDesc('processed_at')
        ->first();
    $classification = SdgClassification::query()
        ->where('research_id', $researchId)
        ->where('file_id', $fileId)
        ->orderByDesc('processed_at')
        ->first();

    $evidence = $researchId === 108 ? $fallback108 : [];
    $agencyId = (int) ($parsing?->agency_id ?? $metadata?->agency_id ?? $evidence['agency_id'] ?? 0);
    $uploaderId = (int) ($parsing?->uploaded_by_user_id ?? $metadata?->uploaded_by_user_id ?? $evidence['uploaded_by_user_id'] ?? 0);
    $originalName = (string) ($parsing?->file_name ?? $evidence['file_name'] ?? basename($path));
    $title = trim((string) ($metadata?->title ?? $evidence['title'] ?? pathinfo($originalName, PATHINFO_FILENAME)));
    $authors = $metadata?->authors ?? $evidence['authors'] ?? [];
    $keywords = $metadata?->keywords ?? $evidence['keywords'] ?? [];
    $abstract = $metadata?->abstract ?? $evidence['abstract'] ?? null;
    $timestamp = gmdate('Y-m-d H:i:s', (int) filemtime($absolutePath));

    if (! DB::table('agencies')->where('id', $agencyId)->exists()) {
        throw new RuntimeException("Recovery agency {$agencyId} does not exist for research {$researchId}.");
    }

    if (! DB::table('users')->where('id', $uploaderId)->exists()) {
        throw new RuntimeException("Recovery uploader {$uploaderId} does not exist for research {$researchId}.");
    }

    $rows[] = [
        'research' => [
            'id' => $researchId,
            'agency_id' => $agencyId,
            'uploaded_by' => $uploaderId,
            'slug' => Str::slug($title).'-recovered-'.$researchId,
            'title' => $title !== '' ? $title : 'Recovered research '.$researchId,
            'abstract' => is_string($abstract) && trim($abstract) !== '' ? trim($abstract) : null,
            'authors' => json_encode(is_array($authors) ? array_values($authors) : [], JSON_UNESCAPED_UNICODE),
            'document_path' => $path,
            'publication_year' => 2026,
            'category' => 'Uncategorized',
            'sdgs' => json_encode($sdgTags($classification), JSON_UNESCAPED_UNICODE),
            'keywords' => json_encode(is_array($keywords) ? array_values($keywords) : [], JSON_UNESCAPED_UNICODE),
            'public_metadata' => json_encode([], JSON_UNESCAPED_UNICODE),
            'public_metadata_fields' => json_encode([], JSON_UNESCAPED_UNICODE),
            'status' => 'draft',
            'access_level' => 'public',
            'downloads' => 0,
            'revision_number' => 1,
            'notify_owner_access_requests' => 1,
            'notify_owner_research_inquiries' => 0,
            'send_owner_copy_to_admin' => 0,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ],
        'file' => [
            'id' => $fileId,
            'research_id' => $researchId,
            'agency_id' => $agencyId,
            'uploaded_by' => $uploaderId,
            'original_name' => $originalName,
            'stored_name' => basename($path),
            'disk' => 'local',
            'path' => $path,
            'mime_type' => 'application/pdf',
            'extension' => strtolower(pathinfo($path, PATHINFO_EXTENSION)),
            'size_bytes' => filesize($absolutePath),
            'checksum' => hash_file('sha256', $absolutePath),
            'file_type' => 'research_document',
            'visibility' => 'private',
            'access_level' => 'restricted',
            'status' => 'active',
            'metadata' => json_encode([
                'recovered' => true,
                'recovery_source' => 'physical_file_logs_and_mongodb_ai_evidence',
                'recovered_at' => now()->toIso8601String(),
            ], JSON_UNESCAPED_SLASHES),
            'uploaded_at' => $timestamp,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ],
    ];
}

foreach ($filelessDrafts as $researchId => [$agencyId, $uploaderId, $timestamp, $reason]) {
    if (! DB::table('agencies')->where('id', $agencyId)->exists()) {
        throw new RuntimeException("Recovery agency {$agencyId} does not exist for research {$researchId}.");
    }

    if (! DB::table('users')->where('id', $uploaderId)->exists()) {
        throw new RuntimeException("Recovery uploader {$uploaderId} does not exist for research {$researchId}.");
    }

    $title = "Recovered fileless draft {$researchId}";
    $rows[] = [
        'research' => [
            'id' => $researchId,
            'agency_id' => $agencyId,
            'uploaded_by' => $uploaderId,
            'slug' => Str::slug($title).'-'.$researchId,
            'title' => $title,
            'abstract' => $reason.'. Original metadata was not recoverable.',
            'authors' => json_encode([], JSON_UNESCAPED_UNICODE),
            'document_path' => null,
            'publication_year' => 2026,
            'category' => 'Uncategorized',
            'sdgs' => json_encode([], JSON_UNESCAPED_UNICODE),
            'keywords' => json_encode([], JSON_UNESCAPED_UNICODE),
            'public_metadata' => json_encode([], JSON_UNESCAPED_UNICODE),
            'public_metadata_fields' => json_encode([], JSON_UNESCAPED_UNICODE),
            'status' => 'draft',
            'access_level' => 'public',
            'downloads' => 0,
            'revision_number' => 1,
            'notify_owner_access_requests' => 1,
            'notify_owner_research_inquiries' => 0,
            'send_owner_copy_to_admin' => 0,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ],
        'file' => null,
    ];
}

foreach ($rows as $row) {
    printf(
        "%d|file=%s|agency=%d|uploader=%d|%s\n",
        $row['research']['id'],
        $row['file']['id'] ?? 'none',
        $row['research']['agency_id'],
        $row['research']['uploaded_by'],
        $row['research']['title'],
    );
}

if (! $apply) {
    echo 'DRY RUN: '.count($rows)." recovery candidates are ready.\n";
    exit(0);
}

DB::transaction(function () use ($rows): void {
    foreach ($rows as $row) {
        $researchId = $row['research']['id'];
        $fileId = $row['file']['id'] ?? null;

        if (DB::table('research')->where('id', $researchId)->exists()) {
            echo "SKIP existing research {$researchId}\n";

            continue;
        }

        if ($fileId !== null && DB::table('research_files')->where('id', $fileId)->exists()) {
            throw new RuntimeException("File ID {$fileId} already exists; refusing partial recovery.");
        }

        DB::table('research')->insert($row['research']);

        if ($row['file'] !== null) {
            DB::table('research_files')->insert($row['file']);
        }

        echo $fileId === null
            ? "RECOVERED fileless draft {$researchId}\n"
            : "RECOVERED research {$researchId} with file {$fileId}\n";
    }
});

echo 'APPLIED: recovery transaction completed. '.count($rows)." candidates processed.\n";
