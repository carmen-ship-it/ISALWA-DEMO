# AGENT 3 — Attention / Commitments / Escalations / What Changed

**Lane:** Attention Engine, Commitments vs WorkItem, owner→manager escalation, What Changed, Notifications (cross-check), Saved/quick views (cross-check)  
**Mode:** Read-only recon. No implementation.  
**Repo:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Date:** 2026-09-15  
**Classification vocabulary:** `EXISTING GOVERNED RULE` | `DERIVABLE SAFELY` | `BUSINESS DECISION REQUIRED` | `MISSING`

---

## Verdict

Attention Engine is **LIVE BUT PARTIAL**: four governed stored types only (`open_work_assigned`, `overdue_work`, `pending_approval`, `reassigned_work`), plus client-side aging *facts* that are explicitly **not** attention types. Commitments and internal notifications have **schema + contract rules**, but **no os-api wire-up**; web ports still return `schema_not_available`. Escalation owner→manager is **not governed** beyond team-visibility reads. What Changed is **party-timeline only** (reuses projected BusinessEvent facts; no second event store). Email/WhatsApp notifications are **intentionally out of channel**.

---

## Canonical Attention Engine (what exists)

| Layer | Path | Role |
|-------|------|------|
| Contract types | `packages/os-contracts/src/queries.ts` → `ATTENTION_TYPES` | Exactly four types |
| Derivation | `packages/os-query/src/work/attention-derivation.ts` → `deriveAttentionReadModels` | Rebuilds read models from work + approvals |
| Clock | `packages/os-query/src/work/attention-clock.ts`, `docs/operations/OVERDUE_ATTENTION_CLOCK.md`, `apps/os-api` AttentionClock | Wall-clock refresh of existing `overdue_work` rule; **no new events** |
| Store | `packages/os-database/prisma/schema.prisma` → `OsAttentionReadModel` | Per-org/member projected rows |
| API | `apps/os-api/src/attention.controller.ts` | `listAttention` |
| Inicio UI | `apps/os-web/lib/work/inicio-attention.ts`, `apps/os-web/components/work/inicio-attention-panel.tsx`, `apps/os-web/app/(app)/inicio/page.tsx` | Groups the four types; optional aging supplements |
| Aging facts (not attention) | `apps/os-web/lib/work/aging/*` | `due_today`, `elapsed_due`, `approval_pending`, `quote_submitted` |

**Governed stored attention rules today:**

1. Open work → `open_work_assigned` (`work:owner:{id}`)
2. Open work + `lastReassignedAt` → `reassigned_work`
3. Open work + `dueAt < asOf` → `overdue_work` (`work:overdue:{id}`); equality / null due / closed ≠ overdue
4. Pending approval → `pending_approval` for approver

Tests explicitly forbid inventing SLA / due-soon / stale-opportunity thresholds (`apps/os-web/lib/work/aging/aging.test.ts`, `inicio-attention.test.ts`, `due-order.test.ts`).

Inicio **does not** pass `commitments` or approval aging sources into the panel today (`inicio/page.tsx` only feeds `quotes` among supplemental sources).

---

## Signal matrix (requested Attention Engine signals)

