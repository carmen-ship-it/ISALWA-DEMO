# Architect → OS Traceability

**Mode:** Read-only reconciliation  
**Date:** 2026-09-13  
**Rule:** Do not invent Álvaro/Isa answers. Empty `ws_isalwa` and unanswered matrices stay UNKNOWN.  
**Demo warning:** `apps/web` Pulso/Radar/Territorio/Señal and `packages/database` seed are **not** client policy (`COMMERCIAL_IMPLEMENTATION_READINESS.md`).

---

## Source authority (ranked)

| Rank | Source | What it is | What it is not |
|------|--------|------------|----------------|
| 1 | Live Supabase `architect_workspaces.data` for `ws_isalwa` | Runtime CompanyWorkspace JSONB | Not in git |
| 2 | `docs/uat/ISA_ALVARO_BUSINESS_QUESTIONS.md` | Open commercial policy questions | Unanswered |
| 3 | `INCREMENT_7_DISCOVERY_MATRIX.md` + `UPDATED_CLIENT_DECISIONS.md` | O-/A-/M-/F-/I-/AI-/H-/RD-* IDs | Almost all UNKNOWN |
| 4 | `ISALWA_REAL_COMMERCIAL_DOCUMENT_FIT.md` + `CLIENT_DATA_INTAKE_MAPPING_PLAN.md` | XLS structure + paper concepts (no PII) | Not answered policy |
| 5 | Planificación `COMMERCIAL_FEATURES` / `IMPLEMENTATION_PHASES` | Client-facing phase intent | Demo feature status ≠ production OS |
| 6 | `PRODUCT_BLUEPRINT.md` §0.3 | **Design premises to validate** | Not discovery answers |
| 7 | Demo universe / legacy `apps/web` | Synthetic UX salvage | Never OS business truth |

**Architect truth in repo:** PARTIAL — pilot shell + question registers + structural XLS/paper fit. Answered interview transcripts: **MISSING** from git (`NO_FABRICATED_CONTENT.md`; empty workspace seed).

---

## Commercial-first sequencing

| ID | Source | Intent | Status vs OS |
|----|--------|--------|--------------|
| `fase-0` | Planificación | Definición y preparación | In progress (Architect/Planificación) |
| `fase-1` | Planificación | **Base comercial** — auth, roles, API isolation | **IMPLEMENTED** in OS foundation |
| `fase-2` | Planificación | Operación comercial piloto (clientes, catálogo, cotización + real data) | **PARTIAL** — synthetic commercial OS; real data gated |
| `fase-3` | Planificación | WhatsApp + cobranzas | **DEFERRED** (capability LOCKED) |
| `fase-4` | Planificación | Finanzas, almacén, ops, producción, compras | **DEFERRED** |

**COMMERCIAL FIRST:** **CONFIRMED** by Planificación phases and Commercial lane posture — not by a signed Álvaro transcript in repo.

Later phases (Finance, Warehouse, Production, Purchasing, Logistics, WhatsApp live, AI): **after** commercial pilot, consistent with `fase-3`/`fase-4` and capability registry.

---

## Traceability table

Status vocabulary: `IMPLEMENTED` · `PARTIAL` · `MISSING` · `DEFERRED` · `BUSINESS DECISION REQUIRED` · `UNKNOWN`

