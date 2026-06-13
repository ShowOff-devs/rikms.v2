<?php

namespace App\Support;

use App\Models\Research;
use Illuminate\Support\Str;

class ResearchSlugger
{
    public static function generateUniqueResearchSlug(string $title, ?int $ignoreId = null): string
    {
        $baseSlug = Str::slug($title) ?: 'research';
        $slug = $baseSlug;
        $suffix = 1;

        while (
            Research::query()
                ->withTrashed()
                ->where('slug', $slug)
                ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
                ->exists()
        ) {
            $slug = $baseSlug.'-'.$suffix++;
        }

        return $slug;
    }
}
