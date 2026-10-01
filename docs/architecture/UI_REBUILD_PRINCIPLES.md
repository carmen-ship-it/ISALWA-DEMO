# UI Rebuild Principles

**Step:** 9.5 — Product salvage + future production UI  
**Status:** Binding for all future UI implementation (Commercial step 16+, admin shell step 14+)  
**Not:** Visual mockups or pixel specs — **product and architecture constraints**

---

## 1. Purpose

The future ISALWA production application is a **real company UI** on the **OS spine** (`STEP_9_SHARED_CONTRACTS_SPEC.md`). It is **not** a cosmetic wrapper around the legacy demo (`apps/web`).

Reuse product work per [`LEGACY_PRODUCT_SALVAGE_REGISTER.md`](./LEGACY_PRODUCT_SALVAGE_REGISTER.md). Reject legacy authority.

---

## 2. Usability principles (employees)

| Principle | Requirement |
|-----------|-------------|
| Few clicks | Common actions ≤ 3 interactions from shell; defaults pre-filled |
| Obvious next action | Attention + WorkItem drive primary CTAs; empty states teach one action |
| Minimal duplicate entry | Search Party before create; ingest resolves to existing Contact |
| Search before navigation | Command palette + search API for customers, work, commands |
| Useful defaults | Territory, owner, price list from role + context |
| Context preserved | Return navigation retains customer/opportunity context |
| Clear Spanish (es-BO) | User-facing: **Cliente**, not Party; **Cotización**, not Quote entity id |
| Progressive disclosure | Advanced fields (NIT, fiscal, merge) behind admin or governed flows |
| Role-aware navigation | Nav items hidden when capability LOCKED or permission missing |
| Meaningful empty states | `EmptyState` with example + action — not blank panels |
| Actionable errors | ApiError `message` + what user can do next |
| Hide admin concepts from staff | No RoleAssignment tables, no integration health for sales reps |
| Self-explanatory workflows | Customer → Opportunity → Quote → Order without training on spine |
| Quick common actions | Check-in, new quote, reply message from dossier header |
| Mobile/responsive | Field check-in, dossier read, message reply — operational minimum |

---

## 3. Navigation philosophy

### Legacy demo (reference only — **ADAPT**)

Seven experiences: Pulso, Radar, Personas, Territorio, Señal, Cierre, Memoria (`app-shell.tsx` NAV).

### Future production shell

```
Auth → Session → Role-aware shell
  ├── Command Center (default landing — replaces "Pulso" as front door)
  ├── My work (open WorkItems + approvals)
  ├── Customers (Party customer lens — replaces "Personas")
  ├── [Capability-gated lenses]
  │     ├── Territorio (Commercial ACTIVE)
  │     ├── Mensajes / Señal (Messaging ACTIVE)
  │     ├── Cotizaciones (Commercial ACTIVE)
  │     ├── Finanzas projection (Finance ACTIVE — honest if LOCKED)
  ├── Search / command palette (global)
  └── Admin (admin scopes only)
```

**One shell** — not separate mini-apps with different nav trees. Departments are **lenses**, not separate products.

---

## 4. Role-aware experience

| Actor | Sees | Does not see |
|-------|------|----------------|
| Sales rep | Customers in territory, own work, quotes, messages | Company admin, integration config, finance GL |
| Manager | Team work, approvals, territory rollup | Other territories (unless scoped) |
| ISALWA admin | Admin self-service (§8) | Raw schema, engineering tools |
| Finance role (when active) | Projections, reconciliation queue | Official ledger editing in OS |

Navigation and Command Center respect **effective authorization at request time** — not static role labels only.

---

## 5. Spanish-first product language

| User term | Never show to ordinary users |
|-----------|------------------------------|
| Cliente | Party, PartyRoleAssignment |
| Proveedor | supplier role edge |
| Cotización / Pedido | CommercialAccount internal ids |
| Centro de mando | AttentionItem, projection |
| Tarea / Pendiente | WorkItem (use "pendiente" or "tarea") |
| Aprobación | ApprovalRequest |

