<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class PdfParsingResult extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'pdf_parsing_results';

    protected $fillable = [
        'research_id',
        'agency_id',
        'file_name',
        'file_path',
        'file_mime_type',
        'file_size',
        'page_count',
        'extracted_text',
        'sections',
        'tables',
        'figures',
        'parser_version',
        'processing_status',
        'processing_errors',
        'processed_at',
    ];

    protected $casts = [
        'research_id' => 'integer',
        'agency_id' => 'integer',
        'file_size' => 'integer',
        'page_count' => 'integer',
        'sections' => 'array',
        'tables' => 'array',
        'figures' => 'array',
        'processing_errors' => 'array',
        'processed_at' => 'datetime',
    ];
}