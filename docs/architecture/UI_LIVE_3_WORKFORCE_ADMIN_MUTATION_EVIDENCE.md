# UI-LIVE-3 — Workforce Admin Mutation Live Browser Smoke

**Date:** 2026-08-24  
**Scope:** `apps/os-web` + running `os-api` + local Postgres  
**Auth mode:** DEV (`NEXT_PUBLIC_OS_AUTH_MODE=dev`)  
**Gate:** **PASS (CONDITIONAL)**  
**Script:** `scripts/ui-live-3-playwright.mjs`  
**Artifacts:** `.ui-live-3-evidence/` (final run stamp `2026-08-24T14-38-52-500Z`)

---

## Preflight

| Check | Result |
|-------|--------|
| UI-2B implementation present (`MemberAdminActionsPanel`, workforce actions) | **YES** |
| Step17 marker | `.step17-evidence/seed-marker-ui-live-1.json` |
| Synthetic target | María Quispe `01M0T1JRY68MZYVSP0YEBRXKBT` (never admin) |
| os-api health | `200` |
| os-web health | `200` (required `.next` cache clear + dev restart after prior 500) |

**Blocked commands absent from normal HR UI (code + browser):** InviteMember, RehireMember, ChangeMemberEmail, RetryAuthProviderSync — **confirmed NO**.

---

## Live flow results

| Step | Result | Notes |
|------|--------|-------|
| Team directory `/administracion/equipo` | **PASS** | Real backend data; María + admin listed |
| Member detail (dept / role / manager / access) | **PASS** | Summary card + Organización panel |
| Change department | **PASS** | Text fallback used Step17 dept `General` (`01M0T1JRRAA0KFK5KSSBDW9D5R`); success UX + directory shows General |
| Change role | **PASS** | Directory-backed role picker |
| Change manager | **PASS** | Admin selected as responsable |
| Suspend | **PASS** | Confirmation checkbox; status → Suspendido; Reactivar offered; no termination copy |
| Reactivate | **PASS** | Returns Activo; no Recontratar |
| Delegation grant + revoke | **PASS** | Grant returns ID; revoke by ID field |
| Open-work termination block | **PASS** | Spanish alert + link “Ver trabajo abierto”; member stays active |
| Terminate (no open work) | **PASS** | Destructive confirm; Acceso revocado; no Reactivar/Rehire |
| Email change request | **NOT RUN** | Self-only; DEV actor has no dedicated self profile route |
| Unauthenticated admin route | **PASS** | Redirects to `/login`; no raw JSON/stack |
| Mobile viewport (390×844) | **PASS** | Suspend / org actions remain reachable |

---

## Auth claim limits (explicit)

**Proven in this run:**

- Live browser → os-web server actions → os-api commands → Postgres mutation path
- DEV session cookie (`os_dev_session`) admin actor

**Not proven:**

- Supabase browser auth
- Production auth / SSO
- Provider email sync completion

---

## Observations (non-blocking)

1. **Department picker:** When no member yet has a department, UI shows identifier text input (directory-backed catalog empty). Valid org department ID required (Step17 seed `General`). Not a UI-LIVE-3 failure once ID known.
2. **Success toast vs revalidate:** After some mutations, `revalidatePath` refreshes the page quickly; summary state change is the reliable post-condition (used in Playwright for suspend/reactivate/terminate).
3. **Backend (cross-lane, not patched):** `ChangeDepartment` with unknown `departmentId` returns HTTP **500** (FK) instead of `400 VALIDATION_FAILED`. Valid seed dept succeeds. **CROSS_LANE_CHANGE_REQUEST** if product wants friendly validation.

---

## Blocked action browser check

Inspected admin self detail page after mutations:

| Surface | Exposed |
|---------|---------|
| InviteMember | **NO** |
| RehireMember | **NO** |
| ChangeMemberEmail | **NO** |
| RetryAuthProviderSync | **NO** |

---

## Verification artifacts

