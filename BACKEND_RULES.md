
---

# `BACKEND_RULES.md`

```md
# RIKMS v2 Backend Rules
Stack: Laravel 12 API Backend

## 1. Backend Mission

The backend is the source of truth for:
- business logic
- validation
- authorization
- persistence
- workflow rules
- audit-sensitive actions
- API response shaping

The backend must be secure, predictable, maintainable, and API-first.

---

## 2. Core Backend Principles

1. Controllers must remain thin
2. Validation belongs in Form Requests
3. Authorization belongs in Policies/Gates
4. Business rules belong in Services or Actions
5. API output belongs in Resources
6. Models should not become dumping grounds for unrelated logic
7. Use explicit naming
8. Prefer maintainability over shortcuts
9. Keep responses consistent
10. Always enforce permissions on the backend

---

## 3. Suggested Backend Structure

```text
app/
├── Actions/
├── DTOs/
├── Enums/
├── Exceptions/
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   ├── Requests/
│   ├── Resources/
│   └── Middleware/
├── Models/
├── Policies/
├── Services/
├── Support/
└── Traits/