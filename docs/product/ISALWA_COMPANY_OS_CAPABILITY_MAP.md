# ISALWA Company OS — Capability Control Map

**Date:** 2026-09-16 (Final pre-pilot runtime)  
**Role:** Permanent Control Tower map (reconcile vision ↔ code/runtime truth)  
**FINAL RUNTIME SHA (web+API same):** `37a1ed7bb783b2c2ea211ce49616442884825b1c`  
**Web deploy:** `dep-dal4oqlg1s2s73e8bmpg` LIVE  
**API deploy:** `dep-dal4oldbedkc73b8uu0g` LIVE  
**Wave B accepted base (before this pass):** `afeb1c14c144f05a0eb99c745bbe14d8a0091f6e`  
**URL:** https://os-web-staging.onrender.com  
**REAL tenant:** `01M2DV9F0V5DXS4G89AKF4D5SR`  
**SYNTH tenant:** `01M2JKF77TXMJNDTKNCYNHH9G5`

**Pre-pilot 2026-09-16 proof (do not collapse):** web+API LIVE on `37a1ed7` (web `dep-dal4oqlg1s2s73e8bmpg` · api `dep-dal4oldbedkc73b8uu0g`). Independent hosted SYNTH verifier re-run 17/17 PASS (health/ready, login 200, unauth inicio/QA 307, AI 503 `AI_UNAVAILABLE`, operator audit/changes 403, issues/commitments/parties 200, no REAL leak, QA effective-access 404). Authenticated SSR HTML HOSTED: SYNTH owner 200 on Inicio/Clientes/Mapa/Incidencias/Aprobaciones/Finanzas/Administración/Sistema; REAL `carmen.staging` READ-SAFE 200 on Inicio/Clientes/Mapa. REAL map honesty HOSTED: 7 active, 2 confirmed coords, 5 provenance-only, 0 invented pins; copy `2 de 7 tienen coordenadas` + `Vista geográfica en preparación`. QA `/sistema/pruebas-acceso` hosted 404 (`OS_QA_CONTROL_ENABLED` not true) = PROVIDER_BLOCKED. Interactive visual 1440/390 layout = UNPROVEN (IDE browser tabs unavailable). Map live tiles = MAP_PROVIDER_CREDENTIAL_REQUIRED. AI live model = AI_PROVIDER_CREDENTIAL_REQUIRED. REAL mutations = NONE.

**Sources (recon receipts only):**  
`docs/operations/company-os-recon-2026-09-15/agent-01-admin-lifecycle.md` · `agent-02-issues-memory.md` · `agent-03-attention-commitments.md` · `agent-04-decision-audit.md` · `agent-05-data-health.md` · `agent-06-search-productivity.md` · `agent-08-notifications-health.md` · `agent-11-infra-owner-cost.md` · `agent-12-developer-handoff.md`  
Onboarding member-scope note: code in this pass; hosted proof deferred (see §A).

---

## 1. Purpose

This map is the permanent Company OS control surface: what exists, what is partial, what is missing, what must wait for business decision, and which build wave owns the next honest step. It is not a feature backlog fantasy and not an acceptance certificate.

## 2. State vocabulary (CURRENT STATE — only these)

| Value | Meaning |
|---|---|
| `LIVE` | End-to-end product path exists in code and is intended for operators |
| `LIVE BUT PARTIAL` | Usable path with known gaps / honesty limits |
| `BACKEND ONLY` | Contract/schema/API/tests without operator UI (or UI unmounted) |
| `PLANNED` | Documented intent; not implemented as product capability |
| `MISSING` | Required vision capability absent |
| `INTENTIONALLY DEFERRED` | Explicitly out of pilot channel / policy (not forgotten) |
| `NO LONGER NEEDED` | Deliberately not productized (e.g. hard-delete employee) |

## 3. Proof-state rules (never collapse)

Keep **separate**: `PLANNED` → `IMPLEMENTED` → `TESTED` → `INTEGRATED` → `DEPLOYED` → `HOSTED` → `BROWSER-VERIFIED` → `USER-ACCEPTED`.

- Cursor / agent claims ≠ acceptance.
- A route ≠ working capability.
- A package ≠ operator can use it.
- Synthetic fixtures ≠ real-company proof.
- Component/unit tests ≠ hosted browser proof.
- Proof columns below use only: **YES / NO / PARTIAL / UNPROVEN / N/A** — never vague `PASS`.
- REAL vs SYNTH tenants must never be mixed in counts or remediation playbooks.

**Hosted baseline caveat:** Proof columns for product surfaces that were not re-browser-verified in recon receipts are **UNPROVEN** at map write time even when code is LIVE. Onboarding isolation was **BROWSER-GLOBAL** at `e5e9cac`; member-scoped fix is **in this pass (code)** and remains **HOSTED / BROWSER-VERIFIED = UNPROVEN** until deploy + independent verifier.

---

## 4. Capability tables (mission areas A–AO)

Column legend: **AUTH** = authority · **REAL** = real-data proof · **SYN** = synthetic proof · **T** = tested · **I** = integrated · **D** = deployed · **H** = hosted · **BV** = browser-verified · **UA** = user-accepted · **BD?** = business decision needed · **NEXT** = recommended next state · **P** = priority · **W** = build wave.

---

### A — Onboarding acceptance debt

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| First-use guide / Learning Mode persistence | Two employees on one browser must not inherit each other’s intro | `LIVE` | Browser `localStorage` via `guideStorageKey(actorKey)` — member-scoped | Device-local UI state (not tenant SoR) | WalkthroughShell / GuideProvider | None (UI chrome only; must not store authz) | N/A | YES (A→B on SYNTH) | YES | YES | YES (`1fd0167`) | YES | YES (`independent-verifier-onboarding.md`) | NO | At `e5e9cac` was BROWSER-GLOBAL; fixed + hosted BV PASS | Shell `actorKey` | No | Maintain MEMBER-SCOPED | closed P0 | A |
| Six-role post-onboarding regression (Asesor…Owner) | Intro/tours must not leak unauthorized controls | `LIVE BUT PARTIAL` | Role homes + walkthrough allowlists | Session scopes | Inicio / micro-tours | Existing scopes only | UNPROVEN | UNPROVEN | PARTIAL | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Independent hosted verifier still required this pass | Onboarding scope fix | No | BROWSER-VERIFIED on SYNTH then REAL smoke | P1 | A |

*Source: pass note + `apps/os-web/lib/walkthrough/persistence.ts` (this worktree); no agent-10 receipt file.*

---

