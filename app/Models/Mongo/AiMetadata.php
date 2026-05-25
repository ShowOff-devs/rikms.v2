<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class AiMetadata extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'ai_metadata';

    protected $fillable = [
        'research_id',
        'agency_id',
        'title',
        'abstract',
        'authors',
        'keywords',
        'detected_language',
        'confidence_score',
        'extraction_source',
        'raw_ai_response',
        'review_status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'research_id' => 'integer',
        'agency_id' => 'integer',
        'authors' => 'array',
        'keywords' => 'array',
        'raw_ai_response' => 'array',
        'confidence_score' => 'float',
        'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime',
    ];
}
