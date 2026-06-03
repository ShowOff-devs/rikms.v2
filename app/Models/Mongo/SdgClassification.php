<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class SdgClassification extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'sdg_classifications';

    protected $fillable = [
        'research_id',
        'file_id',
        'agency_id',
        'uploaded_by_user_id',
        'primary_sdg',
        'primary_sdg_label',
        'sdg_results',
        'confidence_score',
        'classification_source',
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
        'sdg_results' => 'array',
        'raw_ai_response' => 'array',
        'processing_errors' => 'array',
        'confidence_score' => 'float',
        'processed_at' => 'datetime',
        'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime',
    ];
}
