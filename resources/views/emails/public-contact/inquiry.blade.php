<x-mail::message>
# New Public Inquiry

**Concern type:** {{ $concernLabel }}  
**Full name:** {{ $inquiry['name'] }}  
**Email:** {{ $inquiry['email'] }}  
**Organization / Institution:** {{ $inquiry['organization'] ?? 'Not provided' }}  
**Research Record / Reference:** {{ $inquiry['research_reference'] ?? 'Not provided' }}  
**Subject:** {{ $inquiry['subject'] }}

## Message

{{ $inquiry['message'] }}

Reply to this email to respond to the requester. Treat the submitted information according to the RIKMS Privacy Policy and applicable institutional requirements.

Regards,  
RIKMS Help & Contact Center
</x-mail::message>
