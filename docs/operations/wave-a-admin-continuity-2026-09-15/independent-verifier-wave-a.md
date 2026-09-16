# Independent hosted verifier — Wave A admin continuity

**Date:** 2026-09-15 (session UTC ~2026-09-16T01:48–01:50)  
**Role:** Independent hosted verifier (not product author)  
**Host:** https://os-web-staging.onrender.com  
**API:** https://os-api-staging.onrender.com  
**SYNTH org (fixtures):** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Expected integrated SHA (Wave A):** `b6a44f721bff2d1360d510127571818febb3efee` (short `b6a44f7`)  
**REAL org:** not mutated — no terminate/reassign/invite actions executed

---

## Overall verdict: **CONDITIONAL**

| Area | Verdict |
| --- | --- |
| Hosted SHA vs Wave A integrated | **FAIL** — live web is pre–Wave A |
| Owner `people.admin` denial on `/administracion` | **PASS** (expected) |
| Owner `system.admin` reachability on `/sistema` | **PASS** |
| Non-admin (Asesor) `/administracion` denial | **PASS** |
| `people.admin` bootstrap credentials | **AVAILABLE** (not blocked) |
| Admin continuity E2E (list → detail → responsabilidades → ReassignWork → terminate) | **UNPROVEN** — Wave A UI not on host; SYNTH-scoped admin path not established |
| Mobile 390 admin continuity | **UNPROVEN** |
| REAL tenant people mutations | **NONE** (read-only navigation only) |

Wave A access-truth checks **pass** on the currently live staging build. Wave A product continuity **cannot be browser-verified** until `b6a44f7` (or newer Wave A) is live on **both** os-web and os-api.

---

## Tooling (exact)

| Tool | Use |
| --- | --- |
| **playwright-core@1.51.1** | Ephemeral install under `/tmp/isalwa-wave-a-verifier/`; runner `/tmp/isalwa-wave-a-verifier/run-hosted-wave-a.mjs` |
| **Google Chrome** | Headless via Playwright `channel: 'chrome'` (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) |
| **Render CLI** | `render deploys list srv-dajddb67bikc73bl42q0` (web), `render deploys list srv-dajd64gae00c739gpk20` (api) |
| **cursor-ide-browser MCP** | **Not used** (prior onboarding receipt: tab evaporation; verifier used Playwright instead) |
| **Secrets** | Passwords read from `~/.isalwa-secrets/` only; **never echoed** in this receipt |

Machine-readable artifacts (local, not committed): `~/.isalwa-secrets/_verifier-wave-a-out/wave-a-verifier-report.json`, `wave-a-phase2.json`.

---

## 1) Hosted SHA

### Expected vs live (Render — authoritative when UI has no footer SHA)

| Service | Service ID | Live deploy ID | Live commit SHA | Matches `b6a44f7`? |
| --- | --- | --- | --- | --- |
| os-web-staging | `srv-dajddb67bikc73bl42q0` | `dep-dakuhuad0e5s73ftrvng` | `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749` | **NO** |
| os-api-staging | `srv-dajd64gae00c739gpk20` | `dep-dakm1cafngtc73atlrbg` | `fd06aea735fca2400956496727c3d8698f06e046` | **NO** |

Live web commit message (first line): `fix(os-web): scope onboarding guide localStorage per member`.

### UI `/inicio` footer / build meta (browser)

| Check | Result |
| --- | --- |
| Scroll-to-footer on `/inicio` as `w2.owner@isalwa.demo` | **No git SHA** in visible copy |
| `hostedShaCandidates` (regex `\b[a-f0-9]{7,40}\b` on body text) | **[]** |
| `#__NEXT_DATA__` on `/inicio` | **null** (App Router / RSC; no inline build blob) |
| Footer lines observed | Product copy + welcome dialog (“Bienvenido a ISALWA”, “Conocer ISALWA”, …) — **no build stamp** |

**Proof statement:** Hosted web commit is **`1fd0167aba1633a6978058b6f0e2ba3b6eb6c749`** via Render live deploy, **not** `b6a44f721bff2d1360d510127571818febb3efee`. UI does not currently expose SHA in `/inicio` footer.

---

## 2) Owner — `system.admin` without `people.admin`

**Actor:** `w2.owner@isalwa.demo` (fixture: scopes `management.org.read`, `system.admin`; **no** `people.admin` — see `agent-05-owner-admin-truth.md`).

| Route | Pathname after navigation | Deny copy | Verdict |
| --- | --- | --- | --- |
| `/administracion` | `/administracion` | **“Sin acceso”** | **PASS** (expected denial) |
| `/sistema` | `/sistema` | none | **PASS** — page shows **“Sistema operativo de su empresa”** / **“Sistema”** heading; not fail-closed |

