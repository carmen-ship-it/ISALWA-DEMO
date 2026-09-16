# Independent hosted verifier — Wave A CLOSE

**Date:** 2026-09-15 (session UTC ~2026-09-16T02:48–02:52)  
**Role:** Independent hosted verifier (receipt only; not product author)  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate`  
**Host:** https://os-web-staging.onrender.com  
**API:** https://os-api-staging.onrender.com  
**Expected LIVE SHA (web + api):** `a97e17e156f58648beac4c0cd78d3245cc614e85`  
**WEB deploy:** `dep-dal04ie7bikc73dt380g` (live)  
**API deploy:** `dep-dal051740ujc7392vvr0` (live)  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL org:** `01M2DV9F0V5DXS4G89AKF4D5SR` — **no people mutations** (terminate / reassign / invite)

---

## Overall verdict: **CONDITIONAL**

Wave A build **`a97e17e`** is **live on both** staging services. **Access-truth** and **admin shell / member-detail Wave A panels** are **browser-verified**. **SYNTH-scoped continuity mutations** (ReassignWork → terminate → history after lifecycle) are **not hosted-proven** because `carmen.staging@isalwa.demo` resolves to **REAL** org only; REAL mutations were **refused**. **Thin-pilot dual recovery** remains **Carmen decision** (Option A incomplete).

---

## Tooling (disclosed)

| Tool | Use |
| --- | --- |
| **playwright-core@1.51.1** | `/tmp/isalwa-wave-a-verifier/`; runner `run-hosted-wave-a-close.mjs`; **Google Chrome** headless (`channel: 'chrome'`) |
| **Render CLI** | `render deploys list srv-dajddb67bikc73bl42q0` (web), `render deploys list srv-dajd64gae00c739gpk20` (api) |
| **curl / fetch** | `GET /v1/health`, `GET /v1/health/ready` |
| **Hosted isolation script** | `scripts/verify-staging-hosted-tenant-isolation.mjs` (JWT; no password echo) |
| **cursor-ide-browser MCP** | **Not used** |
| **Secrets** | Passwords only from `~/.isalwa-secrets/`; **never printed** in this receipt |

Artifacts (local, not committed): `~/.isalwa-secrets/_verifier-wave-a-close-out/wave-a-close-report.json`

---

## 1) Hosted SHA

| Service | Deploy ID | Commit SHA | Matches `a97e17e`? |
| --- | --- | --- | --- |
| os-web-staging | `dep-dal04ie7bikc73dt380g` | `a97e17e156f58648beac4c0cd78d3245cc614e85` | **PASS** |
| os-api-staging | `dep-dal051740ujc7392vvr0` | `a97e17e156f58648beac4c0cd78d3245cc614e85` | **PASS** |

Live commit message (first line): `fix(os-web): clarify split-authority termination resolution paths`

---

## 2) Health endpoints

| Endpoint | HTTP | Body check | Verdict |
| --- | --- | --- | --- |
| `GET /v1/health` | 200 | `status: ok`, `check: liveness` | **PASS** |
| `GET /v1/health/ready` | 200 | `status: ready`, `database.ok`, workers running | **PASS** |
| Web `/login` | 200 | login shell loads | **PASS** (web liveness) |

---

## 3–5) Role probes (Playwright)

### w2.owner (`w2.owner@isalwa.demo`) — SYNTH session

API `GET /v1/session/me` (JWT): `organizationId = 01M2JKF77TXMJNDTKNCYNHH9G5`

| Route | Result | Verdict |
| --- | --- | --- |
| `/administracion` | **“Sin acceso”** (deny) | **PASS** (expected) |
| `/sistema` | Sistema surface reachable; not fail-closed | **PASS** |

### w2.asesor

| Route | Result | Verdict |
| --- | --- | --- |
| `/administracion` | **“Sin acceso”** | **PASS** |

### people.admin (`carmen.staging@isalwa.demo`)

| Route | Result | Verdict |
| --- | --- | --- |
| `/administracion` | Admin shell reachable | **PASS** |
| `/administracion/equipo` | Equipo list reachable | **PASS** |

JWT session: `organizationId = 01M2DV9F0V5DXS4G89AKF4D5SR` (**REAL**), `memberId = 507febfb-59e6-4cd1-9a02-362be66dc5ee`, scopes include `people.admin`.

---

## 6) SYNTH continuity E2E (mutations)

| Step | Result | Verdict |
| --- | --- | --- |
| SYNTH-scoped `people.admin` actor | **None** — bootstrap admin not in SYNTH org | **BLOCKED** |
| Direct URL SYNTH asesor `…/equipo/e6f13fdc-fb46-4382-b0d3-599a6d4a0676` under REAL admin session | No Wave A detail panels (wrong-tenant / empty shell) | **UNPROVEN** on SYNTH fixtures |
| Member A + open work + ReassignWork + terminate + history (SYNTH) | Not executed — REAL mutations forbidden | **UNPROVEN** |
| Mobile 390 on REAL member detail (read-only) | Responsabilidades + Trabajo activo visible; ~6801 chars body | **PASS** (panels usable; mutation flows not run) |

**REAL read-only employee detail** (María Quispe `01M2DV9J827Q5QXH3KP5SVJKAN`): **Responsabilidades**, **Trabajo activo**, **Continuidad comercial**, **Historial de acceso** present; **Finalizar** disabled; preflight shows commercial / quote / approval blockers.

API preflight (JWT, read-only): `canTerminate: false`; blocking counts — `commercial_accounts: 3`, `active_quotes: 4`, `pending_approvals: 3`; **open_work: 0** (no work blocker to exercise in this org).

---

## 7) Split-authority UX (commercial account blocker)

On María detail **Responsabilidades** copy includes Spanish guidance: permiso **comercial distinto**, pedir a quien administra cuentas, links to **Continuidad comercial** — **no** dotted capability keys (`people.admin`, `commercial.account.reassign`, etc.) in visible preflight copy.

| Check | Verdict |
| --- | --- |
| Commercial blocker explains another permission needed | **PASS** |
| Capability keys exposed in preflight UI | **PASS** (not observed) |

---

## 8) Cross-tenant

`scripts/verify-staging-hosted-tenant-isolation.mjs`: **17/17 PASS** — foreign Tenant B party/quote/opportunity/member → **404**, no leak; org-hint spoof → **403**; Carmen JWT attention → **200**.

Owner JWT on SYNTH member termination-impact → **403 PERMISSION_DENIED** (expected people.admin gate).

---

## 9) REAL tenant safety

| Rule | Compliance |
| --- | --- |
| No terminate / reassign / invite on REAL | **YES** — navigation + API reads only |
| Protected production customers | **Not re-verified individually** — no writes performed; equipo list unchanged (3 members) |

---

## §22 — Acceptance matrix (Wave A close brief)

| Line | State | Notes |
| --- | --- | --- |
| PEOPLE ADMIN LOGIN | **PASS** | Bootstrap password file present; login succeeds |
| PEOPLE ADMIN /administracion | **PASS** | Shell reachable |
| EMPLOYEE DETAIL | **PASS** | REAL María detail — Wave A sections on host `a97e17e` |
| RESPONSIBILITY PREFLIGHT | **PASS** | Impact panel + fail-closed copy; API aligns |
| WORK BLOCKER | **N/A** | No `open_work` in REAL directory scan (3 members) |
| REASSIGNWORK | **UNPROVEN** | No open work; SYNTH mutation path blocked |
| PREFLIGHT REFRESH | **UNPROVEN** | No post-reassign refresh executed |
| TERMINATION BLOCK | **PASS** | Finalizar disabled; `canTerminate: false` with blockers |
| TERMINATION SUCCESS | **UNPROVEN** | Blockers remain; no terminate attempted |
| HISTORICAL ATTRIBUTION | **UNPROVEN** | No ReassignWork hosted run |
| COMMERCIAL BLOCKER | **PASS** | Count 3; split-authority Spanish copy |
| OPPORTUNITY BLOCKER | **N/A** | Count 0 on probed member |
| QUOTE BLOCKER | **PASS** | Count 4; fail-closed copy present |
| ORDER BLOCKER | **N/A** | Count 0 on probed member |
| APPROVAL BLOCKER | **PASS** | Count 3; copy points to `/aprobaciones` |
| DIRECT REPORT BLOCKER | **N/A** | Count 0 on probed member |
| DELEGATION BLOCKER | **N/A** | Count 0 on probed member |
| ACCESS HISTORY | **PASS** | API + UI panel; Spanish **labels** (e.g. “Permiso adicional otorgado”). **Note:** `detail` lines use English display names (e.g. “Commercial Account Reassign”) — not dotted keys, but not fully Spanish. |
| SYSTEM ADMIN DENY PEOPLE ADMIN | **PASS** | w2.owner `/administracion` deny |
| SYSTEM ADMIN /sistema | **PASS** | w2.owner `/sistema` allow |
| CROSS TENANT | **PASS** | Isolation script + owner 403 on foreign admin API |
| MOBILE | **PASS** | 390×844 — detail panels usable (read-only) |
| REAL TENANT UNCHANGED | **PASS** | No people mutations |

---

## Wave A close criteria (brief §23) — honest scorecard

| Criterion | Met? |
| --- | --- |
| Exact candidate `a97e17e` deployed web + api | **YES** |
| people.admin hosted acceptance (full continuity) | **PARTIAL** — coarse + read-only detail **PASS**; SYNTH mutation path **UNPROVEN** |
| ReassignWork hosted | **UNPROVEN** |
| Termination preflight hosted | **PASS** (read-only) |
| Fail-closed blockers | **PASS** (commercial / quote / approval on REAL probe) |
| system.admin separation | **PASS** |
| cross-tenant | **PASS** |
| mobile admin | **PASS** (read-only) |
| REAL unchanged | **PASS** |
| Quote/Order gaps fail-closed + documented | **YES** (hosted copy matches matrix) |
| Thin-pilot recovery A or B | **NO** — Option A not done; Option B unsigned (`thin-pilot-recovery-decision.md`) |

**Wave A CLOSED FOR THIN PILOT:** **NO** (continuity E2E + recovery gate)

**Thin pilot technical safety (ignoring recovery choice):** **PARTIAL** — hosted on correct SHA; admin continuity **mutations** not proven on SYNTH.

---

## Unblock / residuals

1. **SYNTH `people.admin` path:** membership or grant for bootstrap admin in `01M2JKF77TXMJNDTKNCYNHH9G5` (or dedicated SYNTH admin fixture) — then re-run ReassignWork → terminate → history on disposable SYNTH members **without** REAL writes.
2. **Open-work fixture:** seed or locate SYNTH member with `open_work > 0` for hosted ReassignWork proof.
3. **Carmen:** dual recovery Option A or signed Option B before thin-pilot **close** claim.
4. Optional: access-history `detail` strings → Spanish operator labels (product gap; not blocking access-truth).

---

## Bottom line

**CONDITIONAL:** Deploy and health **PASS** on **`a97e17e`**. Owner/Asesor access-truth **PASS** on SYNTH. Bootstrap `people.admin` **PASS** for admin reach and **Wave A member-detail UI** on REAL (read-only). **SYNTH continuity mutations UNPROVEN** (org scope). **Cross-tenant PASS.** **No REAL people mutations.**
