# UI-2B — Workforce Admin Mutation UI Evidence

**Date:** 2026-08-24  
**Scope:** `apps/os-web` only  
**Gate:** **PASS (CONDITIONAL)** — commands wired + tests/build; live browser mutation smoke not recorded in this run  
**Backend readiness:** Step 14.7 CONDITIONAL PASS (Lane J)

---

## Summary

Extended Workforce Administration from read-only (UI-1) to **UI-safe admin mutations** on `/administracion/equipo/[memberId]`, using verified `POST /v1/commands/*` workforce commands only.

---

## Commands wired (9)

| Command | UI surface |
|---------|------------|
| `ChangeDepartment` | Organización → Cambiar departamento |
| `ChangeRole` | Organización → Cambiar rol |
| `ChangeManager` | Organización → Cambiar responsable |
| `SuspendMember` | Acceso → Suspender acceso (confirmación) |
| `ActivateMember` | Acceso → Reactivar acceso (suspended only, admin) |
| `TerminateMember` | Acceso → Finalizar relación (confirmación fuerte) |
| `GrantDelegation` | Delegaciones → Crear delegación |
| `RevokeDelegation` | Delegaciones → Revocar (por ID) |
| `RequestMemberEmailChange` | Cuenta → Solicitar cambio de correo (**self only**) |

---

## Blocked — confirmed absent

| Command | Exposed |
|---------|---------|
| `InviteMember` | **NO** |
| `RehireMember` | **NO** |
| `ChangeMemberEmail` | **NO** |
| `RetryAuthProviderSync` | **NO** (not in normal admin UI) |

---

## Lifecycle UX

| State | Actions shown |
|-------|----------------|
| **Active** | Organización, Suspender, Terminar, Delegaciones; email change if self |
| **Suspended** | Organización, Reactivar (admin, not self), Terminar |
| **Terminated / Revoked** | Read-only — no reactivate, suspend, or org mutations |
| **Invited** | No admin activate, suspend, or org mutations (onboarding path separate) |

Copy uses **Reactivar acceso** — not Recontratar.

---

## Open-work termination UX

`TerminateMember` → `VALIDATION_FAILED` maps to:

> No se puede finalizar todavía porque esta persona tiene trabajo abierto. Reasigna ese trabajo primero.

Link to `/trabajo` provided. No silent reassignment.

---

## Directory-backed pickers (no static HR catalog)

| Picker | Source |
|--------|--------|
| Departamentos | Unique `(departmentId, departmentName)` from `GET /v1/members`; text fallback if empty |
| Roles | Unique `roleKeys` from directory |
| Responsable / delegado | Active members from directory |

---

## Cross-lane note (non-blocking)

**Delegation revoke:** No `ListDelegations` HTTP query exists. UI shows `delegationId` from grant success message + manual revoke field.  
**Classification:** UX workaround within UI lane — **not** a backend patch request for UI-2B scope.

**Department catalog:** No dedicated departments endpoint — directory derivation used per spec.

---

## Files added/changed

| Path | Role |
|------|------|
| `lib/workforce/actions.ts` | Server actions for 9 commands |
| `lib/workforce/command-types.ts` | UI-2B registry + blocked list |
| `lib/workforce/command-errors.ts` | Step 14.7 error mapping + terminate open-work |
| `lib/workforce/lifecycle-ui.ts` | Visibility rules by access/employment state |
| `lib/workforce/admin-options.ts` | Directory-backed pickers |
| `components/admin/member-admin-actions-panel.tsx` | Mutation forms |
| `app/(app)/administracion/equipo/[memberId]/page.tsx` | Wired panel |
| `lib/api/os-api-client.ts` | `executeWorkforceCommand` |
| `components/commercial/command-submit-button.tsx` | Optional `disabled` prop |
| `lib/workforce/ui-2b.test.ts` | 19 regression tests |
| `lib/workforce/admin-options.test.ts` | Directory picker test |

---

## Verification

| Check | Result |
|-------|--------|
| `npm test` (os-web) | **116/116 PASS** |
| `npm run typecheck` | **PASS** |
| `npm run build` | **PASS** |
| Live browser admin mutations | **NOT RUN** (CONDITIONAL) |

---

## Authorization

Backend remains authority. UI handles 403/401 via `mapWorkforceCommandError`. Button visibility is presentation only.

---

## Carmen handoff gate

**WORKFORCE ADMIN MUTATION UI:** **PASS (CONDITIONAL)**

**Exact next workforce UI slice:** Live workforce admin UAT (browser mutations on synthetic members)

**Exact next action:** Run Playwright/admin smoke against Step17 tenant — suspend → reactivate → terminate (synthetic member only)

**Exact next Cursor prompt (Agent 4):**

```
STEP UI-LIVE-3 — WORKFORCE ADMIN MUTATION BROWSER SMOKE

MODE: PLAYWRIGHT VERIFICATION ONLY · apps/os-web · DEV auth · synthetic members only

Verify on /administracion/equipo/[memberId]:
- ChangeDepartment, ChangeRole, ChangeManager
- Suspend → Reactivar → (optional) Terminate on member with no open work
- GrantDelegation → RevokeDelegation via returned delegationId
- Confirm InviteMember / RehireMember / ChangeMemberEmail / RetryAuthProviderSync absent
- Terminate with open work shows open-work message + Trabajo link

Evidence: docs/architecture/UI_LIVE_3_WORKFORCE_ADMIN_MUTATION_EVIDENCE.md
STOP.
```