| Artifact | Path |
|----------|------|
| Final results JSON | `.ui-live-3-evidence/latest-results.json` |
| Directory screenshot | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-equipo-directory.png` |
| Department mutation | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-change-department.png` |
| Suspended state | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-maria-suspended.png` |
| Open-work block | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-terminate-blocked-open-work.png` |
| Terminated state | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-maria-terminated.png` |
| Mobile | `.ui-live-3-evidence/2026-08-24T14-38-52-500Z-mobile-member-detail.png` |

---

## Script / environment notes

- Playwright uses system Chrome (`channel: 'chrome'`).
- Preflight activates/reactivates synthetic María if suspended/invited.
- Open-work negative uses API `CreateWorkItem` / `CompleteWork` (work lane setup, not blocked UI commands).
- **Post-run:** María is **terminated** — re-run Step17 seed before next UI-LIVE-3.

---

## Carmen handoff

### LIVE WORKFORCE ADMIN
PASS (CONDITIONAL)

### AUTH MODE
DEV

### TEAM DIRECTORY
PASS

### CHANGE DEPARTMENT
PASS

### CHANGE ROLE
PASS

### CHANGE MANAGER
PASS

### SUSPEND
PASS

### REACTIVATE
PASS

### TERMINATE
PASS

### OPEN-WORK TERMINATION BLOCK
PASS

### DELEGATION
PASS

### EMAIL CHANGE REQUEST
NOT RUN

### INVITE EXPOSED
NO

### REHIRE EXPOSED
NO

### CHANGE EMAIL COMPLETION EXPOSED
NO

### RETRY PROVIDER SYNC EXPOSED
NO

### UI BUGS FOUND/FIXED
NONE (os-web). Playwright script hardened for dept text fallback and post-revalidate state assertions.

### BACKEND BUGS FOUND
ChangeDepartment with invalid departmentId → HTTP 500 (should be VALIDATION_FAILED). Not patched (UI lane).

### LIVE WORKFORCE UAT STATUS
CONDITIONAL

### WHAT REMAINS BEFORE PRODUCTION
1. Supabase/production auth browser smoke (separate tier from DEV).
2. Self-profile route to exercise RequestMemberEmailChange in browser.
3. Reseed synthetic María after terminate (Step17).
4. Optional: departments read API or friendlier invalid-dept validation (backend).
5. Optional: delegation list/revoke UX without manual ID (needs query API).

### EXACT NEXT ACTION
**UI-LIVE-4 — Supabase browser auth smoke** on the same Workforce Admin mutation path (login → Equipo → member detail → one safe read/mutation), or re-seed Step17 if another DEV mutation run is needed immediately.

---

## UI-LIVE-3B — ChangeDepartment error-contract regression (2026-08-27)

**Label:** UI-LIVE-3B  
**Mode:** Targeted live verification only (not a full UI-LIVE-3 retest)  
**Auth:** DEV  
**Gate:** **PASS (CONDITIONAL)** — foreign-tenant department check NOT RUN after Step17 single-org seed  
**Backend precondition:** Step 14.7 PASS (`.step14-7-evidence/verify-20260827T124620Z.log`) — invalid/foreign departmentId → `VALIDATION_FAILED` / HTTP 400  
**Script:** `scripts/ui-live-3b-changedepartment.mjs`  
**Final stamp:** `2026-08-27T12-56-20-104Z`

### Preflight

| Step | Result |
|------|--------|
| Step17 reseed (`packages/os-database/src/step17-restore-seed.ts` → `.step17-evidence/seed-marker-ui-live-1.json`) | Done — prior Step17 IDs absent after Step14.7 DB churn |
| Synthetic María activated for org mutations | Done |
| Foreign-tenant dept in seed | None (single org) → CHECK 2 NOT RUN |

### Results

| Check | Result | Evidence |
|-------|--------|----------|
| 1. Invalid departmentId | **PASS** | API `400` + `VALIDATION_FAILED`; UI: *“Revise los datos ingresados e intente de nuevo.”*; no FK/Prisma/500/stack; assignment **UNCHANGED** |
| 2. Foreign-tenant departmentId | **NOT RUN** | Step17 seed has one organization only — no safe foreign dept fixture |
| 3. Valid same-org ChangeDepartment | **PASS** | Success UX; Postgres assignment = General (`01M11MEJ7NHB5B2205RM343ET0`); detail shows General |

### Artifacts

| File | Role |
|------|------|
| `.ui-live-3-evidence/ui-live-3b-latest-results.json` | Results |
| `.ui-live-3-evidence/ui-live-3b-results-2026-08-27T12-56-20-104Z.json` | Stamp copy |
| `.ui-live-3-evidence/ui-live-3b-2026-08-27T12-56-20-104Z.log` | Run log |
| `.ui-live-3-evidence/ui-live-3b-2026-08-27T12-56-20-104Z-invalid-department.png` | Invalid UX |
| `.ui-live-3-evidence/ui-live-3b-2026-08-27T12-56-20-104Z-valid-department.png` | Valid UX |

### Not retested (out of scope)

Suspend, Reactivate, Terminate, Delegation, Manager, Role, RequestMemberEmailChange, Invite, Rehire, ChangeMemberEmail.

### Carmen handoff (UI-LIVE-3B)

### UI-LIVE-3B
PASS (CONDITIONAL)

### INVALID DEPARTMENT
PASS

### INVALID DEPARTMENT HTTP
400 VALIDATION_FAILED

### FOREIGN-TENANT DEPARTMENT
NOT RUN

### FOREIGN EXISTENCE LEAK
NOT RUN

### VALID DEPARTMENT REGRESSION
PASS

### MEMBER STATE AFTER INVALID ATTEMPT
UNCHANGED

### RAW DATABASE ERROR EXPOSED
NO

### BACKEND BUGS
NONE

### UI BUGS
NONE

### WORKFORCE ADMIN INTERNAL UAT
CONDITIONAL

### WHAT REMAINS UNVERIFIED
1. Foreign-tenant ChangeDepartment live path (needs multi-org synthetic fixture beyond single-org Step17)
2. Supabase / production browser auth
3. RequestMemberEmailChange browser path

### EXACT NEXT ACTION
Add a documented multi-org Step17/fixture path (or reuse Step14.7 dual-org seed without wiping UI-LIVE marker) and run **only** foreign-tenant ChangeDepartment live check — or proceed to Supabase auth smoke if foreign-tenant is deferred to backend-only (already covered in Step14.7 HTTP tests).
