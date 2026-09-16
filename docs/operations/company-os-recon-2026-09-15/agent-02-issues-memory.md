# AGENT 2 — Issues / Resolution Memory / Organizational Learning

**Lane:** Company OS reconciliation — AGENT 2 ONLY  
**Mode:** Read-only recon (no implementation)  
**Date:** 2026-09-15  
**Repo:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Scope:** Issue lifecycle, Resolution Memory, Organizational Memory types, Knowledge/SOP coach, Product Feedback vs Business Issue, AI-ready memory architecture (wiring out of scope)

Allowed CURRENT STATE values only: `LIVE` | `LIVE BUT PARTIAL` | `BACKEND ONLY` | `PLANNED` | `MISSING` | `INTENTIONALLY DEFERRED` | `NO LONGER NEEDED`

---

## Verdict

**Do not create a parallel task system.** Issue lifecycle can largely **compose existing primitives** (Work + Coordination + evidence/case/date-issue + BusinessEvent/Audit). A first-class **Business Issue / Resolution Memory** aggregate is still **MISSING** as a governed company record with learning-loop states. Universal **REPORTAR PROBLEMA** and Command Palette **Reportar una incidencia** are **MISSING**. AI stays **UNWIRED**; conversation/evidence packets are AI-ready architecture only.

---

## Primitives inspected (before any Issue aggregate)