### B — Admin control center / employee lifecycle / access / org

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Invite employee | Add person without developer | `LIVE` | `InviteMember` + Supabase invite | `OsPerson` / `OsOrganizationMember` / `OsAuthIdentity` | `/administracion/equipo/invitar` | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Invite omits manager; roles from existing keys | Auth provider | Yes — role catalog | Governed role enum | P1 | A |
| Invitation state visibility | See invited / email / resend | `LIVE BUT PARTIAL` | Member summary + auth identity | Member + auth rows | Equipo / member detail | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Invited email often `—`; no resend | Invite path | Yes — show invited email? | LIVE (email + resend policy) | P1 | A |
| Activate / complete invite | Invitee becomes active | `LIVE` | `ActivateMember` / `completeInvitedAccess` | Member accessStatus | `/auth/complete-invite` | Invitee + admin reactivate rules | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Admin cannot force-activate invited from panel (by design) | Auth | No | Keep | — | — |
| Suspend / reactivate | Pause access without terminate | `LIVE` | `SuspendMember` / `ActivateMember` | Member accessStatus | MemberAdminActionsPanel | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Reason UI not persisted | — | Yes — persist reason? | LIVE + reason audit | P1 | A |
| Terminate employee | End employment safely | `LIVE BUT PARTIAL` | `TerminateMember` + `collectTerminationImpact` fail-closed | Member employment + access revoked | Member detail: Responsabilidades + Acceso | `people.admin` | UNPROVEN | PARTIAL (unit) | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Quote/Order reassign commands missing; no ReassignApprover; Wave2 lacks people.admin fixture | ReassignWork + commercial cmds | Yes — quote/order cmds | LIVE continuity after hosted BV | **P0** | A |
| Reassign work (admin) | Move open work before terminate | `LIVE` (code) | `ReassignWork` | WorkItem owner + events | Admin member **Trabajo activo** | `people.admin` | UNPROVEN | PARTIAL | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Hosted BV pending; not on `/trabajo` | Open work list | No | BROWSER-VERIFIED | P0 | A |
| Access history (employee) | Who changed access | `LIVE BUT PARTIAL` | Bounded BusinessEvent projection | `OsBusinessEvent` access types | Member detail Historial | `people.admin` | UNPROVEN | PARTIAL | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not full Audit Viewer | Events | No | Maintain; Wave C for full audit | P1 | A |
| Rehire | Bring back terminated member | `BACKEND ONLY` | `RehireMember` | Membership restart events | UI blocked | `people.admin` (API) | N/A | UNPROVEN | YES | NO | UNPROVEN | UNPROVEN | NO | NO | Explicitly UI-blocked | Lifecycle | Yes — ship UI? | LIVE UI or keep deferred | P2 | A |
| Assign primary business role | Put person on correct job access | `LIVE BUT PARTIAL` | `ChangeRole` | `OsRoleAssignment.roleKey` | Member detail | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Free-string roleKey; options from existing members | Scopes | Yes — freeze catalog | Governed enum | P1 | A |
| Additional roles / remove | Grant/end scoped extras | `LIVE` / remove primary = `LIVE BUT PARTIAL` | `GrantAdditionalRole` / `EndAdditionalRole` / `ChangeRole` | Role assignments | Permisos adicionales | `people.admin` + `ADDITIONAL_ASSIGNABLE_SCOPE_KEYS` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | ChangeRole clears additionals | Scopes | No | Keep | — | A |
| Inspect effective access | What can this person do now? | `LIVE BUT PARTIAL` | `computeEffectiveScopes` | Roles + non-expired delegations | Member pills; Accesos = explainer only | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No effective-scopes inspector / dates | Delegation | Yes — review depth | LIVE inspector | P1 | A |
| Department | Place in org structure | `LIVE BUT PARTIAL` | `ChangeDepartment` | `OsDepartmentAssignment` | Member select (existing depts only) | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No CreateDepartment / CRUD UI | Dept seed | Yes — who creates depts? | LIVE CRUD or seed policy | P2 | A |
| Manager / reporting | Who leads whom | `LIVE` | `ChangeManager` | `OsManagerAssignment` | Typeahead on member | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Invite omits manager | — | No | Keep | — | A |
| HR cargo / job title | Non-authorizing function label | `INTENTIONALLY DEFERRED` / `MISSING` | None on member | N/A | Forbidden on invite | Must never grant scopes | N/A | N/A | YES | N/A | N/A | N/A | N/A | N/A | Cargo ≠ access (by design) | — | Yes — ever store label? | Stay deferred | P3 | — |
| Access review surfaces | Review who has what without SQL | `LIVE BUT PARTIAL` | Directory filters | Member directory | Equipo filters; Accesos static | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No attestation campaign | History | Yes | Formal review or keep filters | P1 | A |

*Source: `agent-01-admin-lifecycle.md`.*

---

### C — Governed correction / override

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Correct commercial owner / opp owner | Wrong responsible | `LIVE` | `ReassignCommercialAccountOwner` / `AssignOpportunityOwner` | Account/opp row + event/audit | Cliente / commercial forms | Commercial reassign scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Current pointer overwritten; prior in event | — | No | Keep | — | A |
| Correct work ownership | Wrong work owner | `LIVE` (code) | `ReassignWork` + ownership history | `OsWorkItem` + history | Admin member **Trabajo activo** | `people.admin` | UNPROVEN | PARTIAL | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Hosted BV pending | Terminate path | No | BROWSER-VERIFIED | P0 | A |
| Correct contact / phone | Wrong contact facts | `LIVE BUT PARTIAL` | `UpdateContact` | Contact row | Cliente edit | Master-data scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Weak beforeJson; no version history | Audit | Yes — correction pattern | Stronger provenance | P1 | A |
| Correct location | Wrong location | `LIVE` | `UpdateLocation` + before/after | Location row + audit | Cliente / map honesty | Location scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Row overwrite (not append history table) | Map boundary | No | Keep | — | A |
| Correct role / manager / relationship | Wrong org facts | `LIVE` | ChangeRole/Manager/Dept; party roles | Temporal assignment rows | Admin / party | people / master_data | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No separate “override with reason” | — | Yes — reason required? | Optional reason | P1 | A |
| Correct manual operational fact | Wrong reported fact | `LIVE BUT PARTIAL` | Reverse / `correctsFactId` | `OsReportedOperationalFact` | Ops desks | Ops scopes | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Confirmation stays pending by design | — | No | Keep | — | C |
| Production / warehouse correction | Wrong ops quantities | `LIVE BUT PARTIAL` | Append correction rows | Desk tables | Producción / Almacén | Desk scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Hosted proof separate | — | No | Hosted BV | P2 | — |

*Source: `agent-04-decision-audit.md`, `agent-01-admin-lifecycle.md`.*

---

### D — Employee continuity / transfer / reassignment / unassigned

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Termination continuity (work) | Leaving employee’s open work | `LIVE` (code) | Terminate blocked until no open work + ReassignWork UI | `OsWorkItem` | Admin member detail | `people.admin` | UNPROVEN | PARTIAL | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Hosted BV; commercial quote/order gaps remain | Impact preflight | No | Hosted BV | **P0** | A |
| Termination continuity (customers / opp / quote / order / approvals) | Assets not stranded | `MISSING` | Commercial reassign exists separately; terminate does not check | Commercial + approvals | None on terminate | — | UNPROVEN | UNPROVEN | NO | NO | NO | NO | NO | NO | Orphan ownership risk | Continuity policy | **Yes** | Policy + gates/transfer | **P0** | A |
| Bulk transfer on leave | One continuity ceremony | `MISSING` | No `TransferMember` | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Fragmented reassign only | Work + commercial | Yes | Orchestrated transfer | P1 | A |
| Unassigned / continuity queues | See stranded ownership | `LIVE BUT PARTIAL` (customers) / `MISSING` (term queues) | Data health unassigned; no term queue | Party / commercial | Mapa Salud; no admin term queue | Read scopes | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | No terminated-owner scan | Data Health | Yes | Continuity queue | P1 | A |
| Suspend holds work | Pause without reassign | `LIVE` | Suspend leaves ownership | Work + member | Suspend UI | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Documented hold | — | No | Keep | — | A |

*Source: `agent-01-admin-lifecycle.md`, `agent-05-data-health.md`.*

---

