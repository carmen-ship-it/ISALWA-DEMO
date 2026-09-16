# WAVE A AGENT 5 — Owner / people.admin / system.admin truth

**Date:** 2026-09-15  
**Agent:** 5 ONLY (read-only)  
**Branch:** `wave-a/admin-continuity`  
**Repo:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Method:** Codebase inspection only. No implementation. Did **not** grant `people.admin` to Owner.

**Known fixture evidence (accepted as given):**

| Field | Value |
| --- | --- |
| Email | `w2.owner@isalwa.demo` |
| MemberId | `4e69ff93-fe92-452d-b836-09dc10836608` |
| Org (SYNTH) | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| Capabilities | `['management.org.read', 'system.admin']` — **NO** `people.admin` |

---

## Classification

**OWNER ADMIN DENIAL = EXPECTED**

Owner denial on `/administracion` is correct product behavior for this fixture.  
Not a gate bug. Not a navigation bug (Inicio does not advertise Administración for Owner).

---

## 1. Exact `/administracion` gate

**Gate:** `people.admin` via `probeAdminAccess()` (member directory probe).  
**Not** `system.admin`. **Not** role/cargo/title strings.

| Layer | Exact mechanism | Path |
| --- | --- | --- |
| Page | `const allowed = await client.probeAdminAccess()` → deny → `AccessDeniedState` | `apps/os-web/app/(app)/administracion/page.tsx` |
| Subpages | Same `probeAdminAccess()` | `apps/os-web/app/(app)/administracion/equipo/page.tsx`, `.../invitar/page.tsx`, `.../[memberId]/page.tsx`, `.../accesos/page.tsx`, `.../capacidades/page.tsx` |
| Client probe | `GET /members?limit=1`; `forbidden`/`unauthorized` → `false` | `apps/os-web/lib/api/os-api-client.ts` (`probeAdminAccess`) |
| Shell nav probe | `showAdmin = await client.probeAdminAccess()` | `apps/os-web/lib/shell/load-shell-context.ts` |
| API / query | `listMembers` → `assertQueryScope(ctx, 'people.admin')` | `packages/os-query/src/member/member-query-service.ts` |
| Nav item | `requiresAdminProbe: true`, `accessClass: 'HIDDEN'` until probe | `apps/os-web/lib/navigation/nav-config.ts` (`id: 'administracion'`) |
| Filter | Hidden unless `showAdmin` | `filterNavByAccess` / `classifyNavItem` in same file |

Comment in nav config (exact intent):

> people.admin only. system.admin Controles del sistema uses /sistema, not this link.

Source-lock test: `apps/os-web/lib/roles/system-admin-affordance.test.ts` — `/administracion` matches `probeAdminAccess` / `AccessDeniedState` and does **not** match `system.admin|mayOpenSystemControls|SYSTEM_ADMIN`.

---

## 2. Exact `/sistema` gate

**Gate:** exact assigned `system.admin` on session scopes.  
**Not** `probeAdminAccess`. **Not** `people.admin`.

| Layer | Exact mechanism | Path |
| --- | --- | --- |
| Page | `grantedScopes = await loadActorRoleKeys(client)` then `mayOpenSystemControls(grantedScopes)` | `apps/os-web/app/(app)/sistema/page.tsx` |
| Helper | `mayOpenSystemControls` → `systemControlsAllowed` | `apps/os-web/lib/roles/system-controls.ts` |
| Scope check | `hasAssignedOperationsScope(grantedScopes, SYSTEM_ADMIN_SCOPE)` | `apps/os-web/lib/roles/access.ts` → `@isalwa/os-contracts` |
| Constant | `SYSTEM_ADMIN_SCOPE = 'system.admin'` | `packages/os-contracts/src/operations-scopes.ts` |
| Destination | `SYSTEM_CONTROLS_HREF = '/sistema'` | `apps/os-web/lib/roles/system-controls.ts` |

Source-lock test: same `system-admin-affordance.test.ts` — `/sistema` uses `mayOpenSystemControls` / `loadActorRoleKeys` / `AccessDeniedState` and does **not** call `probeAdminAccess`.

---

## 3. `system.admin` does **not** imply `people.admin` (tests)

Implication engine is identity-only:

```ts
// packages/os-contracts/src/operations-scopes.ts
export function scopeImplies(heldScope: string, requiredScope: string): boolean {
  return held.length > 0 && held === required;
}
```

