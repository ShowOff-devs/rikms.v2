<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
        'is_public',
        'is_encrypted',
        'updated_by',
    ];

    protected $casts = [
        'is_public' => 'boolean',
        'is_encrypted' => 'boolean',
    ];

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