### E — Temporary delegation

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Grant / revoke delegation | Cover absences without reassignment | `LIVE BUT PARTIAL` | `GrantDelegation` / `RevokeDelegation` | `OsDelegation` | Member detail (revoke-by-pasted-id) | Actor grants; scopes UI-limited (`approval.act`) | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Fragile revoke UX; no list; delegator=actor | Authz | Yes — product model | LIVE list + model | P1 | A |
| Delegation expiry enforcement | Expired must not authorize | `LIVE` | Time check in `computeEffectiveScopes` | Delegation timestamps | Implicit | Runtime authz | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | `delegation.expired` event never emitted | Jobs | No | Optional expiry job | P2 | A |

*Source: `agent-01-admin-lifecycle.md`.*

---

### F — Issues / problems / resolution memory

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Business Issue aggregate | Company problem with learning loop | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | `@isalwa/os-issue` + `OsIssue` (+ journal/refs/work links/relations/resolution cycles) | `os_issues` + related tables (`20260919120000_os_issue_memory`) | `/incidencias`, detail, Cliente 360 issues | `member_active` report; `issue.manage` govern — see `issue-authority-matrix.ts` | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted BV not run; severity optional (deferred BD) | Work links only (no parallel tasks) | Yes — severity thresholds later | DEPLOY + hosted BV | P1 | B |
| Universal Reportar problema | Report without knowing module | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | `ReportIssue` command | `OsIssue` | `/incidencias/reportar`, `ReportIssueDrawer` / trigger | `member_active` | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted BV pending | Issue aggregate | No | BROWSER-VERIFIED | P1 | B |
| Palette “Reportar problema” | Fast report from context | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | Palette action → report route | Session + Issue | Command palette label **Reportar problema** → `/incidencias/reportar` | Existing scopes; report = member_active | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Prefill via query/context; hosted BV pending | Palette + Issue | No | BROWSER-VERIFIED | P1 | B |
| Issue learning loop + Resolution Memory | Precedent / confirmed cause | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | Journal `possible_cause` ≠ `ConfirmIssueCause`; resolution cycles; `GET …/precedents` | Issue + `OsIssueResolutionCycle` + relations | Issue detail (Antecedentes / journal / resolution) | `issue.manage` for confirm/close/relate | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Never invent root cause (honored); hosted BV pending | Issue | No | Hosted BV | P1 | B |
| Work / follow-up (action loop — not Issue) | Do the next action | `LIVE` | `OsWorkItem` | Work tables + events | `/trabajo`, palette, Cliente | Work scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Must not become Issue store; Issue links Work | — | No | Keep | — | — |
| Coordination problem→resolve | Cross-area operating decision | `LIVE BUT PARTIAL` | `OsCoordinationDecision` | Coord ledger (write UNPROVEN hosted) | `/coordinacion` | Coord scopes (non-authorizing) | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Ledger not loaded from DB; write UNPROVEN | Migration flag | No | Hosted write proof | P1 | C |

*Source: `agent-02-issues-memory.md` + Wave B code @ `b28e9fc`. Proof: IMPLEMENTED/TESTED; HOSTED/BV pending — see `WAVE_B_ISSUE_MEMORY_ACCEPTANCE.md`.*

---

### G — Organizational memory types

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Relationship memory | Customer history | `LIVE BUT PARTIAL` | Party timeline + commercial + Cliente 360 issues | `OsPartyTimelineEntry` / commercial / Issue refs | Cliente 360 Historial + Incidencias | Party read + Issue read policy | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Not generic notes; Issue slice hosted pending | — | No | Keep typed; hosted BV | — | B |
| Decision memory (unified) | One place for decisions | `MISSING` | Split: Approval + Coord + Release + events | Multiple | Split surfaces | Per primitive | N/A | N/A | NO | NO | NO | NO | NO | NO | Do not collapse | Agent 4 | Yes | Unified read model later | P2 | C |
| Issue / Resolution memory | Reuse solutions | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | `OsIssue` + resolution cycles + precedents + memory evidence | Issue tables + `GET /v1/memory/evidence` | `/incidencias` + evidence API | Issue read policy / `issue.manage` | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted BV pending; AI OFF | Issue | No | Hosted BV | P1 | B |
| Commitment memory | Promises ≠ tasks | `LIVE` (IMPLEMENTED/TESTED; API wired; hosted pending) | `OsCommitment` + `@isalwa/os-commitment` + Commitments API | Commitment table | Commitment UI + API (no longer persistence stub) | Commitment scopes / member paths | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted BV pending; Attention promotion still Wave C | Do not merge into Work | Yes — vs follow-up language | Hosted BV | P1 | B |
| Operational memory (unified) | Cross-desk memory | `MISSING` as memory; desks `LIVE BUT PARTIAL` | Desk tables | Domain tables | Ops routes | Desk scopes | UNPROVEN | UNPROVEN | PARTIAL | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Do not merge to notes | Desks | Yes | Typed links only | P3 | B |
| Knowledge / SOP memory (OS runtime) | Governed procedures in OS | `MISSING` (OS); Architect SOP `LIVE` | Guidance catalog ≠ SOP vault | Architect deliverables vs OS guidance | `/ayuda` | Guidance | N/A | N/A | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No OS↔Architect link | Architect | Yes — link model | Link refs | P2 | B |

*Source: `agent-02-issues-memory.md`, `agent-03-attention-commitments.md` + Wave B @ `b28e9fc`.*

---

### H — Future AI over organizational memory

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI provider execution | Summarize / suggest only | `LIVE BUT PARTIAL` (adapter + governance DEPLOYED; provider OFF) | `POST /v1/ai/assist` + `createAiProviderFromEnv` + rate/budget seams | Authorized MemoryEvidence packet only | Issue / Cliente assist panel | Authz before provider; mutation features denied | N/A | YES (hosted 503 `AI_UNAVAILABLE`) | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | `AI_ENABLED` not true; no OS key; HARD COST CAP NOT GUARANTEED | `OPENAI_ISALWA_API_KEY` | Yes — enable only after company project | Credential + alerts then BV | P2 | F |
| AI-ready evidence packets | Cite real antecedents | `LIVE` (IMPLEMENTED/TESTED substrate; `modelCalled: false`; hosted pending) | `buildAiReadyContext` + `MemoryEvidenceService` / `GET /v1/memory/evidence` | Evidence helpers + authorized Issue/Commitment slices | Evidence review helpers + API | Read-only packet; authz before return | N/A | N/A | YES | YES | PENDING | PENDING | UNPROVEN | NO | No AI call; hosted BV pending | Issue Memory | No | Hosted BV then grow retrieval | P3 | F |

*Source: `agent-02-issues-memory.md`, `agent-11-infra-owner-cost.md`, Wave B. **AI OFF**.*

---

### I — Attention Engine

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Four governed attention types + clock | What needs me now | `LIVE BUT PARTIAL` | `deriveAttentionReadModels` + AttentionClock | `OsAttentionReadModel` | Inicio attention | Owner/approver memberId | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Only 4 types; no invented SLA | Work/approvals | No | Keep freeze for pilot | — | C |
| Overdue follow-up (as overdue work) | Late follow-ups | `LIVE` (governed as overdue work) | `overdue_work` + followUp filters | Work dueAt | Inicio / `/trabajo?view=overdue` | Work owner | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No follow-up-only saved view | Saved views | Yes — dedicated view? | Optional view | P1 | D |
| Stale customer / opportunity stale | Idle relationships | `MISSING` (+ BD required) | No attention type | — | 360 “sin actividad” composition only | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Do not invent thresholds | Policy | **Yes** | After thresholds | P3 | C |
| Quote waiting / approval aging (facts) | See elapsed age | `LIVE BUT PARTIAL` | Aging facts client-side | Quote/approval timestamps | Aging labels; not Attention types | Read | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Promotion to Attention needs BD | Attention freeze | Yes | Facts OK; Attention later | P2 | C |
| Commitment overdue → Attention | Promise overdue | `MISSING` (Attention) / Commitment API `LIVE` | Commitment derive state | `OsCommitment` | Commitment surfaces wired; Attention type not added | — | N/A | N/A | PARTIAL | PARTIAL | PENDING | PENDING | NO | NO | Do not invent Attention type without freeze | Commitments API (done) | Yes | After Attention policy (Wave C) | P2 | C |
| Unassigned work / issue aging / delivery exception | Gaps | `MISSING` | — | — | Data health for unassigned customers only | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Work always has owner | Issue/ops | Yes | Policy-driven | P3 | C |

