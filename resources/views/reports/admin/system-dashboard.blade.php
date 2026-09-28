<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>RIKMS System Report</title>
    <style>
        @page { margin: 28px; }
        body { color: #172033; font-family: "DejaVu Sans", sans-serif; font-size: 9px; }
        h1 { color: #1e3a8a; font-size: 20px; margin: 0 0 4px; }
        h2 { color: #1e3a8a; font-size: 12px; margin: 18px 0 7px; }
        .subtitle { color: #667085; margin-bottom: 14px; }
        .metrics { width: 100%; border-collapse: separate; border-spacing: 6px; margin-left: -6px; }
        .metric { background: #eff4ff; border: 1px solid #dbe7ff; padding: 8px; width: 16.66%; }
        .metric-value { color: #1e3a8a; font-size: 17px; font-weight: bold; }
        .metric-label { color: #475467; font-size: 8px; margin-top: 2px; }
        table.data { border-collapse: collapse; width: 100%; }
        table.data th { background: #1e3a8a; color: #fff; font-weight: bold; padding: 6px; text-align: left; }
        table.data td { border-bottom: 1px solid #e4e7ec; padding: 5px 6px; vertical-align: top; }
        table.data tr:nth-child(even) td { background: #f8fafc; }
        .columns { width: 100%; }
        .column { vertical-align: top; width: 49%; }
        .spacer { width: 2%; }
        .empty { color: #667085; font-style: italic; }
        .footer { color: #98a2b3; font-size: 8px; margin-top: 16px; text-align: right; }
    </style>
</head>
<body>
    <h1>RIKMS System Report</h1>
    <div class="subtitle">Generated {{ $generatedAt->format('F j, Y \a\t g:i A') }}</div>

    @php
        $summaryMetrics = [
            'Total Research' => $data['metrics']['total_research'],
            'Published Research' => $data['metrics']['published_research'],
            'Participating Agencies' => $data['metrics']['total_agencies'],
            'Agency Admin Users' => $data['metrics']['agency_admin_users'],
            'Pending Access Requests' => $data['metrics']['pending_access_requests'],
            'Security Events' => $data['metrics']['unresolved_security_events'],
        ];
    @endphp

    <table class="metrics"><tr>
        @foreach ($summaryMetrics as $label => $value)
            <td class="metric"><div class="metric-value">{{ $value }}</div><div class="metric-label">{{ $label }}</div></td>
        @endforeach
    </tr></table>

    <table class="columns"><tr>
        <td class="column">
            <h2>Research by Agency</h2>
            <table class="data">
                <thead><tr><th>Agency</th><th>Research Records</th></tr></thead>
                <tbody>
                @forelse ($data['research_by_agency'] as $row)
                    <tr><td>{{ $row['agency'] }}</td><td>{{ $row['count'] }}</td></tr>
                @empty
                    <tr><td colspan="2" class="empty">No agency research data available.</td></tr>
                @endforelse
                </tbody>
            </table>
        </td>
        <td class="spacer"></td>
        <td class="column">
            <h2>Research Uploads by Year</h2>
            <table class="data">
                <thead><tr><th>Year</th><th>Research Records</th></tr></thead>
                <tbody>
                @forelse ($data['research_uploads_by_year'] as $row)
                    <tr><td>{{ $row['year'] }}</td><td>{{ $row['count'] }}</td></tr>
                @empty
                    <tr><td colspan="2" class="empty">No yearly upload data available.</td></tr>
                @endforelse
                </tbody>
            </table>
        </td>
    </tr></table>

    <h2>Pending Moderation</h2>
    <table class="data">
        <thead><tr><th>Title</th><th>Agency</th><th>Issue</th><th>Severity</th><th>Status</th></tr></thead>
        <tbody>
        @forelse ($data['pending_moderation_items'] as $row)
            <tr><td>{{ $row['title'] }}</td><td>{{ $row['agency'] }}</td><td>{{ str($row['issue_type'])->replace('-', ' ')->title() }}</td><td>{{ ucfirst($row['severity']) }}</td><td>{{ $row['status_label'] }}</td></tr>
        @empty
            <tr><td colspan="5" class="empty">No research is awaiting moderation.</td></tr>
        @endforelse
        </tbody>
    </table>

    <h2>Recent System Activity</h2>
    <table class="data">
        <thead><tr><th>Date</th><th>Actor</th><th>Agency</th><th>Event</th><th>Target</th></tr></thead>
        <tbody>
        @forelse ($data['recent_audit_logs'] as $row)
            <tr>
                <td>{{ $row['created_at'] ? \Illuminate\Support\Carbon::parse($row['created_at'])->format('M j, Y g:i A') : '—' }}</td>
                <td>{{ $row['user']['name'] ?? 'System' }}</td>
                <td>{{ $row['agency']['short_name'] ?? $row['agency']['name'] ?? '—' }}</td>
                <td>{{ str($row['event'])->replace(['.', '_'], ' ')->title() }}</td>
                <td>{{ $row['target'] }}</td>
            </tr>
        @empty
            <tr><td colspan="5" class="empty">No recent system activity available.</td></tr>
        @endforelse
        </tbody>
    </table>

    <div class="footer">Regionwide Integrated Knowledge Management System</div>
</body>
</html>
