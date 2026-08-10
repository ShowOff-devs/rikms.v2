<x-mail::message>
# RIKMS

## New Research Access Request

Hello {{ $data['owner_name'] }},

{{ $data['requester_name'] }} submitted a request to access "{{ $data['research_title'] }}".

Request reference: {{ $data['request_reference'] }}

Affiliation: {{ $data['requester_affiliation'] ?: 'Not provided' }}

Purpose: {{ $data['requester_purpose'] }}

Submitted on: {{ $data['submitted_at'] }}

@if (! empty($data['message']))
Message: {{ $data['message'] }}
@endif

<x-mail::button :url="$data['review_url']">
Review Access Request
</x-mail::button>

The research owner email remains hidden from public users. This message was sent internally by RIKMS according to the notification preferences saved with the research record.

This is an automated notification from RIKMS.
</x-mail::message>