*Source: `agent-03-attention-commitments.md`.*

---

### J — Commitments

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Commitment create/fulfill/cancel | “Te llamo el viernes” as promise memory | `LIVE` (IMPLEMENTED/TESTED; API wired; hosted pending) | `@isalwa/os-commitment` + `os_commitments` + CommitmentsController | `OsCommitment` | Existing commitment components + API persistence | Member/commitment paths | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted BV pending; Attention overdue still separate | Do not merge into Work | **Yes** — vs follow-up language | Hosted BV | P1 | B |

*Source: `agent-03-attention-commitments.md` + Wave B @ `b28e9fc`. Do not claim USER-ACCEPTED or hosted PASS until verifier runs.*

---

### K — Escalation (owner → manager)

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Auto escalation / transfer | Manager sees overdue | `MISSING` | Manager graph exists for visibility only | `OsManagerAssignment` | Team lens visibility (not escalate) | — | N/A | N/A | NO | NO | NO | NO | NO | NO | No timing/severity/auto-transfer | Policy | **Yes** | After policy | P3 | E |
| Escalation guidance panel | Impact / who to talk | `LIVE BUT PARTIAL` | `lib/escalation/*` | Derived guidance (not stored stage) | Panel **unmounted** on app pages | Inform-only | N/A | UNPROVEN | YES | NO | UNPROVEN | UNPROVEN | NO | NO | Not on Inicio attention | Mount decision | No | Mount on attention | P1 | E |

*Source: `agent-03-attention-commitments.md`, `agent-06-search-productivity.md`.*

---

### L — What Changed

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Party “Qué cambió” | What changed on my customer | `LIVE` | Timeline → `whatChangedFromTimeline` | BusinessEvent → PartyTimeline | Command Palette mode | Party read | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Fixed CHANGE_EVENTS set | Timeline | No | Keep | — | C |
| Org-wide What Changed / since last login | Company rollup | `LIVE BUT PARTIAL` | `GET /v1/memory/changes` over `os_business_events` | BusinessEvent | Inicio (admin-gated) | `people.admin` or `system.admin` | UNPROVEN | YES (hosted 403 for asesor/gerente) | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | No last-login cursor; operator lens omitted (fail-closed) | Events | Yes — last-login? | Browser BV for admin | P2 | C |

*Source: `agent-03-attention-commitments.md`, `agent-06-search-productivity.md`.*

---

### M — Decision Memory (vs Approval / Coord / Audit)

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Approval memory | Who approved / why | `LIVE` | `OsApprovalRequest` + events | Approval row + audit | `/aprobaciones` | Approver scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Row mutated; before in audit | — | No | Keep | — | — |
| Coordination decision memory | Operating decisions ledger | `LIVE BUT PARTIAL` | Append-only coord contract | Coord rows | `/coordinacion` | Non-mutating authority | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Hosted write UNPROVEN | Migration | No | Prove write | P1 | C |
| Unified Decision Memory product | One decision spine | `LIVE BUT PARTIAL` | Read compose of approvals + coordination (no new SoT) | Approval + Coord + events | `/memoria-decisiones` | Existing approval/coord read | UNPROVEN | UNPROVEN | PARTIAL | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | Not a new decision table; BV pending | Approvals/Coord | No | Browser BV | P2 | C |

*Source: `agent-04-decision-audit.md`.*

---

### N — Impact / dependency awareness

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Impact / mayAffect guidance | If this slips, what is affected? | `LIVE BUT PARTIAL` | Escalation derive + commercial approval impact | Explicit known links only | Approval panel LIVE; full panel unmounted | Inform-only | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | No fake graphs; panel not on attention | Escalation mount | No | Mount + reuse | P1 | E |

*Source: `agent-06-search-productivity.md`.*

---

### O — Who should I talk to?

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Current authority ladder | Who acts now vs previously involved | `LIVE BUT PARTIAL` | Escalation rungs + commercial approver | Owner/approver/manager facts | Approval “A quién acudir”; full ladder unmounted | Does not reassign | UNPROVEN | UNPROVEN | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Prior resolver ≠ new authority (honored) | Escalation | Yes — manager inform policy | Mount ladder | P1 | E |

*Source: `agent-06-search-productivity.md`.*

---

### P — Data Health

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Salud de datos findings | What’s wrong / who can fix | `LIVE BUT PARTIAL` | `data-health.ts` + `/salud-datos` desk | Party summaries (session tenant) | `/salud-datos` + `/mapa` Salud | Read; no auto-fix | UNPROVEN | UNPROVEN | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | Capped population; BV pending | Party search | Yes — terminated owner? | Browser BV | P1 | C |
| Missing phone / location / provenance / shared phone / unassigned owner / duplicates / missing name | Integrity review | `LIVE` / `LIVE BUT PARTIAL` per finding | Same | Party read models | Mapa lists | Read | UNPROVEN (REAL 2/7 expected) | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Honest no geocode/merge | Map boundary | No | Hosted REAL coverage BV | P1 | C |

*Source: `agent-05-data-health.md`.*

---

### Q — Duplicate / Merge / Split

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Duplicate candidate (NIT) | Catch identity collisions | `LIVE BUT PARTIAL` | Duplicate suggest + `duplicateStatus` | Party duplicate models | Salud flag; timeline | Events | UNPROVEN | YES (integration) | YES | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | No admin resolve queue | — | No | Admin queue on SYNTH | P1 | C |
| Request / approve / reject merge | Governed merge | `BACKEND ONLY` | Merge commands + lineage | Merge request + party status | UI MISSING | `master_data.admin` / `org.admin` | N/A | UNPROVEN | YES | NO | UNPROVEN | UNPROVEN | NO | NO | No silent merge (refused) | — | Yes — REAL merge policy | SYNTH UI first | P2 | C |
| Split / unmerge | Undo bad merge | `MISSING` | No SplitParty | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Merge one-way | Merge | Yes | Later | P3 | C |

*Source: `agent-05-data-health.md`.*

---

### R — Conflicting Truth

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Detect evidence conflict without mutating | Sources disagree | `BACKEND ONLY` | `detectEvidenceConflict` / revisions | Evidence contracts | No Conflict desk | Does not mutate canonical | N/A | UNPROVEN | YES | NO | UNPROVEN | UNPROVEN | NO | NO | No operator desk | Guidance | Yes — desk needed? | Optional desk | P2 | C |
| Manual report ≠ confirmed payment | Do not treat message as pay | `LIVE BUT PARTIAL` | Reported fact pending + guidance | Reported facts | Finance/ops honesty | Separate confirm scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No unconfirmed-payments list | Productivity gaps | No | Keep boundary | — | — |