| Proof | File | Assertion |
| --- | --- | --- |
| Meaning object | `apps/os-web/lib/roles/system-admin-affordance.test.ts` | `SYSTEM_ADMIN_MEANING.impliesPeopleAdmin === false`; scopes unequal |
| Owner home href | same | Owner scopes → Controles href `/sistema`, never contains `administracion` |
| Bidirectional hide | same | `mayOpenSystemControls(['people.admin']) === false`; `people.admin` alone → `systemControls === null` |
| Nav separation | same | Administración only when `showAdmin` (people probe); Controles separate |
| Planned Owner | `packages/os-contracts/src/v1-planned-assignments.test.ts` | `isalwa-manager` intended = `[management.org.read, system.admin]`; `people.admin` **not** bundled; stays in `V1_UNASSIGNED_CAPABILITIES` |
| Trusted context | `packages/os-domain/src/trusted-member-context.ts` | comment: `people.admin` is explicit assignment only |
| Governance copy | `packages/os-contracts/src/governance-proposals.ts` | both are distinct identity/admin authorities; neither unlocks sibling domains |

---

## 4. What nav / homes advertise for Owner — does Inicio show Administración incorrectly?

**No.** Inicio does **not** advertise Administración for Owner.

Owner scopes `management.org.read` + `system.admin` produce:

| Surface | Advertises | Does not advertise |
| --- | --- | --- |
| Primary nav | No Administración (`showAdmin=false` without people probe) | `administracion` hidden — `nav-config.ts` + `load-shell-context.ts` |
| Inicio operating homes | Gerente business home (from `management.org.read`) + **Controles del sistema** card | No `/administracion` link |
| Controles card | Link **Abrir controles** → `controls.href` = `/sistema` | `SystemControlsHome` in `apps/os-web/components/management/system-controls-home.tsx` |
| Role nav requests | `{ id: 'system-controls', href: '/sistema', label: 'Controles del sistema' }` | `apps/os-web/lib/navigation/requests/roles.ts` |
| Palette Admin invite | Only if `canInvite` / people probe | `apps/os-web/lib/shell/command-palette.ts` + tests |

Tests locking this:

- `system-admin-affordance.test.ts` — Owner Controles → `/sistema`, never `/administracion`
- `role-homes.test.ts` — system controls kept **off** the gerente home; `model.systemControls.href === '/sistema'`
- `businessHomeHasSystemControls` forbids embedding `/administracion` or Controles inside business home JSON (`homes.ts`)

**Hosted residual context:** independent verifier recorded Owner denied on `/administracion` as FAIL against an “Owner should allow Admin” expectation (`docs/operations/company-os-recon-2026-09-15/independent-verifier-onboarding.md`). Code truth: that hosted deny matches the gate; the expectation was wrong for this fixture.

---

## 5. Exact meaning: `SYSTEM.ADMIN` vs `PEOPLE.ADMIN`

### `system.admin` (technical)

From `SYSTEM_ADMIN_MEANING` in `apps/os-web/lib/roles/system-controls.ts` + `operations-scopes.ts`:

| Property | Value |
| --- | --- |
| Scope string | `system.admin` |
| Tenant-bound | `true` (`systemAdminMayActInOrganization`) |
| Rewrites history | `false` (`mayRewriteHistory` always false) |
| Implies people.admin | `false` |
| Includes integration health | `false` |
| Separate from business home | `true` |
| UI destination | `/sistema` Controles del sistema shell |
| Planned on | `isalwa-manager` / Owner (`v1-planned-assignments.ts`) |

Page copy (`sistema/page.tsx`): technical authority only; does not open Equipo / Accesos / invitaciones.

### `people.admin` (people / workforce admin)

| Property | Value |
| --- | --- |
| Scope string | `people.admin` (`PEOPLE_ADMIN_SCOPE`) |
| Listed in | `ADMIN_SCOPE_KEYS` (`packages/os-contracts/src/scopes.ts`) |
| UI destination | `/administracion/**` |
| Probe | `GET /members` / `listMembers` requires it |
| Commands | `COMMAND_REQUIRED_SCOPES` — InviteMember, ChangeRole, Suspend/Terminate, Grant/End additional roles, ChangeManager/Department, ReassignWork, etc. (`scopes.ts`) |
| Planned assignment | **None** — `V1_UNASSIGNED_CAPABILITIES`; note: “No confirmed person. Not a Gerente or Owner shortcut…” (`v1-planned-assignments.ts`) |
| Governance | “people.admin can manage people…” (`governance-proposals.ts`) — identity/people admin, not commercial/production/finance shortcut |

