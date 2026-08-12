<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Project Report Analytics</title>
<style>
@page{margin:26px 30px 40px}body{font-family:"DejaVu Sans",sans-serif;font-size:8px;color:#1f2937}h1{margin:0;color:#1e3a8a;font-size:19px}.sub{margin:3px 0 14px;color:#64748b}.meta{padding:8px 10px;margin-bottom:12px;border-left:4px solid #1e3a8a;background:#f1f5f9}.summary{width:100%;margin-bottom:12px}.summary td{width:20%;padding:7px;text-align:center;border:1px solid #dbeafe;background:#eff6ff}.summary strong{display:block;color:#1e3a8a;font-size:14px}.records{width:100%;border-collapse:collapse}.records th{padding:6px 4px;text-align:left;color:#fff;background:#1e3a8a;font-size:7px}.records td{padding:5px 4px;border-bottom:1px solid #e2e8f0;vertical-align:top}.records tr:nth-child(even) td{background:#f8fafc}.num{text-align:right}footer{position:fixed;bottom:-27px;width:100%;text-align:center;color:#94a3b8;font-size:7px}
</style></head><body>
<h1>Project Report Analytics</h1><div class="sub">Regional Terminal Report and Project Accomplishment Report metrics</div>
<div class="meta"><strong>Generated:</strong> {{ $generatedAt->format('F j, Y g:i A') }}
@if(array_filter($filters)) &nbsp; | &nbsp; <strong>Filters:</strong> {{ collect($filters)->filter()->map(fn($v,$k)=>str($k)->headline().' = '.$v)->implode('; ') }} @endif</div>
<table class="summary"><tr>
<td><strong>{{ $summary['total_reports'] }}</strong>Total reports</td><td><strong>{{ $summary['terminal_reports'] }}</strong>Terminal</td>
<td><strong>{{ $summary['project_accomplishment_reports'] }}</strong>Accomplishment</td><td><strong>{{ $summary['complete_reports'] }}</strong>Complete</td>
<td><strong>{{ number_format((float)$summary['overall_utilization_percentage'],2) }}%</strong>Budget utilization</td>
</tr></table>
<table class="records"><thead><tr><th>ID</th><th style="width:24%">Title</th><th>Agency</th><th>Type / Period</th><th>Year</th><th>Status</th><th>Completeness</th><th>Allotted</th><th>Utilized</th><th>Util. %</th><th>Physical %</th></tr></thead><tbody>
@forelse($records as $r)<tr><td>{{ $r['research_id'] }}</td><td>{{ $r['title'] }}</td><td>{{ $r['agency']['short_name'] ?? $r['agency']['name'] ?? '—' }}</td>
<td>{{ str($r['report_type'])->headline() }} / {{ $r['reporting_period'] ?? '—' }}</td><td>{{ $r['publication_year'] ?? '—' }}</td><td>{{ str($r['workflow_status'])->headline() }}</td>
<td>{{ str($r['completeness']['classification'] ?? 'not reported')->headline() }}</td><td class="num">{{ number_format((float)($r['budget']['allotted_budget'] ?? 0),2) }}</td>
<td class="num">{{ number_format((float)($r['budget']['utilized_amount'] ?? 0),2) }}</td><td class="num">{{ isset($r['budget']['utilization_percentage']) ? number_format((float)$r['budget']['utilization_percentage'],2).'%' : '—' }}</td>
<td class="num">{{ isset($r['accomplishment']['physical_accomplishment_percentage']) ? number_format((float)$r['accomplishment']['physical_accomplishment_percentage'],2).'%' : '—' }}</td></tr>
@empty<tr><td colspan="11" style="padding:20px;text-align:center">No project reports match the selected filters.</td></tr>@endforelse
</tbody></table><footer>RIKMS — Superadmin project report analytics export</footer></body></html>