| REQ ID / SOURCE | BUSINESS REQUIREMENT | ROLE | CURRENT OS HOME | STATUS | EVIDENCE | GAP / NEXT ACTION |
|-----------------|----------------------|------|-----------------|--------|----------|-------------------|
| **SAFE-INFRA** | Tenant isolation | All | Session → org from member | IMPLEMENTED | `os-session.ts`; ADR-0003 runtime | Hosted red-team still pending |
| **SAFE-INFRA** | AuthIdentity → Person → Member | All | Workforce + Supabase JWT | IMPLEMENTED | `prisma-workforce-store`; staging bootstrap | — |
| **SAFE-INFRA** | Audit / outbox / health | Ops | BusinessEvent, outbox, `/v1/health*` | IMPLEMENTED | Steps 11, 14–16 | Free Render: migrate via external URL |
| **RD-01** / **A-01** | Admin role display names | Admin | Scope keys + Spanish labels | PARTIAL | `scopes.ts`; `formatRoleKey` | Client-confirm titles; do not invent org chart |
| **RD-02** / **A-04** | Approval thresholds (discount/credit) | Manager | Approval machinery | DEFERRED / BUSINESS DECISION REQUIRED | G-08 not approved; thresholds UNKNOWN | Ask Isa/Álvaro; keep G-08 off |
| **RD-03** | Accounting provider | Finance | Finance LOCKED | DEFERRED | Capability `finance` | No AR UI |
| **RD-04** / **A-07** | Territory / geographic sales scope | Field / manager | `OsTerritory` stub; capability `territory` FUTURE | MISSING / BUSINESS DECISION REQUIRED | Schema name/code only; no assignment; no os-web map | Location/territory decision before real GPS |
| **O-01** | Departments | Admin | `OsDepartment` + ChangeDepartment | PARTIAL | Admin UI | Real dept names UNKNOWN |
| **O-02** | Admins vs managers vs ICs | All | Pilot read scopes, not `people.admin` | PARTIAL | `commercial.team.read` / `commercial.org.read` | Provisional; not persona policy |
| **M-01** | Customer creation process | MD admin | CreateParty API; **no os-web create** | PARTIAL | Party commands PASS; Clientes list-only | Add UI after policy; or admin-only intake |
| **M-08** | Commercial account owner rules | Manager | `ownerMemberId` on account/opp | PARTIAL | Party create sets actor owner | ReassignCommercialAccountOwner deferred |
| **XLS-A** | Staff cargo → roles | Admin | Labels: sales_rep, sales_manager, … | BUSINESS DECISION REQUIRED | Intake: ASESOR / JEFE COMERCIAL / GERENTE GENERAL | Map cargo → roleKey with Isa/Álvaro |
| **XLS-B** | Nombre comercial → Party | Sales | Party.displayName + customer role | ALIGNED (model) | Intake mapping | Importer NOT YET; REAL_DATA_ALLOWED=NO |
| **XLS-B** | Contact name/phone | Sales | Contact | ALIGNED (model) | Intake mapping | Normalize phones on import |
| **XLS-B** | GPS Maps URL | Field | Location | IMPLEMENTED (model) | `CreateLocation` + `provenanceUrl`; coords optional | Importer + map UI deferred |
| **UAT-Q1** / **G-02** | Who converts quote → order | Sales / manager | CreateOrder gated | BUSINESS DECISION REQUIRED | Decision brief UNKNOWN | No conversion CTA until answered |
| **UAT-Q2–Q3** | Cotización vs Nota de Entrega | Sales / ops | Quote + Order only; no DN | BUSINESS DECISION REQUIRED | Document fit: treat as D | Do not model DN |
| **UAT-Q4** | Document numbering | All | `quoteNumber` `Q-######` | PARTIAL | commercial-command-service | Yearly/branch rules UNKNOWN |
| **UAT-Q5** | “Factura a” | Sales / fiscal | FiscalIdentity on Party; not on Quote | GAP / BUSINESS DECISION REQUIRED | Document fit | Expose NIT carefully after meaning confirmed |
| **UAT-Q6** | Multi-local / delivery points | Field | — | UNKNOWN | Intake: not in XLS | Confirm with Isa/Álvaro |
| **UAT-Q7** | GPS meaning (store / delivery / visit) | Field | — | UNKNOWN | UAT Q7 unanswered | Same Location decision |
| **UAT-Q8** | Catalog vs free-text lines | Sales | Free-text QuoteLine; optional productRef | PARTIAL | Document fit | Catalog policy UNKNOWN |
| **UAT-Q9** | Discounts / who approves | Manager | headerDiscount fields; no policy UI | BUSINESS DECISION REQUIRED | Adjacent G-08 | Keep off until answered |
| **pulso** (Planificación) | Executive commercial pulse | Owner / manager | `/inicio` attention/work | PARTIAL | Honest list; no fake KPIs | Not Pulso demo vitals — correct |
| **radar** | Prioritized attention | Sales / manager | Attention projection | PARTIAL | Inicio / Trabajo | Not demo Radar |
| **personas** | Cliente 360 | Sales | `/clientes/[id]` | PARTIAL | Opp/quote/historial | NIT/GPS/WA missing |
| **territorio** | Map + coverage | Field | os-web ABSENT; legacy `apps/web` demo | MISSING (OS) / DEFERRED | Capability FUTURE | Do not show map to Isa/Álvaro |
| **senal** | WhatsApp inbox | WA operator | Mensajes LOCKED | DEFERRED | I-02 UNKNOWN; MessagingProvider mock | Meta Cloud API later |
| **cierre** | Quote → order → invoice → pay | Sales / finance | Quote submit; Order gated; Finance LOCKED | PARTIAL | os-commercial | Stop at submitted quote until G-02 |
| **I-02** | WABA / numbers by purpose | WA / admin | — | UNKNOWN / DEFERRED | Discovery matrix | Ask before Meta live |
| **AI-01/02** | AI suggest vs human-approve | All | AiProvider mock; ADR-0009 | DEFERRED | Capability off | No invented AI use cases |
| **H-01** | Primary admin after Carmen | Owner | Staging bootstrap Carmen | PARTIAL | staging-supabase-bootstrap | Confirm permanent admin |
| **PRODUCT_BLUEPRINT §0.3** | Field advisors + visits + WA | Field | Visits not in os-web; WA locked | UNKNOWN / design premise | Premises to validate | Confirm vs Álvaro before building visits |
| **PRODUCT_BLUEPRINT §0.3** | 3 corporate WA numbers | WA | — | UNKNOWN / design premise | Premise #3 | Confirm I-02 |

---

## Role / persona reconciliation

