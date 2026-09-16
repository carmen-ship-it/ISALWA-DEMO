# Independent verifier — onboarding isolation

**Date:** 2026-09-15  
**Role:** Independent verifier (not the fix author)  
**Host:** https://os-web-staging.onrender.com  
**SYNTH org:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**Passwords:** read from local secrets JSON only — **never echoed**

---

## Hosted SHA / deploy

| Field | Value |
| --- | --- |
| **HOSTED_SHA** | `1fd0167aba1633a6978058b6f0e2ba3b6eb6c749` |
| **Deploy id** | `dep-dakuhuad0e5s73ftrvng` |
| **Render status** | `live` (Render CLI `deploys list` on `srv-dajddb67bikc73bl42q0`) |

---

## Tooling

| Path | Result |
| --- | --- |
| **cursor-ide-browser** | **BLOCKED** — `browser_tabs` creates a `viewId`, then the tab evaporates; `browser_navigate` / `browser_lock` return “No browser tab available” / “Browser view not found”. Repeated (active/side/newTab). |
| **Fallback used** | Headless system Chrome + CDP (`chrome-remote-interface` on `:9222`). Same live host. Equivalent steps: login → intro → `localStorage` guide keys → logout → next role → clear storage → role matrix. |

---

## Verdicts (summary)

| Claim | Verdict |
| --- | --- |
| Hosted SHA / deploy match | **PASS** |
| Asesor welcome / skip intro | **PASS** |
| Gerente fresh intro after Asesor (same browser) | **PASS** |
| Guide keys colon-scoped (not bare only) | **PASS** |
| Clear `localStorage` → Asesor fresh intro (DEVICE-LOCAL) | **PASS** |
| Non-admin `/administracion` deny | **PASS** (asesor, gerente, produccion, almacen, contabilidad) |
| Contabilidad `/finanzas` human Spanish | **PASS** |
| Owner `/administracion` allow | **FAIL** (same deny surface as non-admin) |
| **Overall onboarding isolation** | **PASS** |
| **Overall six-role admin gate** | **FAIL** (owner denied) |

---

## 1) Asesor → complete/skip intro

| Step | Evidence |
| --- | --- |
| Login `w2.asesor@isalwa.demo` | Landed `/inicio` |
| Intro visible | **Yes** — `[role=dialog]` “Bienvenido a ISALWA” |
| Dismiss | Dialog CTA clicked (`Omitir`/`Continuar`/`Entendido` path); dialog gone |
| Guide keys after | `["isalwa.os-web.guide.v1:01M2JKF77TXMJNDTKNCYNHH9G5:e6f13fdc-fb46-4382-b0d3-599a6d4a0676"]` |
| Logout via UI | **Yes** — “Cerrar sesión” → `/login` |

**Verdict: PASS**

---

## 2) Gerente same tab — fresh intro required

| Step | Evidence |
| --- | --- |
| Login `w2.gerente@isalwa.demo` | `/inicio` |
| Intro visible | **Yes** (did not inherit Asesor completion) |
| Pre-dismiss keys still showed Asesor scoped key only | Expected shared profile residue |
| After Gerente dismiss | **Two distinct keys** present |

**Verdict: PASS** (welcome/intro appeared for Gerente)

---

## 3) localStorage scope check

CDP equivalent of:

`JSON.stringify(Object.keys(localStorage).filter(k => k.includes('guide')))`

Observed keys:

- `isalwa.os-web.guide.v1:01M2JKF77TXMJNDTKNCYNHH9G5:e6f13fdc-fb46-4382-b0d3-599a6d4a0676`
- `isalwa.os-web.guide.v1:01M2JKF77TXMJNDTKNCYNHH9G5:cbf19e7a-9a2a-4a4c-8f87-619530a99bae`

| Check | Result |
| --- | --- |
| Distinct keys with `:` scope | **Yes** (`prefix:orgId:memberId`) |
| Bare-only `isalwa.os-web.guide.v1` writes | **None observed** |

**Verdict: PASS** — MEMBER-SCOPED writes, not browser-global bare key.

---

## 4) Clear storage → Asesor fresh intro (DEVICE-LOCAL)

| Step | Evidence |
| --- | --- |
| `localStorage.clear()` on login origin | guide keys `[]` |
| Re-login Asesor | Intro **visible again** |

**Verdict: PASS** — **DEVICE-LOCAL** confirmed (progress is browser `localStorage`, not server SoR).

---

## 5) Six-role brief matrix

For each role: login → dismiss intro if present → open `/administracion` → logout.

| Role | `/administracion` | Verdict |
| --- | --- | --- |
| asesor | Stays on `/administracion`; copy **“Sin acceso / No tiene permiso para ver esta sección.”** | **PASS_DENY** |
| gerente | Same deny copy | **PASS_DENY** |
| produccion | Same deny copy | **PASS_DENY** |
| almacen | Same deny copy | **PASS_DENY** |
| contabilidad | Same deny copy | **PASS_DENY** |
| owner | Same deny copy (“Sin acceso…”) | **FAIL_DENY** (expected allow for admin) |

### Contabilidad `/finanzas`

| Check | Evidence |
| --- | --- |
| URL | `/finanzas` |
| Human Spanish | **Yes** — “Finanzas operativas”, “Anote evidencia de pago reportada”, “No es contabilidad oficial…”, “Sin libro mayor” |
| Jargon (KPI/EBITDA/ARR/…) | **Not observed** |

**Verdict: PASS**

---

## Classification

| Dimension | Label |
| --- | --- |
| Guide storage | **MEMBER-SCOPED** device keys (`isalwa.os-web.guide.v1:{orgId}:{memberId}`) |
| Cross-member same browser | **Isolated** (Gerente still gets welcome) |
| Cross-device / cleared profile | **DEVICE-LOCAL** (fresh intro after clear) |
| Bare prefix writes | **Not used** in this hosted proof |

---

## Residuals

1. **cursor-ide-browser MCP unusable** in this session — proof via Chrome CDP fallback; do not claim IDE-browser interaction.
2. **Owner denied on `/administracion`** — same fail-closed copy as non-admin. Product gate is `people.admin` (not role name alone); Owner seed may lack that scope, or expectation needs `/sistema` for `system.admin`. Either way: **hosted allow for Owner on `/administracion` = FAIL**.
3. After welcome dismiss, UI may still show “Continuar recorrido (2 / 7)” coach chrome; welcome dialog isolation still held.

---

## Bottom line

**Onboarding isolation on live `1fd0167` / `dep-dakuhuad0e5s73ftrvng`: PASS** (A→B fresh intro, colon-scoped keys, DEVICE-LOCAL after clear, Contabilidad Spanish OK, non-admin admin deny OK).

**Owner admin allow on `/administracion`: FAIL.**
