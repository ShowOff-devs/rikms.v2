<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = [
        'name',
        'slug',
        'module',
        'display_name',
        'description',
    ];

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'permission_role')
            ->withTimestamps();
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'permission_user')
            ->withPivot(['granted_by', 'granted_at', 'expires_at'])
            ->withTimestamps();
    }
}
