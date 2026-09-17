# PP-4 — Work / Inicio / Issues / Commitments / Conversations manual

**Lane:** PP-4  
**As of:** 2026-09-17  
**Audit mode:** READ-ONLY (no product code edited)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**RC2 failed SHA (immutable tip at audit):** `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc`  
**Working tree:** dirty (RC3 + related uncommitted)  
**Deploy / hosted BV:** NOT performed — interactive operator walks remain **UNPROVEN**

---

## Verdict strip

| Slice | Local code | Local tests | Hosted |
|---|---|---|---|
| Inicio as command center (cards / Mi día / lenses / Centro de mando) | **IMPLEMENTED** · **INTEGRATED** | **TESTED** (composition + honesty) | **UNPROVEN** (narrow Empresa/gerencia language + Story cues only in prior CT3 BV) |
| Work create / complete | **IMPLEMENTED** · **INTEGRATED** (OS commands) | **TESTED** (payload + surface wiring) | **UNPROVEN** |
| Work reassign | **IMPLEMENTED** · **INTEGRATED** (**people.admin only**) | **TESTED** (admin surface; absent from `/trabajo`) | **UNPROVEN** |
| Issues report + assign owner | **IMPLEMENTED** · **INTEGRATED** | Light **TESTED** (nav/context/scope) | **UNPROVEN** |
| Issues resolve / close / journal | Domain **IMPLEMENTED**; **UI absent** | Domain suite only | **UNPROVEN** / N/A for UI |
| Commitments create + fulfill | **IMPLEMENTED** · **INTEGRATED** | Draft/buckets/domain **TESTED**; web action exec weak | **UNPROVEN** |
| Conversations suggest → copy (no fake WhatsApp) | **IMPLEMENTED** · **INTEGRATED** | **TESTED** (adapter + shell + panel asserts) | **UNPROVEN** |
| Conversations suggest → confirm (Review/Ignore/record-sent) | UI present; **handlers unwired** | Partial | **UNPROVEN** |
| Conversations manual register durable write | UI admit **local only**; no POST | Admit/project **TESTED** | **UNPROVEN** |

**PP4_LOCAL_COMMAND_CENTER = PASS** (Inicio composed; exception-first; not a stub)  
**PP4_WORK_MUTATIONS_LOCAL = PASS** (create/complete real; reassign admin-only by design)  
**PP4_ISSUES_MUTATIONS_LOCAL = PARTIAL** (report + assign only)  
**PP4_COMMITMENTS_MUTATIONS_LOCAL = PASS** (create + fulfill; cancel/reassign UI gap)  
**PP4_CONVERSATIONS_NO_FAKE_WHATSAPP = PASS** (local contract)  
**PP4_CONVERSATIONS_CONFIRM_PIPELINE = GAP** (suggest display without confirm wiring)  
**PP4_HOSTED_BV = UNPROVEN**  
**SAFE_TO_CLAIM_OWNER_ACCEPTANCE_ON_PP4 = NO**

---

## Contract (what this lane must prove)

1. **Inicio** is the operating **command center**: summary cards with real CTAs, Mi día, lens tabs (**Mi trabajo | Equipo | Empresa**), Centro de mando queues — not stacked role homes or vanity KPIs.
2. **Work** supports create / reassign / complete on real OS commands (reassign may be admin-scoped).
3. **Issues** and **Commitments** desks support operator mutations that exist in product UI (honest about gaps).
4. **Conversations** supports human **suggest → confirm** for drafts without **fake WhatsApp send**.

Proof matrix states kept separate: PLANNED · IMPLEMENTED · TESTED · INTEGRATED · HOSTED · BROWSER-VERIFIED · USER-ACCEPTED.

---

## 1. Inicio — command center

### Key surfaces

| Path | Role |
|---|---|
| `apps/os-web/app/(app)/inicio/page.tsx` | SSR composition |
| `components/inicio/inicio-summary-cards.tsx` | 4 navigable summary metrics |
| `components/inicio/inicio-mi-dia.tsx` | Flattened today queue (max 7) |
| `components/inicio/inicio-lens-tabs.tsx` | Mi trabajo / Equipo / Empresa |
| `components/inicio/inicio-command-queue-sections.tsx` | Pendientes / Problemas / Compromisos / Decisiones |
| `lib/inicio/{page-lens,role-lens,build-summary-cards,today-queue,load-command-queues}.ts` | Lens + counts + queues |
| `components/management/*` | Equipo/Empresa metrics, funnel, insights |

