# CR-3 / CR-4 — Ownership, coverage, approval gap analysis

**Date:** 2026-09-17  
**Worktree:** `ct3-owner-demo`  
**Scope:** Map code vs locked V1 defaults (no implementation in this pass)  
**Source docs (read):**

- `docs/operations/ct3-owner-demo-completeness-2026-09-17/OWNERSHIP_COVERAGE_HANDOFF_RULES.md`
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/APPROVAL_RESPONSIBILITY_ROUTING.md`
- `docs/operations/ct3-owner-demo-completeness-2026-09-17/REAL_STAFF_RESPONSIBILITY_RECONCILIATION.md`

**INVENTED_RULES:** **0**  
**INVENTED_STAFF_NAMES:** **0**

---

## CR3_CR4_STATUS

| Lane | Theme | Status | Summary |
|------|--------|--------|---------|
| **CR-3** | One owner · coverage · reassignment · convert | **PARTIAL** | Canonical owner + permanent reassignment command + coverage-aware `CreateOrder` are implemented and tested. No governed **grant/revoke coverage** command or product UI. Query/UI omit coverage in convert authority. `commercial.quote.convert.own` is not wired into the live convert gate (documented in code; conflicts with reconciliation wording). |
| **CR-4** | Approval routing · exceptions · escalation | **PARTIAL** | Explicit same-org approver, owner-only commercial `RequestApproval`, decide limited to assignee/`approval.act`, approval never creates Pedido — implemented and tested. No discount auto-threshold. No Cargo-based approver queue. Escalation is **view-only** (no auto manager route). REAL staff not bound to Member/login yet. |

**Overall:** Safe fail-closed behavior dominates; **product completeness** and **one canonical convert story** remain open. Two **CONTRADICTION** items need an explicit engineering/policy decision (see below).

---

## REAL staff (workbook evidence only — do not invent)

From `REAL_STAFF_RESPONSIBILITY_RECONCILIATION.md` (DATOS CLIENTES `Hoja1` rows 1–6):

| PERSON_NAME | CARGO | HAS_LOGIN | HAS_MEMBER | APPROVAL_AUTHORITY |
|---|---|---|---|---|
| YUSELKA JUSTINIANO DURAN | ASESOR DE VENTA | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN — Cargo alone grants none |
| JOSE LUIS VARGAS ALMANZA | ASESOR DE VENTA | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN — Cargo alone grants none |
| EDWIN YAMIL CALERO VALDEZ | JEFE COMERCIAL | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN until governed `commercial.price.approve` / exception assignment |
| ISABELA RODA GUTIERREZ | GERENTE GENERAL | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN — do not auto-pick between two Gerentes |
| ALVARO MARTIN SANDOVAL MONTES | GERENTE GENERAL | NOT_PROVEN | NOT_PROVEN | NOT_PROVEN — do not auto-pick between two Gerentes |

Display helpers know Cargo labels only (`apps/os-web/lib/work/staff-display.ts`); routing code contains **no** hardcoded person names (verified by repo search).

---

## Code map (ownership · coverage · reassignment · convert · approval · escalation)

### Canonical commercial owner

| Concern | Location |
|---------|----------|
| Account owner field | `CommercialAccount.ownerMemberId` via party/commercial stores; e.g. `packages/os-database/src/prisma-party-store.ts` |
| Permanent owner change command | `ReassignCommercialAccountOwner` — `packages/os-commercial/src/commercial-command-service.ts` (`reassignCommercialAccountOwner`) |
| Scope gate | `canReassignCommercialAccountOwner` — `packages/os-contracts/src/commercial-authority.ts` → `commercial.account.reassign` |
| Event + timeline | `commercial_account.owner_reassigned` — `packages/os-contracts/src/events.ts`, labels `apps/os-web/lib/commercial/timeline-labels.ts` |
| UI (capability-gated) | `apps/os-web/components/party/reassign-owner-form.tsx`, `apps/os-api/src/parties.controller.ts` (`commercialAuthority.canReassignOwner`) |

### Temporary coverage (`commercial.customer.coverage`)

| Concern | Location |
|---------|----------|
| Grant type + predicates | `packages/os-contracts/src/operations-scopes.ts` (`CustomerCoverageGrant`, `continueCoveredCustomerWorkflow`, `buildCustomerCoverageGrant`) |
| Persisted grants (read) | `packages/os-database/src/prisma-commercial-store.ts` (`listActiveCustomerCoverageGrants` → `osCustomerCoverageGrant`) |
| Convert audit | `coverageAuditForConvert` / `canConvertQuoteToOrder` — `packages/os-contracts/src/commercial-authority.ts` |
| Enforced on convert | `CreateOrder` — `packages/os-commercial/src/commercial-command-service.ts` |
| Tests | `packages/os-commercial/src/commercial-authority.test.ts` (coverage convert, expired/revoked, cross-owner deny) |
| Termination / acting vs primary labels | `apps/os-web/components/admin/commercial-continuity-panel.tsx`, `termination-impact-panel.tsx` |
| **No grant/revoke command** | `COMMERCIAL_COMMAND_NAMES` — `packages/os-contracts/src/commercial-commands.ts` (no `GrantCustomerCoverage`) |
| Staging-only writes | `packages/os-database/src/staging-wave-a-synth-continuity.ts` |

### Opportunity / quote ownership (distinct from account owner)

| Concern | Location |
|---------|----------|
| Assign opportunity owner | `AssignOpportunityOwner` — `commercial-command-service.ts` (only current owner or `people.admin` via `assertCanEditOpportunity`) |
| Admin bulk reassign UI | `apps/os-web/lib/commercial/reassign-opportunities-action.ts` (documents `people.admin`) |
| Create with optional owner | `createOpportunity` / `createQuote` default `ownerMemberId` to actor |

### Convert Quote → Pedido

| Concern | Location |
|---------|----------|
| Command | `CreateOrder` — `commercial-command-service.ts` |
| Live gate | `canConvertQuoteToOrder` (owner **or** active coverage **or** `commercial.order.convert`) |
| Separate own-quote scope | `canConvertOwnEligibleQuote` + `COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE` — `operations-scopes.ts`; **not** wired into `CreateOrder` (`QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = false`) |
| Read model authority (UI) | `subjectAuthority` — `packages/os-query/src/commercial/commercial-query-service.ts` (**no coverage** passed to `canConvertQuoteToOrder`) |
| Post-approval CTA | `apps/os-web/lib/commercial/post-approval-continue.ts` |
| Approval ≠ Pedido | `packages/os-work/src/commercial-approval.test.ts`; `apps/os-web/lib/commercial/actions.ts` (`decideCommercialApprovalAction`) |

### Approval routing

| Concern | Location |
|---------|----------|
| Request | `RequestApproval` — `packages/os-work/src/work-command-service.ts` (`getMemberInOrg`, `canRequestCommercialSubjectApproval`) |
| Decide | `Approve` / `Reject` — assignee or `approval.act` delegate only (`canDecideApproval`) |
| Commercial subject owner gate | `canRequestCommercialSubjectApproval` — `commercial-authority.ts` |
| Price/exception scopes (not from Cargo) | `scopesGrantedByCargoOrTitle` → `[]`; `canApproveCommercialPrice`, `canAuthorizePaymentException` — `operations-scopes.ts` |
| UI copy + missing config | `apps/os-web/lib/work/approval-responsibility.ts` |
| Explicit approver picker | `apps/os-web/lib/commercial/actions.ts` (`requestCommercialApprovalAction`) |
| Attention to assignee | `packages/os-query/src/work/attention-derivation.ts` |

### Who has the ball

| Concern | Location |
|---------|----------|
| Pure view | `apps/os-web/lib/work/who-has-the-ball.ts` |
| Wired (quote detail) | `apps/os-web/app/(app)/clientes/[partyId]/cotizaciones/[quoteId]/page.tsx` (`temporarySupport: null` today) |
| Name + Cargo resolution | `apps/os-web/lib/work/member-resolver.ts`, `staff-display.ts` |

### Escalation (explicit policy only)

| Concern | Location |
|---------|----------|
| View model | `apps/os-web/lib/escalation/derive.ts` (`escalationLimits`: no reassign, no approver change, no notify) |
| Tests | `apps/os-web/lib/escalation/escalation.test.ts` |

### Work creation (human action only)

| Concern | Location |
|---------|----------|
| Explicit create | `CreateWorkItem` — `work-command-service.ts` |
| Quote follow-up offer (no auto Work) | `apps/os-web/lib/commercial/quote-follow-up.ts` |
| Pedido prep review (explicit) | `apps/os-web/lib/commercial/order-prep-actions.ts` |
| Productivity gaps | `apps/os-web/lib/productivity/not-implemented.ts` (`team-coverage-picker`, `coverage-reassignment`) |

### V1 planned capabilities (receipt, not runtime grant)

| Concern | Location |
|---------|----------|
| Function → intended scopes | `packages/os-contracts/src/v1-planned-assignments.ts` |
| Unassigned: reassignment, order convert, price approve | `V1_UNASSIGNED_CAPABILITIES`, `V1_UNASSIGNED_NOTES` |

---

## Gap matrix (RULE → status → evidence)

| # | Locked V1 rule | Status | Evidence / notes |
|---|----------------|--------|------------------|
| 1 | **One commercial owner** (singular canonical) | **IMPLEMENTED** | `ownerMemberId` on commercial account; `ReassignCommercialAccountOwner` emits single owner; UI copy in `reassign-owner-form.tsx` |
| 2 | **Ownership history persist** | **PARTIAL** | Work item ownership history: `insertOwnershipHistory` in `work-command-service.ts`. Commercial owner change: event `commercial_account.owner_reassigned` + party timeline facts — not a dedicated owner-history table in commercial lane |
| 3 | **Temporary coverage DISTINCT from ownership** | **IMPLEMENTED** (domain) / **MISSING** (product) | `continueCoveredCustomerWorkflow` keeps `primaryOwnerMemberId`; convert event records `actingAdvisorMemberId` + `coverageSource`. No user-facing grant/revoke flow |
| 4 | **Grant type `commercial.customer.coverage`** | **IMPLEMENTED** (read + convert) / **MISSING** (write API) | DB model + `listActiveCustomerCoverageGrants`; no command in `commercial-commands.ts` |
| 5 | **Jefe/Gerencia may assign coverage + permanent reassignment** | **PARTIAL** | Permanent: command exists, scope `commercial.account.reassign` in `V1_UNASSIGNED_CAPABILITIES` — **no confirmed person/function**. Coverage assign: **MISSING**. Jefe `commercial.team.read` does not grant reassignment (`commercial-authority.test.ts`) |
| 6 | **Reassignment authority by Cargo alone: NO** | **IMPLEMENTED** | `canReassignCommercialAccountOwner(grantedScopes)` only |
| 7 | **Asesor cannot self-take another client** | **IMPLEMENTED** (opportunity/quote edit) | `assertCanEditOpportunity` / `assertCanEditQuote` — non-owner denied unless `people.admin`. `AssignOpportunityOwner` requires edit rights |
| 8 | **Cross-owner Quote→Pedido blocked without explicit authority** | **IMPLEMENTED** | Foreign actor denied unless active coverage or `commercial.order.convert` (`commercial-authority.test.ts`) |
| 9 | **Commercial exception → named Jefe Comercial (same company)** | **PARTIAL** | Requester must pick `approverMemberId` same org; no auto-route to Edwin or Jefe role. `commercial.price.approve` / `commercial.exception.authorize` exist but **unassigned** in `v1-planned-assignments.ts` |
| 10 | **No random Gerente; no auto threshold escalation; explicit escalate to Gerencia only** | **IMPLEMENTED** (no auto) / **MISSING** (explicit escalate product) | No `defaultApprover` / auto-threshold in commercial package. Escalation derive does not reassign (`derive.ts`). Policy input exists but no automatic ladder |
| 11 | **`commercial.quote.convert.own` — own eligible quote** | **CONTRADICTION** | Scope + `canConvertOwnEligibleQuote` exist; **`CreateOrder` does not require scope** for owner (`commercial-authority.test.ts`: owner converts with `sales_rep` only). Reconciliation doc requires owner + conversion capability |
| 12 | **Approval NEVER creates Pedido; convert explicit** | **IMPLEMENTED** | `decideApproval` emits approval events only; `post-approval-continue.ts`; tests in `commercial-approval.test.ts` |
| 13 | **Work only for genuine pending human action** | **IMPLEMENTED** (no invented SLA Work) | No auto Work on submit/approve in work service; follow-up is offered, not auto-created |
| 14 | **Who-has-the-ball: real names + Cargo** | **PARTIAL** | Implemented on quote page for owner + pending approver; **`temporarySupport` always null** — coverage helper not surfaced |
| 15 | **Query/UI convert authority matches server** | **CONTRADICTION** / **PARTIAL** | `commercial-query-service.ts` `subjectAuthority` omits `coverage` → covered advisor may see `canConvertToOrder: false` while server allows `CreateOrder` |
| 16 | **Unowned client: no random owner** | **IMPLEMENTED** (display) / **BUSINESS_DECISION** (default on create) | `WHO_HAS_THE_BALL_COPY.noOwner`; default assignment for new client without owner still **BUSINESS_DECISION_REQUIRED** in ownership doc |
| 17 | **Pedido does not auto-trigger Production/Warehouse/Purchasing** | **IMPLEMENTED** | Explicit prep review action only (`order-prep-actions.ts`); ownership doc aligned |
| 18 | **REAL staff bound to login/Member for demo** | **MISSING** | All five staff `NOT_PROVEN` for HAS_LOGIN/HAS_MEMBER; `V1_PLANNED_ASSIGNMENTS` uses `PLANNED_PERSON` |

---

## CONTRADICTIONS (require decision — do not implement silently)

1. **Convert gate vs `commercial.quote.convert.own` vs reconciliation addendum**  
   - **Code truth:** `canConvertQuoteToOrder` returns true when `actorMemberId === quoteOwnerMemberId` with **no** `commercial.quote.convert.own` check; constant `QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = false`.  
   - **V1 planned asesor intent:** `COMMERCIAL_QUOTE_CONVERT_OWN_SCOPE` on asesor function (`v1-planned-assignments.ts`).  
   - **Reconciliation addendum:** “Own-quote conversion only when actor is governed commercial owner **+ conversion capability**.”  
   - **Pick one canonical story** for V1 consolidation: wire scope into `CreateOrder`, or update docs/receipt to “quote ownerMemberId match is sufficient” and demote scope to UI/guidance-only.

2. **Read model vs server for coverage convert**  
   - **Server:** `CreateOrder` loads grants and passes `coverage` into `canConvertQuoteToOrder`.  
   - **Query:** `subjectAuthority` does not load grants → UI `authority.canConvertToOrder` can disagree with server.  
   - **Fix direction (when approved):** extend commercial query context with coverage audit for quote’s party/account owner, or document UI as intentionally conservative (would still block covered advisors from convert CTA).

---

## UNBLOCK REQUIREMENTS (no implementation in this pass)

### BUSINESS_DECISION_REQUIRED

1. Canonical **CreateOrder** predicate: quote-owner match only vs **must** hold `commercial.quote.convert.own` (and whether covered advisor convert requires a separate flag on the grant).  
2. Default **commercial owner** when a new client has no owner.  
3. Discount **% / amount auto-threshold** for commercial exception approval (currently explicit `RequestApproval` only).  
4. Which **Gerente General** receives which management approval types when both eligible.  
5. Whether **acting coverage** always includes convert or owner-only convert in some cases.  
6. Overdue **escalation ladder** (when / to whom) — escalation UI is ready for policy input but must not auto-escalate without policy.

### BUSINESS_CONFIGURATION_REQUIRED

1. Assign `commercial.account.reassign` to governed Jefe/Gerencia member(s) (not Cargo alone).  
2. Assign `commercial.price.approve` / `commercial.exception.authorize` to named same-company members (Jefe Comercial slot eligible per `V1_EXPLICIT_CAPABILITY_SLOTS` — still explicit grant).  
3. Runtime **Member + login** for the five REAL staff rows (SECURITY_GATE for SYNTH apply per reconciliation doc).  
4. Approver type matrix copy when no eligible member: `APPROVAL_RESPONSIBILITY_COPY.missingApproverConfig`.

### ENGINEERING / PRODUCT (after decisions)

1. **GrantCustomerCoverage** / **RevokeCustomerCoverage** (or equivalent) command + audit — grants today are staging/DB-only.  
2. **Team coverage picker** / reassignment UX (`PRODUCTIVITY_NOT_IMPLEMENTED`: `team-coverage-picker`, `coverage-reassignment`).  
3. Align **`commercial-query-service`** with coverage for `canConvertToOrder`.  
4. Wire **`whoHasTheBallView.temporarySupport`** from active grants on quote/party reads.  
5. Optional: commercial **owner history** read model if “ownership history persist” must be user-visible beyond timeline events.

---

## Automated test anchors (logic proof — not browser proof)

| Behavior | Test file |
|----------|-----------|
| Cross-owner convert deny; coverage convert; `convert.own` not foreign convert | `packages/os-commercial/src/commercial-authority.test.ts` |
| `canConvertQuoteToOrder` / coverage audit | `packages/os-contracts/src/commercial-authority.test.ts` |
| Approval does not CreateOrder | `packages/os-work/src/commercial-approval.test.ts` |
| Post-approval convert CTA separate | `apps/os-web/lib/commercial/post-approval-continue.test.ts` |
| Who-has-the-ball copy | `apps/os-web/lib/work/who-has-the-ball.test.ts` |
| Escalation limits | `apps/os-web/lib/escalation/escalation.test.ts` |
| Same-org RequestApproval security | `packages/os-database/src/approval-security-prisma.integration.test.ts` |

**HOSTED / BROWSER:** UNPROVEN for end-to-end Jefe assign coverage, REAL-name display with live Member cargo fields, and post-approval convert on hosted tenant.

---

## Worker handoff

- **Safe to demo today:** explicit approval with named approver; convert after approval via separate CTA; cross-owner convert blocked; permanent owner reassignment when actor holds `commercial.account.reassign`.  
- **Do not claim:** team coverage UI, auto commercial exception routing to Edwin, Gerencia auto-pick, discount threshold approvals, or full who-has-the-ball with temporary support.  
- **Next consolidation step:** resolve **CONTRADICTION #1** with Carmen/policy, then CR-3 implement grant command + query alignment; CR-4 bind scopes to configured members once Member records exist.