*Source: `agent-04-decision-audit.md`, `agent-05-data-health.md`.*

---

### S — Audit Viewer

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Audit Viewer (who/what/when/before/why) | Answer without SQL | `LIVE BUT PARTIAL` | `GET /v1/audit` over `OsAuditLog` | Audit + BusinessEvent | `/auditoria` | `people.admin` or `system.admin` | UNPROVEN | YES (hosted 403 for asesor) | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | No export; reason only when supplied; BV pending | Query service | No | Browser BV for admin | P1 | C |
| Party Historial substitute | Customer activity spine | `LIVE` | Party timeline projection | Timeline entries | Cliente Historial | Party read | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not full before/why audit | — | No | Keep | — | — |

*Source: `agent-04-decision-audit.md`.*

---

### T — Global Command Palette / smart search

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ⌘K / Ctrl+K palette | Find + act without inventing authority | `LIVE BUT PARTIAL` | Palette search + gated actions | Session + API probes | Shell CommandPalette | Existing scopes only | UNPROVEN | UNPROVEN | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | Products not live (no listProducts API); WhatsApp deferred | API lenses | No | Product search when catalog list exists | — | D |
| Global contact / location / WhatsApp / product search | Find those entities | `MISSING` | Ops-search helper unwired for some | — | Gaps in not-implemented | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Explicit absences | — | Yes | Selective add | P2 | D |

*Source: `agent-06-search-productivity.md`.*

---

### U — Saved / quick views

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Built-in saved views | Jump to common queues | `LIVE BUT PARTIAL` | `BUILT_IN_SAVED_VIEWS` | URL filters | Palette Vistas | Read scopes | UNPROVEN | UNPROVEN | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | Added aprobaciones + salud-datos; no generic BI | — | No | Browser BV | — | D |
| Mis clientes / Mis pendientes / Sin responsable / Compromisos / Problemas | Named employee views | `MISSING` (as named views) | Closest: Inicio + Trabajo tabs + data health | — | Gaps listed | — | N/A | N/A | NO | NO | NO | NO | NO | NO | No report builder (intentional) | Commitments/Issue | Yes | Add carefully | P1 | D |

*Source: `agent-06-search-productivity.md`, `agent-03-attention-commitments.md`.*

---

### V — Notifications

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| In-app notifications inbox | Quiet useful avisos | `BACKEND ONLY` (contract+schema) / UI `MISSING` (unmounted) | `OsInternalNotification` + kinds | Internal channel only | Components exist; no nav/API | — | N/A | UNPROVEN | YES | NO | UNPROVEN | UNPROVEN | NO | NO | No emitters; stub persistence | Attention/Work | Yes — quiet policy | Wire internal only | P1 | D |
| Email / WhatsApp notification delivery | Push outside app | `INTENTIONALLY DEFERRED` | `notificationDeliversExternally(): false` | — | Honesty copy | — | N/A | N/A | YES | N/A | N/A | N/A | N/A | N/A | Not in channel enum | Providers | Yes | Stay deferred | P3 | F |
| Triggers (assign/approval/commitment/issue/correction/delegation) | Notice when relevant | Kinds `BACKEND ONLY` · emit `MISSING` | Kind catalog | — | — | — | N/A | N/A | PARTIAL | NO | NO | NO | NO | NO | No emit paths | Domain commands | Yes | After inbox wire | P2 | D |

*Source: `agent-08-notifications-health.md`. **Not P0**.*

---

### W — Cross-record timeline

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Party-scoped cross-record timeline | One customer activity spine | `LIVE` | Timeline projection allowlist | BusinessEvent → timeline | Cliente Historial | Tenant-isolated | UNPROVEN | YES (API tests) | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No location/coord/production/audit entries | Events | No | Keep | — | — |
| Universal cross-entity timeline | Order↔warehouse↔coord↔audit | `MISSING` | — | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Avoid duplicate stores | Party timeline | Yes | Later compose | P3 | C |

*Source: `agent-04-decision-audit.md`.*

---

### X — Import Center

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin Import Center UI | Self-serve bulk import | `MISSING` | — | — | No admin route | — | N/A | N/A | NO | NO | NO | NO | NO | NO | Prefer engineering-governed | PII/audit | Yes | Do not ship casually | P3 | — |
| Engineering-governed client import | Controlled intake | `BACKEND ONLY` / gated execute | `packages/os-import` commands | Import batches | API/commands | Fail-closed `OS_REAL_CLIENT_IMPORT_ENABLED` | UNPROVEN | YES (tests) | YES | YES (API) | UNPROVEN | UNPROVEN | NO | NO | Docs drift vs package | REAL gate | Yes — REAL enable | Keep gated | — | — |

*Source: `agent-05-data-health.md`.*

---

### Y — Exports

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bulk CSV / audit export | Download lists | `MISSING` | — | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | PII + audit required | Policy | Yes | Capability-scoped later | P3 | — |
| Quote PDF | Commercial document | `LIVE` | Quote PDF route | Quote document | Quote download | Quote access | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not data dump | — | No | Keep | — | — |

*Source: `agent-05-data-health.md`.*

---

### Z — Provider / System Health

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Owner System Health matrix | App/API/DB/Auth/Map/Email/WA/AI/Backup/Monitor | `LIVE BUT PARTIAL` | `/v1/health` + `/v1/health/ready` + provider-status | Ops endpoints + env presence (no secrets) | `/sistema` human rows | `system.admin` | N/A | YES (ready profile=staging, db ok; SSR `/sistema` 200) | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN (layout) | NO | Map/AI/email/WA honesty = No configurado / No conectado until credentials | Infra | No | Interactive 1440/390 BV | P2 | F |
| Map / Auth / App honesty fragments | Don’t claim broken providers | `LIVE BUT PARTIAL` | provider-status + session states | Desk copy | Mapa / session | — | YES (`2 de 7 tienen coordenadas`; 5 provenance-only; preparation copy) | YES (`0 de 1 tienen coordenadas`; preparation copy) | YES | YES | YES (`37a1ed7`) | YES | PARTIAL (SSR HTML; layout UNPROVEN) | NO | Not a full health console; no live tiles | — | No | Keep honesty | — | F |
| Live Mapbox canvas | Confirmed coordinates only | `LIVE BUT PARTIAL` (adapter DEPLOYED; credential missing) | OS Location → MapsProvider → Mapbox adapter | Location rows with confirmed coords | `/mapa` | Existing location/party read | NO tiles (counts only: 2/7 confirmed) | NO tiles (0/1 confirmed) | YES | YES | YES (`37a1ed7`) | YES | UNPROVEN | NO | `MAP_PROVIDER_CREDENTIAL_REQUIRED`; no invented pins/heatmaps | `NEXT_PUBLIC_MAPBOX_TOKEN` | No | Credential then BV | P2 | F |

*Source: `agent-08-notifications-health.md`, `agent-11-infra-owner-cost.md`.*

---

### AA — Business Settings

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Org capability flags (read) | See org feature state | `LIVE BUT PARTIAL` | Capability state | Capability catalog | `/administracion/capacidades` | Org admin read | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not infra settings | — | Yes — what is configurable | Keep security governed | P2 | A |
| Infra / security / provider knobs | Tune host/auth/DB | `INTENTIONALLY DEFERRED` (in product) | Host env + fail-closed startup | Env secrets (names only) | None in OS | Engineering | N/A | N/A | YES | N/A | N/A | N/A | N/A | N/A | Must stay governed code | — | No | Stay host-governed | — | — |