**Removed from page (still proven absent by tests):** stacked `OperatingHomes`, `InicioLeadershipSection`. Legacy `InicioTodayQueue` / `InicioAttentionPanel` remain in tree but are **not** the live Mi día path.

### Cards / CTAs

| Card | Count idea | Href |
|---|---|---|
| Necesita atención | Attention + overdue owned work | `/trabajo?view=overdue` |
| Para hoy | Due-today work + pending approvals (scope) | `/trabajo` |
| Aprobaciones | Personal or org pending (lens / View As) | `/aprobaciones` |
| Incidencias abiertas | Owned/unassigned open (`—` if unavailable) | `/incidencias` |

Hero primary CTA: **Ver mi trabajo** → `/trabajo`. Subtitle frames exception attention (“necesita atención hoy”).

### Lenses

| Tab | Query | Content |
|---|---|---|
| **Mi trabajo** (default) | (none) | Centro de mando: commercial strip, management exceptions (when scoped), command queues, Qué cambió |
| **Equipo** | `?lente=equipo` | Team table + deterministic insights (when team leadership / read ready) |
| **Empresa** | `?lente=empresa` or Story alias `gerencia` | Funnel + org metrics + insights + example preview |

Tabs hidden when only personal lens is available. Page lens (UI) is distinct from role lens (queue visibility).

### Centro de mando desk CTAs

| Section | Desk href |
|---|---|
| Pendientes | `/trabajo` (+ `?view=team|org` by role lens) |
| Problemas abiertos | Incidencias open filter |
| Compromisos | **`/clientes`** (“Ir a clientes”) — **not** `/compromisos` |
| Decisiones | `/aprobaciones` |

Fail-closed per section via `safeInicioSectionFetch` (403/unavailable → “No disponible…” without blanking home).

### Honesty / gaps (Inicio)

| Item | Severity | Note |
|---|---|---|
| Compromisos CTA → `/clientes` | **Residual** | Product desk is `/compromisos`; misdirected navigation |
| Commitment row without `partyId` → `/inicio` | Low | Self-loop in `today-queue` |
| Qué cambió rows non-navigable | Low | Only “Ver auditoría” |
| Management exception cards display-only | Low | No deep links |
| Insight inputs `clientsMissingLocation` / `exitsWithoutDelivery` / `pendingConfirmations` hard-`null` on page | Medium | Logic in `improvement-insights.ts` not fed — honest omission, not fake counts |
| Dual summary builders | Drift risk | Live path: `summaryCardsFromCounts`; unused alternate still in `summary-cards.ts` |
| View As vs org queues | See PP-5 / RC3 | Org loads may over-expose under evaluation — out of PP-4 mutation scope |

### Local tests (Inicio)

| File | Proves |
|---|---|
| `lib/inicio/inicio-ux2.test.ts` | Mi día cap 7; lens labels/`gerencia`; mounts summary + Mi día + tabs; **no** OperatingHomes / leadership section; no revenue/rank copy |
| `lib/inicio/inicio-command.test.ts` | Role lens; queue queries; fail-closed; Centro de mando survives org 403 |
| `lib/inicio/today-queue.test.ts` | Bucket order; ownership; no urgency/SLA invention |
| `lib/inicio/filter-for-evaluation.test.ts` | View As filters; approvals personal vs org |
| `lib/management/inicio-management.test.ts` | Exception cards without money fields; no invented production/stock queries |
| `lib/work/inicio-attention.test.ts` | Attention wiring into summary / Mi día |

### Subfeature scores — Inicio

| Subfeature | Score |
|---|---|
| Hero + Ver mi trabajo | **INTEGRATED** · hosted interactive **UNPROVEN** |
| Summary cards | **TESTED** + **INTEGRATED** · hosted count accuracy **UNPROVEN** |
| Mi día | **TESTED** + **INTEGRATED** · **UNPROVEN** hosted |
| Lens tabs | **TESTED** + **INTEGRATED** · Empresa language BV prior **PASS** (narrow) · full tab UX **UNPROVEN** |
| Centro de mando queues | **TESTED** + **INTEGRATED** · Compromisos CTA **weak** · hosted **UNPROVEN** |
| Equipo / Empresa intelligence | **TESTED** + **INTEGRATED** · map/ops insight inputs **PLANNED** (null) |
| Fail-closed sections | **TESTED** + **INTEGRATED** |
| Overall “command center” claim | **INTEGRATED** in app · **TESTED** locally · full hosted walk **UNPROVEN** |

---

## 2. Work — create / reassign / complete

### Key surfaces