| Signal | Classification | Evidence | Notes |
|--------|----------------|----------|-------|
| **Overdue follow-up** | **EXISTING GOVERNED RULE** (as overdue *work*, scoped follow-up optional) | Attention: `overdue_work` in `attention-derivation.ts` + clock. Follow-up = `CreateWorkItem` on `party` / `commercial_account` (`apps/os-web/lib/work/follow-up.ts`). Query: `followUpOnly` + `overdue` in `ListOpenWorkQuerySchema` / `work-query-service.ts`. Cliente 360 blocker `overdue_follow_up` in `apps/os-web/lib/party/next-action.ts`. Saved view `/trabajo?view=overdue` is **all** overdue work, not follow-ups only (`saved-views.ts` detail: “No solo seguimientos”). Gap id `overdue-follow-up-view` in `not-implemented.ts`. | Not a separate attention type. Do not invent a second overdue rule. |
| **Stale customer** | **BUSINESS DECISION REQUIRED** | No attention type. Cliente 360 exposes latest activity / “sin actividad” composition (`next-action.ts`) but **no** relationship-staleness threshold. `stale_projection` is projection freshness, not CRM inactivity. | Need: definition of “stale” (days since last event? last visit? open work absent?). |
| **Quote waiting** | **DERIVABLE SAFELY** (elapsed fact) + **BUSINESS DECISION REQUIRED** (when it becomes attention / SLA) | Aging fact `quote_submitted` from `submittedAt` (`aging/derive.ts`, label: “No es un plazo incumplido”). List filter `/cotizaciones?status=submitted`. **Not** in `ATTENTION_TYPES`. | Safe: show elapsed age. Unsafe without decision: auto-promote to Attention / overdue-like signal. |
| **Opportunity stale** | **BUSINESS DECISION REQUIRED** | `OsOpportunityReadModel.lastOccurredAt` exists; no stale rule. Tests ban “stale opportunity / seven-day”. | Need stage-idle policy before any attention type. |
| **Approval aging** | **EXISTING GOVERNED RULE** (pending) + **DERIVABLE SAFELY** (elapsed label) | Stored: `pending_approval`. UI age: `approvalPendingAgeLabel` / `deriveApprovalAgingFact` when `requestedAt` present. No escalate-after-N rule. | Aging ≠ escalation. |
| **Commitment overdue** | **EXISTING GOVERNED RULE** (contract calendar state) + **MISSING** (Attention Engine / API) | `deriveCommitmentState` + `America/La_Paz` in `packages/os-contracts/src/commitments.ts`. Table `os_commitments` migration `packages/os-database/prisma/migrations/20260914133000_os_commitments_internal_notifications/migration.sql`. Schema comment: not a work item or attention row. Web: `commitmentPersistence()` still returns `schema_not_available` (`apps/os-web/lib/commitments/persistence.ts`). No commitment controller under `apps/os-api`. Not in `ATTENTION_TYPES`. Aging adapter exists but Inicio does not feed it. `PRODUCTIVITY_NOT_IMPLEMENTED` id `commitments`. | Do not duplicate as WorkItem overdue. Wire API before Attention. |
| **Unassigned work** | **MISSING** as work attention; related commercial gap is **DERIVABLE SAFELY** | `OsWorkItem.ownerMemberId` is required. Data health flags commercial accounts with `commercialOwnerMemberId === null` (`apps/os-web/lib/party/data-health.ts`). No `unassigned_work` attention type. | “Sin responsable” ≠ unassigned WorkItem. |
| **Issue aging** | **MISSING** | No Company OS Issue aggregate in attention derivation. (Architect readiness engine is a different app.) | Depends on Agent 2 Issue recon. |
| **Blocked work** | **DERIVABLE SAFELY** (narrow) + **BUSINESS DECISION REQUIRED** (definition) | Cliente 360 treats `approvalStatus === 'pending'` as blocker. Work read model carries `pendingApprovalId` / `approvalStatus`. No `blocked_work` attention type. | Decide whether “blocked” = pending approval only, or ops/delivery holds, etc. |
| **Repeated issue** | **MISSING** | No recurrence / linked-previous-issue primitive in Attention. | Needs Issue + resolution memory. |
| **Missing important information** | **DERIVABLE SAFELY** (data-health findings) + **BUSINESS DECISION REQUIRED** (which become Attention) | Live data-health: missing phone/location/name, provenance-only, duplicates, shared phone (`data-health.ts`). Not Attention types. Architect `missing-information.ts` is **not** Company OS Attention. | Keep Data Health vs Attention separate until policy chooses promotion. |
| **Manual fact awaiting confirmation** | **EXISTING GOVERNED RULE** (facts stay `confirmation=pending`) + **MISSING** (Attention signal) | `OsReportedOperationalFact` + `packages/os-contracts/src/reported-operational-fact.ts`: confirmation cannot complete in place; CHECK forces pending. Cliente 360 omits `manual_facts`. No attention type. | Listing pending facts is safe; treating them as confirmable Attention is not. |
| **Delivery exception** | **MISSING** + **BUSINESS DECISION REQUIRED** | Scope `commercial.exception.authorize` exists (`operations-scopes.ts`); no Attention derivation / notification kind for delivery exception. | Need: what event/state constitutes an exception worthy of Attention. |

