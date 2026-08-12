<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResearchPerformanceItem extends Model
{
    protected $fillable = [
        'research_id',
        'project_name',
        'target_value',
        'actual_value',
        'target_numeric_value',
        'actual_numeric_value',
        'unit',
        'accomplishment_percentage',
        'project_status',
        'remarks',
        'sort_order',
    ];

    protected $casts = [
        'accomplishment_percentage' => 'decimal:2',
        'target_numeric_value' => 'decimal:4',
        'actual_numeric_value' => 'decimal:4',
        'sort_order' => 'integer',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }
}