| Primitive | What exists | Paths | Relevance to Issue | CURRENT STATE |
|---|---|---|---|---|
| **Work** | `OsWorkItem` open/complete/cancel/reassign; commands + events + projections; `/trabajo` UI; follow-up is CreateWorkItem UX | `packages/os-database/prisma/schema.prisma` (`OsWorkItem`); `packages/os-contracts/src/work-commands.ts`; `packages/os-contracts/src/work-events.ts`; `packages/os-work/src/work-command-service.ts`; `apps/os-web/app/(app)/trabajo/page.tsx`; `apps/os-web/lib/work/follow-up.ts` | Owner + action loop for “do something about this.” Subject types today: `party`, `organization_member`, `commercial_account`, `work_item` — **not** order/delivery/product as Work subjects | `LIVE` |
| **Follow-up** | Employee copy for “Registrar seguimiento” → `CreateWorkItem` / `CompleteWork` | `apps/os-web/lib/work/follow-up.ts`; palette action in `apps/os-web/lib/shell/command-palette.ts` | **Not** a second task system — alias over Work | `LIVE` |
| **Approval** | `OsApprovalRequest` pending/approved/rejected; commercial + work subjects; `/aprobaciones` | `packages/os-database/prisma/schema.prisma` (`OsApprovalRequest`); `packages/os-contracts/src/work-events.ts`; `apps/os-web/app/(app)/aprobaciones/` | Decision gate, not problem investigation. May attach to Work | `LIVE` |
| **Coordination** | Decision contract + Prisma `OsCoordinationDecision`; UI records/resolves **in memory**; page load always hydrates `decisions: []`; live write marked UNPROVEN | `packages/os-contracts/src/coordination-decision.ts`; `packages/os-database/prisma/schema.prisma` (`OsCoordinationDecision`); `apps/os-web/lib/coordination/load.ts`; `apps/os-web/components/coordination/`; migration `20260916160000_os_coordination_decision` | Closest “problema → decisión → resolución” surface (`problema` field, `production_issue_flag`, resolve appends new row). Not a full Issue learning loop | `LIVE BUT PARTIAL` (UI + contract); hosted write **UNPROVEN** / effectively `BACKEND ONLY` until wired |
| **BusinessEvent** | Canonical event envelope + `OsBusinessEvent` | `packages/os-contracts/src/event-envelope.ts`; `packages/os-contracts/src/events.ts`; `packages/os-database/prisma/schema.prisma` (`OsBusinessEvent`); work events in `packages/os-contracts/src/work-events.ts` | Provenance for commands; not Issue storage | `LIVE` |
| **Audit** | `OsAuditLog` before/after + correlation | `packages/os-database/prisma/schema.prisma` (`OsAuditLog`); written via work command path (`packages/os-work` + `@isalwa/os-events`) | Correction/history primitive. **No** dedicated Audit Viewer UI in this lane’s scope | `LIVE` (write path); viewer `MISSING` (Agent 4 lane) |
| **Commercial** | Opp/Quote/Order/Approval; Cliente 360 timeline | `apps/os-web/app/(app)/clientes/`; `packages/os-database/prisma/schema.prisma` commercial models; `OsPartyTimelineEntry` | Relationship/commercial history context for issues; not Issue lifecycle | `LIVE` |
| **Operational desks** | Producción, Almacén, Compras, Entregas, Finanzas, Coordinación nav | `apps/os-web/lib/navigation/nav-config.ts`; desk routes under `apps/os-web/app/(app)/` | Domain facts and exceptions; no universal problem entry | `LIVE BUT PARTIAL` (desk-specific) |
| **Reported operational fact** | Manual payment/dispatch/stock report; pending confirmation; no canonical mutation | `packages/os-contracts/src/reported-operational-fact.ts`; `OsReportedOperationalFact` | **Evidence**, not Issue lifecycle | `LIVE BUT PARTIAL` / command wiring partial |
| **Operational case** | Order-scoped folder of reports + release decisions | `packages/os-contracts/src/operational-case.ts`; `OsOperationalCase*`; `apps/os-web/lib/operations/operational-case.ts`; `apps/os-web/components/operations/order-case-panel.tsx` | Order annotations / release — **not** company-wide Issue | `BACKEND ONLY` → UI listing `LIVE BUT PARTIAL` (does not claim full hosted write proof here) |
| **ProductionDateIssue** | Explicit human date-risk flags; informed record separate | `ProductionDateIssue` / `CustomerDateInformedRecord` in `packages/os-database/prisma/schema.prisma` | Narrow specialized “issue,” not universal Reportar problema | `BACKEND ONLY` / domain `LIVE BUT PARTIAL` |
| **Commitments** | Contract + `OsCommitment` table migration; web persistence port still returns `schema_not_available` | `packages/os-contracts/src/commitments.ts`; `apps/os-web/lib/commitments/persistence.ts`; migration `20260914133000_os_commitments_internal_notifications` | Commitment Memory sibling — **not** Work, **not** Issue | Schema `BACKEND ONLY`; app port stale → treat product surface as `LIVE BUT PARTIAL` / blocked |
| **Attention / Escalation / Issue identity** | Attention projections; escalation **derived** guidance; `issueIdentityFromAttentionKey` dedupes work/approval/quote/commitment attention keys | `packages/os-query/src/work/`; `apps/os-web/lib/escalation/`; `apps/os-web/lib/work/issue-identity.ts` | Identity helper only — **does not create** Issue rows, ownership, or deadlines | `LIVE` (derivation); Escalation stage storage `INTENTIONALLY DEFERRED` / shared-contract gated |
| **Architect SOP / knowledge** | Living SOP Library / handbook in Architect | `apps/architect/MISSION26.md`; `apps/architect/lib/living-deliverables/` | Consulting deliverable SOP — **not** OS runtime Organizational Memory | Architect `LIVE`; OS link `MISSING` |

---

## Audit answers (required)

### 1) Can Issue lifecycle reuse existing primitives?

**Yes — compose, do not replace.**

| Learning-loop stage | Reuse today | Gap |
|---|---|---|
| PROBLEM | Coordination `problema` field; ProductionDateIssue; operational case notes; walkthrough “Resolver un problema” blocked honestly | No universal Issue record |
| TRIAGE | Attention + escalation guidance (derived) | No stored triage state on an Issue |
| OWNER | Work `ownerMemberId` / reassign | Work subject types don’t cover order/product/delivery |
| INVESTIGATION | Operational case facts; reported facts; conversation evidence | No Issue-linked investigation trail type |
| DECISION | Approval; Coordination decision; OperationalReleaseDecision | Fragmented; Coordination write UNPROVEN |
| ACTION | Work / follow-up | Risk of treating Work as the Issue itself |
| RESOLUTION | Coordination `resolved` row; Work complete | No “confirmed resolution + outcome + precedent” memory |
| OUTCOME / REUSABLE PRECEDENT | — | `MISSING` |

**Recommendation:** Prefer a thin **Business Issue** aggregate (or typed envelope) that **links** Work (actions), Coordination (cross-area decisions), evidence (case/reported facts), and BusinessEvent/Audit — rather than stretching `OsWorkItem` into a problem-management system or cloning a second task board.

