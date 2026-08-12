<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CspViolationReport extends Model
{
    public $timestamps = false;

    protected $guarded = [];

    protected $casts = [
        'line_number' => 'integer',
        'column_number' => 'integer',
        'status_code' => 'integer',
        'occurrence_count' => 'integer',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];
}
