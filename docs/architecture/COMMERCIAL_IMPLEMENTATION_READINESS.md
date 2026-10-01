# Commercial Implementation Readiness

**Lane:** G — Commercial (Step 16+)  
**Date:** 2026-08-24  
**Status:** ANALYSIS ONLY — no Commercial runtime, no `packages/os-commercial`, no UI build  
**Scope constraint:** Does not modify runtime packages or Lanes C, D, E, F  
**Binding predecessors:** `LEGACY_PRODUCT_SALVAGE_REGISTER.md`, `UI_REBUILD_PRINCIPLES.md`, ADRs 0003–0012, `STEP_9_SHARED_CONTRACTS_SPEC.md`

This document prepares Commercial so implementation can begin the moment Work (E) and Query/Projection (F) gates pass. It does not authorize implementation now.

**Authority rules used here:**

- Do not invent ISALWA policy. Client decisions remain `UNKNOWN` / `REQUIRES_CLIENT_CONFIRMATION` unless already recorded.
- Do not invent KPIs. Command Center consumes contracts, not fabricated vitals.
- Do not change salvage classifications without new evidence. Classifications below cite `LEGACY_PRODUCT_SALVAGE_REGISTER.md`.
- Do not treat legacy Pulso / Radar / Personas / Cierre as the production information architecture. Planificación: *Centro de comando ≠ prototipo Pulso*.

---

## READY FOUNDATION DEPENDENCIES

These exist and Commercial may **consume** them. They are not Commercial implementation.

| Dependency | Evidence | What Commercial can use |
|------------|----------|-------------------------|
| Tenant isolation (`organizationId` from session) | Step 10 VERIFIED; `os-api` tenant tests | Every Commercial command/query |
| Person / Member / AuthIdentity | Step 10 PASS | Owner, actor, session — never legacy `User` |
| Effective-dated Role / Dept / Manager / Delegation | Step 10 TESTED | Authorization evaluation order §5.4 |
| Admin scopes (`people.admin`, `master_data.admin`, `fiscal.admin`, `org.admin`) | `os-contracts` `scopes.ts`; RD-01 placeholders | Command gating; display labels still client-configurable |
| BusinessEvent + AuditLog + transactional outbox | Step 11 PASS (InviteMember + Party + Work paths transactional) | Emit Commercial events on the **same** spine — never `ActivityEvent` |
| PartyGraph commands | Step 12 PASS | `CreateParty`, roles, contacts, lead resolve, governed merge |
| `CommercialAccount` lens (customer role) | Step 12 PASS; `os_commercial_accounts` | Quotes/orders attach here, not a second customer master |
| `GET /v1/parties/:id` | Step 12 | Customer dossier identity chapter (Party + roles + contacts + account lens) |
| `GET /v1/parties` (`SearchParties`) | `os-query` PartyQueryService + `PartiesController` | Search-first customer list / command palette hits |
| WorkItem + ApprovalRequest commands | Step 14 PASS | Follow-ups, quote/discount/merge approvals, reassignment |
| `GET /v1/work-items/:id` | Step 14 | Single-work detail |
| `GET /v1/members/:id` | Step 10 | Owner names in Commercial UI |
| Design system `@isalwa/ui` | Salvage **REUSE** | All production UI — no second library |
| Money as bigint centavos + ULID | Salvage **REUSE**; API contract | Quote/order amounts and ids |
| Spanish product vocabulary (EXTRACT) | Salvage §9; UI principles §5 | User language; hide spine terms |
| Provider adapter pattern | Salvage **REUSE** / **ADAPT** | Maps / future WhatsApp — not vendor in UI |
| Capability registry table | `OsCapabilityState` in `os-database` | Honest LOCKED banners (Finance, Warehouse, Messaging) |
| Planificación Commercial lane posture | `command-center.ts`, `finance-dependency.ts`, `party-lifecycle.ts` | Commercial first capability; Finance LOCKED; Party as customer master |

**Not ready for Commercial consumption as production truth:** legacy `Account`, `Invoice.balance`, `ActivityEvent`, `apps/web` data bindings, demo Pulso KPIs.

---

## MISSING FOUNDATION DEPENDENCIES

Commercial **must not start** until the items marked **GATE** below pass. Items marked **PARALLEL** may land with Commercial but are not Lane G work.

### GATE — Lane E (Work / Approval / Attention)

Step 14 gate is **PASS** for commands. Commercial still needs the **query/attention surface** that Step 14 deferred to Lane F:

| Missing | Why Commercial needs it | Owner |
|---------|-------------------------|-------|
| AttentionItem **projection** (derived, auto-resolving) | Inicio / prioridades; not a second task table | F (E supplies `work.*` / `approval.*` events) |
| `ListOpenWork` query | Trabajo / Aprobaciones list; manager team queue | F |
| `GetApproval` query | Pending approvals inbox | F |
| Work subject validation for `commercial_account` | Quote/visit work attached to account lens | E residual + G when account exists |
| Blocker subtype (DG-03) | “Trabajo bloqueado” without inventing a second work system | E follow-up — UNKNOWN shape until specified |
| Collaborators / watchers | Multi-person account work (foundation spec) | DEFERRED Step 14 — do not invent |

### GATE — Lane F (Query / Projection)

No `STEP_15_*_EVIDENCE.md` exists. `packages/os-query` has Party search + a **Work projection boundary stub** (`WorkProjectionBoundary` with optional handler — no Attention persistence).

| Missing | Why Commercial needs it | Owner |
|---------|-------------------------|-------|
| Step 15 gate VERIFIED | Shared-contracts order: Step 15 before Step 16 | F |
| AttentionItem read model + freshness | Command Center ranked list | F |
| Timeline / activity projection from `BusinessEvent` | Cliente historial; Memoria successor | F |
| Changed-items / recent-events query (authorized, scoped) | “Qué cambió” without vanity dashboards | F |
| `GetCapabilityState` HTTP query | Hide LOCKED lenses; honest gaps | F |
| Projection freshness on Commercial reads | Stale banner, never silent | F |
| Search index beyond Party (work, quotes — quotes after G exists) | Command palette | F, then G |
| Outbox consumer host (long-running worker) | Step 11 DEFERRED worker process | D operational — F cannot stay current without it |

### GATE — still required from C / A (not G)

