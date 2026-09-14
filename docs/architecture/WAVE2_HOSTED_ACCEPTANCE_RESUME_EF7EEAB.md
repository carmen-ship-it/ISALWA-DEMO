# Wave 2 — Hosted acceptance resume (`ef7eeab`) — STOPPED on fixture gate

**Date:** 2026-09-14  
**Candidate / live SHA:** `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**Integration pin:** `316426f272bce29924ffd4991da88ffe7d421bbd` (unchanged)  
**Migrations run this pass:** **NO**  
**Redeploy this pass:** **NO**  
**DB migration count (prior Gate C):** **29** (not re-queried this pass — agent IP not allowlisted)

## Deploy confirmation

| Service | Live deploy | Commit | Status |
|---|---|---|---|
| os-api-staging (`srv-dajd64gae00c739gpk20`) | `dep-dak6lee1egvs739ajvig` | `ef7eeab…` | live |
| os-web-staging (`srv-dajddb67bikc73bl42q0`) | `dep-dak6n49594qs738j6ncg` | `ef7eeab…` | live |

API ready: `/v1/health` ok · `/v1/health/ready` ready · `devBootstrapEnabled=false` · DB check ok.

## Fixture tooling (separate from hosted app)

| Pin | Value |
|---|---|
| HOSTED_APP_SHA | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` |
| FIXTURE_TOOL_SHA | see `WAVE2_FIXTURE_TOOL_PIN.md` / git log for fixture tool commit |
| Execution this tooling pass | **NO** |

## BLOCKED LANE (operator run)

| Field | Value |
|---|---|
| BLOCKED LANE | Synthetic V1 role fixtures + 9-role homes / journeys / adversarial mutation gauntlet |
| BLOCKER TYPE | `CREDENTIAL_BLOCKED` (+ staging DB IP allowlist) until Carmen runs from allowlisted Mac |
| SAFE WORK COMPLETED | Fail-closed fixture tool committed; unit guards tested; hosted browser partial (Carmen); deploy SHA reconfirmed |
| UNBLOCK REQUIREMENT | Allowlisted `/32` + `STAGING_FIXTURE_CONFIRM=1` + run pinned FIXTURE_TOOL_SHA script once |

### Operator command (allowlisted IP only — do not run until authorized)

```bash
export STAGING_FIXTURE_CONFIRM=1
# plus OS_DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
```

Creates synthetic org **`ISALWA Wave2 Synthetic Roles (acceptance)`** — refuses real ISALWA Staging tenant / wrong DB / wrong Supabase.

## A. SYNTHETIC TENANT / FIXTURE IDS

**NOT CREATED** this pass (blocked).

Prior isolation Tenant B (no login) remains from earlier work: org `01M2DY317YNGMXCR59A82ZK829` (see isolation fixture JSON).

## B. SYNTHETIC USERS

**NOT CREATED.** Planned emails (script):

| Role | Email |
|---|---|
| Asesor Comercial | `w2.asesor@isalwa.demo` |
| Jefe Comercial | `w2.jefe@isalwa.demo` |
| Gerente General | `w2.gerente@isalwa.demo` |
| Encargado de Producción | `w2.produccion@isalwa.demo` |
| Encargado de Almacén | `w2.almacen@isalwa.demo` |
| Encargada de Compras | `w2.compras@isalwa.demo` |
| Contabilidad | `w2.contabilidad@isalwa.demo` |
| Auxiliar / Coordinación | `w2.auxiliar@isalwa.demo` |
| Owner / Manager | `w2.owner@isalwa.demo` |

## C. CAPABILITIES PER ROLE (planned / script — not yet granted hosted)

Exact from `V1_PLANNED_ASSIGNMENTS` (not broadened):

| Role | Capabilities |
|---|---|
| Asesor | `commercial.customer.create`, `commercial.quote.convert.own` |
| Jefe | `commercial.team.read` |
| Gerente | `management.org.read` |
| Producción | `production.operational.record`, `production.entry.member` |
| Almacén | `warehouse.finished_goods.receive`, `warehouse.finished_goods.allocate`, `warehouse.outbound.record` |
| Compras | `purchasing.operational.record` |
| Contabilidad | `finance.operational.record` |
| Auxiliar | `operations.coordinator.record`, `coordination.decision.record` |
| Owner | `management.org.read`, `system.admin` |

Explicitly **unassigned** on these fixtures: `delivery.record`, `commercial.order.convert`, `commercial.exception.authorize`, `production.review.member`, `people.admin`.

## D. REAL CUSTOMER MUTATIONS

**NONE** this pass.  
Hosted `/clientes` still shows exactly the seven: ALVAREZ, ASTRIX, GARCIA, MICRISTAL, TORREZ, VAINSA, IMPORTAMEC. No create/edit/delete performed on them.

## E. ROLE HOME RESULTS (9 roles)

