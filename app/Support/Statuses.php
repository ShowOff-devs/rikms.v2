<?php

namespace App\Support;

class Statuses
{
    public const USER_ACTIVE = 'active';

    public const USER_INACTIVE = 'inactive';

    public const USER_ARCHIVED = 'archived';

    public const RESEARCH_DRAFT = 'draft';

    public const RESEARCH_SUBMITTED = 'submitted';

    public const RESEARCH_UNDER_REVIEW = 'under_review';

    public const RESEARCH_PUBLISHED = 'published';

    public const RESEARCH_ARCHIVED = 'archived';

    public const RESEARCH_SUPERSEDED = 'superseded';

    public const ACCESS_REQUEST_PENDING = 'pending';

    public const ACCESS_REQUEST_APPROVED = 'approved';

    public const ACCESS_REQUEST_DENIED = 'denied';

    public const NOTIFICATION_UNREAD = 'unread';

    public const NOTIFICATION_READ = 'read';

    public const USERS = [
        self::USER_ACTIVE,
        self::USER_INACTIVE,
        'suspended',
        self::USER_ARCHIVED,
    ];

    public const AGENCIES = [
        'active',
        'inactive',
        'pending',
        'archived',
    ];

    public const RESEARCH = [
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'published',
        'archived',
        'superseded',
    ];

    public const RESEARCH_APPROVALS = [
        'pending',
        'approved',
        'rejected',
        'returned',
    ];

    public const ACCESS_REQUESTS = [
        'pending',
        'approved',
        'denied',
        'expired',
        'cancelled',
    ];

    public const RESEARCH_FILES = [
        'pending',
        'active',
        'archived',
        'deleted',
        'failed',
    ];

    public const RESEARCH_FILE_ACCESS_LEVELS = [
        'public',
        'restricted',
        'private',
        'embargoed',
    ];

    public const NOTIFICATIONS = [
        'unread',
        'read',
        'archived',
    ];

    public const NOTIFICATION_PRIORITIES = [
        'low',
        'normal',
        'high',
        'critical',
    ];

    public const SECURITY_EVENT_TYPES = [
        'login.success',
        'login.failed',
        'logout',
        'password.reset.requested',
        'password.changed',
        'mfa.enabled',
        'mfa.disabled',
        'session.revoked',
        'suspicious.activity',
        'account.locked',
    ];

    public const SECURITY_SEVERITIES = [
        'low',
        'medium',
        'high',
        'critical',
    ];

    public const PLATFORM_SETTING_TYPES = [
        'string',
        'integer',
        'boolean',
        'json',
        'encrypted',
    ];
}