| Missing | Evidence | Blocks |
|---------|----------|--------|
| `ReassignCommercialAccountOwner` | Step 12 DEFERRED; spec listed in Step 9 §9 | Ownership / reassignment admin |
| `TerritoryAssignment` (member ↔ territory, effective-dated) | FG-02 planned; `OsTerritory` exists, **no assignment table** | Territory-scoped visibility |
| Fuzzy duplicate scoring | Step 12 exact NIT only | Import / WhatsApp match quality |
| Admin product UI (`apps/os-web`) | Steps 10–14 HANDOFF_GAP | Carmen-disappearance for master data |
| Territory policy (RD-04) | Client UNKNOWN | Production territory tree and reassignment rules |

### NOT a Commercial v1 gate (must wait or stay honest)

| Missing | Status | Commercial v1 behavior |
|---------|--------|------------------------|
| Finance adapter / `FinanceProjection` | LOCKED (RD-03) | No AR KPIs; “Finanzas no conectada” |
| WhatsApp Cloud API | Integration DEFERRED (I-02 UNKNOWN) | Mensajes lens hidden or mock-free empty; no fake inbox |
| Product catalog as OS entity | Not in `os-*` | Quote builder needs catalog projection — **G creates it** after F query pattern exists |
| Opportunity / Quote / Order / Visit / PriceObservation tables | Not in `os-database` | **G creates** on OS spine after gates |
| Commercial event types in `os-contracts` | Foundation registry has workforce/party/work only | **G + D CROSS-LANE** to register `quote.*`, `visit.*`, … |
| AI package | `packages/os-ai` planned | Suggest later; never auto-commit |

---

## CLIENT DECISIONS

Do not manufacture answers. Sources: `UPDATED_CLIENT_DECISIONS.md`, `INCREMENT_7_DISCOVERY_MATRIX.md`, Planificación derive questions (`governanceStatus: propuesta` / `pendiente`).

### Blocks polished Commercial v1 (or specific features)

| ID | Topic | Status | Commercial impact if unanswered |
|----|-------|--------|----------------------------------|
| **RD-02** / A-04 | Discount %, credit limit, merge approval thresholds | UNKNOWN | Approval **machinery** can ship; **numeric** credit/discount blocks cannot |
| **RD-04** / A-07 | Territory model / geographic sales scope | UNKNOWN | Territory **entity** exists; names, hierarchy, reassignment rules cannot be invented |
| **M-01** | Who creates customers, from which channel, which fields | UNKNOWN | Capture form defaults and “mínimo de captura” |
| **M-03** | Distributor/partner vs customer overlap | UNKNOWN | Multi-role UX copy; not the PartyGraph itself (architecture approved) |
| **M-04** | Duplicate rules beyond exact NIT | UNKNOWN | Match queue policy |
| **M-08** | Commercial account owner assignment rules | UNKNOWN | Owner default (creator vs territory vs manager) |
| **F-07** | Who approves credit / holds | UNKNOWN | Quote block on credit — only when Finance ACTIVE; while LOCKED show unverified |
| **A-03** | Who changes finance-visibility roles | UNKNOWN | Admin role change class A vs B labels |
| **O-01** | Department names | UNKNOWN | Role-aware nav labels (not architecture) |
| **AI-01 / AI-02** | What AI may suggest vs never automate | UNKNOWN | AI stays off until answered; architecture already forbids silent money/merge |

### Does **not** block Commercial v1 skeleton (placeholders exist)

| ID | Topic | Placeholder |
|----|-------|-------------|
| **RD-01** | Admin role **display** names | Scope keys; labels editable later |
| **RD-03** | Accounting vendor | Finance LOCKED; no vendor in Commercial UI |
| **RD-06** | Email/password self-service | Auth provider owns credentials |
| **I-01** | Email provider | Notifications can wait |
| **I-02** | WABA / 3 numbers | Mensajes capability LOCKED until connect |
| **F-01–F-06** | Accounting operations | Finance lane, not Commercial authority |

### Planificación-derived Commercial requirements (not client-approved facts)

These are **architecture proposals** until ISALWA marks them `aprobado`:

- One Party identity — no WhatsApp/Excel/CRM customer silos (`identity-entry.ts`, `party-lifecycle.ts`)
- CommercialAccount is a **lens** on Party (`party-lifecycle.ts`)
- OS authoritative for opportunity, quote, commercial order, price memory, communication, commercial promise; external accounting authoritative for official invoice / AR (`finance-dependency.ts`)
- While Finance LOCKED: no fabricated AR; Command Center says not connected
- While Warehouse LOCKED: “disponibilidad no conectada — promesa comercial no verificada”
- AI never silent merge, never silent price/credit/fiscal (`ai-authority.ts`)
- Demo Pulso/Radar/Personas/Cierre/Señal/Territorio are **demo features** (`COMMERCIAL_FEATURES` statusNote: demonstration data, not ISALWA facts)

Pilot workspace `ws_isalwa` has **no operational ISALWA commercial facts**. Do not treat demo universe as client policy.

---

## LEGACY SALVAGE MAP

Classifications **unchanged** from `LEGACY_PRODUCT_SALVAGE_REGISTER.md` unless noted. “Commercial use” is consumption guidance only.

### Named assets (this lane’s required list)

