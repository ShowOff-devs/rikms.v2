# RIKMS v2 API Conventions
Stack: Laravel 12 API Backend

---

# 1. Purpose

This document defines the API standards used by RIKMS v2.

The goals are:

- predictable API structure
- consistent request and response formats
- frontend-friendly payloads
- secure backend enforcement
- scalable architecture
- maintainable endpoints

All backend development must follow these conventions.

---

# 2. API Design Principles

RIKMS v2 follows an **API-first architecture**.

Principles:

1. The API is the single source of truth.
2. The frontend communicates only through the API.
3. Backend enforces validation, authorization, and workflows.
4. API responses must remain consistent across modules.
5. Endpoints must be predictable and resource-oriented.
6. APIs must be designed for long-term maintainability.

Avoid creating endpoints that are tied to a single UI screen.

---

# 3. Base API URL Structure

All endpoints use the `/api` prefix.

Example:
/api/*

Example module groups:
/api/auth/*
/api/users/*
/api/agencies/*
/api/research/*
/api/publications/*
/api/notifications/*
/api/analytics/*
/api/archive/*
/api/rbac/*
/api/settings/*
/api/audit-logs/*


---

# 4. API Versioning Strategy

RIKMS may introduce versioning in the future.

Recommended version format:
/api/v1/*

/api/v1/*
/api/v1/research
/api/v1/users


If versioning is not yet required, design endpoints so versioning can be introduced later.

---

# 5. Resource Naming Rules

Use **plural nouns** for resource endpoints.

Correct examples:
/api/users
/api/agencies
/api/research
/api/publications
/api/notifications


Avoid verbs in route names unless representing a workflow action.

Bad examples:
/api/getResearch
/api/updateUserData
/api/deleteAgencyNow


---

# 6. CRUD Endpoint Conventions

Standard CRUD operations should follow REST conventions.

### List resources
GET /api/research

### Retrieve a single resource
GET /api/research/{research}

### Create a resources
POST /api/research

### Update a resource
PUT/api/reseach/{research}
or
PATCH /api/research/{research}


### Delete a resource
DELETE/api/research/{research}

---

# 7. Workflow Action Endpoints

Some domain actions are not standard CRUD.

Use explicit action routes.

Examples:

POST /api/research/{research}/submit
POST /api/research/{research}/publish
POST /api/research/{research}/archive
POST /api/archive/{archiveItem}/restore
POST /api/users/{user}/assign-role
POST /api/users/{user}/remove-role


Rules:

- Use POST for workflow actions
- Action names must be explicit
- Do not overload update endpoints with hidden state changes

---

# 8. Standard Success Response Format

All successful responses should follow this structure.

### Basic success response
{
"data": {},
"message": "Success"
}

### List reponse
{
    "data": []
    "message": "Records retrieved successfully"
}

### Single resource response
{
    "data":{},
    "message":"Record retrieved successfully"

}

### Creation response
{
"data": {},
"message": "Record created successfully"
}

### Update response
{
"data": {},
"message": "Record updated successfully"
}


### Delete response

Either return:
{
"message": "Record deleted successfully"
}


Or return:

204 No Content

Use one style consistently across the project.

---

# 9. Error Response Format

### Validation Error
{
"message": "The given data was invalid.",
"errors": {
"title": [
"The title field is required."
]
}
}


### Unauthorized Action
{
    "message;"This action is unauthorized."
}

### Unauthenticated Request
{
"message": "Unauthenticated."
}

### Resource Not Found
{
"message": "Resource not found."
}

### Server Error
{
"message": "An unexpected error occurred."
}


Never expose stack traces in production.

---

# 10. HTTP Status Code Rules

Use proper HTTP status codes.

Common codes:
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthenticated
403 Forbidden
404 Not Found
422 Validation Error
500 Server Error


---

# 11. Pagination Conventions

All large lists must support pagination.

### Request parameters
?page=1
?per_page=10


### Standard paginated response
{
"data": [],
"meta": {
"current_page": 1,
"per_page": 10,
"total": 100,
"last_page": 10
},
"message": "Records retrieved successfully"
}


Optional pagination links:
"links": {
"first": "...",
"last": "...",
"prev": null,
"next": "..."
}


---

# 12. Filtering Conventions

Filtering should use query parameters.

Examples:
GET /api/research?status=published
GET /api/research?agency_id=3
GET /api/users?role=agency-admin
GET /api/archive?module=research

Rules:

- filter names must be predictable
- filtering logic happens on the backend
- invalid filters should be ignored or validated

---

# 13. Search Conventions

Use a unified search parameter.

Standard parameter:
?q=keyword


Examples:
GET /api/research?q=climate
GET /api/users?q=juan


Search should be implemented server-side.

---

# 14. Sorting Conventions

Sorting uses query parameters.

Example:
?sort=created_at
?direction=desc


Example request:
GET /api/research?sort=published_at&direction=desc


Rules:

- only allow approved sortable fields
- default sorting should be defined per endpoint

---

# 15. Combined Query Example

Example endpoint with filters, search, sorting, and pagination:
GET /api/research?q=climate&status=published&agency_id=2&sort=published_at&direction=desc&page=1&per_page=10


The API must handle these parameters consistently.

---

# 16. Resource Representation

Use **Laravel API Resources** to shape responses.

Example:
{
"data": {
"id": 101,
"title": "Climate Change Adaptation",
"status": "published",
"agency": {
"id": 3,
"name": "DOST Region XI"
},
"author": {
"id": 12,
"name": "Maria Santos"
},
"published_at": "2026-03-12T08:00:00Z"
},
"message": "Research retrieved successfully"
}


Rules:

- do not expose internal database fields
- keep payload minimal
- include relationships only when necessary

---

# 17. Relationship Inclusion

Optional relationships can be included using:
?include=

Example:
GET /api/research/101?include=agency,author,documents


Rules:

- validate allowed relationships
- prevent excessive nested loading

---

# 18. Authentication Endpoints

Authentication endpoints should be grouped clearly.

Examples:
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password


Example response:
{
"data": {
"id": 1,
"name": "Admin User",
"email": "admin@example.com
",
"roles": ["super-admin"],
"permissions": [
"research.view",
"research.publish"
]
},
"message": "Authenticated user retrieved successfully"
}


---

# 19. RBAC Endpoints

Example RBAC routes:
GET /api/rbac/roles
POST /api/rbac/roles
GET /api/rbac/roles/{role}
PUT /api/rbac/roles/{role}
DELETE /api/rbac/roles/{role}

GET /api/rbac/permissions
POST /api/rbac/roles/{role}/sync-permissions


Role updates must always require authorization.

---

# 20. File Upload Endpoints

Use multipart form-data.

Example:
POST /api/research/{research}/documents

Example response:
{
"data": {
"id": 88,
"filename": "research-paper.pdf",
"mime_type": "application/pdf",
"size": 245812
},
"message": "Document uploaded successfully"
}


---

# 21. Archive and Restore

Archive actions should be explicit.

Examples:
POST /api/research/{research}/archive
POST /api/archive/{archiveItem}/restore


Archive and delete should be separate actions.

---

# 22. Bulk Operations

Example bulk actions:
OST /api/research/bulk-archive
POST /api/notifications/bulk-mark-as-read


Example request body:
{
"ids": [1,2,3]
}


Bulk actions must be validated and authorized.

---

# 23. Date and Time Format

All dates must follow **ISO 8601 format**.

Example:
2026-03-12T08:00:00Z


---

# 24. Boolean Values

Return proper boolean values.

Correct:
"is_published": true

Incorrect:
"is_published": "true"

---

# 25. Final Principle

RIKMS APIs must always be:

- predictable
- secure
- consistent
- domain-aware
- frontend-friendly
- maintainable

The API should feel like a well-designed platform interface, not a collection of unrelated endpoints.