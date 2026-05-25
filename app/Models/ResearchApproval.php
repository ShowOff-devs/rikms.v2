<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResearchApproval extends Model
{
    protected $fillable = [
        'research_id',
        'reviewed_by',
        'status',
        'remarks',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