| Asset | Salvage class | Evidence | Commercial use | Do not inherit |
|-------|---------------|----------|----------------|----------------|
| **Quote builder** (`quote-canvas.tsx`) | **ADAPT** | Salvage §8, §13.2 | Rebind to `CreateQuote` / revise / send commands; keep line editor, last-price chip, discount display, BOB formatting | `API_BASE` posts; `accountId` as master; invoice side-effects |
| **Customer dossier** (`personas/[id]/page.tsx`) | **REBUILD** bindings; IA **EXTRACT** | Salvage §8: page REBUILD; dossier field set EXTRACT from `AccountsService.dossier` | One-scroll Cliente 360: identity, contacts, historial, precios, visitas, mensajes dock, acciones | `Account` DTO, `openBalance` as truth, seeded `aiSummary` as production AI, `relationshipScore` as authority |
| **Command palette** | **ADAPT** | Salvage §8 | Global search + Spanish commands on OS queries | Hard-coded Pulso/Radar/Personas routes as final IA; unauthenticated `/v1/search` |
| **Radar** | **ADAPT** (UX); **EXTRACT** (ranking idea) | Salvage §1 AttentionItem ADAPT; §7 RadarController EXTRACT; §8 radar page ADAPT | Ranked **prioridades** from AttentionItem projection — not a permanent top-level “Radar” product | Collections KPIs while Finance LOCKED; demo scoring as production ranking |
| **Pulso concepts** | **ADAPT** layout; **EXTRACT** PulseService sentence | Salvage §7 PulseService EXTRACT; §8 pulso ADAPT; Planificación: not copy Pulso as truth | **Inicio / Centro de mando**: one honest narrative + ranked attention + work — capability-gated | Fabricated sales/cartera/WhatsApp vitals; 40-tile dashboard |
| **Territory** | **ADAPT** (entity + UX) | Salvage §1 Territory ADAPT; §8 territorio ADAPT; Mission 16 map **ADAPT** | Map + filters + drawer on Party locations + territory scope | `Account.territoryId` required legacy model; routing/heatmaps (Mission 16 out of scope) |
| **Messaging UI** (`senal`, `signal-conversation.tsx`) | **ADAPT** | Salvage §8 | Thread + customer dock when Messaging ACTIVE | `MessagingChannel` as SoR; scraping; fake SLA numbers |
| **Timeline** | **ADAPT** UI (`Timeline` REUSE); **EXTRACT** catalog + read pattern | Salvage §2 Timeline REUSE; §4 catalog EXTRACT; §6 `listAccountTimeline` EXTRACT | BusinessEvent projection; chapters in employee language | `ActivityEvent` writer; per-module feeds |
| **Price memory** | **EXTRACT** (`lastPrice` in CommerceService) | Salvage §7 | `PriceObservation` append-only on CommercialAccount | Overwriting list price; AI silently changing unit price |
| **Visits** | **EXTRACT** check-in / geofence flow | Salvage §7 VisitsController; §8 check-in ADAPT | Visit commands + events; mobile-first | GPS as labor surveillance policy (client UNKNOWN) |
| **Empty states** | **REUSE** | Salvage §2 `EmptyState`; §8 skeletons REUSE | Teach one next action | Blank panels; demo-tour copy as production help |
| **Design tokens** | **REUSE** | Salvage §2; constitution | Porcelain / kiln / glaze; 8px; Newsreader titles | New visual language |

### Supporting salvage (Commercial-relevant, unchanged)

| Artifact | Class | Note |
|----------|-------|------|
| `Button`, `Panel`, `StatusPill`, `MetricCard`, `ListRow`, `Chip`, `PageContainer`, `ExperienceHeader`, `SearchField` | **REUSE** | Compose only |
| `CommercialEventIcon` | **ADAPT** | Map to unified OS event registry |
| `app-shell.tsx` 7-experience NAV | **ADAPT** | Role-aware production shell — not copy seven names |
| `global-hotkeys`, `shortcut-sheet`, `toast-provider`, `animated-value`, `reading-progress`, `lib/motion.ts` | **REUSE** | Shell |
| `lib/api.ts` | **REBUILD** | Session + OS error envelope |
| `lib/preferences.ts` | **ADAPT** | Favorites/recents keyed by Member id |
| `lib/demo-mode.ts` | **RETIRE** | No demo mode in OS tenant |
| `payment-form.tsx` | **REBUILD** | Not inline ledger; Finance ingest later |
| `guided-tour.tsx` / `intro-experience.tsx` | **ADAPT** | First-run for real company — UNKNOWN depth |
| Legacy `User`, `Account` as Party, `Invoice`/`Payment` as finance authority, `ActivityEvent` as spine | **RETIRE** | ADR-0012 / FG-01 / FG-03 |
| `COMMERCIAL_EVENT_CATALOG` (17 types) | **EXTRACT** | Seed OS registry via D-lane review — do not extend legacy catalog |
| `money()` BOB helper | **REUSE** | Shared util |
| Seed `universe.ts` / `validate.ts` | **EXTRACT** | E2E fixtures — not production data |
| `EXPERIENCE_ROUTES` | **EXTRACT** | Inform route map; employee terms in §NEW UI TARGET override demo names |

**Critical salvage risks (unchanged):** do not reuse `Account` types in new UI; do not copy `Invoice.balance` into dashboards; do not emit `ActivityEvent` from new commands; do not keep two permanent UIs — `apps/web` retires at Commercial parity on `apps/os-web`.

---

## NEW UI TARGET

Production app: **`apps/os-web`** (planned). Not an in-place rewrite of `apps/web` data layer.

### Philosophy

- Real-company UX: little/no training, few clicks, Spanish-first (es-BO), role-aware, contextual.
- Departments are **lenses** on one shell — not mini-apps.
- Hide: Party, PartyRoleAssignment, WorkItem, AttentionItem, CommercialAccount, projection, outbox.
- Show: Cliente, Cotización, Pedido, Pendiente, Aprobación, Mensaje, Territorio.
- Empty states teach **one** action. Errors use `ApiError.message` + recovery.
- Finance / Almacén / Mensajería LOCKED → honest unavailable, never fake numbers.

### Employee information architecture (proposed production)

Legacy seven (Pulso, Radar, Personas, Territorio, Señal, Cierre, Memoria) is **reference only**. Target primary nav:

```
Inicio
Clientes
Oportunidades
Cotizaciones
Pedidos
Mensajes          [hidden unless Messaging ACTIVE]
Territorio        [hidden unless Commercial ACTIVE + territory scope]
Trabajo           [Pendientes + Aprobaciones]
Admin             [scopes only]
```

| Nav item | Employee job | Spine (hidden) | Capability gate |
|----------|--------------|----------------|-----------------|
| **Inicio** | “Qué me toca ahora” | Attention + open work + recent authorized changes + one-sentence health | Always (content capability-gated) |
| **Clientes** | Find / open customer | SearchParties `roleKey=customer` + CommercialAccount | Commercial ACTIVE |
| **Oportunidades** | Pipeline of open commercial work | Opportunity on CommercialAccount | Commercial ACTIVE |
| **Cotizaciones** | Create / send / accept quotes | Quote commands + list query | Commercial ACTIVE |
| **Pedidos** | Confirmed commercial orders | Order commercial state (not official invoice) | Commercial ACTIVE |
| **Mensajes** | Reply in context | Message artifacts linked to Party | Messaging ACTIVE |
| **Territorio** | Who is where; check-in | Territory scope + locations | Commercial ACTIVE |
| **Trabajo** | My pendientes + approvals | WorkItem + ApprovalRequest | Always for members |

