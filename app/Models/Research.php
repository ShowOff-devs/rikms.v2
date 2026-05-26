<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Research extends Model
{
    use SoftDeletes;

    protected $table = 'research';

    protected $fillable = [
        'slug',
        'agency_id',
        'uploaded_by',
        'title',
        'abstract',
        'authors',
        'document_path',
        'publication_year',
        'category',
        'sdgs',
        'keywords',
        'status',
        'access_level',
        'downloads',
        'embargo_until',
        'external_url',
        'submitted_at',
        'approved_at',
        'published_at',
        'approved_by',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
    ];

    protected $casts = [
        'authors' => 'array',
        'sdgs' => 'array',
        'keywords' => 'array',
        'downloads' => 'integer',
        'embargo_until' => 'date',
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function accessRequests()
    {
        return $this->hasMany(AccessRequest::class);
    }

    public function approvals()
    {
        return $this->hasMany(ResearchApproval::class);
    }

    public function files()
    {
        return $this->hasMany(ResearchFile::class);
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
