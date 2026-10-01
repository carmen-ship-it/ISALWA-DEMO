# Production UI + Admin Self-Service Readiness

**Lane:** G-prep.2 — Production UX + admin operability specification  
**Date:** 2026-08-24  
**Status:** ANALYSIS / SPECIFICATION ONLY — no implementation  
**Scope:** No runtime changes, no migrations, no package edits, no Commercial commands, no Lane C–F edits  
**App target:** `apps/os-web` (planned) on OS spine — **not** extending `apps/web` data layer  
**Binding predecessors:** `UI_REBUILD_PRINCIPLES.md`, `COMMERCIAL_IMPLEMENTATION_READINESS.md`, `ADMIN_SELF_SERVICE_BOUNDARY.md`, salvage register, Step 10–15 evidence

---

## Purpose

Design the real ISALWA OS product surface that **hides** PartyGraph, BusinessEvent, Projection, Outbox, and other spine vocabulary from normal employees.

The finished system must be:

- Spanish-first (es-BO)
- Simple enough for normal employees without training
- Role-aware and few-click
- Obvious next action (attention + work driven)
- No duplicate data entry (search before create)
- Honest when capabilities or integrations are unavailable
- Operable without Carmen once UI ships
- Maintainable by a replacement engineer

Legacy demo IA (Pulso · Radar · Personas · Señal · Cierre · Memoria) is **salvage input only** — not authoritative navigation.

---

## Foundation snapshot (for UI dependency planning)

Evidence as of 2026-08-24. UI builds on **queries + commands** — never Prisma in the browser.

| Area | Status | UI impact |
|------|--------|-----------|
| Session + tenant | `resolveSession` — dev headers or `OS_AUTH_MODE=supabase` | UI-0 auth |
| Workforce commands | Step 10 TESTED | Admin → Equipo |
| Party commands | Step 12 PASS | Admin → Relaciones / Clientes |
| Work / approval commands | Step 14 PASS | Trabajo / Aprobaciones |
| `GET /v1/parties` search | Step 15 VERIFIED | Clientes list, palette |
| `GET /v1/parties/:id` | Step 12 | Cliente detail (authoritative) |
| `GET /v1/work-items`, `/v1/approvals`, `/v1/attention` | Step 15.1 + `query-runtime.test.ts` | Inicio, Trabajo, Aprobaciones |
| Outbox worker | Step 14.2 co-hosted in `os-api` | Projection freshness banners |
| `GET /v1/members/:id` | Step 10 | Owner display names |
| `ListMembers`, `GetCapabilityState`, timeline query | **ListMembers + GetCapabilityState HTTP CLOSED (Step 15.2)**; timeline partial (Step 16.1A) | Equipo + nav gating unblocked for Agent 4 |
| `ReassignCommercialAccountOwner` | Step 12 DEFERRED | Owner change HANDOFF_GAP |
| `TerritoryAssignment` | FG-02 planned, table missing | Territory scope HANDOFF_GAP |
| Commercial commands (Quote, etc.) | Step 16 — not started | UI-4 blocked on Lane G |
| Finance / Messaging integrations | LOCKED / DEFERRED | Honest empty states |
| `apps/os-web` | Not started | All UI is spec-only |

---

## TASK 1 — Production information architecture

### Shell principles

1. **One application** — departments are lenses, not separate apps.  
2. **Nav is role + capability gated** — hidden beats disabled-with-jargon.  
3. **Search / command palette** is global (⌘K / Ctrl+K).  
4. **Administración** is a separate area for scoped admins — not mixed into daily sales nav.  
5. **No spine terms** in employee copy (see vocabulary table below).

### Employee vocabulary (show → hide)

| Show | Hide |
|------|------|
| Cliente | Party, CommercialAccount |
| Contacto | Contact entity id |
| Proveedor / Distribuidor / Socio | PartyRoleAssignment |
| Cotización / Pedido / Oportunidad | Quote/Order internal ids |
| Pendiente / Tarea | WorkItem |
| Aprobación | ApprovalRequest |
| Inicio | Command Center, AttentionItem, projection |
| Historial | BusinessEvent, ActivityEvent |
| Finanzas (when active) | FinanceProjection |

---

### Surface catalog

#### Inicio

| Field | Spec |
|-------|------|
| **Who** | All active members |
| **Question** | ¿Qué necesita mi atención ahora? |
| **Primary action** | Open top attention item or pending approval |
| **Data source** | `GET /v1/attention`, `GET /v1/approvals` (approver), `GET /v1/work-items?status=open`, optional recent party/work changes when timeline query exists |
| **Queries** | `ListAttentionItems`, `ListPendingApprovals`, `ListOpenWork` |
| **Commands** | None on landing — deep-link to Approve / CompleteWork |
| **Capability** | **ACTIVE** (core shell) |
| **Empty state** | “No hay pendientes urgentes.” + link to Clientes or Trabajo |
| **Permission** | `member_active`; lists scoped to actor (owner / approver) |

Not Pulso KPI tiles. No sales/cartera/SLA numbers unless backed by ACTIVE capability projections.

---

#### Clientes

| Field | Spec |
|-------|------|
| **Who** | Commercial roles, admins, managers (scoped) |
| **Question** | ¿Quién es este cliente y qué pasó con él? |
| **Primary action** | Buscar → abrir ficha → Cotizar / Registrar visita (when Commercial ACTIVE) |
| **Data source** | `GET /v1/parties?roleKey=customer`, `GET /v1/parties/:id` |
| **Queries** | `SearchParties`, `GetParty` (+ future `GetCustomer360`) |
| **Commands** | `CreateParty` + `AssignPartyRole(customer)` via admin or governed capture |
| **Capability** | **ACTIVE** when Commercial capability approved; list searchable before Commercial objects exist |
| **Empty state** | “Aún no hay clientes.” → “Agregar cliente” (admin) or “Solicitar alta” (employee) |
| **Permission** | Read: territory/ownership scope (future); create: `master_data.admin` or policy TBD (M-01) |