| Evidence tier | Persona / title | Architect status | Current os-web |
|---------------|-----------------|------------------|----------------|
| XLS staff cargo (structure only) | ASESOR DE VENTA, JEFE COMERCIAL, GERENTE GENERAL | Job titles in sheet — **not** OS scopes | Map undecided (XLS-A) |
| PRODUCT_BLUEPRINT (premise) | Propietaria, Gerente, Asesor, Operadora WA, Cobranzas | Design — **validate** | Same `/inicio`; Admin if `people.admin`; Mensajes/Finanzas locked |
| OS scopes | people.admin, master_data.admin, member_active commercial | Implemented | Admin nav probe only |
| Álvaro answered org chart | — | **MISSING** in repo | Do not invent |

Default landing: **all → `/inicio`**. Territory scope: **none**. Approval authority: machinery exists; **ISALWA matrix UNKNOWN**.

---

## Current commercial UI vs Architect

| Screen | Álvaro/Architect requirement satisfied? | Primary role | ISALWA wording | Missing vs discovery |
|--------|----------------------------------------|--------------|----------------|----------------------|
| Inicio | Attention/work (radar-like), not Pulso KPIs | All | Mostly Spanish | Role-shaped home; English stage leaks elsewhere |
| Clientes | Search Party (M-01 partial) | Sales | Spanish | No create client; no territory filter |
| Cliente 360 | personas / PartyGraph | Sales | Spanish | NIT, address, WA, GPS |
| Oportunidades | Pipeline (premises) | Sales | **English stage `open`** | Confirmed stages UNKNOWN |
| Cotizaciones | Paper line economics FIT | Sales | Strong | Print/PDF; Factura a; pedido dead-end (honest) |
| Historial | Timeline from events | Sales | Titles Spanish; facts may be English | Label domain values |
| Equipo | Admin self-service | people.admin | Spanish | Cargo mapping; member historial stub |

---

## Territory / map / location

| ARCHITECT REQUIREMENT | CURRENT OS SUPPORT | GAP |
|----------------------|--------------------|-----|
| A-07 / RD-04 territory scope | `OsTerritory` tree stub; no member assignment | Policy + assignment + UI |
| XLS GPS / Maps URL | Location (`os_locations`) | IMPLEMENTED (model); import/map deferred |
| Field visit planning | Not in os-web | UNKNOWN need vs premise |
| Map UI | Absent in os-web; synthetic demo in `apps/web` | Do not ship demo as ISALWA |

---

## WhatsApp

| Discovery | Technical plan | Align? |
|-----------|----------------|--------|
| Premise: corporate WA, field follow-up (PRODUCT_BLUEPRINT) | Meta Cloud API direct; OS owns conversation/assignment; Meta owns transport | **Aligned direction** |
| I-02 WABA/numbers | UNKNOWN | **Diverges until answered** |
| Who uses / inbound-outbound / collections vs sales | UNKNOWN in answered form | Do not invent lanes |
| Live | NO | Correct |

---

## AI

| ACTUAL ISALWA NEED (answered) | FUTURE CAPABILITY |
|------------------------------|-------------------|
| **None recorded** in repo answers | ADR-0009 provider-neutral suggest/draft; no autonomous writes |

---

## Business documents

| Evidence | OS | Fit |
|----------|-----|-----|
| Paper cotización lines/totals | Quote / QuoteLine UI | ALIGNED |
| Document # / Factura a / address / DN | Partial / gap / not modeled | CONDITIONAL |
| G-02 pedido | Blocked pending decision | Correct honesty |

---

## Drift check

### SAFE GENERIC INFRASTRUCTURE
Tenant isolation · Supabase auth mode · scopes · outbox · projections · health/ready · capability LOCKED banners · free-text quote lines · owner-scoped commercial reads for non-admin.

### BUSINESS DRIFT (or unverified assumptions)
| Item | Classification |
|------|----------------|
| Opportunity stage default `'open'` (English) | **BUSINESS DRIFT / UX** — not from Architect answers |
| Treating demo Pulso/Radar/Territorio as production IA | Avoided in os-web (good); Planificación still marks demo features “completado” | Document honesty only |
| `sales_manager` label without org-wide commercial view | **PARTIAL mismatch** with gerente premise — not proven Álvaro rule |
| Invented approval thresholds / DN / territory rules | **Not implemented** (correct) |
| Quote numbering `Q-######` | Safe placeholder until UAT-Q4 |

---

## Related parallel audits (2026-09-13)

- UI red team: CONDITIONAL readiness; P0 English stages, no client create, quote→pedido dead-end wording.
- Tenant/auth: architecture PASS; hosted verification NOT YET.
- Data/WhatsApp/AI: REAL_DATA_ALLOWED=NO; WA/AI READY FOR LATER, LIVE=NO.

---

## Exact next action (traceability lane)

Keep staging deploy as sole writer until HTTPS Carmen smoke passes; then use this table + `ISA_ALVARO_BUSINESS_QUESTIONS.md` for Isa/Álvaro answers — **do not** expand map/WA/AI/DN before those answers.
