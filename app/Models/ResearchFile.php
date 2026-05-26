<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ResearchFile extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'research_id',
        'agency_id',
        'uploaded_by',
        'original_name',
        'stored_name',
        'disk',
        'path',
        'mime_type',
        'extension',
        'size_bytes',
        'checksum',
        'file_type',
        'visibility',
        'access_level',
        'status',
        'metadata',
        'uploaded_at',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
    ];

    protected $casts = [
        'metadata' => 'array',
        'size_bytes' => 'integer',
        'uploaded_at' => 'datetime',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
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
