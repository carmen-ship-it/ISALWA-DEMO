# G-02 — CreateOrder Authorization Decision Brief

**Date:** 2026-08-24  
**Mode:** Discovery + business control design — **NO IMPLEMENTATION**  
**Status:** superseded for the pilot by provisional defaults in `COMMERCIAL_AUTHORITY_V1_PILOT_DEFAULTS.md`. This brief is not final company policy.  
**Audience:** ISALWA leadership (Carmen) — engineering does not select policy

---

## Context

Commercial Phase 1 internal UAT is **READY** for Opportunity → Quote write flows.

The backend command path **Opportunity → Quote → Order** exists and is Postgres-verified. **CreateOrder UI is intentionally absent** until G-02 is decided.

**Question for ISALWA:** Who may convert a **submitted** quote into an Order?

---

## Current CreateOrder authority (as implemented)

| Layer | Rule |
|-------|------|
| **Contract scope** | `COMMAND_REQUIRED_SCOPES.CreateOrder` = `member_active` (`packages/os-contracts/src/scopes.ts`) |
| **Runtime check** | `authorize(ctx, 'CreateOrder', …)` — tenant match + active member only (`commercial-command-service.ts`) |
| **Owner check** | **None** — `assertCanEditQuote()` is **not** called for CreateOrder |
| **Admin override** | **None** on CreateOrder (unlike quote edit / CancelOrder) |

**Effective rule today:** any organization member with `accessStatus: active` in the same tenant may run `CreateOrder` on any submitted quote, if they know the `quoteId`.

**Read/query asymmetry:** Commercial list/detail queries filter by **quote owner** or **`people.admin`** (`packages/os-query/src/commercial/commercial-auth.ts`). A non-owner active member typically **cannot see** another member's submitted quote in UI/API lists, but **can still convert it** via direct command if they obtain the UUID.

---

## CreateOrder lifecycle — actual backend preconditions

Source: `CommercialCommandService.createOrder()` + integration tests.

| Precondition | Behavior |
|--------------|----------|
| Actor tenant | Must match quote org (`authorize` → `assertTenantMatch`) |
| Actor membership | Must exist in org and pass `assertMemberActive` |
| Quote exists | `getQuoteInOrg` — else `NOT_FOUND` |
| Quote status | Must be **`submitted`** — draft/accepted/cancelled → `VALIDATION_FAILED` |
| Quote lines | At least one line (enforced indirectly: empty quotes cannot be submitted; CreateOrder also checks `lines.length === 0` → `VALIDATION_FAILED`) |
| Duplicate order | `getOrderForQuote` — if order exists → `CONFLICT` |
| Cancelled quote | Status ≠ submitted → cannot convert |
| Accepted quote | Already converted — status `accepted` → `VALIDATION_FAILED` |
| Party active | Quote creation required active party; no re-check at CreateOrder |
| Idempotency | Supported via `idempotency-key` on `execute()` — replay returns stored result inside transaction |
| Order owner | **Copied from quote** — `ownerMemberId: quote.ownerMemberId` (converter is recorded as `actorMemberId` on event/audit only) |
| Quote after success | Status → **`accepted`** |
| Order after success | Status → **`open`** |
| Events | `order.created` + audit + outbox (transactional) |

**Not enforced:** quote-owner match, commercial role, discount approval, credit check, manager sign-off.

---

## CancelOrder comparison

| | CreateOrder (today) | CancelOrder |
|--|---------------------|-------------|
| Base scope | `member_active` | `member_active` |
| Owner gate | **No** | **Yes** — `order.ownerMemberId === snap.memberId` |
| Admin override | **No** | **Yes** — `people.admin` via `memberHasAdminScope()` |
| Object state | Quote `submitted` → Order `open` | Order must be `open` |

**Relevance for G-02:** CancelOrder establishes an **owner-or-`people.admin`** pattern for **post-quote order lifecycle**. It is **informative evidence**, not a mandate to copy:

- CancelOrder protects an **existing commitment** (open order).
- CreateOrder is the **conversion decision** (submitted quote → binding order).
- ISALWA may intentionally want **broader** conversion authority than cancellation authority (Option B), or **narrower** conversion matching quote edit (Option A).

---

## Existing ISALWA architecture support

### Already exists

| Capability | Where | Notes |
|------------|-------|-------|
| Quote ownership | `ownerMemberId` on `OsQuote` | Set at create (default actor); optional override in payload |
| Opportunity ownership | `ownerMemberId` on `OsOpportunity` | Same pattern |
| Order ownership | Inherited from quote at CreateOrder | CancelOrder uses order owner |
| Owner edit gate (quotes) | `assertCanEditQuote()` | Owner or `people.admin` |
| Owner edit gate (opportunities) | `assertCanEditOpportunity()` | Owner or `people.admin` |
| Admin scope | `people.admin` in `ADMIN_SCOPE_KEYS` | Used for commercial owner override on **edit** commands and **read** visibility |
| Role keys as scopes | `computeEffectiveScopes()` | e.g. `sales_rep` from role assignment — **not used** by CreateOrder today |
| Delegation | `GrantDelegation` with scope list | Could grant a future commercial scope to back-office |
| Active member gate | `member_active` on all commercial commands | Baseline only |
| Audit trail | `actorMemberId` on BusinessEvent + AuditLog | Records **who converted**, regardless of quote owner |
| Idempotency | Command idempotency store | Per org + key |

### Does NOT exist (would require new contract if chosen)

| Capability | Status |
|------------|--------|
| `commercial.convert_order` (or similar) scope | **Not in repo** — example only |
| Commercial-specific admin scope (e.g. `commercial.admin`) | **Not in repo** |
| Manager/team hierarchy on commercial commands | **Not implemented** — queries use owner or `people.admin`, not manager tree |
| Auto-approval on discount / order value | **Deferred** (RD-02; G-08 not approved) |
| Documented ISALWA policy for order conversion | **UNKNOWN** — G-02 |

**M-08 (Commercial owner assignment rules)** remains **UNKNOWN** in discovery matrix — separate from but related to G-02.

---

## Option analysis

### OPTION A — Quote owner only (+ `people.admin` override)

**Business meaning:** Only the member who owns the submitted quote may convert it. Organization admins (`people.admin`) may convert on behalf of others — same override pattern as `SubmitQuote`, `CancelQuote`, and `CancelOrder`.

| Dimension | Assessment |
|-----------|------------|
| **Accountability** | Strong — order owner matches quote owner by default; converter equals owner unless admin acts |
| **Operational flexibility** | Low for back-office — ops must be admin or quote must be reassigned (no reassign-quote command exists today) |
| **Unauthorized order risk** | Low — non-owners denied even with quote UUID |
| **Small-team workflow** | Good when same rep owns quote through close; friction if admin/ops converts without admin scope |
| **Backend change** | **Small** — call existing `assertCanEditQuote(snap, quote)` after `authorize()` in `createOrder()` |
| **UI behavior** | Show "Convertir a pedido" only when viewer is quote owner or has `people.admin`; align with submitted-quote policy copy replacement |
| **Audit** | `actorMemberId` + inherited `ownerMemberId` — clear when admin converts someone else's quote |
| **Future approval (G-08)** | Clean separation: approval may gate **SubmitQuote** or **CreateOrder**; owner-only conversion limits who can act after approval without widening org-wide write |
| **Maintenance** | **Low** — reuses existing helper; mirrors 6+ quote commands |

**If ISALWA values sales accountability and tight ownership chain (quote author → order owner), Option A fits best.**

---

### OPTION B — Any authorized Commercial member

**Business meaning:** Any active org member may convert any submitted quote. "Authorized Commercial member" = **`member_active`** today (no separate commercial role required).