**Historial** is not a top-level app. It lives on the Cliente dossier (and later a filtered “qué pasó” on Inicio). That replaces demo Memoria as a separate religion.

### Role-aware shells (architecture — not invented org chart)

| Actor (generic) | Sees | Does not see |
|-----------------|------|----------------|
| Asesor | Own / territory clientes, own work, quotes, check-in | Admin, integration health, GL, other territories |
| Gerente | Team work, approvals, territory rollup | Other territories unless scoped |
| Operador mensajes | Mensajes + customer dock | Pricing cost, credit admin |
| ISALWA admin | Master data + equipo | Raw schema, engineering tools |
| Finance role | Only when Finance ACTIVE: projections | Official ledger editing in OS |

Exact ISALWA titles: **RD-01 / O-01 UNKNOWN**.

### Minimal-click paths (UI principles §6)

| Job | Path |
|-----|------|
| Nueva cotización | Cliente → Cotizar (1) → canvas prefilled |
| Check-in | Cliente or Territorio → Check-in (1–2) |
| Responder WhatsApp | Mensajes thread (in context) |
| Reasignar | Trabajo → Reasignar → miembro |
| Alta cliente | Clientes → Nuevo → search-first duplicate check |

Progressive disclosure: (1) nombre / teléfono / segmento (2) NIT / contactos / ubicaciones (3) fusión / fiscal / crédito = governed (4) integraciones = admin.

### Cliente 360 chapters (EXTRACT IA from dossier; REBUILD data)

Single scroll, not a tab farm:

1. Identidad (nombre, segmento, owner, territorio)  
2. Próxima acción (attention + work on this cliente)  
3. Historial (BusinessEvent timeline)  
4. Cotizaciones / pedidos  
5. Precios negociados (PriceObservation)  
6. Visitas  
7. Mensajes (dock; empty if Messaging LOCKED)  
8. Notas / pendientes  

**Omit from v1 as authority:** open AR balance, predicted next order, seeded AI briefing, credit limit — unless Finance ACTIVE and client policy exists. May show “no verificado” for credit, never a fake Bs amount.

### Mobile vs desk

- Field: Territorio, check-in, dossier read, message reply, short quote.  
- Desk: quote canvas, Inicio, lists.  
- PWA: PLANNED in EMP — not verified.

---

## COMMANDS REQUIRED

### Already on OS (consume — do not reimplement)

Workforce, PartyGraph, Work/Approval as listed in `handoff-manifest.yaml` / Step 12 / Step 14.

Commercial-adjacent **missing** from C:

| Command | Class | Why |
|---------|-------|-----|
| `ReassignCommercialAccountOwner` | A/B (policy UNKNOWN M-08) | Owner change without Carmen |

### Commercial v1 command set (Lane G — not implemented)

Register in `os-contracts` with **D-lane review** for new event types. Payloads TBD at implementation; names are the contract intent.

| Command | Class | Auth (proposed) | Emits (EXTRACT catalog → OS names) | Depends on |
|---------|-------|-----------------|-------------------------------------|------------|
| `CreateOpportunity` | A | member + territory | `opportunity.created` (new type — not in legacy 17) | CommercialAccount |
| `UpdateOpportunity` | A | owner / manager | `opportunity.updated` | — |
| `CloseOpportunity` | A | owner / manager | `opportunity.closed` | — |
| `CreateQuote` | A | member | `quote.created` | Account + catalog |
| `ReviseQuote` | A | owner | `quote.revised` | Version, don’t erase |
| `SendQuote` | A | owner | `quote.sent` | Messaging optional |
| `AcceptQuote` | A | owner / policy | `quote.accepted` | Human; not AI |
| `RejectQuote` | A | owner | `quote.rejected` (if added — UNKNOWN if needed) | — |
| `ConfirmOrder` | A | member | `order.confirmed` | From accepted quote |
| `RecordPriceObservation` | A | system or member | (payload on quote events or dedicated) | Append-only |
| `ScheduleVisit` | A | member | `visit.scheduled` | Party location |
| `CompleteVisit` / `CheckInVisit` | A | member | `visit.completed` | Geofence policy UNKNOWN |
| `CreateCommercialNote` | A | member | `note.created` | Subject = account |
| `RequestInvoiceIssuance` | A | member | `invoice.requested` | Finance LOCKED → attention only |
| `RecordCommercialPromise` | A | member | `promise.made` | Commercial object; not official AR |
| `RequestDiscountApproval` | B | member | `approval.requested` | RD-02 thresholds UNKNOWN — flag only until client |
| `CreateCustomer` UI path | A | `master_data.admin` or governed sales capture | uses `CreateParty` + `AssignPartyRole(customer)` | Search first |

**Do not add in v1:** official `invoice.issued` / `payment.allocated` as OS authority (Finance / external). Commercial may **request** invoice; issuance is external when connected.

**Idempotency:** `Idempotency-Key` on all; `If-Match` version on Quote/Opportunity/Order.

---

## QUERIES REQUIRED

### Specified in handoff / `OS_QUERY_NAMES` (Lane F)

| Query | Commercial use | Status now |
|-------|----------------|------------|
| `SearchParties` | Clientes + palette | Partial (HTTP list exists) |
| `GetParty` / `GetPartyRoles` | Dossier identity | Partial (`GET /v1/parties/:id`) |
| `ListOpenWork` | Trabajo | **DEFERRED** (no list HTTP) |
| `GetApproval` | Aprobaciones | **DEFERRED** |
| `GetCapabilityState` | Nav + honesty | Table exists; **no HTTP** in contracts usage |
| `GetMember` / `ListMembers` | Owners | Partial (GetMember) |
| `GetMemberEffectiveAuth` | Shell permissions | Specified; `asOf` required |
| `GetFinanceProjection` | LOCKED | Must return locked/unavailable — never fake AR |
| `GetIntegrationHealth` | Admin ops — **not** sales Inicio | Specified |

### Additional queries Commercial v1 needs (F + G read models)

