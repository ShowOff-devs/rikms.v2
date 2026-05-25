<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Research extends Model
{
    use SoftDeletes;

    protected $table = 'research';

    protected $fillable = [
        'agency_id',
        'uploaded_by',
        'title',
        'abstract',
        'document_path',
        'publication_year',
        'status',
        'access_level',
        'submitted_at',
        'approved_at',
        'approved_by',
    ];

    protected $casts = [
        'submitted_at' => 'datetime',
        'approved_at' => 'datetime',
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
}
