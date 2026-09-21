<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class PdfParsingResult extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'pdf_parsing_results';

    protected $fillable = [
        'idempotency_key',
        'research_id',
        'file_id',
        'agency_id',
        'uploaded_by_user_id',
        'file_name',
        'file_path',
        'file_mime_type',
        'file_size',
        'page_count',
        'extracted_text',
        'text_length',
        'sections',
        'tables',
        'figures',
        'extraction_method',
        'parser_version',
        'processing_status',
        'processing_errors',
        'processed_at',
    ];

    protected $casts = [
        'research_id' => 'integer',
        'file_id' => 'integer',
        'agency_id' => 'integer',
        'uploaded_by_user_id' => 'integer',
        'file_size' => 'integer',
        'page_count' => 'integer',
        'text_length' => 'integer',
        'sections' => 'array',
        'tables' => 'array',
        'figures' => 'array',
        'processing_errors' => 'array',
        'processed_at' => 'datetime',
    ];
}