Detail = **Cliente 360** (Task 5). Historial section **LOCKED** until timeline query ships — show “Historial disponible pronto” or omit section, never fake timeline.

---

#### Oportunidades

| Field | Spec |
|-------|------|
| **Who** | Asesores, gerentes comerciales |
| **Question** | ¿Qué negocios abiertos tengo? |
| **Primary action** | Nueva oportunidad desde Cliente |
| **Data source** | Commercial Opportunity projection (Lane G) |
| **Queries** | `ListOpportunities` (future) |
| **Commands** | `CreateOpportunity`, `UpdateOpportunity`, `CloseOpportunity` (future) |
| **Capability** | **ACTIVE** with Commercial lane |
| **Empty state** | “Sin oportunidades abiertas.” → “Crear desde un cliente” |
| **Permission** | Owner / team / territory scope |

Omit from nav until Lane G exists — do not show empty module shell.

---

#### Cotizaciones

| Field | Spec |
|-------|------|
| **Who** | Asesores, operaciones comerciales |
| **Question** | ¿Qué cotizaciones están en curso? |
| **Primary action** | Nueva cotización (from Cliente or list) |
| **Data source** | Quote projection (Lane G) |
| **Queries** | `ListQuotes`, `GetQuote`, `GetLastPrices` (future) |
| **Commands** | `CreateQuote`, `ReviseQuote`, `SendQuote`, `AcceptQuote`, `RequestApproval` when discount policy requires |
| **Capability** | **ACTIVE** with Commercial |
| **Empty state** | “No hay cotizaciones.” → “Cotizar para un cliente” |
| **Permission** | Owner; accept may need manager per RD-02 UNKNOWN |

---

#### Pedidos

| Field | Spec |
|-------|------|
| **Who** | Asesores, gerentes, administración |
| **Question** | ¿Qué pedidos comerciales están confirmados? |
| **Primary action** | Ver pedido / solicitar facturación (honest if Finance LOCKED) |
| **Data source** | Order commercial state (Lane G); not official invoice |
| **Queries** | `ListOrders`, `GetOrder` (future) |
| **Commands** | `ConfirmOrder`, `RequestInvoiceIssuance` (attention only while Finance LOCKED) |
| **Capability** | **ACTIVE** with Commercial |
| **Empty state** | “No hay pedidos confirmados.” |
| **Permission** | Same as quotes |

---

#### Trabajo

| Field | Spec |
|-------|------|
| **Who** | All employees with assigned work |
| **Question** | ¿Qué tareas tengo pendientes? |
| **Primary action** | Completar / abrir detalle |
| **Data source** | `GET /v1/work-items?ownerMemberId={self}` |
| **Queries** | `ListOpenWork`, `GetWorkItem` (via work-items/:id) |
| **Commands** | `CreateWorkItem`, `CompleteWork`, `CancelWorkItem`, `ReassignWork` (manager/admin) |
| **Capability** | **ACTIVE** |
| **Empty state** | “No tiene pendientes asignados.” |
| **Permission** | Owner completes; `people.admin` reassigns |

Managers see team filter when `ListOpenWork` supports manager scope (future) or separate “Equipo” filter — **do not invent team rollup without query contract**.

---

#### Aprobaciones

| Field | Spec |
|-------|------|
| **Who** | Approvers, delegates, managers |
| **Question** | ¿Qué debo aprobar o rechazar? |
| **Primary action** | Aprobar / Rechazar with reason |
| **Data source** | `GET /v1/approvals`, `GET /v1/approvals/:id` |
| **Queries** | `ListPendingApprovals`, `GetApproval` |
| **Commands** | `Approve`, `Reject`, `RequestApproval` |
| **Capability** | **ACTIVE** |
| **Empty state** | “No hay aprobaciones pendientes.” |
| **Permission** | Approver or active delegate at `effectiveAt` |

Separate nav item keeps approval visible — not buried in Trabajo.

---

#### Mensajes

| Field | Spec |
|-------|------|
| **Who** | Operadores, asesores |
| **Question** | ¿Qué conversaciones necesitan respuesta? |
| **Primary action** | Responder en contexto de cliente |
| **Data source** | Messaging projection (Integration H) linked to Party |
| **Queries** | Inbox projection (future) |
| **Commands** | Send message via integration adapter — never UI-as-authority |
| **Capability** | **LOCKED** until Messaging ACTIVE + I-02 client decision |
| **Empty state** | “Mensajes no conectados.” — no fake WhatsApp threads |
| **Permission** | Channel assignment + territory |

Hide nav item when LOCKED.

---

#### Territorio

| Field | Spec |
|-------|------|
| **Who** | Asesores de campo, gerentes |
| **Question** | ¿Dónde están mis clientes y en qué estado? |
| **Primary action** | Abrir cliente en mapa / check-in |
| **Data source** | Territory-scoped customer locations + health flags (no fake finance) |
| **Queries** | `ListTerritoryPoints` (future); map provider ADAPT from legacy |
| **Commands** | `CompleteVisit` / check-in (Commercial G) |
| **Capability** | **ACTIVE** with Commercial; **partial** until TerritoryAssignment + RD-04 |
| **Empty state** | “No hay clientes con ubicación en su territorio.” |
| **Permission** | Territory scope (future assignment table) |

---

#### Reportes

| Field | Spec |
|-------|------|
| **Who** | Gerentes, dirección |
| **Question** | Respuestas recurrentes autorizadas — not dashboard soup |
| **Primary action** | Export / drill to Cliente |
| **Data source** | Authorized queries only — same spine, saved filters |
| **Queries** | Future saved report definitions |
| **Capability** | **FUTURE** — omit from v1 nav or show “Próximamente” for executives only |
| **Empty state** | N/A until defined |
| **Permission** | Report class per role |

Do **not** ship demo Pulso/Reportes tiles. Mission 15: operational truth first.

---

#### Administración

