<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    protected $fillable = [
        'transition_id',
        'user_id',
        'agency_id',
        'type',
        'title',
        'message',
        'data',
        'read_at',
        'action_url',
        'priority',
        'status',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function userStates()
    {
        return $this->hasMany(NotificationUserState::class);
    }

    public function scopeVisibleTo(Builder $query, int $userId): Builder
    {
        return $query->whereDoesntHave('userStates', fn (Builder $query) => $query
            ->where('user_id', $userId)
            ->whereNotNull('hidden_at'));
    }

    public function scopeReadBy(Builder $query, int $userId): Builder
    {
        return $query->where(function (Builder $query) use ($userId): void {
            $query->whereHas('userStates', fn (Builder $query) => $query->where('user_id', $userId)->whereNotNull('read_at'))
                ->orWhere(function (Builder $query) use ($userId): void {
                    $query->where('user_id', $userId)->whereNotNull('read_at');
                });
        });
    }

    public function scopeUnreadBy(Builder $query, int $userId): Builder
    {
        return $query->whereDoesntHave('userStates', fn (Builder $query) => $query->where('user_id', $userId)->whereNotNull('read_at'))
            ->where(function (Builder $query) use ($userId): void {
                $query->whereNull('user_id')
                    ->orWhere('user_id', '!=', $userId)
                    ->orWhere(function (Builder $query) use ($userId): void {
                        $query->where('user_id', $userId)->whereNull('read_at');
                    });
            });
    }
}
