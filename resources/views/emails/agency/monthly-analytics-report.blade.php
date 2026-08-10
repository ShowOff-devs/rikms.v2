<x-mail::message>
# Monthly analytics report

Hello {{ $data['recipientName'] }},

Here is the **{{ $data['agencyName'] }}** analytics report for {{ $data['periodStart'] }}–{{ $data['periodEnd'] }}.

<x-mail::table>
| Metric | Report period |
|:--|--:|
| Research records added | {{ $data['researchAdded'] }} |
| Research records published | {{ $data['researchPublished'] }} |
| Access requests received | {{ $data['accessRequestsReceived'] }} |
| Access requests approved | {{ $data['accessRequestsApproved'] }} |
| Access requests denied | {{ $data['accessRequestsDenied'] }} |
| Public views | {{ $data['views'] }} |
| Downloads | {{ $data['downloads'] }} |
</x-mail::table>

Your agency currently has **{{ $data['totalPublishedResearch'] }} published** research records out of **{{ $data['totalResearch'] }} total**, with **{{ $data['pendingAccessRequests'] }} access requests** awaiting review.

<x-mail::button :url="url('/agency/analytics')">
Open full analytics
</x-mail::button>

You can change this subscription at any time in Agency Settings → Notifications.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