Admin UI may show governed labels (e.g. "fusionar registros") — not database table names.

---

## 6. Minimal-click principle

| Workflow | Target path |
|----------|-------------|
| New quote from customer | Cliente dossier → Cotizar (1 click) → canvas with customer pre-filled |
| Check-in visit | Cliente / map → Check-in (1–2 clicks) |
| Reply WhatsApp | Mensaje thread → reply in context |
| Reassign work (manager) | Pendiente → Reasignar → pick member |
| Add customer (admin) | Cliente → Nuevo → form with search-first duplicate check |

---

## 7. Progressive disclosure

- **Level 1:** Name, phone, segment — create customer  
- **Level 2:** NIT, contacts, locations — dossier edit  
- **Level 3:** Merge, fiscal change, credit — governed approval flows  
- **Level 4:** Integration health, capability activation — admin only  

---

## 8. Accessibility expectations

- Reuse `@isalwa/ui` focus rings and semantic structure (`AppShell` aria patterns)  
- Skeleton loading with `aria-busy` (see `experience-skeletons.tsx`)  
- `prefers-reduced-motion` honored (`lib/motion.ts`)  
- Full WCAG audit: **UNKNOWN** — required before production launch gate  

---

## 9. Responsive expectations

- **Field:** Territorio map, check-in, dossier read, message reply — mobile-friendly  
- **Desk:** Quote canvas, Command Center dashboards — primary design target  
- PWA per EMP — **PLANNED**, not verified in legacy web  

---

## 10. Design system extraction candidates

| Source | Status |
|--------|--------|
| `packages/ui/tokens.css` | **REUSE** — law |
| Panel, MetricCard, Timeline, EmptyState, Skeleton | **REUSE** |
| Kiln sidebar + glaze accents (`app-shell`) | **ADAPT** to production shell |
| Commercial event icons | **ADAPT** to unified event registry |
| Quote line editor UX | **ADAPT** from `quote-canvas.tsx` |

**Do not** fork a second component library. Extend `@isalwa/ui`.

---

## 11. Command Center philosophy

- **Not** 40 vanity dashboards (foundation spec)  
- **One sentence** health narrative (extract from `PulseService` pattern — capability-gated)  
- **Ranked focus list** from AttentionItem projection  
- **Honest gaps** when Finance/Warehouse LOCKED — no fabricated KPIs  
- Role-specific: sales sees pipeline + visits; manager sees team attention  

Replaces legacy "Pulso" as default landing.

---

## 12. Department intelligence philosophy

### One company spine (shared)

Identity · PartyGraph · Events · Work · Permissions · Knowledge · Integrations · Projections

### Department lenses (capability-gated)

| Lens | Intelligence source | User experience |
|------|---------------------|-----------------|
| Commercial | Quotes, visits, pipeline projections | Cliente → Oportunidad → Cotización |
| Finance | FinanceProjection only when ACTIVE | Cartera, crédito — or "no conectado" |
| Operations | Future ops events | Entregas, excepciones |
| Logistics | Future carrier ingest | Envíos |

Each lens: **same customer record**, own work queue, own AI context pack — **no duplicate customer DB**.

---

## 13. Admin self-service philosophy

### Normal company operations → **no Carmen**

| Area | UI surface (future) |
|------|---------------------|
| People | Equipo → invitar, cambiar departamento/rol, terminar |
| Master data | Clientes/Proveedores → Party + roles |
| Work | Reasignar pendientes |
| Governed | Fusionar, NIT, crédito → approval workflow |

### Engineering / integration → **not in ordinary admin UI**

Connect accounting, WhatsApp WABA, new capabilities, schema changes.

Every admin action = **OS command** → audit → event (ADR-0011).