| Query | Purpose | Source events / rows |
|-------|---------|----------------------|
| `GetCommercialAccount` | Lens for cliente | `os_commercial_accounts` + Party |
| `ListCustomers` | Clientes list (territory/owner filters) | Party search `roleKey=customer` + account projection |
| `GetCustomer360` | Dossier aggregate | Party + account + timeline + open work + quotes |
| `ListOpportunities` | Oportunidades | Opportunity projection |
| `GetOpportunity` | Detail | — |
| `ListQuotes` | Cotizaciones | Quote projection |
| `GetQuote` | Canvas load | — |
| `GetLastPrices` | Price memory on canvas | PriceObservation |
| `ListOrders` | Pedidos | Order projection |
| `ListVisits` / `GetVisit` | Campo | Visit events |
| `ListAccountTimeline` | Historial | BusinessEvent by Party/account |
| `ListAttention` | Inicio ranked list | AttentionItem projection |
| `ListChanged` | Inicio “cambios” | Recent authorized events (not a KPI) |
| `Search` (global) | Palette | Parties + work + quotes (quotes after G) |
| `ListTerritoryPoints` | Territorio map | Locations + account health **without** fake finance |

All queries: cursor pagination, tenant from session, territory scope, capability deny, freshness metadata.

---

## EVENTS REQUIRED

### Already on OS registry (do not duplicate)

`party.*`, `contact.*`, `lead.*`, `work.*`, `approval.*`, `member.*`, `delegation.*`.

### EXTRACT from `COMMERCIAL_EVENT_CATALOG` → register on BusinessEvent (D-lane)

Legacy types (demo `ActivityEvent` today):

| Legacy type | OS target | v1 emit? |
|-------------|-----------|----------|
| `account.created` | Prefer `party.created` + `party.role.assigned` (customer) | Do not dual-write `account.created` long-term |
| `visit.scheduled` / `visit.completed` | Same names on BusinessEvent | Yes |
| `quote.created` / `revised` / `sent` / `accepted` | Same | Yes |
| `order.confirmed` | Same | Yes |
| `invoice.issued` | External / Finance when ACTIVE; Commercial only `invoice.requested` while LOCKED | No OS authority while Finance LOCKED |
| `payment.allocated` | Finance ingest | No |
| `promise.made` / `promise.broken` | Commercial commitment | Yes (commercial object) |
| `whatsapp.received` / `whatsapp.sent` | Messaging ingest | After H connect |
| `task.completed` | Prefer `work.completed` | Do not fork |
| `note.created` | Same | Yes |
| `credit.approved` | Finance / governed | Not while Finance LOCKED |
| `territory.reassigned` | After TerritoryAssignment | When RD-04 allows |

**New types (not in legacy 17)** if Opportunity is a first-class object: `opportunity.created` / `updated` / `closed` — add only with D-lane registry update.

Envelope fields required (FG-03): `occurredAt`, `recordedAt`, `authorizationContext`, `correlationId`, `idempotencyKey`, `dataOrigin`, `capabilityKey`.

Corrections: compensating events — never silent rewrite.

---

## ADMIN SELF-SERVICE REQUIRED

Goal: normal Commercial operations **without Carmen**. Engineering remains for adapters, schema, new capabilities (ADR-0011).

| Workflow | Class | Commands | UI (future `apps/os-web`) | Eng? |
|----------|-------|----------|---------------------------|------|
| Create / update customer | A | `CreateParty`, `AssignPartyRole(customer)`, `UpdateParty` | Clientes → Nuevo / Editar (search-first) | No |
| Contacts | A | `UpdateContact` | Dossier → Contactos | No |
| Ownership | A/B | `ReassignCommercialAccountOwner` (**missing**) | Dossier → Cambiar responsable | No (once command exists) |
| Territory assign customer | A/B | Territory on CommercialAccount + org Territory tree | Cliente / Admin Territorio | No for assign; **tree names = RD-04** |
| Territory assign people | A | `TerritoryAssignment` (**missing table**) | Admin → Equipo / Territorio | No once entity exists |
| Pricing configuration | A/B | Price lists / observations | Only **policy-permitted** list maintenance; negotiated price = observation + audit | Thresholds RD-02 |
| Deactivation | A | `DeactivateParty` / end customer role | Cliente → Desactivar (no hard delete if history) | No |
| Reactivation | A | `ReactivateParty` | Admin | No |
| Reassignment (work) | A | `ReassignWork` | Trabajo | No |
| Reassignment (account) | A/B | Owner command | Dossier | No |
| Import | B for confirm | `CreateLead` batch → `ResolveLead`; quarantine duplicates | Admin → Importar (Excel) | Template once; not per row |
| Correction (name, phone) | A | `UpdateParty` / `UpdateContact` | Dossier | No |
| Correction (NIT / razón social) | B | `UpdateFiscalIdentity` | Governed | No |
| Merge duplicates | B | `RequestPartyMerge` / `ApprovePartyMerge` | Wizard | No |
| Invite commercial staff | A | `InviteMember` | Admin → Equipo | No (*provider connect once = C*) |

**Not admin self-service:** connect WhatsApp, connect accounting, new Party role types in schema, capability activation to ACTIVE (B + engineering connect).

---

## AI OPPORTUNITIES

**Do not implement AI in Commercial v1.** Architecture: suggest / explain / draft; humans decide money, identity, fiscal, outbound send (ADR-0009, Planificación `ai-authority.ts`, Mission 15 T0–T2). Client AI-01/AI-02 UNKNOWN — treat as **off** until answered.

For each later opportunity:

### 1. Message classification

| Axis | Requirement |
|------|-------------|
| **DATA** | Inbound message artifact + Party/Contact link + channel; no body in unrestricted logs |
| **AUTHORIZATION** | Same as user inbox scope (territory, assignment); no super-prompt |
| **HUMAN AUTHORITY** | Labels editable; never auto-route money or auto-send |
| **PROVENANCE** | modelId, evidenceRefs (message id), confidence, FACT vs CONCLUSION |
| **FALLBACK** | Unclassified queue; operator tags manually |
| **DEPENDENCY** | Messaging ingest (H); Commercial ACTIVE; AI-01 |

### 2. Customer brief

| Axis | Requirement |
|------|-------------|
| **DATA** | Authorized Customer360 projection + timeline events; never Finance fields if LOCKED |
| **AUTHORIZATION** | Dossier ACL + field masks (AI-03 UNKNOWN — do not show margin/NIT if policy forbids) |
| **HUMAN AUTHORITY** | Brief is soft; does not write Party |
| **PROVENANCE** | Cite event ids / quote ids; silence if no evidence |
| **FALLBACK** | Empty “sin resumen” — never seeded demo copy |
| **DEPENDENCY** | Timeline projection (F); PartyGraph; capability gate |

