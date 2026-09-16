# AGENT 4 — OPERATING DAY handoff

**Branch:** `agent4/operating-day`  
**Base:** `03745ab` (pre-pilot company-os-pass)  
**Lane:** Work / Attention / Inicio only

## Carmen answers

### TODAY_QUEUE
**IMPLEMENTED** (code + unit tests). Inicio mounts `InicioTodayQueue` built by `buildTodayQueue` from governed facts only:

| Bucket | Source |
|--------|--------|
| overdue | Attention `overdue_work` + live `dueAt < now` on open work |
| due_today | Bolivia calendar due-today on open work (`isDueToday`) |
| pending_approvals | Approvals with `approverMemberId === session.memberId` |
| next_actions | Open work with future `dueAt` |
| commitments | Open commitments in `overdue` / `due_today` state |
| issues | Open issues owned by member (or unowned) |

No invented KPIs or SLA scores.

### OVERDUE
**HOSTED + DEPLOYED.** Staging `/v1/health/ready` (2026-09-16):

- `attentionClock.enabled=true`
- `running=true`
- `lastSuccessAt` recent
- `lastError=null`

Wall-clock rebuild; no business mutation required for aging. Docs: `docs/operations/OVERDUE_ATTENTION_CLOCK.md`.

### NEXT_ACTION
**IMPLEMENTED.** `TodayQueue.nextAction` = first overdue → due-today → dated open work → pending approval. Shown as **¿Qué hago ahora?** on Inicio. Cliente 360 next-action path unchanged (still WorkItem+dueAt).

### REMINDERS_IN_PRODUCT
**YES.** Copy on Inicio + event offers: reminder = Work/Attention in-product. Internal notices contract remains `channel: internal` with no provider.

### NO_FAKE_EXTERNAL_NOTIFICATION
**HONORED.** No email / push / WhatsApp reminder claims added. Explicit denial in `TODAY_QUEUE_COPY` and `EVENT_WORK_OFFER_COPY`.

### EVENT_INTEGRATION_POINTS
**OFFER adapters (no auto-create, no auto-due):**

| Trigger | Adapter | Wired |
|---------|---------|-------|
| Quote submitted/send | `offerAfterQuoteSent` | Quote detail + existing `RegisterFollowUpForm` |
| Production expected date | `offerAfterProductionExpectedDate` | Production workspace when `dateFact` exists |
| Delivery follow-up | `offerAfterDeliveryFollowUp` | `/entregas` when a delivery row exists |

User always chooses `dueAt`. No “3 days after quote” rule.

### MANAGER_VIEW
**PARTIAL — existing scopes only.**

- Manager/owner Inicio lenses use `commercial.team.read` / `management.org.read` (+ leadership readiness).
- `people.admin` is **not** used as a manager-queue shortcut for `visibility=team|org` (`leadership-visibility.ts`).

#### MANAGER_QUEUE_GAP (separate)

| Gap | Status |
|-----|--------|
| Escalation of overdue personal work into a manager-owned attention type | **MISSING** (policy not approved) |
| Dedicated “manager queue” product surface beyond team/org leadership lists | **MISSING** |
| Reschedule dueAt command (`RescheduleWork`) | **MISSING** — complete/cancel preserve history; changing due requires new follow-up or future command |
| Commitment overdue → Attention type | **NOT PRODUCTIZED** (prior freeze) |

### NEGATIVE_AUTH
**Preserved.**

- Today queue filters approvals to the session member.
- Team/org work lists still require commercial read scopes (people.admin does not unlock them).
- Cancel/complete remain owner-or-admin at command layer.
- Cross-tenant: unchanged projection/query isolation.
- Cross-user: other members’ approvals/issues excluded from personal today queue.

## History

| Action | Preservation |
|--------|--------------|
| Complete | `completedAt` + `work.completed` event + ownership history reason `completed` |
| Cancel | `cancelledAt` + `work.cancelled` event + ownership history reason `cancelled` (+ optional note); **employee UI** now exposes cancel |
| Reschedule | **NOT PRODUCTIZED** (no dueAt mutation command) |

## Tests run (local)

- `apps/os-web/lib/inicio/today-queue.test.ts` — time boundary, overdue, approvals, commitments/issues
- `apps/os-web/lib/work/event-work-offer.test.ts` — offer honesty / no auto due
- Follow-up command allowlist updated for `CancelWorkItem`

## Proof states

| Capability | State |
|------------|-------|
| TODAY_QUEUE composition | **TESTED** |
| Inicio UI mount | **IMPLEMENTED** (BROWSER-VERIFIED UNPROVEN this branch) |
| Overdue clock hosted | **HOSTED** (staging health) |
| Event offers | **IMPLEMENTED** / **TESTED** |
| Cancel UI | **IMPLEMENTED** |
| Manager escalation queue | **UNPROVEN** / gap |

## Files

- `apps/os-web/lib/inicio/today-queue.ts` (+ test)
- `apps/os-web/components/inicio/inicio-today-queue.tsx`
- `apps/os-web/lib/work/event-work-offer.ts` (+ test)
- `apps/os-web/components/work/event-work-offer-panel.tsx`
- `apps/os-web/components/work/cancel-follow-up-form.tsx`
- Inicio / quote / entregas / producción / trabajo detail / follow-up actions / work-command-service