Owner must **not** be treated as `/administracion` admin on SYNTH; `/sistema` remains the `system.admin` surface.

---

## 3) Non-admin — Asesor

**Actor:** `w2.asesor@isalwa.demo`

| Route | Pathname | Deny copy | Verdict |
| --- | --- | --- | --- |
| `/administracion` | `/administracion` | **“Sin acceso”** | **PASS** |

---

## 4) `people.admin` — admin continuity (hosted)

### Credentials

| Item | Result |
| --- | --- |
| `~/.isalwa-secrets/isalwa-os-staging-admin.password` | **Present** |
| Bootstrap email (from `staging-supabase-bootstrap.ts`) | `carmen.staging@isalwa.demo` |
| Wave2 SYNTH fixtures with `people.admin` | **None** (`people.admin` listed under `explicitlyUnassigned` in fixture JSON) |

**Credential gate:** **NOT** `BLOCKED_CREDENTIAL`.

### Bootstrap admin — coarse access

**Actor:** `carmen.staging@isalwa.demo`

| Route | Deny? | Verdict |
| --- | --- | --- |
| `/administracion` | no | **PASS** — admin shell reachable |
| `/administracion/equipo` | no | **PASS** — employee list reachable |

### Employee list → detail → Wave A panels (FAIL / UNPROVEN on current host)

| Step | Evidence | Verdict |
| --- | --- | --- |
| List → member link (first non-invite) | `/administracion/equipo/01M2DV9J827Q5QXH3KP5SVJKAN`, `01M2FCHJGAJNP3M682XJBQ6EPN`, `507febfb-59e6-4cd1-9a02-362be66dc5ee` — **REAL-org-shaped member IDs**, not SYNTH `w2.*` UUIDs | **Org context mismatch vs SYNTH org `01M2JKF77TXMJNDTKNCYNHH9G5`** |
| SYNTH Asesor detail (read-only probe) `/administracion/equipo/e6f13fdc-fb46-4382-b0d3-599a6d4a0676` | Shell only; **no** “Responsabilidades”, **no** “Trabajo activo”, **no** “Finalizar”, **no** “Historial de acceso” | **UNPROVEN** — Wave A member detail UI **absent** on live `1fd0167` web |
| ReassignWork → blocked terminate → resolve → terminate | **Not executed** (no Wave A panels; no SYNTH-safe target confirmed under bootstrap session) | **UNPROVEN** |
| Access history after terminate | **Not executed** | **UNPROVEN** |

**Interpretation:** Bootstrap `people.admin` is live on staging but session appears bound to **REAL** (or non–SYNTH-w2) org for directory data. Wave A termination/reassign/history UI ships in **`b6a44f7`** and is **not** on the live web SHA above. Verifier did **not** mutate REAL tenant people.

---

## 5) Mobile 390 smoke

| Check | Result |
| --- | --- |
| Viewport 390×844 as bootstrap admin on admin route | Page rendered (~1451 chars body text on `/administracion/equipo/invitar` mis-click path in first pass) |
| Responsabilidades / ReassignWork / terminate on SYNTH member at 390 | **UNPROVEN** — Wave A detail panels not on host |

---

## 6) Safety / scope

| Rule | Compliance |
| --- | --- |
| No REAL tenant people mutations | **YES** — login + navigation + read-only probes only |
| Did not grant `people.admin` to Owner | **YES** |
| Owner `/administracion` denial treated as expected | **YES** |

---

## Residuals / unblock

1. **Deploy Wave A integrated SHA** to staging: at minimum `b6a44f721bff2d1360d510127571818febb3efee` on **os-web-staging** and matching os-api (see `WAVE_A_ADMIN_CONTINUITY_ACCEPTANCE.md` deploy table).
2. **Re-run hosted BV** after deploy: confirm `/inicio` or build meta if added; otherwise Render live commit must show `b6a44f7+`.
3. **SYNTH-scoped `people.admin` actor:** either bootstrap admin membership in org `01M2JKF77TXMJNDTKNCYNHH9G5` or explicit SYNTH grant — required to prove terminate/reassign on `w2.*` fixtures without touching REAL org directory rows.
4. Optional: add visible build SHA in `/inicio` footer to satisfy “prove from footer” without CLI.

---

## Bottom line

**CONDITIONAL:** Access truth on live staging (**Owner deny admin, Owner reach `/sistema`, Asesor deny admin, bootstrap `people.admin` coarse allow**) is **browser-verified** on web SHA **`1fd0167`**. Wave A admin continuity (**ReassignWork, termination preflight, access history, mobile detail**) is **UNPROVEN** because the host is **not** on **`b6a44f7`** and SYNTH-scoped admin E2E was not achievable without REAL-org directory exposure.
