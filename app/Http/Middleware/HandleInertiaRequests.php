<?php

namespace App\Http\Middleware;

use App\Services\UploadLimitService;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user()?->loadMissing(['agency', 'roles']);
        $uploadLimits = app(UploadLimitService::class)->limits();
        $adminPermissions = [];

        if ($user?->isSuperAdmin()) {
            $adminPermissions = ['*'];
        } elseif ($user) {
            $rolePermissions = $user->roles()
                ->where('roles.is_active', true)
                ->with('permissions:id,slug')
                ->get()
                ->flatMap->permissions
                ->pluck('slug');
            $directPermissions = $user->directPermissions()
                ->where(function ($query): void {
                    $query->whereNull('permission_user.expires_at')
                        ->orWhere('permission_user.expires_at', '>', now());
                })
                ->pluck('permissions.slug');
            $adminPermissions = $rolePermissions
                ->merge($directPermissions)
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'adminPermissions' => $adminPermissions,
            ],
            'uploadLimits' => [
                'configuredMb' => $uploadLimits['configured_mb'],
                'phpUploadMaxFilesizeMb' => $uploadLimits['php_upload_max_filesize_mb'],
                'phpPostMaxSizeMb' => $uploadLimits['php_post_max_size_mb'],
                'effectiveMb' => $uploadLimits['effective_mb'],
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
