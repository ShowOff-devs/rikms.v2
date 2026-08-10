<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResearchReportDetail extends Model
{
    protected $fillable = [
        'research_id',
        'reporting_period',
        'project_start_date',
        'project_end_date',
        'allotted_budget',
        'released_amount',
        'obligated_amount',
        'utilized_amount',
        'physical_accomplishment_percent',
        'financial_as_of_date',
        'pap_categories',
        'pap_description',
        'beneficiary_sectors',
        'performance_remarks',
        'last_wizard_step',
        'draft_version',
    ];

    protected $casts = [
        'project_start_date' => 'date',
        'project_end_date' => 'date',
        'allotted_budget' => 'decimal:2',
        'released_amount' => 'decimal:2',
        'obligated_amount' => 'decimal:2',
        'utilized_amount' => 'decimal:2',
        'physical_accomplishment_percent' => 'decimal:2',
        'financial_as_of_date' => 'date',
        'pap_categories' => 'array',
        'beneficiary_sectors' => 'array',
        'draft_version' => 'integer',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }
}
