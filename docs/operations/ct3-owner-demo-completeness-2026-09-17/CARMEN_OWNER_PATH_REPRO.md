# CARMEN OWNER PATH — HOSTED FORENSIC REPRO

**At:** 2026-09-17T04:30Z (approx; run wall-clock local)  
**Mode:** READ-ONLY — no product code changes.  
**Host:** https://os-web-staging.onrender.com  
**Tool:** Playwright Chromium (`channel: chrome`) from `/Users/carmen/projects/isalwa/.tmp/pw-agent4/carmen-owner-path-repro.mjs`  
**Evidence JSON:** `/tmp/ct3-bv/carmen-owner-path-repro.json`  
**Passwords:** loaded from `~/.isalwa-secrets` — never printed.

---

## Actors

| Actor | Password source | Org visible in UI | Notes |
|---|---|---|---|
| `w2.people-admin@isalwa.demo` | `isalwa-os-staging-wave-a-continuity-passwords.json` (not in wave2-role-passwords keys) | **SYNTH** — shell: `VISTA DE EVALUACIÓN` · `CONECTADO COMO WaveA` · body cues `Synth FixtureSeed` / `Synth Asesor` | PF-8 primary |
| `carmen.staging@isalwa.demo` | `isalwa-os-staging-admin.password` filename | **REAL / Staging production lens** — shell: `PRODUCCIÓN` · `CONECTADO COMO Carmen` | Secondary: **no** email containing `carmen` or `admin` in wave2 fixtures JSON keys; used staging-admin password file + prior verifier email |

Wave2 fixtures `carmen|admin` email keys: **none**.

---

## Verdict

| Gate | Actor | Result |
|---|---|---|
| **CARMEN_CLIENTES_DEMO_REPRO** | `w2.people-admin@isalwa.demo` | **PASS** |
| Same path (contrast) | `carmen.staging@isalwa.demo` | **FAIL** (empty demo list; Story CTA → cliente no disponible) |

### Root-cause hypothesis

Demo mode (`?datos=demo` / cookie `isalwa-demo-data-mode=demo` / Demo toggle) is a **filter inside the signed-in organization**, not an org switcher.

- **people-admin** sits on **SYNTH** (`01M2JKF…` / Wave2 synthetic roles). Seeded DEMO parties exist → `/clientes?datos=demo` shows DEMO MADERAS ORIENTE, DEMO CONSTRUCTORA ANDINA, FERRETERÍA, etc.
- **Carmen Staging** sits on **REAL Staging S.R.L.** (`01M2DV9F…`). That org has **0** seeded DEMO parties → same URL + banner + cookie + Demo toggle active, but body empty: *“No hay clientes registrados”*.
- Story Mode CTA `Ver cliente demo` href is `/clientes/<SYNTH partyId>` **without** `?datos=demo`. Cookie still keeps Demo active, but Carmen cannot see a SYNTH party → *“Cliente no disponible”*.

This matches `FORENSIC_FREEZE.md` org-split table. Carmen’s empty Clientes view is **expected on REAL**, not a broken Demo toggle for people-admin.

---

## Step table — `w2.people-admin@isalwa.demo` (PASS)

| Step | Action | Destination URL | Demo toggle | Banner `DEMO · DATOS FICTICIOS` | Cookie `isalwa-demo-data-mode` | Body / data |
|---|---|---|---|---|---|---|
| Login | Submit login | `/inicio` | — | — | — | OK; WaveA / evaluación |
| **A** | Goto `/clientes?datos=demo` | `…/clientes?datos=demo` | **Demo active** | **Present** | **`demo`** | **Client names visible** (DEMO MADERAS ORIENTE, DEMO CONSTRUCTORA ANDINA, FERRETERÍA, …). Empty-state: no |
| **B** | Sidebar Cotizaciones → then accepted filter **without** adding `datos=demo` | `…/cotizaciones?status=accepted` (**no** `datos=demo`) | **Demo still active** | **Present** | **`demo`** | **Quotes visible** (Q-000002 DEMO MADERAS ORIENTE, Q-000004 DEMO HOTEL CENTRAL, …). Sidebar link href was `/cotizaciones` (no status); accepted reached via `/cotizaciones?status=accepted` |
| **C** | Sidebar Mi trabajo | `…/trabajo` (**no** `datos=demo`) | **Demo still active** | **Present** | **`demo`** | Work items with DEMO labels visible (`[is_demo] Seguimiento cotización…`) |
| **D** | Story Mode (`/inicio?datos=demo&story=1`) → **Ver cliente demo** | `…/clientes/01M2PM95PV7YP6AECYXSX4GRBW` — **`datos=demo` absent** | **Demo still active** (cookie) | **Present** | **`demo`** | Cliente360 **DEMO MADERAS ORIENTE** loads. CTA href: `/clientes/01M2PM95PV7YP6AECYXSX4GRBW` (no query) |

**D answer:** destination URL does **not** include `datos=demo`; mode persists via cookie/toggle.

---

## Step table — `carmen.staging@isalwa.demo` (contrast FAIL)

| Step | Destination URL | Demo toggle / banner / cookie | Body / data |
|---|---|---|---|
| **A** `/clientes?datos=demo` | `…/clientes?datos=demo` | Demo active · banner present · cookie `demo` | **Empty:** “No hay clientes registrados” / “Busque por nombre…” — no DEMO MADERAS / ORIENTE list |
| **B** `/cotizaciones?status=accepted` | no `datos=demo` | Demo active · banner · cookie `demo` | **Sin cotizaciones** (empty accepted desk) |
| **C** `/trabajo` | no `datos=demo` | Demo active · banner · cookie `demo` | (captured; REAL org desk — not SYNTH demo density) |
| **D** Ver cliente demo | `…/clientes/01M2PM95PV7YP6AECYXSX4GRBW` **no** `datos=demo` | Demo active · banner · cookie `demo` | **“Cliente no disponible”** / “No se encontró este cliente…” |

---

## Org note (UI)

| Signal | people-admin | carmen.staging |
|---|---|---|
| Shell strip | `VISTA DE EVALUACIÓN` | `PRODUCCIÓN` |
| Connected as | WaveA | Carmen |
| Synth labels in body | Yes (`Synth FixtureSeed`, `Synth Asesor`) | No |
| Implied org | **SYNTH** Wave2 | **Staging S.R.L. (REAL)** |

Exact org ULIDs not printed in chrome shell; inference aligns with freeze pins SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` vs REAL `01M2DV9F0V5DXS4G89AKF4D5SR`.

---

## Method notes

1. Overlays dismissed (`Explorar por mi cuenta` / Escape) after login and navigations.
2. No product code edited; script lives only under `.tmp/pw-agent4`.
3. Cookie persistence across B/C without `?datos=demo` is **working as designed** for people-admin.
4. Story CTA omitting `datos=demo` is a **URL hygiene gap**, not the Carmen empty-list root cause (cookie already = demo).
)
