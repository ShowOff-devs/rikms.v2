<?php

namespace App\Models\Mongo;

use MongoDB\Laravel\Eloquent\Model;

class SdgClassification extends Model
{
    protected $connection = 'mongodb';

    protected $collection = 'sdg_classifications';

    protected $fillable = [
        'research_id',
        'agency_id',
        'primary_sdg',
        'primary_sdg_label',
        'sdg_results',
        'confidence_score',
        'classification_source',
        'raw_ai_response',
        'review_status',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'research_id' => 'integer',
        'agency_id' => 'integer',
        'sdg_results' => 'array',
        'raw_ai_response' => 'array',
        'confidence_score' => 'float',
        'reviewed_by' => 'integer',
        'reviewed_at' => 'datetime',
    ];
}
