<?php

namespace App\Models;

use App\Support\Statuses;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AccessRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'research_id',
        'requested_by',
        'agency_id',
        'requester_name',
        'requester_email',
        'requester_affiliation',
        'purpose',
        'message',
        'intended_use',
        'status',
        'requested_at',
        'reviewed_by',
        'reviewed_at',
        'review_notes',
        'public_denial_reason',
        'internal_review_notes',
        'access_expires_at',
        'access_token_hash',
        'access_token_generated_at',
        'access_token_last_used_at',
        'access_revoked_at',
        'archived_at',
        'archived_by',
        'archive_reason',
        'restored_at',
        'restored_by',
        'active_duplicate_key',
    ];

    protected $casts = [
        'requested_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'access_expires_at' => 'datetime',
        'access_token_generated_at' => 'datetime',
        'access_token_last_used_at' => 'datetime',
        'access_revoked_at' => 'datetime',
        'archived_at' => 'datetime',
        'restored_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::saving(function (AccessRequest $accessRequest): void {
            $accessRequest->active_duplicate_key = static::shouldCarryActiveDuplicateKey(
                $accessRequest->status,
                $accessRequest->requester_email,
                $accessRequest->research_id,
            )
                ? static::activeDuplicateKey((int) $accessRequest->research_id, (string) $accessRequest->requester_email)
                : null;
        });
    }

    public static function normalizeRequesterEmail(?string $email): ?string
    {
        $normalized = mb_strtolower(trim((string) $email));

        return $normalized !== '' ? $normalized : null;
    }

    public static function activeDuplicateKey(int $researchId, string $requesterEmail): string
    {
        return hash('sha256', $researchId.':'.static::normalizeRequesterEmail($requesterEmail));
    }

    public static function shouldCarryActiveDuplicateKey(
        ?string $status,
        ?string $requesterEmail,
        mixed $researchId,
    ): bool {
        return in_array($status, static::activeDuplicateStatuses(), true)
            && static::normalizeRequesterEmail($requesterEmail) !== null
            && $researchId !== null;
    }

    /**
     * @return list<string>
     */
    public static function activeDuplicateStatuses(): array
    {
        $statuses = config('rikms.public_access_requests.active_duplicate_statuses');

        if (! is_array($statuses) || $statuses === []) {
            return [Statuses::ACCESS_REQUEST_PENDING];
        }

        return array_values(array_filter($statuses, 'is_string'));
    }

    public function research()
    {
        return $this->belongsTo(Research::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function agency()
    {
        return $this->belongsTo(Agency::class);
    }

    public function archivedBy()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function restoredBy()
    {
        return $this->belongsTo(User::class, 'restored_by');
    }
}
