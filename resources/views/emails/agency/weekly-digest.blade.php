<x-mail::message>
# Weekly agency digest

Hello {{ $data['recipientName'] }},

Here is the **{{ $data['agencyName'] }}** activity summary for {{ $data['periodStart'] }}–{{ $data['periodEnd'] }}.

<x-mail::table>
| Activity | Count |
|:--|--:|
| Research records added | {{ $data['researchAdded'] }} |
| Research records published | {{ $data['researchPublished'] }} |
| Access requests received | {{ $data['accessRequestsReceived'] }} |
| Pending access requests | {{ $data['pendingAccessRequests'] }} |
| Public views | {{ $data['views'] }} |
| Downloads | {{ $data['downloads'] }} |
</x-mail::table>

<x-mail::button :url="url('/agency/analytics')">
View agency analytics
</x-mail::button>

You can change this subscription at any time in Agency Settings → Notifications.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