### 2) Any parallel task system?

**No first-class parallel task product.** Existing action systems:

1. **Work / follow-up** — canonical personal/open work (`OsWorkItem`).
2. **Coordination decisions** — committee decisions, not a task queue.
3. **Commitments** — promises with due dates (separate from Work by contract).
4. **Attention** — derived, not a task store.
5. **`issue-identity`** — naming/dedup only.

Creating `OsIssue` **as another open/complete task list** would violate constitution (“never create parallel implementations”). Creating Issue **as problem/resolution memory** that **may spawn Work** is the safe shape — pending BUSINESS DECISIONS below.

### 3) REPORTAR PROBLEMA

| Item | CURRENT STATE | Evidence |
|---|---|---|
| Universal “Reportar problema” entry (module-agnostic) | `MISSING` | No command, route, or nav action found |
| Walkthrough journey “Resolver un problema” | `LIVE BUT PARTIAL` | Honest blocked stop — does not invent a case/screen: `apps/os-web/lib/walkthrough/journeys.ts` (`id: 'problema'`) |
| Production “incidencia” language | `LIVE BUT PARTIAL` | Coordination trigger label `Incidencia de producción` only: `packages/os-contracts/src/coordination-decision.ts` |

### 4) Command Palette — Reportar una incidencia

| Item | CURRENT STATE | Evidence |
|---|---|---|
| Palette action “Reportar una incidencia” | `MISSING` | Actions are customer/opp/quote/follow-up/invite/ayuda only: `apps/os-web/lib/shell/command-palette.ts` (`paletteActions`) |
| Context pre-associate from current record | `PLANNED` | Desired in Company OS brief; not implemented |

### 5) Issue learning loop

Desired: PROBLEM → TRIAGE → OWNER → INVESTIGATION → DECISION → ACTION → RESOLUTION → OUTCOME → REUSABLE PRECEDENT, with **possible vs confirmed cause** and **suggested vs actual resolution** kept separate.

| Item | CURRENT STATE |
|---|---|
| End-to-end learning loop as product capability | `MISSING` |
| Partial fragments (coord resolve, work complete, date issue flags) | `LIVE BUT PARTIAL` |
| Never invent root cause (constraint) | Honored by absence — no cause fields inventing truth |

### 6) Resolution Memory

| Item | CURRENT STATE | Notes |
|---|---|---|
| First-class Resolution / precedent store | `MISSING` | |
| Coordination resolution rows | `LIVE BUT PARTIAL` | Append-only resolve in contract; page does not load ledger from DB |
| Work completion as “resolved” | `LIVE` | Status only — not reusable precedent |
| Similar-previous-issue retrieval | `MISSING` (AI retrieval later; records first) | |

### 7) Organizational Memory types

| Memory type | CURRENT STATE | Canonical-ish sources (cite) | Collapse risk |
|---|---|---|---|
| **Relationship** | `LIVE BUT PARTIAL` | `OsPartyTimelineEntry`; Cliente 360 commercial history | Do not rename timeline into generic notes |
| **Decision** | `LIVE BUT PARTIAL` | Approvals; Coordination decisions; OperationalReleaseDecision | Agent 4 owns deeper Decision Memory / Audit Viewer |
| **Issue / Resolution** | `MISSING` (narrow ProductionDateIssue = `BACKEND ONLY`) | — | Highest gap for this lane |
| **Commitment** | `BACKEND ONLY` / app port `LIVE BUT PARTIAL` blocked | `OsCommitment` + `packages/os-contracts/src/commitments.ts`; web `commitmentPersistence()` still `schema_not_available` | Keep ≠ Work ≠ Issue |
| **Operational** | `LIVE BUT PARTIAL` | Desk domain tables (quema, warehouse, delivery, purchase, reported facts, cases) | Do not merge into one notes table |
| **Knowledge / SOP** | Architect `LIVE`; OS runtime `MISSING` / coach `LIVE BUT PARTIAL` | Architect SOP Library (Mission 26); OS `apps/os-web/lib/guidance/` | Link later; don’t duplicate Architect vault inside OS tables without decision |

### 8) Knowledge / SOP coach primitives