| Dimension | Assessment |
|-----------|------------|
| **Accountability** | Weaker — order `ownerMemberId` stays quote owner, but **actor** may be a different member; audit shows converter but policy allows it |
| **Operational flexibility** | High — back-office, coverage, handoffs without admin role |
| **Unauthorized order risk** | Medium — any active member with quote UUID can convert; read UI hides others' quotes but API write does not |
| **Small-team workflow** | Best when team shares workload and trust is high |
| **Backend change** | **None** (document policy as intentional) — optional hardening: align read visibility if policy stays B |
| **UI behavior** | Could expose convert on any submitted quote the user can see — today non-owners often cannot see others' quotes unless admin |
| **Audit** | Must rely on `actorMemberId` in events — leadership must accept cross-member conversion as normal |
| **Future approval (G-08)** | Harder — org-wide convert rights may bypass intended "owner submits, manager approves, ops converts" flows unless G-08 adds separate gates |
| **Maintenance** | **Lowest** if accepted as policy — no code change |

**If ISALWA values operational speed and shared commercial desk over strict quote ownership at conversion, Option B fits best.**

---

### OPTION C — Explicit scope (e.g. `commercial.convert_order`)

**Business meaning:** Conversion requires a **dedicated scope** granted via role assignment or delegation — not merely active membership, not necessarily quote ownership.

| Dimension | Assessment |
|-----------|------------|
| **Accountability** | Moderate — scope holders are explicit; ownership may still differ from converter |
| **Operational flexibility** | High and **governed** — back-office can receive scope without full `people.admin` |
| **Unauthorized order risk** | Low-Medium — only scoped members convert; still org-wide on any submitted quote unless combined with owner check |
| **Small-team workflow** | Requires role design — who gets the scope in a 5-person org? |
| **Backend change** | **Medium** — new scope key in contracts; `COMMAND_REQUIRED_SCOPES.CreateOrder`; possibly extend `ADMIN_SCOPE_KEYS` or new commercial scope registry; role seeding/docs; delegation rules |
| **UI behavior** | Hide convert unless scope present (capability manifest / nav may need extension beyond UI-5A) |
| **Audit** | Scope + actor recorded; role assignment changes become ops concern |
| **Future approval (G-08)** | **Best composability** — can require `commercial.convert_order` **and** approval completion independently |
| **Maintenance** | **Higher** — new scope lifecycle: assign, revoke, test, document, UAT matrix |

**If ISALWA values delegated back-office authority without granting full people admin, Option C fits best.**

**Note:** `commercial.convert_order` is a **concept example only** — it does not exist in the repo.

---

## Future approval compatibility (G-08 not designed)

G-08 (Commercial→Approval) is **separately unapproved**. Engineering must not implement approval subjects until leadership answers the G-08 design questions.

| G-02 option | Interaction with future approvals (conceptual) |
|-------------|-----------------------------------------------|
| **A — Owner only** | Approval could protect SubmitQuote or CreateOrder; only owner (or admin) executes after approval — clear actor chain |
| **B — Any member** | Approval gate must be explicit on command; otherwise any member could convert after approval on someone else's quote |
| **C — Explicit scope** | Natural split: e.g. scope to convert + optional approval for thresholds; supports "ops converts after manager approved discount" without org-wide write |

None of the options **requires** G-08. All remain compatible if G-08 is designed later as an **additional** gate.

---

## Neutral engineering guidance (not a selection)

| ISALWA priority | Option that fits |
|-----------------|------------------|
| Match existing quote edit / submit / cancel ownership model | **A** |
| Maximum handoff flexibility in a small trusted team | **B** |
| Back-office conversion without `people.admin` | **C** (or **A** with admin doing conversions) |
| Minimal implementation before UI-5B | **B** (zero backend change) or **A** (one helper call) |
| Future discount/order approval thresholds (G-08) | **C** composes best; **A** is simplest baseline |

---

## UI impact summary