---

## 14. Relationship to OS commands and queries

```
UI component
  → OS API client (session cookie / token)
  → POST /v1/commands/{name}  (mutations)
  → GET /v1/...               (reads only)
  → never Prisma, never client-supplied role flags
```

| UI responsibility | OS responsibility |
|-------------------|-------------------|
| Display projection | Compute authorization |
| Submit command payload | Validate domain |
| Show error + recovery | Enforce governance |
| Optimistic UI (optional) | Authoritative version + idempotency |

**Prohibited:** Duplicated merge logic, credit rules, or permission checks in React components.

---

## 15. Prohibition on UI-as-authority

The UI must **never**:

- Write authoritative state except through command API  
- Trust client-side role or tenant ids from forms  
- Fabricate finance balances when Finance LOCKED  
- Store canonical Party or Member data in localStorage as truth  
- Emit events directly  
- Bypass approval for class B operations  

---

## 16. Future UI architecture (conceptual)

```
User
  → Auth provider (credentials)
  → OS session (Member + AuthIdentity link)
  → Authorization context (effective role, delegation, territory, capability)
  → Application shell (role-aware nav + Command Center)
  → Feature views (commands / queries only)
  → OS foundation (packages/os-*)
  → Projections + BusinessEvent read models
```

**Planned app:** `apps/os-web` (or successor) — **not** extending `apps/web` data layer in place.

Legacy `apps/web` remains frozen demo until **retirement gate:** Commercial v1 parity on new spine.

---

## 17. Commercial v1 user experience (target)

User sees **one coherent system:**

| User journey | Spine (hidden) |
|--------------|----------------|
| Cliente | Party + customer role + CommercialAccount |
| Contacto | Contact |
| Oportunidad | Opportunity on CommercialAccount |
| Cotización | Quote |
| Pedido | Order |
| Mensaje | Message artifact linked to Party |
| Pendiente | WorkItem |
| Historial | BusinessEvent timeline |

**Not** separate "CRM app" + "quote app" + "WhatsApp app".

Extract UX from: `quote-canvas.tsx`, `personas/[id]/page.tsx`, `signal-conversation.tsx`, `radar/page.tsx`.

---

## 18. Admin self-service checklist (architecture support)

| Operation | Future UI + commands | Eng required? |
|-----------|----------------------|---------------|
| Add / invite employee | Admin → Equipo | No |
| Change email | Admin / policy self-service | No |
| Password reset/change | Auth provider UI | No* |
| Dept / role / manager | Admin → Equipo | No |
| Delegation | Admin → Equipo | No |
| Terminate / rehire | Admin → Equipo | No |
| Reassign work | Manager/admin → Pendientes | No |
| Add customer/supplier/etc. | Admin → Clientes/Proveedores | No |
| Merge | Governed wizard | No |
| Change account owner | Dossier admin action | No |
| Connect accounting/WhatsApp | Integration admin (C/D) | **Yes** (initial connect) |

\*Provider setup once.

---

## 19. What would force unnecessary training

| Anti-pattern | Mitigation |
|--------------|------------|
| Exposing spine vocabulary | Spanish user terms (§5) |
| Fake finance dashboards | LOCKED honesty |
| 7 disconnected apps | Single shell (§3) |
| Duplicate customer entry paths | Unified ingest + search-first |
| Errors without recovery | ApiError contract |
| Admin tasks requiring SQL/tickets | Admin commands (§13) |

---

## Related

- [`LEGACY_PRODUCT_SALVAGE_REGISTER.md`](./LEGACY_PRODUCT_SALVAGE_REGISTER.md)
- [`STEP_9_SHARED_CONTRACTS_SPEC.md`](./STEP_9_SHARED_CONTRACTS_SPEC.md)
- [`ISALWA_OS_HANDOFF_MANIFEST.md`](./ISALWA_OS_HANDOFF_MANIFEST.md)
