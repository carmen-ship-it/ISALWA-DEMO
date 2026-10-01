# UAT Review Intake Template — Lane J

**Purpose:** Structured intake for the **next** evidence only. Do not use to re-audit closed foundation work.

**Current gate (closed):** Commercial Phase 1 internal UAT = **READY** (UI-LIVE-1). Workforce Admin mutation API = **READY** (Step 14.7). Lane J remains **HOLD** until new evidence arrives.

**Acceptable next inputs:**

| ID | Input | Lane J action when received |
|----|--------|----------------------------|
| **A** | UI-LIVE-3 Workforce Admin mutation smoke | Fill § UI-LIVE-3; update `ACTIVE_LANES_REVIEW.md` reconciliation section |
| **B** | First human internal UAT feedback | Fill § Human UAT; classify findings; update readiness if P0 |
| **C** | G-02 design decision (CreateOrder policy) | Record decision; assess UI/production impact only |
| **D** | Provider invite/rehire live evidence | Reconcile InviteMember/RehireMember unblock status |

---

## 1. Universal review structure (all intakes)

Copy this block per intake. **No verdict until evidence is attached.**

### Intake metadata

| Field | Value |
|-------|--------|
| **Intake ID** | A / B / C / D |
| **Date** | |
| **Reviewer** | Lane J |
| **Evidence doc** | |
| **Log / artifact** | |
| **Agent / source** | |

### 1. What was tested

- Scope (commands, routes, flows)
- What was explicitly **out of scope**

### 2. Environment / auth tier

Classify (do not collapse):

| Tier | Status |
|------|--------|
| POSTGRES / DOMAIN | |
| MOCK PROVIDER | |
| HTTP OS SESSION (dev-auth) | |
| LIVE SUPABASE TEST PROJECT | |
| LIVE BROWSER / SSR | |
| INTERACTIVE PLAYWRIGHT | |
| HUMAN UAT SESSION | |

**Auth mode:** `dev` / `supabase` / mixed — state limitations explicitly.

### 3. User flow exercised

Step-by-step path actually run (not intended path).

### 4. PASS / FAIL by action

| Action / step | PASS / FAIL / DEFERRED / NOT TESTED | Evidence pointer |
|---------------|-------------------------------------|------------------|

### 5. Backend vs UI defect

| Finding | Layer | Notes |
|---------|-------|-------|
| | **BACKEND** / **UI** / **BOTH** / **ENV** / **POLICY** | |

### 6. Security / tenant impact

| Finding | Tenant isolation? | Auth bypass? | Data leak? | Severity |
|---------|---------------------|--------------|------------|----------|

### 7. Policy issue vs code issue

| Finding | **POLICY** (needs ISALWA decision) / **CODE** (fixable) / **ENV** (config) |
|---------|-------------------------------------------------------------------------------|

### 8. UAT blocker severity

| Finding | **P0** / **P1** / **P2** / **NONE** |
|---------|-------------------------------------|

**P0** — blocks internal UAT continuation  
**P1** — blocks production  
**P2** — safe follow-up after UAT

### 9. Production blocker severity

| Finding | **P0** / **P1** / **P2** / **NONE** |
|---------|-------------------------------------|

### 10. Exact owner

| Finding | Owner (Agent 1 / 2 / 4 / Carmen / ISALWA) | Next slice |
|---------|-------------------------------------------|------------|

### Lane J verdict (fill only when evidence complete)

| Gate | READY / CONDITIONAL / NOT READY |
|------|----------------------------------|
| Internal UAT | |
| Production | |

**Reconciliation section to add:** `## RECONCILIATION — <INTAKE ID> — <TITLE>` in `ACTIVE_LANES_REVIEW.md`

---

## 2. UI-LIVE-3 — Workforce Admin mutation (ready when evidence arrives)

**Expected evidence:** `docs/architecture/UI_LIVE_3_*_EVIDENCE.md`, script log, `latest-results.json`

**Do not verdict until:** log + script + environment pre-flight reviewed.

### Environment checklist

- [ ] Local Postgres
- [ ] os-api running
- [ ] os-web running
- [ ] Auth mode documented (`dev` expected)
- [ ] Step17 or documented seed marker
- [ ] Synthetic tenant only

### Actions to score (PASS / FAIL / NOT TESTED)

| Command | UI-safe per 14.7 | Review focus |
|---------|------------------|--------------|
| ChangeDepartment | READY | Effective-dated assignment; tenant scope |
| ChangeRole | READY | `people.admin`; history preserved |
| ChangeManager | READY | Same-org manager; cross-tenant negative |
| SuspendMember | READY | OS `suspended`; actor blocked after |
| ActivateMember (reactivate suspended) | READY | J-13: admin only; terminated must fail |
| TerminateMember | READY | Open-work block → `VALIDATION_FAILED` |
| GrantDelegation | READY | Expiry; scopes |
| RevokeDelegation | READY | Atomic revoke |
| RequestMemberEmailChange | READY | Self only; **no** provider email mutation |

