<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArchiveRecord extends Model
{
    protected $fillable = [
        'archivable_type',
        'archivable_id',
        'archived_by',
        'restored_by',
        'reason',
        'metadata',
        'archived_at',
        'restored_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function archivable()
    {
        return $this->morphTo();
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