| Option | UI-5B (CreateOrder surface) implication |
|--------|----------------------------------------|
| A | Button on submitted quote detail for owner + `people.admin` only |
| B | Button for any user who can view the quote (owner or admin via current read rules) |
| C | Button only if member has convert scope (+ optional owner visibility rules) |

Current UI-5A copy: *"Conversión a pedido pendiente de política comercial."* — remains correct until decision + UI-5B.

---

## Verification impact (post-decision, not now)

| Option | New tests needed when implemented |
|--------|-------------------------------------|
| A | Postgres + HTTP: non-owner CreateOrder → `PERMISSION_DENIED`; admin → PASS |
| B | Document + optional test asserting non-owner CAN convert (currently untested negative/positive for actor policy) |
| C | Scope grant/revoke matrix + HTTP negatives for unscoped member |

---

## Decision required from ISALWA

**Who may run `CreateOrder` on a submitted quote?**

Choose one:

- **A** — Quote owner only, with `people.admin` override (mirrors quote edit + CancelOrder pattern)
- **B** — Any active org member (`member_active` — current API behavior)
- **C** — Members with an explicit convert scope (name and grant rules to be defined by ISALWA)

Optional follow-ups (out of G-02 minimum scope): Should conversion also require manager approval above a threshold (G-08)? Should back-office convert without being quote owner (A vs C)?

---

## Carmen handoff

### CURRENT CREATEORDER AUTHORITY

Any **`member_active`** (active org member, same tenant). No quote-owner check. No admin override on the command itself. Order `ownerMemberId` copied from quote; `actorMemberId` on audit/event records who ran the command.

### OPTION A — QUOTE OWNER ONLY

**Pros:** Strong accountability; matches SubmitQuote/CancelQuote/CancelOrder pattern; small backend change; low maintenance.  
**Cons:** Back-office needs `people.admin` or quote ownership change (no reassign-quote command).  
**Code impact:** Call `assertCanEditQuote()` in `createOrder()`; UI owner/admin gate; new deny tests.

### OPTION B — ANY COMMERCIAL MEMBER

**Pros:** Current behavior; maximum flexibility; zero backend change if accepted as policy.  
**Cons:** Write wider than read; weak ownership at conversion; harder to compose with future approvals.  
**Code impact:** Documentation + optional positive test; UI visibility still constrained by read auth unless changed.

### OPTION C — EXPLICIT SCOPE

**Pros:** Governed back-office path without full admin; best G-08 composability.  
**Cons:** New contract scope + role/delegation ops; highest maintenance; scope name and grants need ISALWA definition.  
**Code impact:** New scope in contracts, authorize path, capability/UI checks, grant matrix tests.

### EXISTING ARCHITECTURE SUPPORT

**Exists:** quote/opportunity/order ownership, owner-or-`people.admin` on quote edits and CancelOrder, `member_active` baseline, audit actor, idempotency, read-side owner filtering.  
**Missing for C:** any commercial convert scope. **Missing for all:** documented ISALWA conversion policy (G-02).

### CANCELORDER COMPARISON

**Relevant** — shows owner + `people.admin` pattern for order lifecycle commands. **Not automatic copy** — conversion vs cancellation may legitimately differ.

### FUTURE APPROVAL COMPATIBILITY

All options can coexist with future G-08 if approval is modeled as an **additional** gate. Option C separates role-to-convert from approval-to-convert most cleanly; Option B needs explicit approval enforcement to avoid org-wide bypass.

### DECISION REQUIRED FROM ISALWA

**Who may convert a submitted quote into an Order — quote owner only (A), any active member (B), or holders of an explicit convert scope (C)?**

### CAN UI-5B START BEFORE DECISION

**NO**

### IMPLEMENTATION STARTED

**NO**

### EXACT NEXT ACTION

Carmen/ISALWA chooses **A**, **B**, or **C** (and if **C**, defines scope name and who receives it).

**STOP.**