### 3. Opportunity suggestions

| Axis | Requirement |
|------|-------------|
| **DATA** | Visit gaps, quote silence, replenishment from **price/order observations** — not invented demand |
| **AUTHORIZATION** | Territory / owner |
| **HUMAN AUTHORITY** | Creates Opportunity only via human `CreateOpportunity` |
| **PROVENANCE** | PATTERN from listed events; not FACT of a deal |
| **FALLBACK** | Radar-style deterministic rules (T0) without model |
| **DEPENDENCY** | Attention projection; Opportunity entity (G); AI-01 |

### 4. Quote follow-up draft

| Axis | Requirement |
|------|-------------|
| **DATA** | Quote version, last send event, thread if Messaging ACTIVE |
| **AUTHORIZATION** | Quote owner scope |
| **HUMAN AUTHORITY** | Operator sends; never autonomous WhatsApp |
| **PROVENANCE** | Draft linked to quote id + template id |
| **FALLBACK** | Blank composer + governed templates |
| **DEPENDENCY** | Quote commands; Messaging for send; AI-02 |

### 5. Next action

| Axis | Requirement |
|------|-------------|
| **DATA** | Open WorkItems + AttentionItems on the cliente |
| **AUTHORIZATION** | Same as Trabajo |
| **HUMAN AUTHORITY** | Completing work is a command, not a model write |
| **PROVENANCE** | Prefer deterministic attention reasons (T0) before T4 rank |
| **FALLBACK** | Show open pendientes only |
| **DEPENDENCY** | F Attention + E Work |

### 6. Department summary (Inicio)

| Axis | Requirement |
|------|-------------|
| **DATA** | Capability-gated pack: Commercial projections only |
| **AUTHORIZATION** | Role + territory; manager sees team, not company-wide unless scoped |
| **HUMAN AUTHORITY** | Narrative is not a ledger |
| **PROVENANCE** | FACT counts from projections; no Finance sentences if LOCKED |
| **FALLBACK** | PulseService-style **one sentence** from deterministic features only |
| **DEPENDENCY** | F Command Center queries; never locked-dept fabrication |

**Logged:** suggestion shown before human action (`ai-suggestion-audit`).

---

## INTEGRATION REQUIREMENTS

Commercial consumes `IntegrationConnection` — does not own adapters (Lane H).

| Integration | Commercial v1 | Later |
|-------------|---------------|-------|
| **Auth provider** | Required for real users (Step 10 DEFERRED production provider) | — |
| **Maps** | Territorio ADAPT `MapProvider` (mock or Mapbox token) | Geocoding hygiene |
| **WhatsApp Cloud API** | LOCKED / DEFERRED until I-02 | Ingest + send; identity match to Contact |
| **Object storage** | Quote PDF / visit photos | Document ACL |
| **Email** | Can defer (I-01) | Quote send fallback |
| **Accounting** | LOCKED (RD-03) | `invoice.issued` ingest; credit hold → quote block |
| **Banking** | DEFERRED | Payment events |
| **SIN / fiscal** | DEFERRED | Not Commercial authority |

Webhook rules (already specified): signature, provider idempotency, per-aggregate `occurredAt`, DLQ, degraded → manual provenance.

---

## ACCEPTANCE TEST PLAN

No Commercial code in this document. Tests below are the **gate Commercial v1 must pass** after implementation. Foundation boundary tests remain owned by A–F.

### Identity and party

1. Create customer via Party + customer role + CommercialAccount — **one** Party id.  
2. Same Party can hold supplier role later without a second master.  
3. Search-before-create surfaces exact NIT duplicate (`party.duplicate.suggested`); no silent merge.  
4. Merge requires Approve (`org.admin`); lineage preserved.  
5. Cross-tenant Party/quote commands return `TENANT_FORBIDDEN`.

### Commands and events

6. `CreateQuote` writes Quote + `quote.created` BusinessEvent + AuditLog + outbox in **one transaction**.  
7. Idempotent retry returns same quote; no second event.  
8. Revise quote versions; history still shows prior `quote.created` / `quote.revised`.  
9. No `ActivityEvent` rows from OS Commercial path.  
10. `AcceptQuote` is a human command; AI cannot accept.

### Work and attention

11. Quote follow-up can create WorkItem `subjectType=commercial_account`.  
12. `ListOpenWork` (once F ships) returns only in-scope items.  
13. Attention auto-resolves when underlying event clears (F contract) — no stuck demo scores.  
14. TerminateMember still blocked with open work (already E).

### Honesty / capabilities

15. Finance LOCKED: Inicio and dossier show no AR balance KPI and no collections dashboard.  
16. Warehouse LOCKED: quote does not claim confirmed stock.  
17. Messaging LOCKED: Mensajes nav hidden; no fake WhatsApp threads.  
18. `GetFinanceProjection` does not invent balances.

### UX / language

19. UI copy uses Cliente / Cotización / Pedido / Pendiente — never Party / WorkItem / AttentionItem in staff UI.  
20. Cliente → Cotizar is one click with customer prefilled.  
21. Empty Clientes list offers “Nuevo cliente” with search-first.  
22. Role without `master_data.admin` cannot see Admin master-data.

### Territory / auth

23. Asesor does not receive other-territory customers in `ListCustomers` once TerritoryAssignment exists.  
24. Effective auth `asOf` respected on historical quote reads.

### Admin without Carmen

25. Authorized admin creates customer, contact, deactivates, reassigns work **via UI/commands** without engineering.  
26. Owner reassignment uses `ReassignCommercialAccountOwner` once implemented.

### Salvage / retirement

27. Production Commercial does not call legacy `apps/api` for writes.  
28. Demo `apps/web` remains frozen until retirement gate (parity).

### Explicit non-tests for v1

- Live Meta WABA.  
- Official SIN invoice.  
- AI classification quality.  
- Route optimization.  
- WCAG full audit (UNKNOWN — required before **launch**, not this analysis).

---

## COMMAND CENTER — WHAT COMMERCIAL WILL CONSUME FROM E/F

Not a KPI catalog. Contracts only. Inicio replaces demo Pulso as front door (`UI_REBUILD_PRINCIPLES.md` §11). Planificación forbids copying Pulso vitals as truth.

