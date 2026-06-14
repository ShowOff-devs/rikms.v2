<x-mail::message>
# RIKMS

## Access Request Approved

Hello {{ $data['requester_name'] }},

Your request to access "{{ $data['research_title'] }}" has been approved by {{ $data['agency_name'] }}.

Request reference: {{ $data['request_reference'] }}

Status: {{ $data['status'] }}

Processed on: {{ $data['processed_at'] }}

@if (! empty($data['expires_at']))
Access valid until: {{ $data['expires_at'] }}
@endif

@if (! empty($data['access_url']))
<x-mail::button :url="$data['access_url']">
Access Research
</x-mail::button>
@endif

Please use the approved access only for the purpose stated in your request and follow applicable RIKMS and agency policies.

For help, contact {{ $data['support_email'] }} or visit {{ $data['support_url'] }}.

This is an automated notification from RIKMS.
</x-mail::message>