---

## Commitments vs WorkItem

### Intent (contracts / schema)

- **WorkItem / follow-up:** operational task (`OsWorkItem`), create via `CreateWorkItem`, complete via `CompleteWork`. Follow-up copy examples are task-shaped (“Llamar al cliente…”) in `follow-up.ts`.
- **Commitment:** promise record (“Te llamo el viernes”), **explicitly not** a payment, work item, or attention row (`OsCommitment` schema comments; `packages/os-contracts/src/commitments.ts`).
- Lifecycle stored: `open` | `fulfilled` | `cancelled`. Display states `pending` / `due_today` / `overdue` are **derived** from `dueAt` + `America/La_Paz`.
- Origins: `employee_entered` | `human_confirmed_suggestion` (suggestion is never canonical until human confirm).
- Can link `partyId` + optional `relatedSubjectType/Id` (party, work_item, quote, order, opportunity, commercial_account, approval_request).

### Runtime truth

| Piece | State |
|-------|--------|
| Prisma model + SQL migration | Present |
| Contract create/fulfill/cancel/derive | Present |
| UI form/list/view/copy | Present under `apps/os-web/components/commitments/*`, `lib/commitments/*` |
| Persistence port | **Honest stub:** always `schema_not_available` (stale comment vs migrated table) |
| os-api commands/queries | **MISSING** |
| Attention type / projection rebuild | **MISSING** |
| Aging adapter hook | Present; **not wired** on Inicio |

**Recon conclusion:** WorkItem is **not** enough for promise memory as designed. Commitments are a **separate canonical model** already sketched. Live employee path today for “call Friday” is still **follow-up WorkItem** (or nothing). Merging commitments into WorkItem would violate existing constitution comments; wiring the commitment table + API is the extend-before-replace path.

**CROSS_LANE_CHANGE_REQUEST (if implementing later):** Agent 8 owns notification emission; Agent 6 saved views for “Compromisos próximos”; do not add a parallel commitment store.

---

## Escalation (owner → manager → higher attention)

| Primitive | Exists? | Used for escalation? |
|-----------|---------|----------------------|
| `OsManagerAssignment` | Yes (`schema.prisma`) | **No** auto-escalate |
| Direct-report lookup | Yes (`packages/os-query/src/leadership/direct-reports.ts`, `prisma-member-query-store.ts` `listDirectReportMemberIds`) | **Team visibility** (`visibility=team`), not overdue escalation |
| Attention memberId | Owner / approver from source row | Stays on owner; clock docs: “Owner (`memberId`) … stay those of the work read model” |
| Timing / severity / auto-transfer | — | **None** |

**Classification:** entire escalation policy = **BUSINESS DECISION REQUIRED**.

Do **not** invent:

- hours/days before manager sees owner overdue
- recursive org chart (code is **one hop**)
- severity ladders
- automatic authority transfer to manager

Safe reuse later: same `OsManagerAssignment` slice already used for leadership reads—**after** policy is decided.

---

## What Changed

| Capability | Classification | Evidence |
|------------|----------------|----------|
| Party “qué cambió” from timeline | **EXISTING** (UI reuse of projected events) | `apps/os-web/lib/productivity/what-changed.ts` → `whatChangedFromTimeline`; filters fixed `CHANGE_EVENTS` set; loads via `loadWhatChanged` in `productivity/actions.ts`; Command Palette (`command-palette.tsx`) |
| Source of truth | **Reuse BusinessEvent → PartyTimelineEntry** | `OsBusinessEvent`, `OsPartyTimelineEntry`; query `party-timeline-query-service.ts` |
| Org-wide What Changed | **MISSING** (explicit) | `PRODUCTIVITY_NOT_IMPLEMENTED` id `org-what-changed` |
| “Since yesterday / since last login” | **DERIVABLE SAFELY** on `occurredAt` **after** party scope; last-login cursor = **BUSINESS DECISION REQUIRED** / session product choice | No dedicated lens today |
| New event store | **FORBIDDEN / unnecessary** | Constitution of this lane: reuse BusinessEvent/audit |

