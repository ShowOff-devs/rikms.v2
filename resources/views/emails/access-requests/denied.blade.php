<x-mail::message>
# RIKMS

## Access Request Update

Hello {{ $data['requester_name'] }},

Your request to access "{{ $data['research_title'] }}" was not approved by {{ $data['agency_name'] }}.

Request reference: {{ $data['request_reference'] }}

Status: {{ $data['status'] }}

Processed on: {{ $data['processed_at'] }}

@if (! empty($data['denial_reason']))
Reason: {{ $data['denial_reason'] }}
@endif

You may submit a new request with complete or corrected information when appropriate.

For help, contact {{ $data['support_email'] }} or visit {{ $data['support_url'] }}.

This is an automated notification from RIKMS.
</x-mail::message>