| Layer | Paths |
|---|---|
| Desk | `app/(app)/trabajo/page.tsx`, `trabajo/[workItemId]/page.tsx` |
| UI | `components/work/{work-list,register-follow-up-form,complete-follow-up-form,cancel-follow-up-form}.tsx` |
| Actions | `lib/work/actions.ts`, `reassign-work-action.ts`, `follow-up.ts` |
| Reassign UI | `components/admin/reassign-work-panel.tsx` on `administracion/equipo/[memberId]` |
| API | `executeWorkCommand` → `@isalwa/os-work` (`CreateWorkItem`, `CompleteWork`, `CancelWorkItem`, `ReassignWork`) |

### Mutation matrix

| Action | Command | Where in product | Notes |
|---|---|---|---|
| **Create** | `CreateWorkItem` via `createFollowUpAction` | Cliente 360, quote envío / manual-send (`RegisterFollowUpForm`) — **not** a create button on `/trabajo` | Owner = authenticated member; subject `party` or `commercial_account` |
| **Complete** | `CompleteWork` via `completeFollowUpAction` | Work **detail** when `status === 'open'` | List rows are navigation-only |
| **Cancel** | `CancelWorkItem` | Work detail | Extra vs create/reassign/complete triad; real |
| **Reassign** | `ReassignWork` via `reassignWorkAction` | **people.admin** member page only | Explicitly **absent** from `/trabajo` and follow-up actions (tests enforce) |

`/trabajo` itself: list (mine / overdue / team / org), stats, demo filter, View As projection — mutations require detail (or admin for reassign).

### Local tests (Work)

| File | Proves |
|---|---|
| `lib/work/follow-up.test.ts` | Create/Complete/Cancel payloads; no Reassign in follow-up |
| `lib/work/reassign-work-admin.test.ts` | Reassign only on admin member page; `people.admin` scope; absent from Trabajo |
| `lib/commercial/quote-follow-up.test.ts` | Quote surfaces wire register form / action |

**Missing for this lane:** os-web HTTP/integration of actions → API; hosted CompleteWork walk.

### Demo / fake

- Owner-demo seed creates real DEMO work rows (DB), not client-side fake complete.
- Conversation `demo-followup-*` suggestions are **cards only** (`isDemo: true`) — do not silent-create.
- No evidence of fake success without API for create/complete/reassign.

### Subfeature scores — Work

| Subfeature | Score |
|---|---|
| Create follow-up | **TESTED** + **INTEGRATED** · hosted **UNPROVEN** |
| Complete | **TESTED** + **INTEGRATED** · hosted **UNPROVEN** |
| Reassign (admin) | **TESTED** + **INTEGRATED** · hosted **UNPROVEN** |
| Reassign on `/trabajo` | **Not a product surface** (by design) |
| List / detail desks | **INTEGRATED** · presentation **TESTED** · hosted **UNPROVEN** |

---

## 3. Issues

### Key surfaces

| Layer | Paths |
|---|---|
| Desk | `app/(app)/incidencias/{page,reportar,[issueId]/page}.tsx` |
| UI | `components/issue/{report-issue-drawer,assign-issue-owner-form,issue-list}.tsx` |
| Actions | `lib/issue/actions.ts` — **`reportIssueAction`**, **`assignIssueOwnerAction` only** |
| Domain | `@isalwa/os-issue` + contracts (12 commands) |

### What operators can do in UI

| Capability | Status |
|---|---|
| List desks (open / assigned / reported / resolved) | Live |
| Detail read (status, journal display, cause/resolution/outcome fields, linked work) | Live (read) |
| **Report** (`ReportIssue`) | Live — reportar route, drawer, Cliente 360 / pedido triggers |
| **Assign owner** (`AssignIssueOwner`) | Live — gated `issue.manage` / `ISSUE_MANAGE_SCOPE` |

### Domain commands **not** wired in os-web

`TriageIssue`, `StartIssueProgress`, `AddIssueJournalEntry`, `ConfirmIssueCause`, `LinkIssueWork`, `ResolveIssue`, `RecordIssueOutcome`, `CloseIssue`, `ReopenIssue`, `RelateIssues`

Detail may **show** empty investigation/resolution states with **no write forms**. Operators cannot close an issue from UI even though domain can.

Conversation “Crear incidencia …” links require human confirmation elsewhere; demo suggestion cards do not auto-call `reportIssueAction`.

### Local tests (Issues)

| File | Proves |
|---|---|
| `lib/issue/issue.test.ts` | Labels, nav, report context |
| `lib/issue/lane-d-v1-close.test.ts` | Pedido report trigger; Assign form + scope in sources |
| `packages/os-issue` lifecycle / adversarial | Full domain command lifecycle |

