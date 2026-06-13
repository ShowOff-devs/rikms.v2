<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ResearchAnalyticsEvent extends Model
{
    protected $fillable = [
        'research_id',
        'agency_id',
        'user_id',
        'research_file_id',
        'event_type',
        'source',
        'session_hash',
        'ip_hash',
        'metadata',
        'occurred_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'occurred_at' => 'datetime',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function researchFile()
    {
        return $this->belongsTo(ResearchFile::class);
    }
}
