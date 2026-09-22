<?php

namespace App\Http\Middleware;

use App\Support\ApiResponse;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Pilot permission-to-endpoint map. Route-specific `permission:*` middleware
 * remains on the highest-risk endpoints; this map ensures no admin route is
 * accidentally left protected only by portal eligibility.
 */
class AuthorizeAdminRoute
{
    public function handle(Request $request, Closure $next): Response
    {
        $permission = $this->permissionFor((string) $request->route()?->getName(), $request->method());

        if (! $permission || ! $request->user()?->hasPermission($permission)) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                abort(403, 'You do not have permission to access this resource.');
            }

            return ApiResponse::error('You do not have permission to access this resource.', [], 403);
        }

        return $next($request);
    }

    private function permissionFor(string $name, string $method): ?string
    {
        $write = ! in_array($method, ['GET', 'HEAD'], true);

        return match (true) {
            Str::is('admin.rbac', $name) => 'rbac.view',
            Str::is('admin.settings', $name), Str::is('admin.platform-settings', $name) => 'platform_settings.view',
            Str::is('admin.users', $name), Str::is('admin.agency-admin-users', $name) => 'users.view',
            Str::is('admin.agencies', $name) => 'agencies.view',
            Str::is('admin.moderation', $name), Str::is('admin.research-moderation', $name),
            Str::is('admin.research*', $name), Str::is('admin.system-research*', $name) => 'research_moderation.view',
            Str::is('admin.access-*', $name) => 'access_monitoring.view',
            Str::is('admin.analytics*', $name) => 'analytics.view',
            Str::is('admin.security*', $name) => 'security.view',
            Str::is('admin.archive', $name) => 'archive.view',
            Str::is('admin.audit-logs', $name), Str::is('admin.system-activity', $name) => 'audit_logs.view',
            Str::is('admin.dashboard', $name) => 'dashboard.view',
            Str::is('api.admin.agencies.restore', $name),
            Str::is('api.admin.users.restore', $name),
            Str::is('api.admin.research-files.restore', $name),
            Str::is('api.admin.research.restore', $name) => 'archive.restore',
            Str::is('api.admin.agencies.archive.destroy', $name),
            Str::is('api.admin.users.archive.destroy', $name),
            Str::is('api.admin.research-files.archive.destroy', $name),
            Str::is('api.admin.research.archive.destroy', $name) => 'archive.manage',
            Str::is('api.admin.rbac.roles.permissions.update', $name) => 'permissions.manage',
            Str::is('api.admin.rbac.roles.*', $name) => $write ? 'roles.manage' : 'rbac.view',
            Str::is('api.admin.rbac.users.role.update', $name),
            Str::is('api.admin.rbac.users.roles.*', $name) => $write ? 'rbac.manage' : 'rbac.view',
            Str::is('api.admin.rbac.*', $name) => 'rbac.view',
            Str::is('api.admin.platform-settings.*', $name) => $write ? 'platform_settings.manage' : 'platform_settings.view',
            Str::is('api.admin.agency-admin-users.*', $name),
            Str::is('api.admin.users.*', $name) => $write ? 'users.manage' : 'users.view',
            Str::is('api.admin.agencies.*', $name) => $write ? 'agencies.manage' : 'agencies.view',
            Str::is('api.admin.research-moderation.*', $name),
            Str::is('api.admin.research.*', $name) => $write ? 'research_moderation.manage' : 'research_moderation.view',
            Str::is('api.admin.archive.*', $name),
            Str::is('api.admin.research-files.*', $name) => $write ? ($method === 'POST' ? 'archive.restore' : 'archive.manage') : 'archive.view',
            Str::is('api.admin.access-monitoring.*', $name),
            Str::is('api.admin.access-requests.*', $name) => $write ? 'access_monitoring.manage' : 'access_monitoring.view',
            Str::is('api.admin.analytics.project-reports.export', $name) => 'analytics.export',
            Str::is('api.admin.analytics.*', $name) => 'analytics.view',
            Str::is('api.admin.reports.*', $name) => 'analytics.export',
            Str::is('api.admin.security.*', $name),
            Str::is('api.admin.security-events.*', $name) => $write ? 'security.manage' : 'security.view',
            Str::is('api.admin.audit-logs.*', $name),
            Str::is('api.admin.system-activity.*', $name) => 'audit_logs.view',
            Str::is('api.admin.notifications.*', $name) => 'notifications.view',
            Str::is('api.admin.dashboard', $name) => 'dashboard.view',
            default => null,
        };
    }
}