*Source: `agent-11-infra-owner-cost.md`, `agent-01-admin-lifecycle.md`.*

---

### AB — Approval governance

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Approve / reject with reason | Governed yes/no | `LIVE` | Approve/Reject commands | `OsApprovalRequest` | `/aprobaciones` + panels | Approver | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Expiry/revoke policy not productized | — | Yes — expiry? | Keep | — | — |
| APPROVE ≠ CONVERT / PAY / SHIP | Authority separation | `LIVE` | Separate commands/scopes + guidance | Commercial + ops scopes | Guidance notes | Distinct scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | AI deny list includes approve/convert | — | No | Keep | — | — |

*Source: `agent-04-decision-audit.md`.*

---

### AC — Executive / Manager / Operator lenses

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Operator / team / org lenses on Inicio | Same truth, relevant lens | `LIVE` | Attention + leadership probes + homes | Work/attention/commercial reads | `/inicio` | Scope probes; read-only team/org | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Unused `ExecutiveLens` money strip leftover | — | No | Remove dead parallel later | P2 | E |
| Exception-first command centers | Exceptions not vanity KPIs | `LIVE` | Management/executive composers | Loaded exceptions | Inicio lenses | Org read gated | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Tests forbid revenue MetricCards | — | No | Keep | — | E |

*Source: `agent-06-search-productivity.md`, `agent-05-data-health.md`.*

---

### AD — Mobile field workflow

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Online find / next action / update | Field work on phone | `LIVE BUT PARTIAL` | Cliente 360 + search | Party/work | Mobile chrome / sticky | Existing | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No `tel:` click-to-call found | — | No | Add tel: links | P1 | D |
| Offline field stack | Work without network | `MISSING` / deferred | None | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | No SW/cache | — | Yes | Stay MISSING for pilot | P3 | F |
| Report issue from field | Capture incident | `LIVE` (IMPLEMENTED/TESTED; hosted pending) | `ReportIssue` + mobile chrome | `OsIssue` | Reportar drawer/page (responsive) | `member_active` | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Hosted mobile BV pending | Issue | No | Hosted BV | P1 | B |

*Source: `agent-06-search-productivity.md`. No agent-09 receipt.*

---

### AE — Product Feedback loop

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Product Feedback (software) | Tell builders about ISALWA UX | `LIVE` (IMPLEMENTED/TESTED; separate from Issue; hosted pending) | `OsProductFeedback` + `SubmitProductFeedback` | Product feedback table (same migration) | `ProductFeedbackMenu` (≠ Reportar problema) | Submit: member_active; review: `product.feedback.review` | UNPROVEN | UNPROVEN | YES | YES | PENDING | PENDING | UNPROVEN | NO | Never auto-creates Business Issue; hosted BV pending | — | No — separate forever (Wave B) | Hosted BV | P1 | B |

*Source: Wave B + `ISALWA_ORGANIZATIONAL_MEMORY_MODEL.md`. Distinct from Business Issue.*

---

### AF — Change Log / Qué hay de nuevo

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Product “Qué hay de nuevo” | What changed in the product | `MISSING` | Eng `CHANGELOG.md` only | — | None in OS | — | N/A | N/A | NO | NO | NO | NO | NO | NO | ≠ party Qué cambió | — | Yes | Lightweight feed | P2 | D |

*Source: `agent-08-notifications-health.md`, `agent-06-search-productivity.md`.*

---

### AG — Knowledge / SOP coach

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Governed GuidanceNote coach | Show Consejo/Regla in context | `LIVE BUT PARTIAL` | Guidance catalog | Catalog files | `/ayuda` + inline notes | Display only | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not Issue-linked SOP memory | — | Yes — SOP link model | Link later | P2 | B |
| Distinguish SOP vs precedent vs AI | Never invent policy | `LIVE` (boundary) / AI deferred | Guidance + AI deny | Guidance catalog | Copy / gates | — | N/A | N/A | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | AI suggestion channel off | AI boundary | No | Keep | — | F |

*Source: `agent-02-issues-memory.md`.*

---

### AH — Security / access review

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lightweight access review | Review members/roles/delegations | `LIVE BUT PARTIAL` | Equipo filters | Member directory | Equipo | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No stale-access campaign; Accesos explainer | History/delegation list | Yes | Formal review | P1 | A |
| QA Control / Ver Como | Carmen sees SYNTH personas without REAL impersonation | `LIVE BUT PARTIAL` (code; hosted gate off) | `qa.access` + signed cookie/`x-os-qa-view` + `OS_QA_CONTROL_ENABLED` AND staging | SYNTH org only | `/sistema/pruebas-acceso` | `qa.access` (not implied by `system.admin`) | N/A | YES (hosted 404 — flag not true) | YES | YES | YES (`37a1ed7`) | YES | NO (route 404; PROVIDER_BLOCKED) | NO | Hosted `OS_QA_CONTROL_ENABLED` not true; Ver Como not offered | Staging env | No | Enable staging flag then BV | P1 | A |

*Source: `agent-01-admin-lifecycle.md`.*

---

### AI — Session / device control

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Logout | End session | `LIVE` | Sign-out action | Provider session | Shell | Self | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | — | Supabase Auth | No | Keep | — | — |
| Admin session revoke / terminate credentials | Kill access | `LIVE BUT PARTIAL` | Suspend revokeSessions; terminate revokeCredentials | Auth provider | Lifecycle actions | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | No device inventory; RetryAuthProviderSync UI-blocked | Provider | No | Optional recovery UI | P2 | A |
| In-app password reset | Reset password in OS | `INTENTIONALLY DEFERRED` | Provider-owned | Supabase dashboard | None | Provider | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | By design for pilot | Auth | No | Stay provider | — | F |

*Source: `agent-01-admin-lifecycle.md`.*

---

### AJ — Archive vs delete

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Soft-terminate employee (archive) | End access; keep history | `LIVE` | Terminate/revoke | Membership retained | Admin terminate | `people.admin` | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | — | — | No | Keep | — | A |
| Hard delete employee | Erase person | `NO LONGER NEEDED` | No DeleteMember product command | — | — | — | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Unless compliance purge later | — | Yes — GDPR stance | Confirm soft-only | — | — |
| Party deactivate / merge lineage | Preserve history | `LIVE` | Deactivate/merge | Party status + lineage | Cliente | Master-data / org.admin | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Split missing | — | No | Keep | — | — |

*Source: `agent-01-admin-lifecycle.md`, `agent-04-decision-audit.md`.*

---

### AK — KPI / metric truth

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Exception lists (not company KPI cards) | Truthful operating queues | `LIVE` | Attention / command centers | Loaded tenant-filtered rows | Inicio | Scopes | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Vanity MetricCards absent by design | — | No | Keep | — | — |
| Map coverage counts | Location facts only | `LIVE BUT PARTIAL` | Party search ≤100 | Coordinates/provenance | Mapa StatGroup | Read | UNPROVEN (expect 2/7 REAL) | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Not sales KPI; partial note | Map boundary | No | Hosted REAL BV | P1 | C |

*Source: `agent-05-data-health.md`.*

---