| Primitive | CURRENT STATE | Paths |
|---|---|---|
| Governed GuidanceNote catalog (Consejo/Regla) | `LIVE` | `apps/os-web/lib/guidance/catalog.ts`, `model.ts`, `select.ts`; UI `apps/os-web/components/guidance/guidance-note.tsx`; Ayuda `apps/os-web/app/(app)/ayuda/page.tsx` |
| Learning Mode labels / walkthrough helpers | `LIVE` | `LEARNING_MODE_LABELS` in catalog; walkthrough components |
| Knowledge-coach worker placement (reported-payment guidance) | `LIVE BUT PARTIAL` | `apps/os-web/lib/guidance/CROSS_LANE_CHANGE_REQUEST.md`; `reported-payment.ts` |
| Runtime SOP memory linked to Issues | `MISSING` | |
| Architect SOP Library generation | `LIVE` (Architect product) | `apps/architect/MISSION26.md` — **not** OS Issue Resolution Memory |

### 9) Product Feedback vs Business Issue

| Concept | CURRENT STATE | Notes |
|---|---|---|
| **Product Feedback** (software UX / product improvement queue) | `MISSING` | `@isalwa/ui` `FeedbackNote` is **UI state chrome**, not product feedback storage |
| **Business Issue** (company operating problem / resolution) | `MISSING` | Intended Company OS capability |
| Separation | `BUSINESS DECISION NEEDED` | Must not share one “feedback” table with business problems |

### 10) AI-ready memory architecture (UNWIRED — no wiring proposed)

| Item | CURRENT STATE | Paths |
|---|---|---|
| AI provider / execution | `INTENTIONALLY DEFERRED` / unwired | `docs/operations/AI_PILOT_BOUNDARY.md`; `apps/os-web/lib/ai/limits.ts` (`isAiEnabled` default false); Ayuda `AI_FUTURE_UNWIRED` |
| AI-ready context packet (conversation evidence) | `LIVE` (architecture/helpers only; `modelCalled: false`) | `packages/os-contracts/src/conversation-evidence.ts` (`buildAiReadyContext`); used in `apps/os-web/lib/evidence/review-model.ts` |
| Future AI over Issue/Resolution/SOP memory | `PLANNED` | Needs authorized record retrieval over real Issue/Decision/Commitment/SOP stores — **do not wire** in this pass |
| Forbidden autonomous AI actions | Documented | Approve, confirm payment, set root cause as truth, price, permissions, merge, silent correct — boundary already stated in AI pilot + guidance |

**Readiness note only:** Once Issue/Resolution Memory exists as first-class tenant-scoped records with evidence links, the same pattern as `buildAiReadyContext` (packet + boundary string + no model call) can retrieve similar precedents. Company records remain source of truth. No provider wiring proposed here.

---

## Capability scorecard (Agent 2)

| Capability | CURRENT STATE | Backend primitive | UI surface |
|---|---|---|---|
| Work / follow-up action loop | `LIVE` | `OsWorkItem` + work commands/events | `/trabajo`, Cliente seguimiento, palette |
| Approvals as decisions | `LIVE` | `OsApprovalRequest` | `/aprobaciones`, quote/order panels |
| Coordination problem/decision/resolve | `LIVE BUT PARTIAL` | `OsCoordinationDecision` + contract | `/coordinacion` (ledger not loaded from DB) |
| Universal Reportar problema | `MISSING` | — | — |
| Palette Reportar incidencia | `MISSING` | — | Command palette |
| Issue learning loop | `MISSING` | fragments only | walkthrough blocked |
| Resolution / precedent Memory | `MISSING` | — | — |
| Relationship Memory | `LIVE BUT PARTIAL` | party timeline + commercial | Cliente 360 |
| Decision Memory (this lane slice) | `LIVE BUT PARTIAL` | approvals + coord + release | split surfaces |
| Commitment Memory | `BACKEND ONLY` | `OsCommitment` | persistence port blocked |
| Operational Memory (unified) | `MISSING` as memory; desks `LIVE BUT PARTIAL` | desk tables | ops routes |
| Knowledge/SOP coach (OS) | `LIVE BUT PARTIAL` | guidance catalog | `/ayuda`, inline notes |
| SOP Memory linked to issues | `MISSING` | Architect SOP separate | — |
| Product Feedback | `MISSING` | — | — |
| Business Issue aggregate | `MISSING` | — | — |
| AI over organizational memory | `INTENTIONALLY DEFERRED` | AI-ready packets exist | unwired |

