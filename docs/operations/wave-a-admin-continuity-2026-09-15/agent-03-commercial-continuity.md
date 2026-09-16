# WAVE A AGENT 3 — Commercial ownership continuity

**Date:** 2026-09-15  
**Agent:** 3 ONLY  
**Branch:** `wave-a/admin-continuity`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Method:** Code trace + minimal os-web UI where governed commands exist. No Prisma mutations. No TerminateMember gate edits.

---

## Summary

| Entity | Ownership field | “Owned by member” (terminate preflight) | Historical / released | Governed reassignment command |
| --- | --- | --- | --- | --- |
| **Customer (party)** | No `ownerMemberId` on `OsParty` | N/A — customer is a party + roles | Party `status` ≠ `active` or merged | N/A (not owner-scoped) |
| **Commercial account** | `OsCommercialAccount.ownerMemberId` (nullable) | `status === 'active'` **and** `ownerMemberId === memberId` | Account `status` ≠ `active`; null owner not counted | **`ReassignCommercialAccountOwner`** — requires scope `commercial.account.reassign` (not `people.admin`) |
| **Opportunity** | `OsOpportunity.ownerMemberId` (required) | `status === 'open'` | `won` / `lost` / `cancelled` + `closedAt` | **`AssignOpportunityOwner`** — `people.admin` may assign on any open opp |
| **Quote** | `OsQuote.ownerMemberId` (required) | `status !== 'cancelled'` (incl. `accepted`) | Only **`cancelled`** releases (`isQuoteOwnershipReleased`) | **FOUNDATION_GAP — no `AssignQuoteOwner`** |
| **Order** | `OsOrder.ownerMemberId` (required) | `status === 'open'` | `cancelled` | **FOUNDATION_GAP — no `AssignOrderOwner` / `ReassignOrderOwner`** |

---

## 1. Customer vs commercial account

- **Customer** in product terms = `OsParty` with customer role (`OsPartyRoleAssignment`) plus optional **`OsCommercialAccount`** (`@@unique([organizationId, partyId])`).
- **Commercial ownership for terminate** is **`OsCommercialAccount.ownerMemberId`**, not the party row.
- Schema: `packages/os-database/prisma/schema.prisma` — `OsCommercialAccount` (`ownerMemberId String?`, `status` default `active`).
- Store types: `packages/os-commercial/src/store-types.ts` — `CommercialAccountRecord.ownerMemberId: string | null`.

---

## 2. Opportunity / quote / order lifecycle

From `packages/os-contracts/src/commercial-events.ts`:

- **Opportunity:** `open` | `won` | `lost` | `cancelled`. Preflight: **`open` only**.
- **Quote:** `draft` | `submitted` | `accepted` | `cancelled`. Preflight: **all except `cancelled`** (`listBlockingQuotesForOwner` / `isQuoteOwnershipReleased`).
- **Order:** `open` | `cancelled`. Preflight: **`open` only**. `CreateOrder` copies `quote.ownerMemberId` onto the order (`commercial-command-service.ts`).

---

## 3. Termination preflight (fail-closed)

**Collector:** `packages/os-workforce/src/termination-impact.ts` — `collectTerminationImpact`.

Commercial categories (Spanish labels in `CATEGORY_LABELS`):

| Key | Store method | Filter |
| --- | --- | --- |
| `commercial_accounts` | `listActiveCommercialAccountsForOwner` | `status: active`, `ownerMemberId: memberId` |
| `open_opportunities` | `listOpenOpportunitiesForOwner` | `status: open` |
| `active_quotes` | `listBlockingQuotesForOwner` | `status not cancelled` |
| `active_orders` | `listActiveOrdersForOwner` | `status: open` |

**Prisma implementation:** `packages/os-database/src/prisma-workforce-store.ts` (lines ~226–292).

**Terminate gate:** `packages/os-workforce/src/workforce-command-service.ts` — `terminateMember` calls `collectTerminationImpact`; if `!impact.canTerminate` → `VALIDATION_FAILED` (fail-closed). Any commercial category with `count > 0` blocks.

**Tests:** `packages/os-workforce/src/termination-preflight.test.ts` — commercial account, opportunity, quote (+ `AssignQuoteOwner` foundation gap string), order.

**Quote gap annotation (in impact UI):** `active_quotes` category may include `foundationGaps`: `No AssignQuoteOwner command…`.

---

## 4. Governed commands (os-contracts + os-commercial)

**Registered commands:** `packages/os-contracts/src/commercial-commands.ts` — `COMMERCIAL_COMMAND_NAMES`.

