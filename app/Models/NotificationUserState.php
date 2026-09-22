<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationUserState extends Model
{
    protected $fillable = [
        'notification_id',
        'user_id',
        'read_at',
        'hidden_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'hidden_at' => 'datetime',
    ];

    public function notification()
    {
        return $this->belongsTo(Notification::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
