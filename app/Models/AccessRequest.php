<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AccessRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'research_id',
        'requested_by',
        'agency_id',
        'requester_name',
        'requester_email',
        'purpose',
        'status',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function restoredBy()
    {
        return $this->belongsTo(User::class, 'restored_by');
    }
}