| Field | Spec |
|-------|------|
| **Who** | Members with admin scopes only |
| **Question** | ¿Cómo configuro personas, relaciones y datos maestros? |
| **Primary action** | Contextual admin task (invitar, alta cliente, fusionar, etc.) |
| **Data source** | Commands + admin queries |
| **Sub-areas** | Equipo · Relaciones comerciales · Territorio (when ready) · Integraciones (health view only) · Aprobaciones pendientes (org-wide for `org.admin`) |
| **Capability** | **ACTIVE** for workforce + party admin |
| **Empty state** | Per sub-area |
| **Permission** | `people.admin`, `master_data.admin`, `fiscal.admin`, `org.admin`, `integration.admin` |

Staff without admin scopes **never** see Administración.

---

## TASK 2 — Role-aware home (Inicio)

Inicio is **not** a dashboard. It is a ranked action surface. Sections appear only when data exists and capability permits.

### Section contract

| Section | Employee label | Data | Show when |
|---------|----------------|------|-----------|
| Atención | “Requiere su atención” | `GET /v1/attention?activeOnly=true` | items.length > 0 |
| Aprobaciones | “Esperan su decisión” | `GET /v1/approvals` (pending, approver=self) | pending for actor |
| Pendientes | “Sus tareas” | `GET /v1/work-items?status=open` (owner=self) | open work |
| Cambios recientes | “Cambios recientes” | Timeline/changed query (future) | query exists + items |
| Seguimientos | “Seguimientos de clientes” | Commercial attention (future) | Commercial ACTIVE |
| Equipo | “Su equipo necesita ayuda” | Manager-scoped attention/work (future) | manager scope |
| Capacidades | Honest banners | `GetCapabilityState` (future) or static registry | Finance/Messaging/Warehouse LOCKED |

**No KPI row.** No relationship score, no open balance, no “ventas del mes” unless Finance/Revenue capability ACTIVE with real projection.

### By persona (generic — ISALWA titles RD-01 UNKNOWN)

| Persona | Inicio emphasis | Hidden |
|---------|-----------------|--------|
| **Empleado general** | Own attention + own open work | Admin, integrations, team rollup |
| **Usuario comercial** (asesor) | Above + client follow-ups (when Commercial ACTIVE) | Finance GL, company-wide lists |
| **Gerente** | Team pending approvals + team overdue work (when query supports) | Other territories |
| **Administrador** | Shortcut tiles to Administración tasks + org-wide duplicate queue | Engineering ops (outbox payloads) |
| **Ejecutivo / dirección** | Same as manager + honest capability summary sentence — **not** fabricated executive KPIs | Detail admin unless also admin |

### LOCKED capability copy (examples — es-BO)

| Capability | Banner |
|------------|--------|
| Finance | “Finanzas no está conectada. Los saldos y facturas oficiales no se muestran aquí.” |
| Messaging | “WhatsApp corporativo no está conectado.” |
| Warehouse | “Stock no verificado — las promesas de entrega son comerciales, no confirmadas por almacén.” |

### Stale projection

When `freshness.isStale === true` on any Inicio query response: subtle banner “Información actualizándose — puede haber un retraso de unos segundos.” Never block actions; never show internal outbox terms.

---

## TASK 3 — Admin self-service

Every action = `POST /v1/commands/{name}` + audit. UI never bypasses approval or tenant scope.

### Equipo (WORKFORCE) — scope `people.admin`

| Workflow | Commands | UI surface | Class |
|----------|----------|------------|-------|
| Invitar empleado | `InviteMember` | Admin → Equipo → Invitar | A |
| Activar (first login) | `ActivateMember` | Auth provider onboarding + optional admin confirm | A / AUTH PROVIDER |
| Suspender | `SuspendMember` | Admin → Equipo → Suspender | A |
| Reactivar acceso | `ActivateMember` / unsuspend path | Admin → Equipo | A |
| Terminar | `TerminateMember` | Admin → Equipo → Terminar (blocks if open work) | A |
| Recontratar | `RehireMember` | Admin → Equipo → Recontratar | A |
| Cambiar correo | `RequestMemberEmailChange`, `ChangeMemberEmail` | Admin or self-service per RD-06 | A/B |
| Cambiar departamento | `ChangeDepartment` | Admin → Equipo → Editar | A |
| Cambiar jefe | `ChangeManager` | Admin → Equipo → Editar | A |
| Cambiar rol | `ChangeRole` | Admin → Equipo → Editar (warn if finance-sensitive) | A/B |
| Delegación | `GrantDelegation`, `RevokeDelegation` | Admin → Equipo → Delegar (expiry required) | A/B |
| Reasignar trabajo antes de terminar | `ReassignWork` | Forced wizard when terminate blocked | A |

**Password create / change / reset:** Auth provider UI — **AUTH PROVIDER SELF-SERVICE**, not OS UI (Step 10).

### Relaciones comerciales (PARTY) — scope `master_data.admin` / `fiscal.admin` / `org.admin`

| Workflow | Commands | UI surface | Class |
|----------|----------|------------|-------|
| Crear empresa/persona | `CreateParty` | Admin → Relaciones → Nuevo | A |
| Editar datos maestros | `UpdateParty` | Ficha → Editar | A |
| Agregar/editar contacto | `UpdateContact` | Ficha → Contactos | A |
| Asignar rol cliente | `AssignPartyRole(customer)` + optional CommercialAccount | Ficha → Relaciones | A |
| Asignar proveedor/distribuidor/socio/etc. | `AssignPartyRole(...)` | Same ficha — **one company, multiple relationship chips** | A |
| Terminar rol | `EndPartyRole` | Ficha → Relaciones | A |
| Desactivar | `DeactivateParty` | Ficha → Desactivar | A |
| Reactivar | `ReactivateParty` | Admin | A |
| Captura preliminar | `CreateLead` → `ResolveLead` | Import / bandeja de leads | A/B |
| Revisar duplicado | (read duplicate candidate) | Admin → Duplicados | Review |
| Solicitar fusión | `RequestPartyMerge` | Duplicados → Fusionar | B |
| Aprobar/rechazar fusión | `ApprovePartyMerge` / `RejectPartyMerge` | Admin → Fusiones pendientes (`org.admin`) | B |
| Cambiar NIT / razón social | `UpdateFiscalIdentity` | Ficha → Datos fiscales | B (`fiscal.admin`) |
| Cambiar responsable comercial | `ReassignCommercialAccountOwner` | Ficha → Responsable | A/B — **command HANDOFF_GAP** |

