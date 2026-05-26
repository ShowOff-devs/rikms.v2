<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityEvent extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'agency_id',
        'event_type',
        'severity',
        'ip_address',
        'user_agent',
        'location',
        'metadata',
        'resolved_at',
        'resolved_by',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'resolved_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
