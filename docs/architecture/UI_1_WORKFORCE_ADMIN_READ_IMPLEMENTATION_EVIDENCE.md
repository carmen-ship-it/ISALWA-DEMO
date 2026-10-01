# UI-1 — Workforce Admin Read Surfaces Evidence

**Lane:** UI-1 — Administración / Equipo read experience  
**Date:** 2026-08-24  
**App:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL runtime integration)**

---

## Pre-flight

| Endpoint | Status | Evidence |
|----------|--------|----------|
| `GET /v1/members` (ListMembers) | **READY** | `STEP_15_2_MEMBER_CAPABILITY_QUERY_EVIDENCE.md`, postgres + HTTP tests |
| `GET /v1/members/:id` (GetMember + summary) | **READY** | same |
| `GET /v1/capabilities` (GetCapabilityState) | **READY** | same |

**ListMembers scope:** `people.admin` — org-wide directory within session tenant.  
**GetCapabilityState scope:** `member_active` — system availability, not user permission.

**Cross-lane change requests:** NONE for UI-1 read scope. Terminated-member query gap remains Agent 1 (documented in Step 15.2).

---

## IMPLEMENTED

| Surface | Location | API |
|---------|----------|-----|
| Administración hub | `app/(app)/administracion/page.tsx` | `probeAdminAccess` → ListMembers limit 1 |
| Equipo directory | `app/(app)/administracion/equipo/page.tsx` | `GET /v1/members` |
| Member detail | `app/(app)/administracion/equipo/[memberId]/page.tsx` | `GET /v1/members/:id` (summary) |
| Accesos guidance | `app/(app)/administracion/accesos/page.tsx` | Links to Equipo filters (no separate API) |
| Capacidades | `app/(app)/administracion/capacidades/page.tsx` | `GET /v1/capabilities` |
| Member list UI | `components/admin/member-list.tsx` | Directory DTO fields only |
| Search/filters | `components/admin/member-search-form.tsx` | `q`, `accessStatus`, `employmentStatus`, `departmentId`, cursor |
| Capability list | `components/admin/capability-list.tsx` | Backend state + presentation labels |
| Backend-driven nav | `lib/capabilities/resolve-nav.ts`, `app-nav.tsx` | Shell loads capabilities once |
| Presentation metadata | `lib/capabilities/presentation.ts` | Labels/messages only — no lifecycle authority |
| Admin probe | `probeAdminAccess` | ListMembers (replaces operations/outbox hack) |
| Lifecycle copy | `lib/workforce/labels.ts` | Suspended ≠ terminated distinction |

**Not invented:** HR title, seniority, salary, leave, performance metrics, auth-provider IDs.

**Not implemented:** invite, suspend, terminate, reactivate, department/manager/role changes, delegation commands.

---

## STATIC CAPABILITY MANIFEST

| Before | After |
|--------|-------|
| `manifest.ts` held `state: locked/future/active` | **PRESENTATION-ONLY** re-export; state from `GET /v1/capabilities` |
| Nav badges from static state | Nav badges from backend `CapabilityStateReadModel.state` |
| Finanzas/Mensajes locked copy static | Server fetch of capability state on those pages |

---

## N+1 MEMBER LOOKUPS

| Surface | Pattern |
|---------|---------|
| Equipo list | **REMOVED** — single `listMembers`; manager labels from same page via `buildDirectoryLabelMap` |
| Member detail manager | At most **1** extra `getMember` for manager name |
| UI-3/UI-4 owner labels | **STILL PRESENT** — `resolveMemberLabels` N+1 unchanged (out of UI-1 scope) |

---

## TESTED

| Suite | Result |
|-------|--------|
| `lib/workforce/ui-1.test.ts` | 17 tests PASS |
| Full os-web suite | **65 tests PASS** |
| Typecheck + build | PASS — 6 new admin routes |

---

## INTEGRATED

| Path | Status |
|------|--------|
| Postgres os-api browser smoke | **NOT VERIFIED** — environment unavailable |
| Runtime fake employees | **NOT USED** |

---

## VERIFIED

- Directory uses ListMembers with backend filters
- Access/employment lifecycle displayed in Spanish without conflating suspend vs terminate
- Capability state backend-driven for nav + admin Capacidades page
- Capability ACTIVE ≠ user permission (explicit copy on Capacidades)
- Admin pages gated by backend (`people.admin` via ListMembers probe)
- No client-side role override

---

## DEFERRED

- Workforce mutation forms
- Member change history query
- Manager-scoped directory (backend: people.admin only today)
- Browser E2E vs live Postgres
- UI-3/UI-4 member-resolver N+1 reduction via directory cache

---

## Authorization

- 401 → layout/session states
- 403 on admin pages → `AccessDeniedState`
- 404 on member detail → honest not-found message
- Nav visibility ≠ authorization (admin probe + API enforcement)

---

## Accessibility

- Labeled search field and filter chip groups
- Member list semantic `ul` with `aria-label`
- Status via `StatusPill` + text labels (not color alone)
- Keyboard-focusable nav links and member row links
- Loading shell on `/administracion/equipo`

---

## Files touched (apps/os-web only)

```
lib/workforce/*
lib/capabilities/presentation.ts
lib/capabilities/resolve-nav.ts
lib/capabilities/manifest.ts (deprecated re-export)
lib/api/os-api-client.ts
lib/shell/load-shell-context.ts
lib/work/member-resolver.ts
components/admin/*
components/shell/app-nav.tsx
components/shell/app-shell.tsx
app/(app)/administracion/**
app/(app)/finanzas/page.tsx
app/(app)/mensajes/page.tsx
app/(app)/layout.tsx
```