Employee-facing **Cliente** create: search-first → if not found, guided capture → admin queue OR `CreateParty` if user has scope (M-01 UNKNOWN).

### Trabajo (WORK) — scopes per command

| Workflow | Commands | Who |
|----------|----------|-----|
| Crear pendiente | `CreateWorkItem` | Member with context |
| Reasignar | `ReassignWork` | `people.admin` / manager policy |
| Completar / cancelar | `CompleteWork`, `CancelWorkItem` | Owner or admin |
| Solicitar aprobación | `RequestApproval` | Member |
| Decidir | `Approve`, `Reject` | Approver / delegate |
| Ver historial de responsable | `GET /v1/work-items/:id` ownership history | Anyone with read access |

### Configuración — admin-configurable vs engineering-only

| Admin-configurable (future) | Engineering-only (never in staff admin UI) |
|----------------------------|---------------------------------------------|
| Role **display** labels (RD-01) | New OS module / capability type |
| Department names (within template) | Schema migrations |
| Notification quiet hours (future) | Security model changes |
| Approval **routing labels** (not thresholds until RD-02) | New integration adapter **type** |
| Territory **names** (once entity complete) | Break-glass tooling |
| Feature visibility toggles within approved capability | Raw outbox / event payloads |
| Connect WhatsApp / accounting **request** (class B) | Initial WABA / credential provisioning (C/D) |

**Do not expose:** Prisma, scope key enums as primary labels, webhook secrets, `consumerKey`, correlation ids to employees.

---

## TASK 4 — Low-maintenance test

For each operation: *Could ISALWA do this if Carmen permanently disappeared?*

### Classification key

| Class | Meaning |
|-------|---------|
| **ADMIN SELF-SERVICE** | Authorized admin via product UI → command |
| **NORMAL EMPLOYEE SELF-SERVICE** | Any member via product UI → command |
| **AUTH PROVIDER SELF-SERVICE** | Login/password/MFA at identity provider |
| **DEVELOPER REQUIRED** | Engineering / infra / schema |
| **CLIENT POLICY REQUIRED** | Blocked on ISALWA decision — UI may exist but rules empty |

### Workforce

| Operation | Class | Notes |
|-----------|-------|-------|
| Invite / dept / manager / role / delegate / suspend / terminate / rehire | ADMIN SELF-SERVICE | Commands exist; **UI HANDOFF_GAP** |
| Password reset | AUTH PROVIDER SELF-SERVICE | |
| Terminate with open work | ADMIN SELF-SERVICE | UI must force ReassignWork wizard |
| Change role granting finance visibility | ADMIN SELF-SERVICE + CLIENT POLICY REQUIRED | A vs B label (A-03) |

### Party / relationships

| Operation | Class | Notes |
|-----------|-------|-------|
| Create/edit customer/supplier/contact | ADMIN SELF-SERVICE | API today; UI gap |
| Assign/end roles | ADMIN SELF-SERVICE | Multi-role on one ficha |
| Merge / NIT | ADMIN SELF-SERVICE | Approval chain CLIENT POLICY (M-07) |
| Owner reassignment | ADMIN SELF-SERVICE | **DEVELOPER REQUIRED** until command exists |
| Duplicate fuzzy rules | CLIENT POLICY REQUIRED | M-04 |

### Work

| Operation | Class | Notes |
|-----------|-------|-------|
| Create/complete/cancel own work | NORMAL EMPLOYEE SELF-SERVICE | |
| Reassign work | ADMIN SELF-SERVICE | |
| Approve/reject | NORMAL EMPLOYEE SELF-SERVICE | Approver role |

### Commercial (future)

| Operation | Class | Notes |
|-----------|-------|-------|
| Quote CRUD | NORMAL EMPLOYEE SELF-SERVICE | After Lane G |
| Discount/credit block | CLIENT POLICY REQUIRED | RD-02, F-07 |
| Official invoice | DEVELOPER REQUIRED + external | Finance adapter |

### Integrations

| Operation | Class | Notes |
|-----------|-------|-------|
| Connect WhatsApp / accounting | DEVELOPER REQUIRED (first connect) | Then admin **request** only |
| View integration health | ADMIN SELF-SERVICE | `integration.admin` — when HTTP exists |

### HANDOFF_GAP summary (routine ops still blocked without UI or missing backend)

1. **No `apps/os-web`** — all admin/employee flows require API today.  
2. **`ListMembers` HTTP** — **CLOSED (Step 15.2)** — Agent 4 wires Equipo list.
3. **`GetCapabilityState` HTTP** — **CLOSED (Step 15.2)** — replace static nav manifest in os-web.
4. **`ReassignCommercialAccountOwner`** — owner change.  
5. **`TerritoryAssignment`** — territory-scoped UI.  
6. **Timeline query** — Cliente historial.  
7. **Production login page** — Supabase backend exists; UI not built.

---

## TASK 5 — Client / Party UX (no PartyGraph exposure)

### Canonical rule

**One ficha per organization.** Multiple relationship types appear as labeled chips (Cliente · Proveedor · Distribuidor). User never sees separate “supplier record” vs “customer record” for the same NIT.

### List / search

- Route: **Clientes** (filter: Clientes | Proveedores | Todos — maps to `roleKey` on `SearchParties`).  
- Search-first: name, NIT (via projection search_text), phone.  
- Row shows: display name, active relationship chips, owner (when available), duplicate warning badge.  
- **Command/query:** `SearchParties`, freshness banner if stale.

### Create

