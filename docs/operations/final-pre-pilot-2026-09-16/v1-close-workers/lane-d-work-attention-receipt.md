# LANE D — Work / Attention / Issue receipt

**Date:** 2026-09-16  
**Branch:** `lane-d/work-attention-issue`  
**Base:** `origin/pre-pilot/company-os-pass` @ `5ca147207508c93f083e6cf141547f54c45e6eb0`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/lane-d-work-attention`  
**Lane:** Work / Attention / Issue / Commitment (Inicio + cross-cutting Reportar)  
**REAL_SEVEN_MUTATED:** **NO**  
**Deploy / migrate:** not performed (lane receipt only)

---

## Carmen plain language

On **Inicio**, employees see **Necesita atención** and **Para hoy** built only from governed Work, Approvals, Issues, and Commitments. Empty state is **“No tienes pendientes para hoy.”** with CTAs to Trabajo / Incidencias / Clientes — no urgency scores or KPI zeros.

**Reportar incidencia** is reusable from Cliente 360 and Pedido: the source relation is inherited (party / order + human label). Nobody types opaque IDs. No severity taxonomy was invented.

**Quién es responsable** on Issue (and Trabajo) shows the assigned name, or **“Aún no hay una persona responsable asignada.”** **Asignar** appears only when the actor holds `issue.manage`.

---

## Delivered

| Capability | Proof state |
|---|---|
| Inicio Necesita atención / Para hoy deterministic sources | **IMPLEMENTED** + **TESTED** |
| Empty copy “No tienes pendientes para hoy.” + source CTAs | **IMPLEMENTED** + **TESTED** |
| No invented urgency / quote-stale ranking on Inicio attention | **IMPLEMENTED** + **TESTED** (quotes no longer fed into attention aging) |
| Reportar incidencia from Cliente (existing) | **PRESERVED** + copy aligned |
| Reportar incidencia from Pedido with inherited `order` reference | **IMPLEMENTED** + **TESTED** |
| Quién es responsable + gated Asignar (`AssignIssueOwner`) | **IMPLEMENTED** + **TESTED** |
| Hosted / browser verify | **UNPROVEN** this SHA (no deploy) |

---

## Files (this commit)

- `apps/os-web/lib/i18n/es.ts` — Necesita atención / empty copy
- `apps/os-web/lib/inicio/today-queue.ts` (+ test) — Para hoy copy + empty
- `apps/os-web/components/inicio/inicio-today-queue.tsx` — empty CTAs
- `apps/os-web/components/work/inicio-attention-panel.tsx` — empty state; drop quote aging
- `apps/os-web/app/(app)/inicio/page.tsx` — stop passing quotes into attention
- `apps/os-web/lib/issue/labels.ts` — Reportar incidencia / Quién es responsable
- `apps/os-web/lib/issue/{actions,report-context,types}.ts` — AssignIssueOwner + order context helpers
- `apps/os-web/components/issue/assign-issue-owner-form.tsx` — authorized assign UI
- `apps/os-web/app/(app)/incidencias/[issueId]/page.tsx` — responsible + Asignar gate
- `apps/os-web/app/(app)/clientes/.../pedidos/.../page.tsx` — ReportIssueTrigger with order context
- `apps/os-web/app/(app)/trabajo/[workItemId]/page.tsx` — Quién es responsable copy
- `apps/os-web/lib/shell/command-palette.ts` (+ test)
- `apps/os-web/lib/issue/lane-d-v1-close.test.ts` — wiring / honesty tests

---

## Honesty constraints honored

- Eligible Inicio sources remain Work / Approval / Issue / Commitment only
- No urgency score, health score, AI priority, or SLA invention
- Issue report inherits `referenceType` + `referenceId` from context; no opaque ID fields in UI
- No severity / priority taxonomy on Reportar
- `AssignIssueOwner` UI gated by `issue.manage` (server action re-checks)
- REAL_SEVEN_MUTATED = **NO**
- No deploy, no migrations

---

## Tests run (local)

```text
apps/os-web: pnpm exec tsx --test \
  lib/inicio/today-queue.test.ts \
  lib/work/inicio-attention.test.ts \
  lib/issue/issue.test.ts \
  lib/issue/lane-d-v1-close.test.ts \
  lib/shell/command-palette.test.ts
→ 54 pass / 0 fail
```

---

## Gaps (explicit)

1. **Inicio browser verify** — UNPROVEN until integrated deploy + BV  
2. **AssignIssueOwner hosted** — UI + action wired; live SYNTH assign not exercised this lane  
3. **Pedido Incidencias section list** — report entry exists; linked open-issue list on Pedido not expanded this lane (Cliente 360 already lists party issues)

---

## Unblock for Control Tower

Merge this branch into the V1 close integrate SHA. No migration. No REAL_SEVEN touch.
