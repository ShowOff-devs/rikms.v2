<?php

namespace App\Models;

use App\Services\PublicResponseCache;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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

    protected $appends = [
        'logo_url',
    ];

    protected static function booted(): void
    {
        $invalidate = fn (): mixed => app(PublicResponseCache::class)->invalidateAgencies();

        static::saved($invalidate);
        static::deleted($invalidate);
        static::restored($invalidate);
    }

    public function getLogoUrlAttribute(): ?string
    {
        if (! $this->logo_path) {
            return null;
        }

        if (Str::startsWith($this->logo_path, ['http://', 'https://', '/storage/'])) {
            return $this->logo_path;
        }

        return Storage::disk('public')->url($this->logo_path);
    }

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

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function restoredBy()
    {
        return $this->belongsTo(User::class, 'restored_by');
    }

    public function securityEvents()
    {
        return $this->hasMany(SecurityEvent::class);
    }
}
