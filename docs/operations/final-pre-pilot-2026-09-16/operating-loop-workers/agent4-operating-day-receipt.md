# AGENT 4 — Operating Day receipt

**Date:** 2026-09-16  
**Branch:** `agent4/operating-day`  
**Base:** `03745ab522bb6f4e83b27fbc3353efd598ab07ac`  
**SHA:** `65e9b8c9c5a77e68937260f9fcfc5f05553630ed`  
**Lane:** Work / Attention / Inicio only  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy:** not performed (lane receipt only)

---

## Carmen plain language

An employee opening **Inicio** now sees a governed **Cola de hoy**: overdue (wall clock + attention), due today (Bolivia calendar), their pending approvals, dated next actions, open commitments due/overdue, and owned/unowned open issues. Reminders stay **in-product** (Trabajo / Atención) — no email, push, or WhatsApp claim.

After quote send, production expected date, or a delivery row, the UI may **offer** a follow-up WorkItem. The human always picks `dueAt`. No auto-create cadence and no invented SLA.

Open work detail can **complete** or **cancel** (history preserved). **Reschedule dueAt** is not productized — no `RescheduleWork` command.

---

## Delivered

| Capability | Proof state |
|---|---|
| Overdue by wall clock | **PRESERVED / HOSTED** on staging attention clock (pre-existing; not redeployed this commit) |
| Due-today queue on Inicio | **IMPLEMENTED** + **TESTED** (`buildTodayQueue` / `InicioTodayQueue`) |
| Next action (“¿Qué hago ahora?”) | **IMPLEMENTED** + **TESTED** (deterministic: overdue → due today → dated work → approval) |
| Event → WorkItem offers (quote / production / delivery) | **IMPLEMENTED** + **TESTED** (adapters + panels; human confirms) |
| Cancel follow-up UI | **IMPLEMENTED** + **TESTED** (`CancelWorkItem` allowlisted; payload builder) |
| Complete history note | **IMPLEMENTED** (complete/cancel keep record; ownership history reason on command path) |
| Reschedule dueAt | **GAP** — contract not present |
| Manager escalation queue | **GAP** — see `docs/operations/agent4-operating-day-2026-09-16/MANAGER_QUEUE_GAP.md` |
| Inicio UI browser verify | **UNPROVEN** this SHA (no deploy / no hosted BV) |

---

## Files (this commit)

- `apps/os-web/lib/inicio/today-queue.ts` (+ test)
- `apps/os-web/components/inicio/inicio-today-queue.tsx`
- `apps/os-web/lib/work/event-work-offer.ts` (+ test)
- `apps/os-web/components/work/event-work-offer-panel.tsx`
- `apps/os-web/components/work/cancel-follow-up-form.tsx`
- Inicio / quote detail / entregas / producción / trabajo detail wiring
- `apps/os-web/lib/work/{actions,follow-up,command-types}.ts` (+ follow-up tests)
- `packages/os-work/src/work-command-service.ts` — ownership history on complete/cancel
- `docs/operations/agent4-operating-day-2026-09-16/{CARMEN_HANDOFF,MANAGER_QUEUE_GAP}.md`

---

## Honesty constraints honored

- No invented KPI / SLA score on Inicio
- `autoDueAt` always `null` on event offers; `requiresUserDueDate: true`
- No external notification provider claims
- `people.admin` not used as manager-queue visibility shortcut
- Approvals in today queue filtered to `approverMemberId === session.memberId`
- Cancel/complete remain owner-or-admin at command layer (unchanged)

---

## Tests run (local)

```text
apps/os-web: pnpm exec tsx --test \
  lib/inicio/today-queue.test.ts \
  lib/work/event-work-offer.test.ts \
  lib/work/follow-up.test.ts
→ 20 pass / 0 fail
```

---

## Gaps (explicit)

1. **RescheduleWork** — missing command; change due by new follow-up only  
2. **Manager overdue escalation** — no manager-owned attention type / dedicated inbox  
3. **Commitment overdue → Attention type** — not productized (prior freeze)  
4. **BROWSER-VERIFIED / HOSTED** for today queue + offers + cancel UI — **UNPROVEN** (no deploy this lane)  
5. Delivery offer uses first delivery row on `/entregas` as eligibility signal — coarse V1 surface  

---

## Negative auth (preserved)

- Personal today queue does not expand via `people.admin`
- Team/org work lists still require commercial/management read scopes
- Cross-tenant projection isolation unchanged

---

## SHA

`65e9b8c9c5a77e68937260f9fcfc5f05553630ed` on `agent4/operating-day` (not pushed; not deployed).