---

## 6. Who in fixtures **HAS** `people.admin`?

### Wave 2 SYNTH role fixtures (`w2.*@isalwa.demo`) — **nobody**

| Actor | Email | Planned scopes | `people.admin`? |
| --- | --- | --- | --- |
| Owner | `w2.owner@isalwa.demo` | `management.org.read`, `system.admin` | **NO** |
| Gerente | `w2.gerente@isalwa.demo` | `management.org.read` | **NO** |
| Other eight business roles | `w2.asesor|jefe|…` | per planned function | **NO** |
| Fixture seed | `w2.fixture-seed@isalwa.demo` | `master_data.admin`, `commercial.account.reassign` | **NO** |

Evidence:

- Plan table: `docs/architecture/WAVE2_STAGING_ROLE_FIXTURE_PLAN.md` — Owner = technical layer only; `people.admin` “Not a business shortcut” / explicitly unassigned
- Receipt payload lists `people.admin` under `explicitlyUnassigned`: `packages/os-database/src/staging-wave2-role-fixtures.ts`
- Email map: `ROLE_EMAILS['isalwa-manager'].email === 'w2.owner@isalwa.demo'` — `staging-wave2-role-fixtures-guards.ts`
- Tests: seed actor excludes `people.admin` / `system.admin` — `staging-wave2-role-fixtures.test.ts`
- Contracts: every planned business function asserts no `people.admin` — `v1-planned-assignments.test.ts`

### Other (not Wave2 Owner acceptance personas)

| Source | Has `people.admin`? | Note |
| --- | --- | --- |
| `staging-supabase-bootstrap.ts` | Yes — bootstrap admin gets `people.admin` + `master_data.admin` | Separate Step17-style bootstrap; not `w2.owner` |
| UI unit fixtures (`apps/os-web/lib/workforce/fixtures.ts`) | Sample member includes `people.admin` | Test data only |

**Conclusion for SYNTH org acceptance:** no Wave2 fixture persona holds `people.admin`. Owner correctly cannot open Administración until an explicit grant (out of scope for this agent — do not grant).

---

## 7. Free-text role entry on invite / ChangeRole UI?

| Layer | Free-text? | Evidence |
| --- | --- | --- |
| **Invite UI** | **No** — `<select>` of options from directory | `apps/os-web/components/admin/invite-member-form.tsx` |
| **ChangeRole UI** | **No** — `<select>` of `primaryRoleOptions` | `apps/os-web/components/admin/member-admin-actions-panel.tsx` |
| Option source | Existing members’ `roleKeys` (first page), not frozen catalog | `apps/os-web/lib/workforce/admin-options.ts` (`uniqueRoles`) |
| **API / schema** | **Yes free-string** — `roleKey: z.string().min(1)` | `InviteMemberPayloadSchema` / `ChangeRolePayloadSchema` in `packages/os-contracts/src/commands.ts` |
| Product note | Invite copy: choose system role; people.admin not auto-assigned | `apps/os-web/lib/workforce/invite.ts` |

So: UI is select-only from observed keys; contract still accepts any non-empty string (governed enum not frozen). Prior recon labeled this LIVE BUT PARTIAL (`docs/operations/company-os-recon-2026-09-15/agent-01-admin-lifecycle.md`).

---

## Bottom line

1. `/administracion` = `probeAdminAccess` → `people.admin` / `GET /members`.  
2. `/sistema` = exact `system.admin` via `mayOpenSystemControls`.  
3. No implication either way — tested.  
4. Owner Inicio advertises Controles → `/sistema`, **not** Administración.  
5. **OWNER ADMIN DENIAL = EXPECTED.**  
6. Meanings: technical shell vs people/workforce admin — separate assignments.  
7. Wave2 fixtures: **zero** holders of `people.admin`.  
8. Invite/ChangeRole UI: selects, not free-text; schema still free-string.

**Do not grant `people.admin` to Owner in this wave without an explicit product decision.**