1. Type name / NIT / phone.  
2. Search → if match, open existing ficha.  
3. If duplicate suggested (`duplicateStatus: suggested`): show “Posible duplicado” — link to review, **no silent merge**.  
4. Minimal create: display name, party kind (empresa/persona), initial relationship (Cliente).  
5. NIT optional at capture — progressive (M-01 UNKNOWN).

### Detail / 360 layout (single scroll)

| Chapter | Content | Source |
|---------|---------|--------|
| Encabezado | Name, segment (future), owner, territory, relationship chips, primary actions | GetParty + account |
| Próxima acción | Top attention/work for this party | Attention filtered by subject |
| Contactos | List + add | contacts on GetParty |
| Relaciones | Active/ended roles with dates — human labels | roles |
| Historial | Timeline | **WAITING** timeline query |
| Comercial | Opportunities, quotes, orders | **WAITING** Lane G |
| Trabajo | Open work on this subject | ListOpenWork filter |
| Datos fiscales | NIT history — admin/fiscal | fiscal identities |
| Admin | Deactivate, merge, duplicate review | scoped commands |

### Duplicate warning

- Surface: list badge + banner on ficha.  
- Copy: “Existe otra ficha con el mismo NIT. Revise antes de continuar.”  
- Actions: “Ver otra ficha”, “Solicitar fusión” (admin).  
- Never auto-merge (ADR-0009 / Planificación).

### Merge review (admin)

- Side-by-side summary, lineage note, approver queue.  
- Events: `party.merge.requested` → pending → `ApprovePartyMerge`.

### Deactivate

- Copy: “Desactivar cliente” — does not delete history.  
- Warn if open work or pending quotes (when Commercial exists).

### Multi-role example (UX)

```
Distribuidora ABC
[Cliente] [Proveedor] [Distribuidor]
Una sola ficha — tres relaciones comerciales
```

---

## TASK 6 — Commercial workflows (UI flow only)

No code. Unknown policy called out explicitly.

```
Captura / Lead
    → Buscar cliente existente (SearchParties)
    → Si no existe: CreateLead o CreateParty (política M-01 UNKNOWN)
    → Resolver identidad (ResolveLead) — human confirm if low confidence (M-04 UNKNOWN)

Oportunidad
    → CreateOpportunity on CommercialAccount (Lane G)
    → Owner default M-08 UNKNOWN

Cotización
    → CreateQuote from Cliente (1 click)
    → Canvas: lines, last price (PriceObservation)
    → ReviseQuote (versioned — historial shows revisions)
    → SendQuote (Messaging/email when available)
    → If discount exceeds threshold: RequestApproval → RD-02 UNKNOWN (machinery yes, numbers no)
    → AcceptQuote — human only

Pedido
    → ConfirmOrder from accepted quote
    → RequestInvoiceIssuance → Finance LOCKED: attention “Facturación no conectada”

Fulfillment / Finance (future)
    → Warehouse LOCKED: “Disponibilidad no verificada”
    → Finance ACTIVE: credit hold may block — F-07 UNKNOWN
    → External invoice ingest — RD-03 UNKNOWN
```

**Do not invent:** discount %, credit limits, territory assignment rules, accounting vendor, stock confirmation, SLA times.

---

## TASK 7 — UI component salvage map

Preserving `LEGACY_PRODUCT_SALVAGE_REGISTER.md` classifications.

| Asset | Source | Class | Target surface | Rebind | a11y / mobile | Capability |
|-------|--------|-------|----------------|--------|---------------|------------|
| Design tokens | `packages/ui/tokens` | **REUSE** | Global | None | WCAG audit UNKNOWN | — |
| Button, Panel, StatusPill, MetricCard, ListRow, Chip, Timeline, EmptyState, Skeleton, PageContainer, ExperienceHeader, SearchField, ActionBar | `@isalwa/ui` | **REUSE** | All | Query DTOs only | Focus rings exist | — |
| CommercialEventIcon | `@isalwa/ui` | **ADAPT** | Historial | OS event type map | — | Timeline ACTIVE |
| App shell / kiln sidebar | `app-shell.tsx` | **ADAPT** | Production nav | Role + capability nav | Mobile drawer | — |
| Command palette | `command-palette.tsx` | **ADAPT** | Global ⌘K | OS search APIs | Keyboard first | Search ACTIVE |
| Global hotkeys, shortcut sheet | `global-hotkeys.tsx` | **REUSE** | Shell | Route map | — | — |
| Toast provider | `toast-provider.tsx` | **REUSE** | Feedback | — | — | — |
| Experience skeletons | `experience-skeletons.tsx` | **REUSE** | Lists | `aria-busy` | — | — |
| lib/motion.ts | `apps/web` | **REUSE** | Motion | — | `prefers-reduced-motion` | — |
| Quote canvas | `quote-canvas.tsx` | **ADAPT** | Cotizaciones | Commercial commands | Desk-primary | Commercial ACTIVE |
| Quote actions | `quote-actions.tsx` | **ADAPT** | Quote detail | Same | — | Commercial ACTIVE |
| Customer dossier layout | `personas/[id]/page.tsx` | **REBUILD** | Cliente 360 | Party/Account DTOs | Long-scroll mobile read | Party query |
| Customer list | `personas/page.tsx` | **ADAPT** | Clientes | SearchParties | Table responsive | — |
| Pulso page layout | `pulso/page.tsx` | **ADAPT** | Inicio sections only | Attention/work queries | No fake KPI animation | — |
| Radar list UX | `radar/page.tsx` | **ADAPT** | Inicio “Atención” | ListAttention | Risk bar = attention rank | — |
| Territorio map | `territorio/*`, MapProvider | **ADAPT** | Territorio | Territory query | Field mobile | Commercial ACTIVE |
| Signal conversation | `signal-conversation.tsx` | **ADAPT** | Mensajes | Messaging projection | Mobile reply | Messaging ACTIVE |
| Check-in button | `check-in-button.tsx` | **ADAPT** | Cliente / Territorio | Visit command | Geolocation | Commercial ACTIVE |
| Cierre lists | `cierre/*` | **ADAPT** | Cotizaciones/Pedidos | Quote/order queries | Hide invoice AR if LOCKED | Commercial / Finance |
| Memoria | `memoria/page.tsx` | **RETIRE** as nav | Historial on Cliente | Timeline query | — | — |
| Payment form | `payment-form.tsx` | **REBUILD** | Finance when ACTIVE | Finance ingest | — | Finance ACTIVE |
| lib/api.ts | `apps/web` | **REBUILD** | OS client | Session + ApiError | — | — |
| lib/preferences.ts | `apps/web` | **ADAPT** | Palette favorites | Member id | — | — |
| lib/demo-mode.ts | `apps/web` | **RETIRE** | — | — | — | — |
| Guided tour / intro | `guided-tour.tsx` | **ADAPT** | First-run (optional) | Real workflows | UNKNOWN depth | — |
| animated-value | `animated-value.tsx` | **REUSE** | Only if honest numeric | Real query | Reduced motion | — |
| reading-progress | `reading-progress.tsx` | **REUSE** | Cliente 360 | — | — | — |
| Legacy Account/Invoice/User bindings | all data pages | **REBUILD** | — | OS queries | — | — |