| Need | Employee meaning | E/F contract to consume | Must not invent |
|------|------------------|-------------------------|-----------------|
| **Attention** | “Esto pide foco ahora” | AttentionItem projection: id, subject (Party/account/work), reason **from rule/event**, rank, href, auto-resolve key, freshness | Demo Radar scores; cartera risk while Finance LOCKED |
| **Approvals** | “Debo aprobar / espero aprobación” | `GetApproval` / list pending where actor is approver or delegate; subject snapshot | Auto-approve |
| **Changed items** | “Qué cambió desde ayer en *mis* clientes” | Authorized recent BusinessEvent feed (cursor, types whitelist, territory filter) | Company-wide vanity activity |
| **Customer replies** | “El cliente escribió” | Attention or event `whatsapp.received` / message.received **when Messaging ACTIVE**; subject = Party | Fake unread counts; Señal demo inbox |
| **Blocked work** | “No puedo avanzar” | Open WorkItems with blocker/reason **once DG-03 specified**; until then: work stuck in open + last error event | A second blocker database |
| **Opportunities** | “Negocios abiertos” | After G: Opportunity list query scoped to owner/team; until G: **omit** or show work titled as commercial follow-up — do not fake pipeline value | Weighted forecast, demo pipeline Bs |
| **Team exceptions** | Gerente: “equipo fuera de lo normal” | Manager-scoped Attention + overdue WorkItems (dueAt) + pending approvals on team members | Ranking of asesores; HR metrics (LOCKED) |

**Honest gaps on Inicio (copy, not numbers):** Finanzas no conectada; Mensajes no conectados; Almacén no verifica stock.

**One sentence health:** EXTRACT pattern from PulseService **only** from non-locked projections (e.g. open work count, attention count). No sales-vs-quota, no cartera vencida, no SLA% until those projections exist and capabilities are ACTIVE.

---

## MAP TO NEW SPINE (capability × dependencies)

Future Commercial capabilities. Empty cells = not required for that slice. **UNKNOWN** = client/policy not decided.

| Capability | PartyGraph | Work | Projection (F) | Event | Authorization | Integration | Future Finance | AI | Client decision |
|------------|------------|------|----------------|-------|---------------|-------------|----------------|----|-----------------|
| Cliente master / 360 identity | Party + customer role + CommercialAccount + Contact | Open work on account | SearchParties, GetCustomer360, timeline | `party.*`, `contact.*` | `master_data.admin` vs territory read; ACL | Import Excel (H later) | Fiscal conflict attention only | Brief later | M-01, M-03, M-04 |
| Lead → cliente | Lead staging + ResolveLead | Optional work “completar ficha” | Lead list UNKNOWN | `lead.*` | `master_data.admin` | WhatsApp unmatched (H) | — | Match suggest | M-04, I-02 |
| Oportunidad | Account lens | Follow-up WorkItem | ListOpportunities | opportunity.* (new) | Owner / manager | — | — | Suggestions later | Pipeline stages **UNKNOWN** — do not copy Salesforce theater |
| Cotización | Account + catalog | Discount ApprovalRequest | GetQuote, GetLastPrices | `quote.*` | Member; class B if discount policy | PDF storage; send via WA/email | Credit hold **when ACTIVE** | Line whisper later | RD-02, F-07, catalog source UNKNOWN |
| Pedido comercial | Account | Ops/warehouse work later | ListOrders | `order.confirmed` | Member | Warehouse LOCKED → unverified promise | `invoice.requested` | — | Who confirms order UNKNOWN |
| Memoria de precio | Account | — | GetLastPrices | quote/order events | Price view roles | — | — | Never auto-apply | Who may see cost UNKNOWN |
| Visitas / check-in | Location on Party | Optional WorkItem | ListVisits, map points | `visit.*` | Territory | Maps provider | — | — | Geofence policy UNKNOWN |
| Territorio UX | Account.territoryId | Coverage work UNKNOWN | ListTerritoryPoints | `territory.reassigned` | TerritoryAssignment | Maps | Geo-risk of cartera **LOCKED** | Routes Y2 | **RD-04** |
| Mensajes | Contact.whatsapp → Party | SLA work later | Inbox projection | `whatsapp.*` | Channel assignment | **WhatsApp H** | Cobranzas channel later | Classify / draft | I-02, SLA UNKNOWN |
| Inicio / atención | Subject Party | Work + Approval | **AttentionItem**, ListChanged | many | Role + territory | Degraded banners via health (admin) | No AR tiles | Department summary later | — |
| Trabajo / aprobaciones | Subject refs | **WorkItem, Approval** | ListOpenWork, GetApproval | `work.*`, `approval.*` | Owner, delegate | — | Credit approval later | Next action later | A-04, A-05 |
| Collections loop | Same Party | Promise breach work | FinanceProjection | `promise.*`, payment ingest | Collections role | Accounting/banking | **ACTIVE required** for aging truth | — | F-01–F-07 |
| Admin customer ops | All Party commands | Merge as Work/Approval | Duplicate candidates | merge events | Admin scopes | Import | Merge with AR = B | No auto-merge | M-07, M-08 |

---

## CARMEN HANDOFF

### WHAT COMMERCIAL CAN REUSE

- Entire `@isalwa/ui` tokens and primitives (REUSE).  
- Quote canvas **interaction** (ADAPT): lines, last price, discount %, BOB.  
- Dossier **chapter IA** (EXTRACT): actividad, precios, visitas, mensajes dock, check-in CTA.  
- Command palette + hotkeys pattern (ADAPT/REUSE).  
- Empty/skeleton/toast/motion (REUSE).  
- MapProvider + Territorio interactions (ADAPT) without routing.  
- Señal thread UX (ADAPT) when Messaging exists.  
- 17-type commercial catalog as **seed** for OS event registry (EXTRACT).  
- `lastPrice` / price observation idea (EXTRACT).  
- Visit check-in flow idea (EXTRACT).  
- Pulse **one-sentence** idea and Radar **ranked list** idea (EXTRACT/ADAPT) on real projections.  
- Spanish employee words: Cliente, Cotización, Pedido, Territorio (EXTRACT; nav names in this doc).  
- centavos + ULID + `money()` (REUSE).  
- Provider registry mock/live swap (REUSE/ADAPT).

### WHAT MUST BE REBUILT