**Missing:** os-web action execution tests; resolve/close UI (none to test).

### Subfeature scores — Issues

| Subfeature | Score |
|---|---|
| Report | **IMPLEMENTED** + **INTEGRATED** · light **TESTED** · hosted **UNPROVEN** |
| Assign owner | **IMPLEMENTED** + **INTEGRATED** · light **TESTED** · hosted **UNPROVEN** |
| List / detail read | **IMPLEMENTED** + **INTEGRATED** · **TESTED** (labels/nav) · hosted **UNPROVEN** |
| Resolve / close / journal / triage | Domain **IMPLEMENTED**; UI **PLANNED**/absent |

---

## 4. Commitments

### Key surfaces

| Layer | Paths |
|---|---|
| Desk | `app/(app)/compromisos/page.tsx` (list/buckets; **no create CTA**) |
| UI | `components/commitments/{commitment-list,commitment-record-form}.tsx` |
| Create entry | Cliente 360 actions menu |
| Persistence | `lib/commitments/persistence.ts` → `saveCommitmentAction` / `fulfillCommitmentAction` |
| Domain | `@isalwa/os-commitment` (`CreateEmployeeCommitment`, `CreateCustomerReportedCommitment`, `FulfillCommitment`, …) |

### Mutation matrix

| Action | UI | Notes |
|---|---|---|
| **Create** | Cliente 360 only | Employee or customer-reported; payment-boundary copy for customer-reported |
| **Fulfill** | Button on `CommitmentList` (desk) | Real command path |
| **Cancel** / **Reassign owner** | Domain only | Contracts + package tests; **no** os-web wiring |

Inicio Compromisos section CTA still points to **`/clientes`**, not this desk (see §1).

### Local tests (Commitments)

| File | Proves |
|---|---|
| `lib/commitments/commitments.test.ts` | Draft, due ISO, sort; persistence is `'use server'` / no Prisma |
| `lib/commitments/desk-buckets.test.ts` | Desk bucketing |
| `packages/os-commitment` command-service tests | Create / Fulfill / Cancel / Reassign at service |
| Contracts commitments helpers | Pure lifecycle |

**Missing:** web tests that actions hit the OS API client.

### Subfeature scores — Commitments

| Subfeature | Score |
|---|---|
| Create (Cliente 360) | **IMPLEMENTED** + **INTEGRATED** · draft **TESTED** · hosted **UNPROVEN** |
| Fulfill | **IMPLEMENTED** + **INTEGRATED** · domain **TESTED** · web action **UNPROVEN** · hosted **UNPROVEN** |
| Desk list / buckets | **IMPLEMENTED** + **INTEGRATED** · buckets **TESTED** · hosted **UNPROVEN** |
| Cancel / reassign | Domain **IMPLEMENTED**; UI **absent** |

---

## 5. Conversations — suggest → confirm · no fake WhatsApp

### Key surfaces

| Layer | Paths |
|---|---|
| Route | `app/(app)/conversaciones/page.tsx` |
| Workspace | `components/conversations/conversations-workspace.tsx` |
| Manual | `manual-conversation-panel.tsx` + `lib/conversations/{manual-conversation,project-manual}.ts` |
| Suggest / reply | `suggestion-card.tsx`, `recommended-reply-panel.tsx`, `conversation-context-panel.tsx` |
| Rules | `lib/conversations/{recommended-reply,demo-suggestion-rules,build-context-panel}.ts` |
| Adapter | `lib/conversations/adapters.ts` (`canSend: false`, `provider_not_connected`) |
| API | `apps/os-api/.../customer-conversations.controller.ts` — **list only** |

### Suggest → human act (what works)

1. **Recommended reply:** deterministic draft → editable textarea → **Copiar respuesta** (`clipboard`) only.  
   - `data-auto-send="never"`, StatusPill **Sin envío automático**, copy: ISALWA does not auto-send WhatsApp.
2. **Suggestion cards:** demo rules → display with demo badge/note.
3. **Acciones** deep links: “Crear … (requiere confirmación)” → other desks; footer: *ISALWA no crea Pedidos ni envía WhatsApp solo.*

### Confirm gaps (UI present, unwired)

| Affordance | Evidence |
|---|---|
| **Revisar / Ignorar** | `SuggestionCard` accepts `onReview` / `onIgnore`; context panel renders `<SuggestionCard suggestion={…} />` **with no handlers** → buttons no-op |
| **Registrar como enviada** | Panel passes `allowRecordSent` but **not** `onRecordSent` → record-sent CTA does not appear (`onRecordSent` required with label) |
| Suggestion → create entity | No governed confirm command inside Conversaciones — navigation labels only |