---

## TASK 8 — Auth / error / empty states

Consistent patterns across `apps/os-web`. Employee copy in Spanish; **never** expose stack traces, correlation ids, or internal codes in primary message (code OK in support detail for admins).

| Situation | HTTP / code | Employee message | Recovery action |
|-----------|-------------|------------------|-----------------|
| Not authorized | 403 `PERMISSION_DENIED` | “No tiene permiso para esta acción.” | “Volver” / contact admin |
| Session missing | 401 `AUTH_REQUIRED` | “Su sesión expiró.” | “Iniciar sesión” |
| Expired session | 401 | Same | Redirect login |
| Deactivated employee | 403 `ACCESS_REVOKED` | “Su acceso ya no está activo.” | Contact admin |
| No assigned work | empty list | “No tiene pendientes asignados.” | Create if permitted |
| No customers yet | empty search | “Aún no hay clientes registrados.” | “Agregar cliente” (if scoped) |
| Projection stale | `freshness.isStale` | “Actualizando información…” | Retry refresh |
| Integration disconnected | capability LOCKED / health error | “{Mensajes|Finanzas} no conectado.” | Admin link (if admin) |
| Capability locked | `CAPABILITY_LOCKED` | “Esta función no está disponible todavía.” | — |
| Approval required | `GOVERNANCE_REQUIRED` | “Esta acción requiere aprobación.” | “Solicitar aprobación” |
| Duplicate suspected | duplicate badge | “Posible registro duplicado.” | “Revisar” |
| Command failure | 4xx/5xx ApiError | Show server `message` + next step | Retry if idempotent |
| Optimistic conflict | `CONFLICT` | “Alguien más actualizó este registro.” | “Recargar y reintentar” |
| Idempotency replay | `IDEMPOTENCY_REPLAY` | Silent success — same result | — |
| Terminate blocked | `VALIDATION_FAILED` open work | “Hay pendientes asignados. Reasígnelos primero.” | Open reassignment wizard |
| Tenant forbidden | 403 `TENANT_FORBIDDEN` | “Acceso no permitido.” | Logout |

**Auth modes:** Production `OS_AUTH_MODE=supabase` (JWT → AuthIdentity → Member). Dev headers only for engineering — not end-user docs.

---

## TASK 9 — Handoff + operations documentation

The following **must ship with** `apps/os-web` v1 (markdown in `docs/operations/` or in-app help links):

| Document | Audience | Contents |
|----------|----------|----------|
| **Guía del empleado** | Asesores, operadores | Inicio, Clientes, Trabajo, Cotizar (when live), mobile check-in |
| **Guía del administrador** | ISALWA admins | Equipo, relaciones, duplicados, fusiones, desactivación |
| **Matriz de roles y permisos** | Admin + eng | Scope keys → UI capabilities (display labels configurable RD-01) |
| **Guía de configuración** | Admin | What is configurable vs engineering ticket |
| **Solución de problemas** | Admin | Session, stale data, terminate blocked, duplicate merge |
| **Notas de despliegue** | Replacement dev | `OS_AUTH_MODE`, Supabase env, worker flags, health endpoints |
| **Ciclo de vida de acceso** | Admin | Invite → activate → suspend → terminate → rehire; password at provider |
| **Casos de soporte comunes** | Support | “No veo cliente”, “Aprobación pendiente”, “Fusión bloqueada” |
| **Flujos anotados** | All | Screenshots or diagram: alta cliente, invitar empleado, aprobar, cotizar |

Reference existing ops evidence: Step 14.2 recovery (`GET /v1/health`, `GET /v1/operations/outbox` for `people.admin` only — **not** in employee UI).

---

## TASK 10 — Implementation slices

Dependency order for `apps/os-web`. Each slice is shippable without the next.

### UI-0 — Shell, auth, navigation, errors

| Item | Detail |
|------|--------|
| **Delivers** | Login (Supabase), session, role-aware nav skeleton, EmptyState/Error patterns, ⌘K stub, capability honesty placeholders |
| **Backend deps** | `resolveSession`, `GET /v1/health`; optional `GetCapabilityState` HTTP or **static** LOCKED manifest until query exists |
| **Commands** | None |
| **Queries** | Health; session context |
| **Permissions** | `member_active` for app entry |
| **Acceptance** | Login → Inicio shell; 403/401 pages; nav hides Admin without scopes; no spine terms in UI |
| **Admin self-service test** | N/A |
| **Carmen-disappearance** | FAIL alone — login only |

### UI-1 — Admin workforce (Equipo)

| Item | Detail |
|------|--------|
| **Delivers** | Invite, edit dept/manager/role, delegate, suspend, terminate wizard with reassignment |
| **Backend deps** | All workforce commands; **`ListMembers` HTTP HANDOFF_GAP** — may ship detail/edit with search-by-email workaround or block list until query lands |
| **Commands** | InviteMember, ChangeDepartment, ChangeManager, ChangeRole, GrantDelegation, RevokeDelegation, SuspendMember, TerminateMember, RehireMember, ReassignWork |
| **Queries** | GetMember; ListMembers (needed) |
| **Permissions** | `people.admin` |
| **Acceptance** | Invite + terminate blocked without reassignment; audit implied via command success |
| **Carmen-disappearance** | PASS for workforce when UI complete |

