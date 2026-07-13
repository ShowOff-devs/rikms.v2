<?php

namespace App\Services\Analytics;

use App\Models\Research;

class ReportTypeResolver
{
    public const TERMINAL_REPORT = 'terminal-report';

    public const PROJECT_ACCOMPLISHMENT = 'project-accomplishment';

    public const NOT_APPLICABLE = 'not_applicable';

    public function resolve(Research $research): string
    {
        $category = str((string) $research->category)->lower()->toString();

        if (str_contains($category, 'terminal report')) {
            return self::TERMINAL_REPORT;
        }

        if (str_contains($category, 'project accomplishment')) {
            return self::PROJECT_ACCOMPLISHMENT;
        }

        if ($research->relationLoaded('files')) {
            $fileType = $research->files
                ->pluck('file_type')
                ->first(fn (?string $type): bool => in_array($type, [
                    self::TERMINAL_REPORT,
                    self::PROJECT_ACCOMPLISHMENT,
                ], true));

            if ($fileType) {
                return $fileType;
            }
        }

        return self::NOT_APPLICABLE;
    }

    public function isReport(Research $research): bool
    {
        return $this->resolve($research) !== self::NOT_APPLICABLE;
    }
}
