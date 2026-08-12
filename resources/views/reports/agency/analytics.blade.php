<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Agency Research Analytics Report</title>
    <style>
        @page { margin: 28px 32px 42px; }
        body { color: #1f2937; font-family: "DejaVu Sans", sans-serif; font-size: 9px; }
        h1 { color: #1e3a8a; font-size: 20px; margin: 0 0 3px; }
        .subtitle { color: #64748b; font-size: 10px; margin-bottom: 16px; }
        .meta { background: #f1f5f9; border-left: 4px solid #1e3a8a; margin-bottom: 14px; padding: 8px 10px; }
        .summary { margin-bottom: 14px; width: 100%; }
        .summary td { background: #eff6ff; border: 1px solid #dbeafe; padding: 8px; text-align: center; width: 25%; }
        .summary strong { color: #1e3a8a; display: block; font-size: 15px; }
        table.records { border-collapse: collapse; width: 100%; }
        .records th { background: #1e3a8a; color: white; font-size: 8px; padding: 7px 5px; text-align: left; }
        .records td { border-bottom: 1px solid #e2e8f0; padding: 6px 5px; vertical-align: top; }
        .records tr:nth-child(even) td { background: #f8fafc; }
        .empty { color: #64748b; padding: 24px; text-align: center; }
        footer { bottom: -28px; color: #94a3b8; font-size: 8px; position: fixed; text-align: center; width: 100%; }
    </style>
</head>
<body>
    <h1>Agency Research Analytics Report</h1>
    <div class="subtitle">{{ $agency?->name ?? 'RIKMS Agency' }}</div>

    <div class="meta">
        <strong>Generated:</strong> {{ $generatedAt->format('F j, Y g:i A') }}
        @if (collect($filters)->contains(fn ($value) => $value !== 'all'))
            &nbsp; | &nbsp; <strong>Applied filters:</strong>
            {{ collect($filters)->reject(fn ($value) => $value === 'all')->map(fn ($value, $key) => str($key)->headline().' = '.$value)->implode('; ') }}
        @endif
    </div>

    <table class="summary"><tr>
        <td><strong>{{ $records->count() }}</strong>Total research</td>
        <td><strong>{{ $records->where('status', 'published')->count() }}</strong>Published</td>
        <td><strong>{{ $records->pluck('category')->filter()->unique()->count() }}</strong>Categories</td>
        <td><strong>{{ number_format($records->sum('downloads')) }}</strong>Downloads</td>
    </tr></table>

    <table class="records">
        <thead><tr><th>ID</th><th style="width:36%">Research title</th><th>Category</th><th>Year</th><th>Status</th><th>Access type</th><th>Downloads</th><th>Created</th></tr></thead>
        <tbody>
        @forelse ($records as $research)
            <tr><td>{{ $research->id }}</td><td>{{ $research->title }}</td><td>{{ $research->category ?? '—' }}</td>
                <td>{{ $research->publication_year ?? '—' }}</td><td>{{ str($research->status)->headline() }}</td>
                <td>{{ str($research->access_level ?? 'public')->headline() }}</td><td>{{ number_format($research->downloads) }}</td><td>{{ $research->created_at?->format('Y-m-d') }}</td></tr>
        @empty
            <tr><td colspan="8" class="empty">No agency research records match the selected filters.</td></tr>
        @endforelse
        </tbody>
    </table>
    <footer>RIKMS — Agency system-generated report</footer>
</body>
</html>