### UI-2 — Party / client master (Relaciones + Clientes)

| Item | Detail |
|------|--------|
| **Delivers** | SearchParties list, Cliente 360 (minus historial/commercial until later), admin create/edit/roles/contacts, duplicate + merge flows |
| **Backend deps** | Party commands; SearchParties + GetParty |
| **Commands** | Full party command set |
| **Queries** | SearchParties, GetParty |
| **Permissions** | `master_data.admin`, `fiscal.admin`, `org.admin` for merge |
| **Acceptance** | Multi-role chips; search-before-create; no second supplier master |
| **Carmen-disappearance** | CONDITIONAL until owner reassignment command |

### UI-3 — Work, approvals, attention (Trabajo + Aprobaciones + Inicio)

| Item | Detail |
|------|--------|
| **Delivers** | Inicio attention sections, Trabajo list/detail, Aprobaciones inbox, approve/reject |
| **Backend deps** | Step 15.1 projections + HTTP list endpoints (**READY**) |
| **Commands** | CreateWorkItem, CompleteWork, CancelWorkItem, ReassignWork, RequestApproval, Approve, Reject |
| **Queries** | ListOpenWork, ListPendingApprovals, ListAttentionItems, GetApproval, GetWorkItem |
| **Permissions** | Owner vs `people.admin` vs approver |
| **Acceptance** | `query-runtime.test.ts` scenarios reflected in UI; stale banner |
| **Carmen-disappearance** | PASS for work/approval ops |

### UI-4 — Commercial (Cotizaciones, Oportunidades, Pedidos, Territorio field)

| Item | Detail |
|------|--------|
| **Delivers** | ADAPT quote canvas, commercial lists, visit check-in, territory map |
| **Backend deps** | **Lane G** commands + queries; timeline query for historial |
| **Commands** | Commercial command set (Step 16) |
| **Queries** | ListQuotes, GetQuote, etc. |
| **Permissions** | Commercial scopes + territory (when RD-04) |
| **Acceptance** | COMMERCIAL_IMPLEMENTATION_READINESS acceptance rows |
| **Carmen-disappearance** | CONDITIONAL until owner + territory gaps closed |

### UI-5 — Reportes

| Item | Detail |
|------|--------|
| **Delivers** | Saved authorized exports only |
| **Backend deps** | Report definition layer — **FUTURE** |
| **Capability** | FUTURE |

### UI-6 — Integrations / Mensajes

| Item | Detail |
|------|--------|
| **Delivers** | ADAPT Señal inbox, integration health for admin |
| **Backend deps** | Lane H + I-02; GetIntegrationHealth HTTP |
| **Capability** | Messaging ACTIVE |

**Recommended build order:** UI-0 → UI-1 → UI-2 → UI-3 → UI-4 → UI-6 → UI-5

UI-3 can parallel UI-2 after UI-0 if staffing allows — both depend on UI-0 auth shell only.

---

## Carmen handoff — What you need to know

### PRODUCTION UI TARGET

One Spanish-first application (`apps/os-web`) on the OS spine: **Inicio** drives attention and work; **Clientes** is the single relationship hub (multi-role chips, one ficha); **Trabajo** and **Aprobaciones** are first-class; Commercial surfaces appear only when Lane G is live; **Administración** covers workforce and master data without API calls. Legacy demo navigation is retired. Architecture vocabulary never appears in employee UI.

### FIRST UI SLICE TO BUILD

**UI-0 — Shell, auth, navigation, and error system.**

Why: Every other slice needs production login (Supabase session), role-aware nav, consistent ApiError handling, and capability-honesty placeholders. Backend session resolution already supports `OS_AUTH_MODE=supabase`. No Commercial or admin commands required yet.

### ADMIN SELF-SERVICE COVERAGE

Once UI-0 through UI-3 (+ UI-2) ship, authorized ISALWA admins can perform **without Carmen**:

- Invite, suspend, reactivate, terminate (with reassignment), rehire employees  
- Change department, manager, role, delegation  
- Create/edit parties, contacts, customer/supplier/distributor/partner roles  
- Deactivate/reactivate parties, request/approve merges, fiscal identity updates (scoped)  
- Reassign work, complete team work operations  
- Search customers via product UI  

**Auth provider handles:** password create, change, reset.

**Still requires engineering:** first WhatsApp/accounting connect, new capabilities, schema changes, owner reassignment until command exists.

### HANDOFF GAPS

1. `apps/os-web` not started — **all** product UI.  
2. `ListMembers` HTTP — Equipo directory.  
3. `GetCapabilityState` HTTP — prefer before UI-0 nav gating; static fallback acceptable short-term.  
4. `ReassignCommercialAccountOwner` command — commercial owner change.  
5. `TerritoryAssignment` entity — territory-scoped lists/map.  
6. Timeline / `ListAccountTimeline` query — Cliente historial.  
7. `GetIntegrationHealth` HTTP — admin integration panel.  
8. Operations docs listed in Task 9 — not written yet.  
9. WCAG full audit — UNKNOWN before launch gate.

### WHAT STILL REQUIRES CLIENT DECISIONS

Exact items only:

- **RD-01** — Admin role display names  
- **RD-02 / A-04** — Discount and approval thresholds  
- **RD-04 / A-07** — Territory model and reassignment rules  
- **M-01** — Customer capture process and minimum fields  
- **M-03** — Distributor/partner vs customer language  
- **M-04** — Duplicate detection beyond exact NIT  
- **M-07** — Party merge approval chain  
- **M-08** — Commercial account owner assignment rules  
- **A-03** — Who may grant finance-visible roles  
- **F-07** — Credit approval authority (when Finance ACTIVE)  
- **I-02** — WhatsApp WABA / corporate numbers  
- **RD-03** — Accounting provider (Finance lane)  
- **AI-01 / AI-02** — Automation boundaries (AI off until answered)  
- **O-01** — Department names for labels  