### AL — Production / company ownership (infra)

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Staging OS host (web/api/Postgres/Auth) | Run pilot | `LIVE BUT PARTIAL` (ops) | Render + Supabase Auth staging | Hosted services | https://os-web-staging.onrender.com @ `e5e9cac…` | Carmen personal evidenced | N/A | N/A | N/A | N/A | YES | YES | PARTIAL | NO | Personal ownership/billing | Secrets vault | Yes — company transfer | Transfer soon | **P0** (ops) | — |
| Production OS environment | Company production | `MISSING` / NOT EVIDENCED | Planned names only | — | — | — | N/A | N/A | NO | NO | NO | NO | NO | NO | No prod services evidenced | Ownership | Yes | Do not claim prod | — | — |
| Verified monthly invoice costs | Know what we pay | `MISSING` (in repo) | — | Provider dashboards | — | Billing owners | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | **VERIFY EXTERNALLY** — no invoice $ in receipts | — | No | External verify | P1 (ops) | — |
| Planning cost bands (not invoices) | Rough pilot budget | `PLANNED` (bands only) | Ownership doc bands ~USD 80–200/mo staging+prod excl. WA/AI/maps | Docs — **not invoices** | — | — | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Bands ≠ billed truth | — | No | Label BAND ONLY | — | — |

*Source: `agent-11-infra-owner-cost.md`. Do not invent invoice costs.*

---

### AM — Owner continuity (Carmen dependencies)

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dual-admin / company billing / shared vault | Survive without Carmen sole ops | `MISSING` / CRITICAL risk | Informal `~/.isalwa-secrets` + personal accounts | Ops docs | None (ops) | Carmen-only evidenced | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Single laptop / payer / recovery email | Accounts | Yes — legal entity | Dual admin before expansion | **P0** (ops) | — |
| GitHub / DNS continuity | Source + brand | `LIVE BUT PARTIAL` | GitHub personal; staging on onrender.com | Remotes / DNS | — | Carmen | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Company DNS unset | Transfer | Yes | Transfer soon / DNS can wait for pilot | P1 (ops) | — |

*Source: `agent-11-infra-owner-cost.md`. Ops awareness — not a product feature.*

---

### AN — Future developer takeover

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Developer takeover readiness | Engineer operates without Cursor history | `LIVE BUT PARTIAL` → verdict **NOT takeover-ready** | Scattered ops docs; many runbooks missing in this worktree | Ops docs / code | N/A | Access undocumented | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | Access path + consolidated manual + root legacy orientation | Carmen access | Yes | Write handoff maps/manuals | P1 (ops) | — |
| Monitoring / incident / deploy runbooks (this worktree) | Diagnose & deploy safely | `MISSING` / `LIVE BUT PARTIAL` | Health endpoints only; referenced runbooks absent here | — | — | — | N/A | N/A | N/A | N/A | N/A | N/A | N/A | N/A | No Sentry/uptime; missing DEPLOYMENT/INCIDENT/SECRET runbooks in tree | Main drift | No | Restore/port runbooks | P1 (ops) | — |

*Source: `agent-12-developer-handoff.md`.*

---

### AO — Nothing Disappears invariant

| CAPABILITY | USER PROBLEM | CURRENT STATE | BACKEND PRIMITIVE | CANONICAL SOURCE OF TRUTH | UI SURFACE | AUTHORITY | REAL | SYN | T | I | D | H | BV | UA | GAP | DEPENDENCIES | BD? | NEXT | P | W |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Global Nothing Disappears / previous state preserved | History survives corrections | `LIVE BUT PARTIAL` | Strong in append-only lanes; weak on contact overwrite | Events/audit/history tables | Mixed | Per command | UNPROVEN | UNPROVEN | PARTIAL | PARTIAL | UNPROVEN | UNPROVEN | UNPROVEN | NO | Contact/phone in-place; approval row mutate; workforce reasons ignored; terminate orphans non-work | Correction patterns | Yes | Close continuity + contact provenance | **P0** (continuity subset) / P1 (contact) | A |
| Merge / coord resolve / work ownership history / production corrections | Specific preserve paths | `LIVE` / `LIVE BUT PARTIAL` | Dedicated history / append | Domain tables | Various | Scoped | UNPROVEN | UNPROVEN | YES | YES | UNPROVEN | UNPROVEN | UNPROVEN | NO | Coord write UNPROVEN hosted | — | No | Prove hosted | P1 | A |

*Source: `agent-04-decision-audit.md`, `agent-01-admin-lifecycle.md`.*

---

## 5. Proposed build waves (one-liners)

| Wave | One-liner |
|---|---|
| **A** | Admin continuity: member-scoped onboarding proof, ReassignWork UI, terminate continuity gates, governed roles, delegation list, access history/review. |
| **B** | Issues/Resolution Memory LIVE in code + Commitment API wire + Reportar problema + Product Feedback separate + memory evidence (AI OFF); hosted BV pending. |
| **C** | Attention freeze + Data Health/Audit Viewer/What Changed (org)/Decision read-model honesty — no invented thresholds. |
| **D** | Palette/views/notifications (internal only) + mobile tel: friction — no WhatsApp/email channels yet. |
| **E** | Manager intelligence: mount impact / who-to-talk ladder; escalation only after policy. |
| **F** | Providers: AI/WhatsApp/maps/email/monitoring/System Health — intentionally deferred until authorized. |

---

## 6. Priority lists

### P0 — concrete pilot safety / usability (before first real pilot use)

1. ~~**Onboarding member isolation**~~ — **CLOSED** hosted BV PASS (`1fd0167` / `dep-dakuhuad0e5s73ftrvng`; MEMBER-SCOPED).  
2. **Terminate continuity hazard** — commercial / approvals (and related assets) stranded while only open work is gated.  
3. **ReassignWork UI** — IMPLEMENTED on admin member detail; hosted BV pending.  
4. **Owner/`people.admin` gate clarity** — SYNTH `w2.owner` denied `/administracion` on hosted (verifier FAIL_DENY); real Owner must hold `people.admin` before relying on Admin.  
5. **Carmen infra continuity awareness (ops, not product feature)** — personal Render/Supabase/billing/vault single-owner risk; dual admin / shared recovery before pilot expansion.

### P1 — immediately after first pilot feedback

- Freeze governed primary role catalog (free-string / empty-tenant bootstrap hazard).  
- Persist suspend/terminate reasons; invited email visibility; access history UI / review depth.  
- ~~Wire Commitments API~~ — **IMPLEMENTED/TESTED** @ `b28e9fc`; hosted BV pending.  
- Wire internal notifications (no email/WA).  
- Mount escalation/impact/who-to-talk panel on attention.  
- Data Health hosted REAL coverage BV; Audit Viewer.  
- ~~Product Feedback channel~~ — **IMPLEMENTED/TESTED** (separate from Issue); hosted BV pending.  
- Mobile `tel:` links; follow-up-only overdue view if users confuse queues.  
- Developer handoff gaps (access path, runbooks in tree, consolidated manual); invoice costs **VERIFY EXTERNALLY**.  
- ~~Business Issue contract~~ — **IMPLEMENTED/TESTED** (`OsIssue`); hosted BV pending. **Not P0:** AI / WhatsApp.

### P2 — high-value V1.1

- Department CRUD; Rehire UI; Merge ops UI (SYNTH first); org What Changed; promote selected aging→Attention after thresholds; System Health UI; Qué hay de nuevo; SOP/Issue links; Commitment→Attention overdue after policy.

### P3 — later / provider-dependent

- AI wiring; WhatsApp/email notifications; maps live tiles; offline; escalation automation; Issue aging/recurrence; Split/unmerge; Import Center; bulk exports; universal timeline.

---

## 7. Business decisions needed (questions only)

