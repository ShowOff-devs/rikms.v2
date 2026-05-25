<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Agency extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'short_name',
        'email',
        'contact_number',
        'address',
        'description',
        'logo_path',
        'status',
    ];

    public function users()
    {
        return $this->hasMany(User::class);
    }

    public function research()
    {
        return $this->hasMany(Research::class);
    }
}