---

## Reuse recommendation

1. **Do not** invent a second task/kanban parallel to `OsWorkItem`.
2. **Do not** overload Work into “problem + cause + precedent.”
3. **Do not** collapse Organizational Memory types into a generic notes table.
4. **Do** treat Issue/Resolution as **memory + lifecycle**, spawning Work for actions and Coordination for cross-area decisions when needed.
5. **Do** reuse BusinessEvent + Audit for who/when/what changed; reuse reported/case facts for evidence; reuse Guidance/SOP coach for governed knowledge display — link SOP ids later, don’t rewrite Architect.
6. **Do** keep Product Feedback (software) separate from Business Issue (operations) if either is built.
7. **Park** AI wiring; only grow AI-ready retrieval envelopes over authorized records when Issue Memory exists.

**Suggested composition (design only — not implement):**

`BusinessIssue` (report + status + links + possible/confirmed cause + outcome)  
→ optional `OsWorkItem` (owner/actions)  
→ optional Coordination decision/resolve  
→ evidence refs (case fact / reported fact / conversation message ids)  
→ BusinessEvent/Audit on every transition  
→ Resolution Memory = closed Issue with confirmed cause + actual resolution + outcome + recurrence link  

---

## BUSINESS DECISIONS

1. **Is Business Issue a new aggregate, or a typed Coordination matter + Work child?** (Compose vs new table.)
2. **Authority for REPORTAR PROBLEMA** — which capability/role may create; who may confirm cause / close?
3. **Mandatory vs optional context fields** on report (customer/order/product/delivery/…).
4. **Work subject extension** — may Work attach to `order` / `delivery` / `product` / `issue`, or only via Issue links?
5. **Product Feedback vs Business Issue** — separate products forever, or deferred Product Feedback as `NO LONGER NEEDED` for pilot?
6. **SOP linkage** — OS stores SOP references, or deep-link Architect living deliverables only?
7. **Commitment persistence port** — clear `schema_not_available` vs real writer ownership (cross-lane with Agent 3).
8. **Coordination hosted write** — when is UNPROVEN → proven; Issue design must not assume live ledger until then.
9. **Recurrence / precedent** — explicit Issue-to-Issue link required for pilot, or Wave E later?
10. **Universal entry placement** — global button + palette only, vs also desk-local “report from here”?

---

## Priorities

### P0
- Freeze **no parallel task system** decision; document Issue as compose-over-Work/Coordination.
- Resolve BUSINESS DECISIONS 1–2 (aggregate shape + authority) before any schema.
- Keep REPORTAR PROBLEMA / palette action **unimplemented** until canonical design reconciled (already required by brief).

### P1
- Design thin Business Issue contract (states, cause split, evidence links, Work/Coordination foreign keys) without AI.
- Wire Coordination ledger read/write proof **or** explicitly keep Issue independent of coord persistence (cross-lane).
- Align Commitment web persistence with existing `OsCommitment` schema (Agent 3 collision).

### P2
- Universal Reportar problema + palette action with authorized context prefill.
- Resolution Memory as closed-issue precedent list (non-AI retrieval).
- Optional SOP/guidance link ids on resolution (coach reuse).

### P3
- Recurrence analytics / similar-issue retrieval envelopes (AI-ready, still unwired).
- Product Feedback channel (only if BUSINESS DECISION says yes).
- Manager learning loop / organizational learning wave (Wave E in parent brief).

---

## Explicit non-actions (this receipt)

- No Issue aggregate implementation.
- No Command Palette action added.
- No AI provider wiring.
- No competing task system.
- No schema migration proposed as committed work.

---

## Cross-lane handoffs

| Topic | Owner hint |
|---|---|
| Attention / Commitments / Escalations | Agent 3 |
| Decision Memory / Audit Viewer / Provenance | Agent 4 |
| Command Palette / search / saved views | Agent 6 |
| Notifications / Product Feedback / change log | Agent 8 |
| AI provider / WhatsApp | Wave F / AI boundary docs |

If Issue design needs Attention type or Audit Viewer UI: return `CROSS_LANE_CHANGE_REQUEST` — do not fork.

---

*End of AGENT 2 receipt.*
