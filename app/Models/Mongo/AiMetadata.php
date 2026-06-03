<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class AiMetadata extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'ai_metadata';

    protected $fillable = [
        'research_id',
        'file_id',
        'agency_id',
        'uploaded_by_user_id',
        'title',
        'abstract',
        'authors',
        'keywords',
        'publication_year',
        'category',
        'research_category',
        'detected_language',
        'confidence_score',
        'warnings',
        'extraction_source',
        'raw_ai_response',
        'review_status',
        'processing_status',
        'processing_errors',
        'processed_at',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'research_id' => 'integer',
        'file_id' => 'integer',
        'agency_id' => 'integer',
        'uploaded_by_user_id' => 'integer',
        'authors' => 'array',
        'keywords' => 'array',
        'publication_year' => 'integer',
        'warnings' => 'array',
        'raw_ai_response' => 'array',
        'processing_errors' => 'array',
        'confidence_score' => 'float',
        'processed_at' => 'datetime',
        'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime',
    ];
}