1. Freeze a governed enum of invite/ChangeRole keys vs continue deriving free strings from existing members?  
2. On terminate: must customers / opportunities / quotes / orders / pending approvals be blocked, auto-reassigned, or left orphaned?  
3. Expose `ReassignWork` in os-web for people.admin, or keep API/ops-only?  
4. Persist optional suspend/terminate reasons into audit/events, or remove UI fields?  
5. Ship Rehire UI for pilot, or keep backend-only?  
6. Who creates `OsDepartment` rows (seed-only vs admin CRUD)?  
7. Delegation model: admin grants vs employee self-coverage; is list UI required?  
8. Is Equipo filtering enough for V1 access review, or is formal attestation required?  
9. Should member summary show invited auth email (not only active)?  
10. Confirm soft-terminate as permanent employee stance (no hard delete) unless compliance purge?  
11. ~~Is Business Issue a new aggregate, or typed Coordination + Work child?~~ — **Resolved Wave B:** first-class `OsIssue` that **links** Work (no parallel task system).  
12. Who may REPORTAR PROBLEMA / confirm cause / close? — **Resolved in matrix:** report/`member_active`; confirm/close/`issue.manage` (see `issue-authority-matrix.ts`). Refine if product wants narrower reporter set.  
13. Mandatory vs optional context fields on problem report? — Report requires description; context refs optional; **severity optional / deferred** (no mandatory severity).  
14. May Work subjects include order/delivery/product/issue, or only via Issue links?  
15. ~~Product Feedback vs Business Issue — separate forever?~~ — **Resolved Wave B:** separate forever (`OsProductFeedback` ≠ `OsIssue`). 
16. SOP linkage: OS stores refs, or deep-link Architect only?  
17. Stale customer: after how many days without which events?  
18. Opportunity stale: idle rule by stage and/or `lastOccurredAt`?  
19. Quote waiting: elapsed display only, or Attention after N days?  
20. Blocked work: pending approval only, or ops/delivery holds too?  
21. When must employees record a Commitment instead of Registrar seguimiento?  
22. Escalation: after what condition does manager receive overdue/blocked; notify-only or auto-reassign; one-hop only?  
23. Pending manual facts: Attention, Data Health only, or dedicated review queue?  
24. Delivery exception: which states create Attention, who receives?  
25. What Changed “desde mi última entrada”: last-login feature or calendar “desde ayer” only?  
26. Notification quiet policy / defaults by role?  
27. Terminated employee still owning active work/accounts — Attention or Data Health finding?  
28. Enable REAL client import / merge on REAL — under what approval + backup gate?  
29. What belongs in Business Settings vs governed code?  
30. Approval expiry/revoke policy needed for pilot?  
31. Company legal entity / billing emails for Render, Supabase, GitHub transfer?

---

## 8. Foundation gaps

1. ~~**Schema vs web honesty drift (commitments):**~~ **CLOSED in code Wave B** — Commitment API wired; hosted BV still pending. Notifications inbox still stubbed.  
2. **Attention type freeze:** expanding signals (incl. Commitment overdue) requires contract + derivation + clock — not UI-only.  
3. **Dual overdue semantics:** Work uses instant `< asOf`; Commitment uses calendar day `America/La_Paz` — must not conflate.  
4. **Follow-up vs Commitment confusion** until UX teaches the difference on hosted.  
5. **Coordination hosted write UNPROVEN** (`COORDINATION_DECISION_MIGRATION_APPLIED = false`).  
6. **Quote/Order owner reassignment** FOUNDATION_GAP — terminate fail-closed until cancel or new commands.  
7. **Primary roles as free strings** / empty-tenant bootstrap risk.  
8. **Audit Viewer missing**; contact corrections weak on before/why.  
9. **Personal Carmen ownership** of staging host/auth/billing/vault; production **NOT EVIDENCED**.  
10. **Developer takeover not ready** in this worktree (missing runbooks vs main; root README legacy orientation; access undocumented).  
11. **Wave B Issue/Commitment/Feedback/Memory** — IMPLEMENTED/TESTED @ `b28e9fc`; **HOSTED / BROWSER-VERIFIED = PENDING** until deploy confirmation + independent verifier.  
12. **Issue severity** — intentionally optional; thresholds = deferred business decision (do not invent).  
13. **No invoice dollars in repo** — cost truth incomplete until external verify.

---

## 9. Safe for first pilot?

**NO — CONDITIONAL blockers remain.**

**Blockers (must close or explicitly accept in writing):**

1. ~~Onboarding A→B isolation~~ — **CLOSED** hosted BV PASS on `1fd0167` / `dep-dakuhuad0e5s73ftrvng` (MEMBER-SCOPED).  
2. Terminate path **code-ready** with preflight + ReassignWork UI; **hosted BV + people.admin fixture + quote/order gaps** remain.  
3. **Ops single-owner risk** (Carmen personal Render/Supabase/billing/secrets) without dual recovery — ops P0, not a product screen.  
4. **Owner fixture `/administracion` denied** on hosted SYNTH (verifier FAIL_DENY) — confirm `people.admin` on real Owner before Isa/Álvaro rely on Admin.  
5. Wave B Issue/Commitment SYNTH API reads are HOSTED-PROVEN @ `afeb1c14` and re-checked on `37a1ed7` (verifier 17/17). Authenticated SSR desks HOSTED on that SHA. Product Feedback inbox / AI live model / WhatsApp remain not hosted-live. Interactive visual 1440/390 and QA Ver Como remain UNPROVEN / PROVIDER_BLOCKED.

**Already acceptable to keep deferred for a thin pilot:** AI, WhatsApp, maps live tiles, email notices, Import Center — if coaching copy stays honest about hosted-unproven Issue/Commitment memory.

---

## 10. Safe to create Isa / Álvaro once identity + function provided?

**YES — with constraints.**

**Reason:** Invite / activate / role assignment / tenant isolation primitives are LIVE in code and suitable to create real people **after** (a) identity + function/role keys are provided, (b) roles chosen from a **known** set (avoid inventing ghost `roleKey` strings), (c) SYNTH vs REAL tenant rules respected, (d) onboarding isolation is hosted-proven before multi-user same-browser coaching, and (e) they are coached that Notifications inbox / AI / WhatsApp remain deferred, and that Issue/Commitment/Feedback memory is **IMPLEMENTED but HOSTED-UNPROVEN** until Wave B verifier. Creating accounts does **not** require those deferred/provider capabilities.

---

## 11. Document control

| Field | Value |
|---|---|
| Map version | 2026-09-16 (Final pre-pilot runtime) |
| Hosted baseline SHA (recon start) | `e5e9cac82a0e2ba82f3633386393598220471da0` |
| Hosted SHA after member-scope fix | `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749` (deploy `dep-dakuhuad0e5s73ftrvng`, Render LIVE) |
| Wave A technical close SHA | `fc38ebe4f6a445aa1504436040aab257bbd33a4c` |
| Wave B accepted SHA | `afeb1c14c144f05a0eb99c745bbe14d8a0091f6e` |
| Final pre-pilot runtime SHA | `37a1ed7bb783b2c2ea211ce49616442884825b1c` (web `dep-dal4oqlg1s2s73e8bmpg` · api `dep-dal4oldbedkc73b8uu0g`) |
| Wave B acceptance | `docs/operations/WAVE_B_ISSUE_MEMORY_ACCEPTANCE.md` |
| Recon folder | `docs/operations/company-os-recon-2026-09-15/` |
| Next proof gate | Confirm Wave B deploy → independent hosted verifier (Issue / Commitment / Feedback / Memory); then Wave C |

*End of Company OS Capability Control Map.*