| Role | Result | Notes |
|---|---|---|
| 1–9 synthetic | **BLOCKED** | Users not created |
| Carmen (admin session) | **PARTIAL** | `/inicio` management exception reading; truthful warehouse deny; production sequence visible; not a V1 business-home proof |

## F. HOSTED JOURNEYS A–I

| Journey | Starting role | Result | Notes |
|---|---|---|---|
| A Vender | Carmen / Modo Guiado | **PARTIAL** | Continuar navigated to `/clientes`; replay from Ayuda works |
| B Atender un Pedido | — | **BLOCKED** | Needs pedido + role |
| C Producción | Carmen | **PARTIAL** | Exact 11-step sequence hosted; write denied without `production.entry.member` |
| D Cumplir Pedido | — | **BLOCKED** | |
| E Entregar | — | **BLOCKED** | |
| F Resolver | — | **BLOCKED** | |
| G Coordinar | — | **BLOCKED** | |
| H Gerencia | Carmen | **PARTIAL** | Exception reading on Inicio; Sin registro empty states |
| I Owner lens | Carmen | **PARTIAL** | Admin nav present; not synthetic owner login |

## G. SECURITY / ADVERSARIAL

| Check | Result |
|---|---|
| Prior 17/17 hosted isolation smoke | **PASS** (prior pass on `ef7eeab`) |
| Extended adversarial mutation on synthetic tenant | **BLOCKED** (no fixtures / no DB from agent) |
| Warehouse mutation without scope (Carmen) | **PASS** (truthful deny: “Sin permiso de almacén… El cargo no basta”) |
| Production annotate without capability | **PASS** (copy: needs `production.entry.member`; cargo does not authorize) |
| Cross-tenant synthetic writes | **NOT RUN** |

## H. ISA BUSINESS-RULE REGRESSION

Artifact `V1_ISA_BUSINESS_RULE_REGRESSION.md` **not found** in tree this pass.

Hosted observations only:

| Rule (from acceptance brief) | Result |
|---|---|
| Production sequence Laboratorio→…→Almacén PT | **PASS** (UI lists exact 11 steps) |
| Receive ≠ allocate / Listo ≠ allocate | **PARTIAL** (copy present on Producción + Almacén) |
| Warehouse exit ≠ delivery | **PARTIAL** (Almacén copy) |
| Payment evidence non-ledger | **NOT_APPLICABLE** (not exercised hosted) |
| Unresolved mappings | **NOT invented** |

## I. UI HUMILIATION

Artifact `V1_UI_HUMILIATION_ACCEPTANCE.md` **not found**.

| Case | Result |
|---|---|
| Empty / Sin registro on Inicio | **PASS** |
| No-results search (`?q=ZZZ_NO_MATCH…`) | **PASS** (“Sin resultados”) |
| Permission denied (Almacén) | **PASS** |
| Narrow viewport / long names / volume | **NOT RUN** |
| Buscar button without query-param navigation | **PARTIAL** (fill+click did not navigate; `?q=` URL works) |

## J. MODO GUIADO

**PARTIAL**

- Persistent overlay + Continuar advances / navigates — **PASS**  
- Replay from Ayuda (`Repetir Vender`) — **PASS**  
- Dismissible (`Cerrar recorrido` → `Mostrar recorrido`) — **PASS**  
- Truthful limitations visible — **PASS**  
- Role-aware across 9 profiles — **BLOCKED** (single Carmen session)  
- Full 8-journey completion with real synthetic data — **BLOCKED**

## K. FEATURE PROOF MATRIX

See `V1_FEATURE_PROOF_MATRIX.md` — deploy/hosted rows updated; BROWSER_VERIFIED remains no for role gauntlet; Guided Mode → HOSTED P / Br P.

## L–R

| Item | Value |
|---|---|
| L DEPLOYED SHA | `ef7eeabdea5f8f4449ba706caa1a323435d96fcc` |
| M DB migration count | 29 expected (not re-counted) |
| N MIGRATIONS RUN | **NO** |
| O REDEPLOY | **NO** |
| P BROWSER_VERIFIED | **NO** (partial Carmen browser only; not 9-role gauntlet) |
| Q USER_ACCEPTED | **NO** |
| R INTEGRATION PIN | `316426f…` unchanged |
| S SAFE FOR ISA / ÁLVARO | **NO** |

## Remaining blockers before Isa / Álvaro

1. Allowlist (or allowlisted operator) + run `staging-wave2-role-fixtures.ts`  
2. Login as each of 9 roles → role-home PASS matrix  
3. Journeys A–I with synthetic chain through Pedido + thin ops  
4. Extended security/adversarial on synthetic tenant  
5. Full Isa business-rule + UI humiliation artifacts once present / applied  
6. Only then consider BROWSER_VERIFIED for acceptance scope