### Negative / blocked checks

| Check | Expected |
|-------|----------|
| InviteMember UI/command surface | **ABSENT** or honestly disabled |
| RehireMember | **ABSENT** or honestly disabled |
| ChangeMemberEmail completion | **ABSENT** or honestly disabled |
| RetryAuthProviderSync | Ops-only if present; not general HR UI |

### UX contracts to verify

| Scenario | Expected behavior |
|----------|-------------------|
| Terminate with open work | Deterministic error; UI explains reassignment required |
| Suspend with open work | Allowed (hold model per 14.5) |
| Suspended actor | Commands denied `ACCESS_REVOKED` / 403 |
| Reactivate terminated via ActivateMember | **REJECTED** (J-13) |

### DEV auth limitation (do not upgrade tier)

UI-LIVE-3 with `OS_AUTH_MODE=dev` proves **Workforce Admin mutation integration** — not:

- Supabase JWT commercial/workforce browser path
- Production auth readiness
- Live provider invite/rehire

### UI-LIVE-3 verdict placeholders (fill when evidence arrives)

| Item | PASS / CONDITIONAL / FAIL |
|------|---------------------------|
| Live integration (dev-auth) | |
| UI-safe commands | |
| Blocked commands absent | |
| J-13 reactivate guard | |
| Terminate open-work UX | |
| New security blockers | |

---

## 3. Human UAT feedback intake

**Source:** Session notes, screenshots, issue list from Carmen or testers.

### Session metadata

| Field | Value |
|-------|--------|
| Date | |
| Tester(s) | |
| Stack | Postgres + os-api + os-web |
| Auth mode | |
| Flows attempted | |

### Feedback categories

Classify each item **once** (primary category):

| Category | Use when | Not this |
|----------|----------|----------|
| **BUG** | Incorrect behavior vs documented contract | User preference |
| **UX FRICTION** | Works but confusing, slow, or clumsy | Security defect |
| **MISSING BUSINESS RULE** | Expected rule not implemented | Policy already decided elsewhere |
| **DATA ISSUE** | Wrong/missing/stale projection or seed data | Normal ~10s convergence |
| **AUTH/SECURITY** | Tenant leak, bypass, credential issue | Dev-auth limitation in dev stack |
| **PERFORMANCE** | Unacceptable latency at scale | Single-user UAT slowness without repro |
| **POLICY DECISION** | Needs ISALWA choice (e.g. G-02) | Implementation bug |
| **TRAINING/COPY** | Labels, help text, onboarding | Functional defect |

### Per-finding record

| # | Category | Flow / screen | Description | P0/P1/P2 | Owner |
|---|----------|---------------|-------------|----------|-------|
| 1 | | | | | |

### Human UAT impact (fill when feedback complete)

| Question | YES / NO |
|----------|----------|
| Reverses Commercial Phase 1 UAT = READY? | |
| Blocks Workforce Admin mutation UI ship? | |
| Requires G-02 / G-08 decision? | |
| New security blocker? | |

---

## 4. G-02 design decision intake (when received)

**Do not choose policy — record only.**

| Field | Value |
|-------|--------|
| Decision date | |
| Chosen option | A quote owner / B any commercial member / C explicit scope |
| Rationale | |
| Blocks CreateOrder UI? | |
| Blocks production? | |

**Lane J action:** Update G-02 status in `ACTIVE_LANES_REVIEW.md`; assess whether Agent 4 may expose CreateOrder UI.

---

## 5. Provider invite/rehire evidence intake (when received)

| Check | PASS / FAIL / DEFERRED |
|-------|------------------------|
| Live `createInvite` on pilot/production tenant | |
| RehireMember end-to-end | |
| InviteMember end-to-end | |
| Secret hygiene in log | |

**If ENVIRONMENT_CONFIG fixed:** Reclassify InviteMember / RehireMember from BLOCKED → CONDITIONAL/READY for UI.

---

## 6. What Lane J will NOT do on intake

- Re-audit Step 14.4–14.7, UI-LIVE-1, or Commercial Phase 1 closed gates
- Implement fixes or silent patches
- Treat dev-auth limitations as production security defects
- Treat user preference as security defect
- Expand backlog beyond P0/P1/P2 material blockers

---

## Carmen handoff (template status)

### STATUS
**READY FOR NEW EVIDENCE**

### CURRENT REVIEW NEEDED
**NO**

### NEXT ACCEPTABLE INPUT
UI-LIVE-3 / HUMAN UAT / G-02 DECISION / PROVIDER EVIDENCE

### IMPLEMENTATION CHANGES
**NONE**

### NEXT ACTION
**WAIT**
