<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Agency extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'slug',
        'name',
        'short_name',
        'full_name',
        'type',
        'email',
        'contact_number',
        'website',
        'address',
        'description',
        'logo_path',
        'status',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
    ];

    protected $casts = [
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function research()
    {
        return $this->hasMany(Research::class);
    }

    public function researchFiles()
    {
        return $this->hasMany(ResearchFile::class);
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function auditLogs()
    {
        return $this->hasMany(AuditLog::class);
    }

    public function securityEvents()
    {
        return $this->hasMany(SecurityEvent::class);
    }
}