### WHAT CAN BE BUILT WITHOUT CLIENT DECISIONS

- UI-0 shell, Supabase login, nav, errors, empty states  
- UI-1 workforce admin (all commands exist)  
- UI-2 party/client CRUD, multi-role chips, exact-NIT duplicate surfacing, merge machinery (thresholds generic)  
- UI-3 Inicio + Trabajo + Aprobaciones (queries verified)  
- Cliente search and authoritative ficha (identity, contacts, roles, work)  
- Honest LOCKED banners for Finance, Messaging, Warehouse  
- Command palette wired to SearchParties + nav  
- `@isalwa/ui` composition throughout  
- Admin documentation structure (content can reference scope keys, not client titles)

### COMMERCIAL UI DEPENDENCIES

**READY**

- SearchParties / GetParty  
- Work + approval + attention list queries (HTTP)  
- Party + work commands for cross-links  
- Outbox worker / projection freshness pattern  
- Design system + salvage UX patterns  
- Supabase session backend  

**WAITING**

- Lane G Commercial commands and quote/order/opportunity queries  
- Timeline query for historial  
- `ReassignCommercialAccountOwner`  
- TerritoryAssignment + RD-04 for scoped map/lists  
- Product catalog projection  
- Messaging inbox (I-02 + Lane H)  
- Finance projections (RD-03) for invoice/AR UI  
- Numeric discount/credit enforcement (RD-02, F-07)

### WHAT WE CAN SALVAGE

`@isalwa/ui` full kit; quote canvas interaction; dossier chapter layout; command palette + hotkeys; territorio map; signal thread; check-in CTA; empty/skeleton/toast/motion; attention list ranking UX; Spanish relationship vocabulary; centavos/BOB formatting patterns.

### WHAT MUST BE REBUILT

All API bindings; production shell IA; payment/AR UI; OS authenticated client; Cliente 360 data model; Inicio (no Pulso KPIs); every legacy Account/Invoice reference; Memoria as top-level nav; demo mode; admin screens from scratch.

### LOW-MAINTENANCE HANDOFF DESIGN

**CONDITIONAL**

Backend and queries support low-maintenance operations (Step 14.2 outbox PASS, Step 15/15.1 projections PASS). Product UI and admin documentation **do not exist yet**, so normal admins still need API/engineering today. After UI-1–UI-3 + ops docs: **PASS**.

### CARMEN-DISAPPEARANCE TEST

**CONDITIONAL**

| Area | Result | Reason |
|------|--------|--------|
| Backend commands | PASS | Workforce, Party, Work complete |
| Query APIs | PASS | Party search, work, approval, attention |
| Outbox/projection ops | PASS | Step 14.2 — no manual SQL for normal catch-up |
| Product UI | FAIL | `apps/os-web` absent |
| Admin master data via UI | FAIL | API-only |
| Employee daily work via UI | FAIL | API-only |
| Replacement dev onboarding | PASS | verify scripts + evidence docs |

Overall: **CONDITIONAL** — architecture supports disappearance; **UI is the remaining gate**.

### EXACT FIRST apps/os-web IMPLEMENTATION PROMPT

> **DO NOT RUN UNTIL FOUNDATION GATE CONDITIONS LISTED BELOW ARE SATISFIED.**

**Foundation gate conditions (all required):**

1. Step 15 **PASS** — party projection search (`./scripts/verify-step-15.sh`).  
2. Step 15.1 work/attention projections **PASS** — `GET /v1/work-items`, `/v1/approvals`, `/v1/attention` (`query-runtime.test.ts` or successor verify script).  
3. Step 14.2 outbox worker **PASS** — co-hosted worker healthy (`GET /v1/health`).  
4. Supabase (or approved pilot auth) configured — `OS_AUTH_MODE=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`.  
5. Agent 3 QA/security architecture review sign-off for production UI start (or documented waiver).  
6. No open **FOUNDATION_GAP** blocking session or tenant isolation.

**Prompt (run only after gates above):**

```
Implement apps/os-web UI-0 ONLY — production shell for ISALWA OS.

DO NOT implement Commercial quotes, admin CRUD beyond login shell, or Lane G/H features.
DO NOT extend apps/web legacy data layer or call apps/api demo routes.
DO NOT expose PartyGraph, BusinessEvent, WorkItem, Projection, or Outbox in user-facing copy.
DO NOT fabricate Finance, Messaging, or Warehouse data.

Read:
- docs/architecture/PRODUCTION_UI_ADMIN_SELF_SERVICE_READINESS.md
- docs/architecture/UI_REBUILD_PRINCIPLES.md
- packages/ui (reuse only — no fork)

Build:
1. Next.js app apps/os-web with @isalwa/ui, es-BO strings, porcelain/kiln/glaze tokens.
2. Supabase login → OS API session (OS_AUTH_MODE=supabase) — never send member id from client body.
3. Role-aware nav: Inicio, Trabajo, Aprobaciones, Administración (scope-gated), placeholders for Clientes/Cotizaciones until UI-2/UI-4.
4. Inicio: empty honest state + wire ListAttention/ListOpenWork/ListPendingApprovals when session active (read-only lists OK in UI-0).
5. Global ApiError handling per Task 8 table; session expiry redirect.
6. Capability LOCKED banners (Finance, Messaging, Warehouse) — static manifest acceptable until GetCapabilityState HTTP exists.
7. Command palette shell (⌘K) — navigation only in UI-0.
8. Mobile-responsive shell; prefers-reduced-motion.

Acceptance:
- Spanish employee vocabulary only
- Login → Inicio works against os-api
- 401/403 friendly pages
- No legacy Account types
- npm run build passes

STOP after UI-0. Do not start UI-1 until explicitly requested.
```

---

**STOP.** Analysis complete. No code. No runtime changes.
