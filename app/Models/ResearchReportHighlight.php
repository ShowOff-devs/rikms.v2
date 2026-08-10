<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResearchReportHighlight extends Model
{
    protected $fillable = [
        'research_id',
        'title',
        'description',
        'is_featured',
        'sort_order',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function files()
    {
        return $this->hasMany(ResearchFile::class, 'report_highlight_id')
            ->whereNull('archived_at')
            ->where('status', 'active')
            ->orderBy('created_at');
    }
}
