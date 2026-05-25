<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'agency_id',
        'first_name',
        'last_name',
        'name',
        'email',
        'password',
        'role',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function researchUploads()
    {
        return $this->hasMany(Research::class, 'uploaded_by');
    }

    public function approvedResearch()
    {
        return $this->hasMany(Research::class, 'approved_by');
    }

    public function accessRequests()
    {
        return $this->hasMany(AccessRequest::class, 'requested_by');
    }

    public function reviewedAccessRequests()
    {
        return $this->hasMany(AccessRequest::class, 'reviewed_by');
    }

    public function researchApprovals()
    {
        return $this->hasMany(ResearchApproval::class, 'reviewed_by');
    }

    public function isSuperAdmin(): bool
    {
        return $this->role === 'super_admin';
    }

    public function isAgencyAdmin(): bool
    {
        return $this->role === 'agency_admin';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}