| Command | Payload | Authority notes |
| --- | --- | --- |
| `ReassignCommercialAccountOwner` | `commercialAccountId`, `ownerMemberId` | `canReassignCommercialAccountOwner` → **`commercial.account.reassign`** only (`commercial-authority.ts`) |
| `AssignOpportunityOwner` | `opportunityId`, `ownerMemberId` | Open opp only; **`people.admin`** bypasses owner check (`assertCanEditOpportunity`) |
| *(missing)* | — | **`AssignQuoteOwner`** — not in `COMMERCIAL_COMMAND_NAMES` |
| *(missing)* | — | **`AssignOrderOwner` / `ReassignOrderOwner`** — not in `COMMERCIAL_COMMAND_NAMES` |
| `CancelQuote` / `CancelOrder` | — | Release ownership by status change, not reassignment |

**Scopes (command gate):** `packages/os-contracts/src/scopes.ts` — all commercial commands `member_active`; reassignment scope is separate capability for accounts.

---

## 5. Customer coverage grants (separate from ownership)

**Model:** `OsCustomerCoverageGrant` — `primaryOwnerMemberId`, `actingAdvisorMemberId`, `startsAt` / `endsAt` / `revokedAt` (`schema.prisma` comment: not shared ownership, not delegation).

**Usage:** `CreateOrder` reads `listActiveCustomerCoverageGrants` for convert authority (`commercial-command-service.ts`); contracts in `packages/os-contracts/src/operations-scopes.ts` (`continueCoveredCustomerWorkflow`).

**Termination impact:** **No category** for coverage grants in `TERMINATION_IMPACT_CATEGORY_KEYS`. **`collectTerminationImpact` does not query grants.**

**Evidence — terminate can leave sole acting advisor “active” on paper:**

- Member termination does not revoke or end `OsCustomerCoverageGrant` rows.
- No `GrantCustomerCoverage` / `RevokeCustomerCoverage` in `COMMERCIAL_COMMAND_NAMES` or workforce commands (grants appear store-backed for convert only).
- **Product gap:** terminated member may remain `actingAdvisorMemberId` on an active grant; convert/coverage semantics undefined for revoked members until a governed revoke/end command exists.

---

## 6. FOUNDATION_GAP list (commercial continuity)

1. **`AssignQuoteOwner`** — contract + command + UI; terminate blocks on non-cancelled quotes; preflight surfaces gap on `active_quotes`.
2. **`AssignOrderOwner` (or `ReassignOrderOwner`)** — same for open orders; only `CancelOrder` today.
3. **`ListCommercialAccountsByOwner` (query)** — no `ownerMemberId` party/account list in `packages/os-contracts/src/queries.ts`; admin bulk account continuity relies on termination-impact items or per-client `GET /parties/:id`.
4. **Coverage grant lifecycle on terminate** — no preflight, no auto-revoke; risk of stale acting advisor.
5. **Account reassignment vs people.admin** — `ReassignCommercialAccountOwner` requires **`commercial.account.reassign`**; people.admin on member detail does not imply that scope (by design in `commercial-authority.ts`).

---

## 7. Admin UI shipped (os-web)

| Piece | Path |
| --- | --- |
| Batch opportunity reassignment | `apps/os-web/lib/commercial/reassign-opportunities-action.ts` → `AssignOpportunityOwner` |
| Panel | `apps/os-web/components/admin/reassign-opportunities-panel.tsx` — **Oportunidades abiertas** on member detail |
| Wrapper | `apps/os-web/components/admin/commercial-continuity-panel.tsx` — quotes/orders read-only + links; accounts from termination impact → link to cliente |
| Page wire | `apps/os-web/app/(app)/administracion/equipo/[memberId]/page.tsx` |
| Tests | `apps/os-web/lib/commercial/admin-continuity.test.ts` |

**Not shipped (gaps):** quote/order reassignment forms; bulk commercial-account reassignment without list query.

---

## 8. Proof matrix (Agent 3)

| Subfeature | PLANNED | IMPLEMENTED | TESTED |
| --- | --- | --- | --- |
| Ownership trace doc | Yes | Yes | N/A |
| Terminate commercial categories confirmed | Yes | Yes (read) | Yes — `termination-preflight.test.ts` |
| AssignOpportunityOwner admin continuity UI | Yes | Yes | Yes — `admin-continuity.test.ts` |
| AssignQuoteOwner / AssignOrderOwner UI | No command | No | N/A |
| HOSTED / BROWSER-VERIFIED | — | — | UNPROVEN |

---

## 9. Tests run (Agent 3)

```bash
pnpm --filter @isalwa/os-workforce test -- termination-preflight
pnpm --filter os-web test -- admin-continuity
```