**Event types currently surfaced in What Changed:**  
`quote.submitted|cancelled|updated`, `opportunity.stage_changed|closed|owner_assigned`, `order.created|cancelled`, `work.completed|cancelled`, `task.reassigned`, `approval.approved|rejected`, `commercial_account.owner_reassigned`.

Gaps vs vision questions (“qué quedó vencido”, “qué se resolvió” as org rollup): overdue is Attention/work query, not What Changed; resolution of aging facts is client-side key disappearance (`disappearedAgingKeys`)—not persisted org memory.

---

## Notifications (lane cross-check; Agent 8 primary)

| Channel | State |
|---------|--------|
| In-app internal | Contract + schema (`OsInternalNotification`, kinds in `packages/os-contracts/src/notifications.ts`). `notificationDeliversExternally(): false`. Web persistence stub still `schema_not_available`. UI: `notification-center.tsx` / list. **No os-api inbox API found.** |
| Email | **MISSING** / future — not in channel enum (`channel` default `internal`) |
| WhatsApp | **MISSING** / future — product vision only (`docs/product/UX_PRODUCT_REVIEW.md`); not notification delivery |
| Policy (who gets what, quiet hours) | **BUSINESS DECISION REQUIRED** |

Commitment notice kinds `commitment_due` / `commitment_overdue` exist in contracts and resolve when day-state no longer matches—**unwired** end-to-end.

---

## Saved / quick views (lane cross-check; Agent 6 primary)

**Live built-ins** (`apps/os-web/lib/productivity/saved-views.ts`):

- Cotizaciones enviadas / aceptadas  
- Oportunidades abiertas  
- Trabajo vencido (`/trabajo?view=overdue`)  
- Clientes activos  

**Also live:** browser-local pins (localStorage, member-keyed via palette storage helper), Command Palette listing.

**Explicitly not implemented** (`not-implemented.ts`): `overdue-follow-up-view`, `my-customers-view`, commitments counting, unconfirmed reported payments, report builder, WhatsApp search, etc.

**Vision list vs truth:**

| Desired view | State |
|--------------|--------|
| Mis clientes | **MISSING** (no owner filter URL) |
| Mis pendientes | Partial via Inicio / `/trabajo` own scope — not a named saved view |
| Vencidos | **LIVE** (all overdue work) |
| Sin responsable | Data health finding, **not** saved view |
| Aprobaciones pendientes | Route `/aprobaciones` exists; **not** in `BUILT_IN_SAVED_VIEWS` |
| Cotizaciones enviadas | **LIVE** |
| Compromisos próximos | **MISSING** (no API) |
| Problemas abiertos | **MISSING** (no Issue) |
| Datos por revisar | Data health, **not** saved view |

Customer/quote **quick views** (operating UI) are record side-panels, not Attention saved views (`CustomerQuickView`, `QuoteQuickView`).

---

## Foundation gaps (Attention/Commitments lane)

1. **Schema vs web honesty drift:** `os_commitments` / `os_internal_notifications` migrated; web ports still claim `schema_not_available`. Risk: product language vs engineering truth.
2. **Attention type freeze:** expanding signals requires contract + derivation + clock semantics + Inicio grouping—not UI-only.
3. **Dual overdue semantics:** Work overdue uses instant `< asOf`; Commitment overdue uses **calendar day** in La Paz. Must not conflate.
4. **Follow-up vs commitment confusion:** both can encode “Te llamo el viernes” until API + UX teach the difference.

---

## P0 – P3 (this lane only)

### P0 — before first real pilot use