`draftContainsOverpromise` is unit-tested but **not enforced** in the editable panel UI.

### Manual register

| Step | Behavior |
|---|---|
| Admit | `admitManualConversation` / contract helper |
| Project | `projectManualConversation` → bubbles |
| Persist | **Session-local** `recorded[]` in workspace — **no** `POST /customer-conversations` |
| List durable | Page prefers `GET` durable rows; JSON DEMO fixtures only when `dataMode === 'demo'` **and** durable list empty |

Channel label `whatsapp` = **evidence channel metadata**, not provider connect (`providerConnected: false`, advisor number pending).

### Explicit absence of fake WhatsApp

| Guard | Evidence |
|---|---|
| Adapter never sends | `canSend: false`; `send()` → `{ sent: false, reason: 'provider_not_connected' }` |
| No auto-send UI | `data-auto-send="never"`; shell tests match |
| No fake read receipts | Thread copy + tests ban `✓✓` / read ticks |
| No Meta/Twilio/WA Business branding | Shell tests |
| DEMO·WHATSAPP | Demo **label** + banner that WhatsApp is not connected |

### Local tests (Conversations)

| File | Proves |
|---|---|
| `lib/conversations/smart-context.test.ts` | Demo rules; recommended reply never auto-send / no `sendWhatsApp` |
| `lib/conversations/conversaciones-shell.test.ts` | Nav; no WA branding; DEMO badge; no fake ticks; durable-over-JSON |
| `lib/conversations/manual-conversation.test.ts` | Channel closed copy; typeahead; admit keeps provider false |
| `lib/conversations/model.test.ts` | Project-manual; adapter never sends |
| `lib/conversations/conversation-context.test.ts` | SYNTH fixture scenario wiring |
| `apps/os-api/.../customer-conversations.controller.test.ts` | List path |

### Subfeature scores — Conversations

| Subfeature | Score |
|---|---|
| Shell (route, filters, closed-channel labeling) | **TESTED** + **INTEGRATED** |
| Manual panel / admit / project | **TESTED** + **INTEGRATED** (UI); durable write **PLANNED** |
| Durable list GET | **IMPLEMENTED** + **INTEGRATED** · hosted **UNPROVEN** |
| Demo fixtures honesty | **TESTED** + **INTEGRATED** |
| Suggest → **copy** | **TESTED** + **INTEGRATED** · clipboard browser **UNPROVEN** |
| Suggest → **confirm** (Review/Ignore/record-sent) | Display **INTEGRATED**; confirm pipeline **PLANNED**/unwired |
| No fake WhatsApp send | **TESTED** + **INTEGRATED** |
| Live WhatsApp send | Intentionally **absent** / **PLANNED** (`future_whatsapp`) |

---

## Residuals (do not claim fixed in this audit)

1. Inicio Compromisos desk CTA → `/clientes` instead of `/compromisos`.
2. Issues lifecycle beyond report + assign: domain-ready, product-incomplete.
3. Commitments cancel/reassign: domain-only; no create CTA on `/compromisos`.
4. Conversations: unwired Review/Ignore/record-sent; manual register not durable.
5. All PP-4 interactive operator walks: **HOSTED / BROWSER-VERIFIED = UNPROVEN**.
6. Working tree dirty; no RC3 cut SHA for this evidence package.

---

## Recommended local verification commands (not re-run as gate in this write)

```bash
cd apps/os-web && npx tsx --test \
  lib/inicio/inicio-ux2.test.ts \
  lib/inicio/inicio-command.test.ts \
  lib/inicio/today-queue.test.ts \
  lib/work/follow-up.test.ts \
  lib/work/reassign-work-admin.test.ts \
  lib/commitments/desk-buckets.test.ts \
  lib/conversations/smart-context.test.ts \
  lib/conversations/conversaciones-shell.test.ts \
  lib/conversations/manual-conversation.test.ts
```

Treat results as **local** only. Do not promote to hosted PASS.

---

## Bottom line

Inicio **is** an integrated exception-first command center in this worktree. Work **create/complete** and admin **reassign** are real OS command paths. Issues stop at **report + assign**. Commitments support **create + fulfill**. Conversations are an **evidence desk**: suggest drafts and copy without pretending WhatsApp delivery; the human **confirm** pipeline for suggestions/record-sent is still unwired, and manual register is not durable.

**Do not** invite owner acceptance or claim PP-4 hosted PASS from this document alone.
