
---

# `FRONTEND_RULES.md`

```md
# RIKMS v2 Frontend Rules
Stack: Next.js + React

## 1. Frontend Mission

The frontend must provide:
- a clean and responsive user experience
- a reusable and scalable component system
- clear enterprise/government-style interfaces
- seamless consumption of backend APIs
- maintainable code structure

---

## 2. Core Frontend Principles

1. Build reusable components first
2. Keep pages thin
3. Keep feature logic organized
4. Avoid duplicate UI patterns
5. Match Figma closely
6. Support responsive behavior by default
7. Prioritize readability over cleverness
8. Handle loading, empty, and error states clearly
9. Respect accessibility basics
10. Keep backend assumptions typed and explicit

---

## 3. Suggested Frontend Structure

```text
src/
├── app/ or pages/
├── components/
│   ├── ui/
│   ├── layout/
│   └── shared/
├── features/
│   ├── auth/
│   ├── research/
│   ├── publications/
│   ├── agencies/
│   ├── users/
│   ├── rbac/
│   ├── analytics/
│   ├── notifications/
│   ├── archive/
│   └── settings/
├── hooks/
├── services/
├── types/
├── utils/
├── constants/
└── styles/