- Do **not** ship product claims that Commitments or in-app Notifications are operationally live (schema without API).
- Do **not** invent stale-customer / opportunity-stale / escalation thresholds.
- Keep Attention Clock + four types as the only governed Attention truth for pilot coaching copy.

### P1 — immediately after first pilot feedback

- Decide Commitment vs Follow-up employee language with Isa/Álvaro; then wire **one** write/read API to existing `OsCommitment` (extend, don’t replace WorkItem).
- Wire internal notification persistence + list/mark-read to existing table **without** email/WhatsApp.
- Add saved view or filter for **follow-up-only overdue** if users confuse `/trabajo?view=overdue`.

### P2 — high-value V1.1

- Promote selected aging facts (submitted quote age, approval age) into Attention **only** after business thresholds exist.
- Org-scoped What Changed over PartyTimeline/BusinessEvent (still no new event store).
- Data-health → Attention promotion policy for missing owner/phone (explicit allowlist).

### P3 — later / provider-dependent

- Email / WhatsApp notification channels.
- Owner→manager escalation automation.
- Issue aging / repeated issue / delivery-exception Attention (depends on Issue + ops exception productization).
- AI over Attention/commitments (provider unwired).

---

## Business decisions required (exact questions)

1. **Stale customer:** After how many days without which events is a relationship “stale”?
2. **Opportunity stale:** Idle rule by stage? By `lastOccurredAt` only?
3. **Quote waiting → Attention:** Is elapsed “enviada, hace X” enough, or must it become an Attention row after N days?
4. **Blocked work:** Is pending approval the only block, or are there ops/delivery holds?
5. **Commitment vs follow-up:** When must employees record a Commitment instead of `Registrar seguimiento`?
6. **Escalation:** After what condition does a manager receive owner overdue/blocked items? One-hop only? Auto-reassign or notify-only?
7. **Manual facts:** Should pending reported payments/dispatches appear in Attention, Data Health only, or a dedicated review queue?
8. **Delivery exception:** Which recorded states create Attention, and who is the recipient?
9. **What Changed “desde mi última entrada”:** Is last-login a product feature, or calendar “desde ayer” only?
10. **Notification quiet policy:** Which kinds are on by default for Asesor vs Jefe vs Owner?

---

## Recommended reuse (no new stores)

| Need | Reuse |
|------|--------|
| Overdue work / follow-up | `OsWorkItem` + existing `overdue_work` + `followUpOnly` |
| Promises | `OsCommitment` (wire API) |
| Approvals needing action | `pending_approval` |
| Quote wait display | Aging `quote_submitted` / quote list status |
| Manager graph | `OsManagerAssignment` (visibility today; escalation later) |
| What Changed | `OsBusinessEvent` → `OsPartyTimelineEntry` → `whatChangedFromTimeline` |
| In-app notices | `OsInternalNotification` (wire API; channel stays `internal`) |
| Missing data | Data health composers — not Attention until decided |

---

## Explicit non-goals of this receipt

- No Issue architecture design (Agent 2).
- No Admin/delegation policy (Agent 1).
- No implementation of commitments, escalations, notification providers, or new Attention types.
- No browser-hosted PASS claim for Attention beyond code/test evidence in this worktree.

---

## Proof status (lane)

| Subfeature | State |
|------------|--------|
| Four Attention types + clock | IMPLEMENTED / TESTED in repo; HOSTED/BROWSER-VERIFIED = out of scope for this read-only agent |
| Aging facts (due today, quote submitted age, approval age) | IMPLEMENTED client-side; supplemental; not stored Attention |
| Commitments end-to-end | CONTRACT + SCHEMA; UI stub; API MISSING → treat as UNPROVEN / not live |
| Escalation | MISSING policy |
| What Changed (party) | IMPLEMENTED in palette path |
| What Changed (org) | MISSING |
| Notifications internal | CONTRACT + SCHEMA; persistence stub; API MISSING |
| Email / WhatsApp notices | MISSING |

**AGENT 3 STATUS:** RECON COMPLETE — receipt only. No code changes beyond this file.