- All data bindings (`lib/api.ts`, every page that reads `Account` / pulse / radar).  
- Customer dossier as Party/CommercialAccount 360 (page classified REBUILD).  
- Production shell IA — not Pulso-Radar-Personas-Cierre-Memoria as the product grammar.  
- Payment / AR UI (REBUILD; Finance LOCKED).  
- Auth’d OS command client; no anonymous legacy API.  
- Event write path: BusinessEvent only.  
- Attention: projection from E/F, not legacy `AttentionItem` table.  
- Commercial DTOs from OS queries — never Prisma `Account`.  
- Admin UI (does not exist).  
- `ReassignCommercialAccountOwner` and TerritoryAssignment consumption.  
- Catalog + Quote + Opportunity + Order + Visit + PriceObservation on `os-*`.

### WHAT E/F MUST DELIVER

**Lane E (done for commands; residual):** keep Work/Approval transactional; do not persist Attention as authority; specify blocker if Commercial must show “bloqueado”.

**Lane F (gate for Commercial start):**

1. Step 15 evidence **VERIFIED** (consume outbox, freshness, unknown-version policy).  
2. AttentionItem **derived** read model + list query (auto-resolve contract).  
3. `ListOpenWork` and `GetApproval` (HTTP + auth + territory/manager scope).  
4. Timeline/activity query from BusinessEvent for a Party/account.  
5. Changed-items query (authorized recent events).  
6. `GetCapabilityState` (and freshness) so UI can hide LOCKED lenses.  
7. Party search remaining gaps: role/territory filters Commercial will need for Clientes.  
8. Projection consumer actually running (depends on D worker host — call out if still deferred).

Until these exist, Commercial has nowhere honest to land Inicio / Trabajo / Historial.

### WHAT CLIENT DECISIONS ARE STILL NEEDED

**Before Commercial is a daily OS for ISALWA (not before skeleton code):** RD-04 territory policy; M-01 capture process; M-08 owner rules; M-04 duplicate rules; catalog/price-list source; I-02 WhatsApp numbers if Mensajes is in v1.

**Before credit/discount enforcement:** RD-02, F-07.

**Not needed to start skeleton after E/F pass:** RD-03 (stay LOCKED); exact Spanish job titles (RD-01 placeholders); SIN.

**AI:** AI-01, AI-02, AI-03 before any copilot — default off.

### WHAT COMMERCIAL CAN START THE MOMENT E/F PASS

1. `packages/os-commercial` + `os-contracts` Commercial commands/events (**D-lane registry PR**).  
2. `os-database` tables: Opportunity, Quote, QuoteLine, Order, PriceObservation, Visit (and catalog if in v1).  
3. Command handlers: transactional emit like Party/Work.  
4. `apps/os-web` shell: Inicio, Clientes, Cotizaciones, Trabajo — Spanish, `@isalwa/ui`.  
5. ADAPT quote canvas → command API.  
6. REBUILD cliente list/dossier on SearchParties + GetParty + timeline query.  
7. Consume ListOpenWork / Attention / GetApproval on Inicio and Trabajo.  
8. Check-in / visit commands.  
9. Capability-honest empty states (no fake Pulso).  
10. Tests in ACCEPTANCE TEST PLAN rows 1–11, 15–22, 27.

### WHAT MUST STILL WAIT

- Live WhatsApp OS (H + I-02).  
- Verified AR, credit hold blocking, collections dashboard (Finance ACTIVE + RD-03).  
- Stock-confirmed promises (Warehouse).  
- Territory production policy and assignment UX (RD-04 + TerritoryAssignment).  
- Numeric discount/credit gates (RD-02).  
- Fuzzy match / ingest resolution pipeline.  
- AI copilots.  
- Official invoice/PDF/SIN.  
- Route optimization, Memoria-as-product, white-label.  
- Retirement of `apps/web` until parity.  
- Admin polish for Carmen-disappearance if `apps/os-web` admin is still deferred — Commercial staff paths can still ship if master-data commands are callable from Clientes for authorized users.

### EXACT COMMERCIAL START PROMPT TARGET

Copy when **Lane E residuals are accepted** and **Lane F Step 15 is VERIFIED** (Attention list, ListOpenWork, GetApproval, BusinessEvent timeline, capability query, freshness):

```
Implement ISALWA OS Commercial v1 (Lane G, Step 16) on the existing OS spine.

DO NOT extend packages/database, apps/api, or apps/web as authority.
DO NOT emit ActivityEvent. DO NOT create a second Party, event, or work system.
DO NOT fabricate Finance KPIs. Finance remains LOCKED: honest “no conectada”.
DO NOT implement WhatsApp production, AI, or accounting adapters.
DO NOT invent ISALWA policy (thresholds, territory tree, WABA, catalog contents).

Read first:
- docs/architecture/COMMERCIAL_IMPLEMENTATION_READINESS.md
- docs/architecture/LEGACY_PRODUCT_SALVAGE_REGISTER.md
- docs/architecture/UI_REBUILD_PRINCIPLES.md
- docs/architecture/STEP_9_SHARED_CONTRACTS_SPEC.md
- docs/architecture/FINANCE_ACCOUNTING_BOUNDARY.md
- packages/os-contracts, os-party, os-work, os-query, os-events, os-database

Build:
1. packages/os-commercial + contract commands/events (CROSS-LANE with D for registry).
2. Quote / Opportunity / Order / Visit / PriceObservation (centavos, ULID, tenant, versions).
3. POST /v1/commands/* transactional with BusinessEvent + Audit + outbox + idempotency.
4. apps/os-web employee IA: Inicio, Clientes, Oportunidades, Cotizaciones, Pedidos, Territorio, Trabajo.
   Spanish-first. Hide spine terms. Role-aware. Few clicks. Reuse @isalwa/ui only.
5. ADAPT quote-canvas; REBUILD dossier on Party + CommercialAccount + F timeline/attention queries.
6. Inicio consumes F Attention + open work + approvals + changed events — no demo Pulso numbers.
7. Search-first customer create via existing Party commands.
8. Tests: tenant isolation, idempotent CreateQuote, no ActivityEvent, LOCKED finance honesty.

Salvage: reuse UI tokens; adapt quote UX and palette; extract event catalog and price memory;
rebuild bindings; retire User/Account/Invoice authority.

STOP if F queries for attention/work/timeline/capability are missing. Do not stub fake KPIs.
```

---

**STOP.** Commercial is prepared, not implemented. Lanes C–F were not modified. Runtime packages were not modified.
