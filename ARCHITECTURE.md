# RIKMS v2 System Architecture
Stack: Laravel 12 API + React / Next.js Frontend

---

# 1. System Overview

RIKMS v2 (Regionwide Integrated Knowledge Management System) is an enterprise-grade web platform designed to manage research studies, institutional knowledge, and collaborative research data across agencies and organizations.

The system provides a centralized platform for:

- research submissions
- publication management
- agency collaboration
- knowledge archiving
- analytics and reporting
- notifications
- user and role management

The architecture is designed to be:

- modular
- scalable
- maintainable
- secure
- API-driven

The system follows a **separated backend and frontend architecture**.

---

# 2. Technology Stack

## Backend
- Laravel 12
- RESTful API architecture
- MySQL database
- Laravel Sanctum (recommended for API authentication)
- Eloquent ORM
- API Resources for response formatting

## Frontend
- React
- Next.js
- Tailwind CSS (recommended styling system)
- TypeScript (recommended)
- Axios or Fetch API for HTTP communication

## Development Tools
- Cursor IDE
- Codex / AI-assisted development
- ESLint / Prettier
- Laravel Pint

---

# 3. High-Level Architecture

The system follows a **three-layer architecture**.
Frontend Layer
React / Next.js Application

↓

API Layer
Laravel REST API

↓

Data Layer
MySQL Database


### Responsibilities

Frontend Layer
- UI rendering
- user interaction
- state management
- API consumption
- routing

API Layer
- business logic
- validation
- authorization
- workflow rules
- database interaction
- response formatting

Data Layer
- persistent storage
- relational data
- indexing and performance optimization

---

# 4. API-First Architecture

RIKMS v2 is built as an **API-first system**.

All system features are exposed through RESTful APIs.

Advantages:
- frontend independence
- mobile compatibility
- integration readiness
- easier testing
- modular architecture

Frontend applications interact with the system **only through the API layer**.

Direct database access from the frontend is never allowed.

---

# 5. Repository Structure

The project is structured into logical layers.
RIKMSV2/
│
├── app/ # Laravel application code
├── bootstrap/ # Laravel bootstrap
├── config/ # Configuration files
├── database/ # migrations, factories, seeders
├── public/ # public web root
├── resources/ # frontend assets (React)
├── routes/ # API routes
├── storage/ # application storage
├── tests/ # automated tests
│
├── ARCHITECTURE.md
├── FRONTEND_RULES.md
├── BACKEND_RULES.md
├── API_CONVENTIONS.md
├── .cursorrules


---

# 6. Backend Architecture (Laravel)

Backend code follows Laravel's modular structure.

### Key Components

Controllers  
Handle incoming API requests.

Requests  
Form Request classes handle validation.

Services / Actions  
Contain business logic and workflows.

Models  
Represent database entities.

Policies  
Handle authorization.

Resources  
Transform models into API responses.

### Recommended Request Flow
Route
↓
Controller
↓
Form Request (validation)
↓
Service / Action (business logic)
↓
Model / Query
↓
Resource
↓
JSON API Response


Controllers should remain thin.

Business logic must be placed inside **Services or Actions**.

---

# 7. Frontend Architecture (React / Next.js)

Frontend code follows a **feature-based architecture**.

frontend/src/

components/
ui/
layout/
shared/

features/
auth/
research/
publications/
agencies/
users/
rbac/
analytics/
notifications/
archive/
settings/

hooks/
services/
types/
utils/
constants/
styles/


### Responsibilities

Components
Reusable UI building blocks.

Features
Module-specific UI and logic.

Services
API communication layer.

Hooks
Reusable state logic.

Types
Shared TypeScript types.

Utils
Helper functions.

---

# 8. Domain Modules

RIKMS v2 is organized around domain modules.

### Core Modules

Authentication  
Login, logout, user session.

Users  
User account management.

Agencies  
Institution and organization management.

Research
Research submission and management.

Publications
Published research records.

RBAC
Role and permission management.

Analytics
System analytics and reporting.

Notifications
System alerts and activity updates.

Archive
Archived records and restoration.

Settings
Platform configuration.

Audit Logs
Tracking sensitive system operations.

Each module should exist in both:

Backend
- controller
- request
- service
- model
- policy
- resource

Frontend
- page
- feature components
- service
- types

---

# 9. Authentication Architecture

Authentication should use **Laravel Sanctum**.

Features:

- API authentication
- session management
- token protection
- SPA compatibility

Example endpoints:
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password


Protected routes require authentication middleware.

---

# 10. Authorization Architecture (RBAC)

RIKMS uses **Role-Based Access Control (RBAC)**.

Entities:

Users  
Roles  
Permissions  

Authorization enforcement happens on the backend using:

- Policies
- Gates
- Permission checks

Frontend may hide unavailable actions but **backend remains the source of truth**.

Example permissions:
research.view
research.create
research.update
research.publish
archive.restore
rbac.role.update


---

# 11. API Communication

Frontend communicates with the backend through service modules.

Example service:
services/research.service.ts

Example request:
GET /api/research


Example response:
{
"data": [],
"meta": {},
"message": "Research records retrieved successfully"
}


All API behavior must follow **API_CONVENTIONS.md**.

---

# 12. File Storage

Files such as research documents must be handled by the backend.

Backend responsibilities:

- file validation
- secure storage
- metadata persistence
- controlled file access

Frontend responsibilities:

- upload UI
- file selection
- progress indicators

---

# 13. Audit Logging

Sensitive actions should be logged.

Examples:

- research publication
- archive actions
- role assignment
- permission changes
- settings updates

Audit logs improve system accountability and traceability.

---

# 14. Performance Strategy

Performance considerations include:

- pagination for large lists
- optimized database queries
- eager loading relationships
- indexed database columns
- minimal payload responses
- frontend lazy loading

Avoid:

- N+1 queries
- large unpaginated responses
- unnecessary API calls

---

# 15. Security Principles

Security must be enforced at the backend.

Key principles:

- validate all input
- enforce authorization checks
- protect sensitive endpoints
- prevent exposure of internal errors
- never trust client-side validation alone
- secure file uploads

Sensitive actions must always require proper permissions.

---

# 16. Error Handling

Backend must return structured error responses.

Frontend must handle:

- validation errors
- API failures
- empty states
- loading states

Example validation response:
{
"message": "The given data was invalid.",
"errors": {
"title": [
"The title field is required."
]
}
}


---

# 17. Development Workflow

When implementing features:

1. Review system architecture.
2. Follow API conventions.
3. Implement backend logic first.
4. Expose the API endpoint.
5. Integrate the frontend.
6. Apply role-based restrictions.
7. Add loading and error states.

All code must follow:

- BACKEND_RULES.md
- FRONTEND_RULES.md
- API_CONVENTIONS.md
- .cursorrules

---

# 18. Scalability Considerations

RIKMS v2 is designed to support:

- multiple agencies
- thousands of research records
- large document storage
- analytical reporting
- future integrations

Architecture decisions prioritize:

- modular components
- API-first design
- clear domain separation
- maintainable services

---

# 19. System Philosophy

RIKMS v2 must behave as an institutional research platform.

The system should feel:

- professional
- structured
- secure
- reliable
- scalable

It must never feel like a generic dashboard template.

The architecture must support long-term maintainability and institutional use.
