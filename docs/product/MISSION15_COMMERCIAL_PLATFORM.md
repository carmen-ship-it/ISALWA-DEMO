# Mission 15 — Commercial Intelligence & WhatsApp Platform

**Status:** Source of truth for every mission after Mission 15  
**Type:** Product architecture (no implementation)  
**Phase:** Phase Two — Business capability  
**Audience:** Founder · CPO · Engineering leads · Future investors / partners  
**Language of product UI:** Español (Bolivia) · **Language of this doc:** English (execution / board clarity)  
**Frozen predecessors:** Mission 11–14 (visual + experience). Do not reopen design language without a constitution amendment.

---

## Executive posture

ISALWA OS is no longer proving that it can *look* like a commercial operating system.  
It must now become the system manufacturers and distributors run their revenue on.

**Phase One (complete):** Premium feel, design system, experience blueprint, experience layer.  
**Phase Two (this document):** Commercial intelligence + WhatsApp as the nervous system.  
**Phase Three (consequence):** Multi-company platform — still earned, never assumed.

### Non-negotiables carried forward

1. Not a CRM clone. One operational truth per customer.
2. AI suggests; humans decide prices, credit, and legal commitments.
3. WhatsApp is a first-class system — not a side chat widget.
4. Extend `@isalwa/ui` and existing domain model; no parallel stacks.
5. Every feature must change a decision or an action *today*.
6. Spanish Bolivia first. Multi-country later as a deliberate product, not a translation project.

### What this document is

The product constitution for the next five years: capabilities, sequencing, critique, and corrected roadmap.  
**It is not a sprint backlog.** Missions after 15 decompose slices of this plan.

### What this document forbids (until explicitly reopened)

- Rewriting the experience layer for novelty  
- Building “ERP complete” before WhatsApp + commercial loop are production-grade  
- Shipping AI that invents facts without evidence links  
- White-label or multi-country before Auth, tenancy, and audit are boring  

---

# Part A — Capability architecture

## 1. Complete WhatsApp Operating System

### Thesis

WhatsApp is how Bolivian B2B distribution actually sells, collects, and supports.  
If Señal is merely an inbox, the product failed. Señal must become the **WhatsApp Operating System**: channels, policy, people, money, and memory in one nervous system.

### Capability layers

| Layer | Purpose | Years |
|-------|---------|-------|
| **Ingest** | Meta Cloud API webhooks, signature verify, idempotent message store, media vault | Y1 |
| **Identity** | Phone → Contact → Account match; lead drafts; conflict queue | Y1 |
| **Routing** | Channel purpose (Ventas / Cobranzas / Soporte), skill, territory, load, SLA class | Y1–Y2 |
| **Work** | Assignment, transfer, snooze, collab notes, internal @mentions on thread | Y1–Y2 |
| **Policy** | Business hours, SLA clocks, escalation, template governance, opt-in / 24h window | Y1 |
| **Commerce bridge** | Quote / invoice / promise / visit deep-links from thread; last-price context | Y1–Y2 |
| **Intelligence** | Intent classify, risk flags, reply drafts, daily briefings — always citeable | Y2–Y3 |
| **Quality** | QA sampling, coaching scores, template A/B, cost/message economics | Y3–Y4 |
| **Platform** | Multi-WABA, multi-brand numbers, partner ops console | Y4–Y5 |

### Product surfaces (evolution of Señal)

1. **Bandeja operativa** — priority by SLA breach risk × money at stake × segment, not by recency alone.  
2. **Hilo instrumentado** — composer with templates, quick actions (cotizar, promesa, visita), customer dock.  
3. **Sala de mando de canales** — three corporate lines as measurable products, not folders.  
4. **Gobierno de plantillas** — approval workflow, category labels, expiry, cost visibility.  
5. **Sala de excepciones** — unmatched phones, duplicate accounts, failed sends, webhook gaps.

### Operating principles

- Every inbound message becomes a durable `Message` with provenance.  
- SLA is a business clock, not a vanity metric.  
- No scraping WhatsApp Web. Ports/adapters only.  
- Operator speed > feature count. Keyboard-first in Señal (Mission 14 experience law applies).

### Explicit non-goals (Y1)

- Consumer marketing blasts at Meta-spam scale  
- Replacing Meta Business Manager entirely  
- Voice/video calling as a core bet before text OS is solid  

---

## 2. Commercial timeline architecture

### Thesis

The unit of commercial truth is not a “deal stage.” It is a **timeline of irreversible commercial events** with money, people, and promises attached.

### Spine (canonical)

```
Descubrimiento → Relación → Visita → Oportunidad → Cotización →
Aceptación → Pedido → Factura → Promesa → Pago → Servicio → Renovación / Riesgo
```

Every object on the spine emits an `ActivityEvent` (or equivalent) that Memoria and the dossier consume.  
Quotes, visits, WhatsApp messages, and payments are **first-class timeline citizens**, not attachments.

### Timeline rules

| Rule | Why |
|------|-----|
| Append-only commercial facts | Audit + AI evidence |
| Soft state separate from hard events | “Feeling” vs “ledger” |
| Cross-link, don’t duplicate | One payment appears once |
| Human-readable chapter titles | Memoria is a story, not a log dump |
| Timezone = org timezone (`America/La_Paz` default) | Field reality |

### Product expression

- **Personas dossier** = Customer 360 reading experience over the timeline  
- **Memoria** = cross-customer and longitudinal stories (graduates from stub)  
- **Pulso / Radar** = projections *off* the timeline (aggregates + attention objects)  
- **Cierre** = mutation surfaces that write the next timeline events  

### Anti-patterns

- Separate “activity feeds” per module that disagree  
- CRM stage boards as the only source of truth  
- Rewriting history when a quote is edited (version; don’t erase)  

---

## 3. Customer 360 evolution

### Today (foundation)

Living dossier: identity, score, credit, AI briefing (seeded), commerce chapters, Señal dock, visits.

### Target (five-year Customer 360)

| Horizon | Capability |
|---------|------------|
| **360.1 Truth** | Single account graph: contacts, sites, credit, assignments, open money |
| **360.2 Rhythm** | Timeline + relationship score with transparent drivers |
| **360.3 Commerce** | Price memory, quote→cash, product affinity |
| **360.4 Signal** | WhatsApp intents, SLA history, sentiment-lite (operational, not creepy) |
| **360.5 Prediction** | Next order window, churn / silence risk, collection risk — with evidence |
| **360.6 Collaboration** | Internal notes, tasks, ownership handoffs without Slack sprawl |
| **360.7 Network** | Multi-site accounts, holding groups, shared credit (multi-company era) |

### Design law

The dossier must remain **one scrollable instrument**, not a tab farm.  
New intelligence appears as chapters, insights, and actions — never as a second CRM profile.

### Roles × 360

| Role | 360 emphasis |
|------|----------------|
| Propietaria | Risk, money, trust, exceptions |
| Gerente | Coverage, team load, forecast |
| Asesor | Next action, price memory, route context |
| Cobranzas | Promises, aging, WhatsApp collection threads |
| Operador Señal | Thread + dock; full 360 one click away |

---

## 4. AI Copilot strategy

### Positioning

**Asistente ISALWA** is a commercial copilot — not a chatbot bolted on.  
It lives inside Pulso, Radar, dossier, Señal, and Cierre as **suggest / explain / draft**, never **auto-commit money**.

### Capability tree (ordered by trust)

| Tier | Capability | Gate |
|------|------------|------|
| **T0 Rules** | Pulso sentence, Radar ranking explainability from deterministic features | Always on |
| **T1 Retrieval** | Cite dossier evidence, last invoices, last prices, last visits | Y1 |
| **T2 Draft** | WhatsApp reply drafts, visit notes, quote line suggestions | Y1–Y2 · human send |
| **T3 Classify** | Intent (precio, stock, reclamo, cobranza), urgency | Y2 · editable labels |
| **T4 Rank** | Attention scoring assist, next-best-action | Y2 · shadow mode first |
| **T5 Forecast** | Demand / collection / visit load | Y3 · confidence bands |
| **T6 Coach** | Rep coaching from anonymized patterns | Y4 · opt-in managers |

### Copilot principles (hard)

1. **Evidence or silence.** No orphan claims.  
2. **Human in the loop** for price, credit hold, legal text, outbound template blasts.  
3. **Org-scoped models / prompts** — no cross-tenant leakage ever.  
4. **Spanish Bolivia voice** — formal *usted*, industrial calm; no Silicon Valley slang.  
5. **Cost visibility** — tokens and WhatsApp template costs are first-class ops metrics.  
6. **Shadow → assist → automate** promotion path with kill switches.

### Surfaces

- Pulso: “what changed overnight” brief  
- Radar: “why this account” explanation  
- Dossier: living briefing refresh  
- Señal: suggested replies + next commercial action  
- Cierre: line assistants using price memory  
- Comando (⌘K): natural-language jump (“clientes A sin visita 30 días”)

### Explicit refusals

- Autonomously changing prices or credit limits  
- Sending WhatsApp without operator confirmation (until a future governed automation product)  
- Training on customer chat content across companies without contractual clarity  

---

## 5. Territory Intelligence

### Thesis

Territory is not a colored map. It is **coverage, load, promise density, and money in space**.

### Capability stack

| Layer | What it answers |
|-------|-----------------|
| **Map** | Where are accounts and what state are they in? (exists) |
| **Coverage** | Who hasn’t been visited; white space vs over-served |
| **Route** | Suggested day path for an asesor (optimize for money + SLA, not tourism) |
| **Balance** | Fair workload / portfolio health across reps |
| **Expansion** | Where to open next (warnes/montero patterns → productized) |
| **Geo-risk** | Concentration of cartera en riesgo by zone |

### Evolution path

- **Y1:** Production GPS hygiene, visit check-in integrity, filters that match Radar  
- **Y2:** Route suggestions, territory heat from silence + debt  
- **Y3:** What-if rebalancing (move accounts between asesores)  
- **Y4–Y5:** Multi-city / multi-country territory graphs  

### Principles

- Field-first: works offline-ish with sync honesty (queue + conflict).  
- No decorative 3D globes. Precision over spectacle.  
- PostGIS (or equivalent) when query load demands it — not as a vanity migration.

---

## 6. Revenue Intelligence

### Thesis

Revenue Intelligence is the company’s ability to see **pipeline → cash** as one instrument, with forecast that sales managers trust enough to argue with.

### Modules

1. **Bookings & backlog** — accepted quotes / orders not yet invoiced  
2. **Invoiced revenue** — recognized commercial billings (BOB)  
3. **Cash collected** — payments allocated  
4. **Forecast** — weighted by segment, visit rhythm, WhatsApp intent, seasonality  
5. **Price realization** — discount vs list vs last-price memory  
6. **Product mix** — margin proxies when cost available; otherwise contribution heuristics  
7. **Rep / territory contribution** — attribution without toxic scoreboards  

### Product expression

- Pulso vitals deepen (not multiply into dashboard soup)  
- New **executive Revenue strip** only when it earns a decision  
- Cierre feeds truth; Pulso never invents numbers  

### Anti-patterns

- Vanity dashboards disconnected from invoices  
- Forecast without write-back accountability  
- Forcing Salesforce-style opportunity theater onto a WhatsApp-native sales motion  

---

## 7. Collections Intelligence

### Thesis

In distribution, **collections is commercial**, not a back-office afterthought.  
Cobranzas WhatsApp + aging + promises must be one loop.

### Capability stack

| Capability | Outcome |
|------------|---------|
| Aging truth | Open balance by bucket, dispute flags |
| Promise engine | Promise → calendar → breach → Radar |
| Collection playbooks | Segment × aging × relationship scripts (templates) |
| Risk scoring | Who will pay / stall / churn — with evidence |
| Allocation clarity | Partial payments mapped to invoices |
| Credit policy | Holds that block quotes/orders with override audit |

### Surfaces

- Dossier commerce chapter  
- Señal Cobranzas channel as a product  
- Radar collections attention items  
- Pulso “cartera en riesgo” vital with drill-down  

### Principles

- Never shame the customer in UI; be firm and clear.  
- Promises are contracts of intent — visible to asesor + cobranzas.  
- Legal collections escalation is a governed workflow, not a button meme.

---

## 8. Internal collaboration

### Thesis

ISALWA must not become Slack-with-a-CRM. Collaboration is **attached to commercial objects**.

### Primitives

- **Notes** on Account / Conversation / Quote / Invoice  
- **Tasks** with due dates, owners, source (Radar, Señal, visit)  
- **@mentions** that notify in-app (and later WhatsApp-to-staff only if policy allows)  
- **Handoffs** (asesor → cobranzas → soporte) with required context checklist  
- **Approvals** (discount, credit, template) with audit trail  

### Non-goals

- General chat rooms as the core product  
- Email-style endless threads without object anchors  

### Y2+

Lightweight “war room” for a critical account (time-boxed collaboration space bound to one Account).

---

## 9. Product recommendation engine

### Thesis

Recommendations are **commercial memory + catalog intelligence**, not a generic “people also bought” toy.

### Signals

- Price observations (last paid / last quoted)  
- Category affinity by segment and territory  
- Attach rate (sanitary + tank patterns)  
- Seasonality and project-driven spikes  
- Stock / lead-time constraints (when inventory lands)  
- Margin guardrails (when cost available)

### Surfaces

- Cierre quote canvas: whisper next lines  
- Dossier: “likely replenishment”  
- Señal: “customer asking about X — related Y”  
- Field visit: “bring samples / talk track”

### Governance

- Recommendations never silently change price.  
- Explain: “porque compró X el 12/03 a Bs …”  
- Allow “not relevant” feedback to improve ranking.

---

## 10. Reporting philosophy

### Law

**Operational truth first. Analytic theater second.**

Reports exist to:

1. Confirm a decision already suggested by Pulso / Radar, or  
2. Answer a recurring executive question in ≤3 clicks, or  
3. Satisfy audit / export needs.

### Report classes

| Class | Examples | Cadence |
|-------|----------|---------|
| **Pulse** | Vitals, SLA, cartera | Continuous |
| **Ritual** | Morning brief, weekly commercial review | Scheduled |
| **Forensic** | Why did March cash dip? | On demand |
| **Compliance** | Audit exports, message logs | As required |
| **Board** | Monthly packaged narrative | Monthly |

### Principles

- Prefer living surfaces over PDF graveyards.  
- Every report links back into Personas / Señal / Cierre.  
- Exports are citizenship rights (CSV / Excel), not afterthoughts.  
- No 40-tile BI home. If you need Looker, integrate later — don’t fake it.

---

## 11. Notification philosophy

### Law

**Notifications are interrupts. Interrupts must be rare, ranked, and actionable.**

### Channels

| Channel | Use |
|---------|-----|
| In-app (bell + Pulso) | Default |
| Toast / whisper | Confirmation of user’s own action |
| Email | Digests + rare critical |
| WhatsApp-to-staff | Opt-in, role-gated, never default spam |
| Push mobile | Field-critical only (SLA breach, visit nearby) |

### Ranking inputs

Money at stake × SLA time left × segment × ownership × quiet hours.

### Anti-patterns

- Badge inflation  
- Notifying everyone about everything  
- Marketing-style drip inside the OS  

### User control

Per-role defaults + personal mute with “still wake me for breaches.”

---

## 12. Integration roadmap

### Port-first principle (already in engineering law)

Every external system behind an adapter. Mock → sandbox → production.

### Sequence

| Wave | Integrations | Why this order |
|------|--------------|----------------|
| **W0** | Meta WhatsApp Cloud API | Nervous system |
| **W1** | Auth identity provider (Auth.js / OIDC) | Trust boundary |
| **W2** | Maps / geocoding provider | Territory truth |
| **W3** | Object storage (media, PDFs) | Evidence vault |
| **W4** | Email transactional | Digests / invites |
| **W5** | Accounting / SIN e-invoicing (Bolivia) | Fiscal reality |
| **W6** | Banking / payment advice import | Cash application |
| **W7** | ERP / inventory (optional) | When ISALWA outgrows commercial-only |
| **W8** | Partner API + webhooks out | Platform era |

### Rules

- Never scrape.  
- Prefer sync contracts with clear ownership of fields.  
- Dual-run periods for fiscal integrations.  
- Customer-facing WhatsApp content never leaves Meta’s allowed paths.

---

## 13. Security roadmap

### Posture target

Manufacturer-grade trust: field phones, shared WhatsApp, money, and personal data of B2B buyers.

### Stages

| Stage | Outcomes |
|-------|----------|
| **S0** | Private repo discipline; no prod secrets in git; env isolation |
| **S1** | AuthN + RBAC enforcement on every API; session hygiene |
| **S2** | Audit log for reads of sensitive + all writes; admin break-glass |
| **S3** | Encryption at rest (DB + media); TLS everywhere; key rotation |
| **S4** | WhatsApp webhook authenticity; media access signed URLs |
| **S5** | DLP-ish rules (export limits, role-gated phone visibility) |
| **S6** | SOC2-minded controls when selling to enterprises / multi-company |
| **S7** | Penetration tests, bug bounty (platform era) |

### Data classes

| Class | Examples | Handling |
|-------|----------|----------|
| **Restricted** | WhatsApp bodies, phones, NITs | Need-to-know, audit |
| **Confidential** | Prices, credit, balances | Role-gated |
| **Internal** | Tasks, notes | Org-scoped |
| **Operational** | Aggregates | Safer to share |

### Principle

Security is a product feature for the propietaria: she must believe the company’s commercial brain is not on a shared iPad forever.

---

## 14. Scalability roadmap

### Dimensions that matter (not vanity QPS)

1. **Message throughput** (WhatsApp spikes)  
2. **Timeline read amplification** (dossier + Memoria)  
3. **Search** (⌘K + customer find)  
4. **Geo queries**  
5. **Multi-tenant noisy neighbor** (later)  
6. **AI cost per action**

### Technical posture (product constraints on engineering)

- Keep modular monolith + clear packages until a measured bottleneck appears.  
- Queue inbound webhooks; never do heavy work in the request path.  
- Read models for Pulso / Radar (materialized where needed).  
- Media out of DB.  
- Tenant isolation before horizontal poetry.

### Scale stages

| Stage | Shape |
|-------|-------|
| Single-company production | Vertical scale + queues |
| Multi-team ISALWA | Read replicas / cache for pulse |
| Multi-company SaaS | Tenant partitions, per-tenant limits |
| Regional platform | Multi-region only with latency justification |

---

## 15. White-label strategy

### Honest sequencing

White-label is a **Phase Three revenue motion**, not a Year-1 distraction.

### Preconditions (all required)

1. Auth + RBAC + audit boring  
2. WhatsApp OS production-hardened  
3. Commercial loop (quote→cash) trusted  
4. Tenant isolation proven  
5. Config surface for brand tokens **without forking the design system**  
6. Legal packaging (DPA, Meta tech provider posture)

### White-label levels

| Level | Meaning |
|-------|---------|
| **L0** | ISALWA-only product |
| **L1** | “Powered by ISALWA OS” with customer logo + colors (token theming) |
| **L2** | Custom domain + email sender + WhatsApp WABA per customer |
| **L3** | Full OEM for regional distributors / software partners |

### Design constraint

Porcelain / kiln / glaze language can theme; it must not become infinite custom CSS.  
Partners get tokens + limited illustration slots — not a second design system.

---

## 16. Multi-company architecture

### Already true in schema spirit

`Organization` + `organizationId` on tenant tables. V1 ships as single-org.

### Target tenancy model

| Concept | Meaning |
|---------|---------|
| **Organization** | Legal/commercial tenant boundary |
| **Workspace UX** | One org at a time in session (no accidental cross-mix) |
| **Partner operator** | Rare cross-tenant support with break-glass audit |
| **Holding group** (Y5) | Optional soft links between orgs for conglomerates |

### Hard rules

- No shared WhatsApp threads across orgs.  
- No shared AI retrieval across orgs.  
- Migrations and feature flags are tenant-aware.  
- Billing (future) attaches to Organization.

### Product implication

Multi-company is not “add a dropdown.” It is identity, billing, WhatsApp WABA mapping, and support operations.

---

## 17. Multi-country considerations

### Principle

**Win Bolivia depth before LATAM breadth.**

### Country pack concept

A country pack is a versioned bundle:

- Locale (copy, formal address)  
- Currency & tax primitives  
- Fiscal e-invoice adapter  
- Phone / ID formats  
- Business-hour defaults  
- WhatsApp template norms  
- Payment instruments  

### Sequence (indicative)

1. **Bolivia complete** (commercial + WhatsApp + collections + fiscal path)  
2. **Adjacent Spanish LATAM** where distribution motions rhyme (e.g. PY / PE / EC) — only with a design partner customer  
3. **Portuguese** as a deliberate localization program, not Google Translate  

### Traps to avoid

- Premature i18n of every string while product nouns are still moving  
- Assuming SAP-localization complexity on day one  
- Multi-currency vanity before single-currency cash application is excellent  

---

## 18. API ecosystem

### Today

Internal `/v1` for the web app.

### Tomorrow

| Tier | Audience | Contents |
|------|----------|----------|
| **Private API** | ISALWA web / mobile | Full fidelity |
| **Partner API** | Accountants, ERPs, agencies | Stable resources + webhooks |
| **Public API** (late) | Ecosystem builders | Limited, versioned, metered |

### API product principles

- Version from day of externalization (`/v1` stays; breaking changes → `/v2`)  
- Idempotency keys on writes  
- Webhooks with signatures + retries  
- Scoped tokens (not god keys)  
- OpenAPI as contract; contracts package remains law  

### Ecosystem bets (Y4–Y5)

- Quote PDF / e-invoice partners  
- Logistics status ingest  
- BI warehouse export  
- “ISALWA Connect” directory (small, curated)

---

## 19. Feature flag strategy

### Purpose

Ship dark; validate; promote; kill.

### Flag types

| Type | Example |
|------|---------|
| **Release** | `wa.cloud_api` |
| **Experiment** | `radar.ranking_v2` |
| **Permission** | Role-gated surfaces |
| **Tenant** | Org enablement for beta |
| **Ops kill** | Instant disable AI send-assist |

### Rules

1. Flags default safe (off for risky).  
2. No eternal flags — expiry owner + date.  
3. Flags named by capability, not person.  
4. Demo mode (`?demo=1`) is orthogonal and never enables prod side effects.  
5. Multi-company: evaluate flags with `(orgId, userId, role)`.

### Governance

A living flag registry in docs/ops (later tooling). Mission docs reference flag names when slicing work.

---

## 20. Five-year product vision

### North star (2026 → 2031)

> ISALWA OS is the commercial operating system manufacturers and distributors in Spanish-speaking LATAM trust to run field sales, WhatsApp revenue, and collections — with the calm of a precision instrument and the depth of a Customer 360.

### Year narratives

| Year | Narrative | Proof |
|------|-----------|-------|
| **Y1 — Instrument** | Production for ISALWA S.R.L.: Auth, WhatsApp live, quote→cash trusted, Radar/Pulso believed | Daily use by asesores + operadores |
| **Y2 — Intelligence** | Copilot drafts + intent; Territory routes; Collections playbooks; Memoria stories | Measurable SLA + cash cycle improvement |
| **Y3 — Operating system** | Cross-team rituals, approvals, inventory-aware recommendations, fiscal path | Owner runs Monday from Pulso alone |
| **Y4 — Productize** | Second company pilot; L1 white-label; Partner API; SOC2-minded | External tenant pays or formally pilots |
| **Y5 — Platform** | Multi-company, country packs, Connect ecosystem, coaching | Category reference in regional distribution software |

### Experience continuity

The seven experiences remain the product grammar:

**Pulso · Radar · Personas · Territorio · Señal · Cierre · Memoria**

They deepen; they are not replaced by a 30-item nav.

### Emotional promise (unchanged)

The propietaria opens Pulso and feels: *the company is under control.*  
The asesor feels: *faster than WhatsApp + Excel.*  
The operador feels: *I never lose a thread.*

---

# Part B — Critique council

Critique the draft roadmap as seven demanding reviewers. Then absorb the corrections into Part C.

## Stripe

**Praise:** Money objects (quote→invoice→payment) and idempotent mindset.  
**Attack:** Without ruthless cash application, reconciliation, and dispute states, “Revenue Intelligence” is a slide. WhatsApp without payment-state awareness is incomplete commerce.  
**Demand:** Treat payment allocation and promise breach as Tier-0 domain — equal to messaging.

## Linear

**Praise:** Experience grammar and timeline spine; resistance to tab farms.  
**Attack:** Five-year doc risks becoming a museum of ambitions. Without issue-sized missions and kill criteria, velocity dies.  
**Demand:** Every year has ≤5 “must win” capabilities; everything else is parking lot.

## Salesforce

**Praise:** Customer 360 ambition and role-aware depth.  
**Attack:** Under-specified metadata extensibility, enterprise admin, and sandbox/promotion. Fortune distributors will ask “can I add fields / approvals without engineering?”  
**Demand:** Plan a thin **extension layer** (custom fields + approval configs) before Y3 enterprise sales — without rebuilding Salesforce.

## HubSpot

**Praise:** Timeline + messaging unification instinct.  
**Attack:** Lifecycle marketing gravity could distract from operational OS. Also, sequences/cadences can become spam.  
**Demand:** Keep growth loops subordinate to operational truth; templates are governed operations, not marketing automation cosplay.

## Apple

**Praise:** Feel, instrument metaphor, constrained grammar of seven experiences.  
**Attack:** Feature sprawl will destroy the instrument. Recommendations, collaboration, white-label — each can uglify the dossier.  
**Demand:** One new surface per year that users can name; deepen existing experiences before adding nav items.

## Vercel

**Praise:** Port/adapter and flag thinking; demo→prod path.  
**Attack:** Platform talk (multi-region, public API) too early invites premature complexity. DX for internal teams matters as much as customer UX.  
**Demand:** Measure bottlenecks; keep modular monolith until pain is real; invest in preview environments and typed contracts as product infrastructure.

## Fortune 500 CIO

**Praise:** Security stages and audit awareness.  
**Attack:** Without Auth/RBAC/audit as the *first* production gate, nothing else is procurable. Vendor lock, data residency, Meta dependency, and exit exports will be diligence blockers.  
**Demand:** Y1 security gate is non-negotiable; document data residency, retention, and export. Make Meta dependency an explicit risk with mitigations (not hopium).

---

# Part C — Corrected execution model

Absorbed from the council. This is the version a venture-backed company would actually run.

## C1. Capability tiers (portfolio law)

| Tier | Meaning | Examples |
|------|---------|----------|
| **T0 — Survive** | Cannot sell or operate without | Auth/RBAC, WhatsApp ingest, account truth, quote→cash, audit basics |
| **T1 — Prefer** | Changes weekly outcomes | Radar quality, SLA ops, promises, price memory excellence, dossier evidence |
| **T2 — Distinguish** | Category-defining | Territory routes, copilot drafts, Memoria stories, collections intelligence |
| **T3 — Expand** | New markets / revenue | White-label L1, Partner API, country packs |
| **T4 — Dream** | Only after T3 proof | Full OEM, multi-region, public marketplace |

**Rule:** No T3 work while any T0 item is red.

## C2. Must-win outcomes by year (max 5)

### Year 1 — Instrument (T0)

1. **Trusted identity** — AuthN/AuthZ on every sensitive route; roles match reality.  
2. **WhatsApp production OS** — Live Cloud API for 3 channels; match; SLA; durable history.  
3. **Commercial loop hardness** — Quote → accept → invoice → payment allocation believed by finance.  
4. **Attention system believed** — Radar + Pulso numbers reconcile to ledger-ish truth.  
5. **Security baseline** — Audit writes, secrets hygiene, webhook verify, export for owner.

### Year 2 — Intelligence (T1–T2)

1. Copilot drafts + intent classify in Señal/Cierre (human send).  
2. Collections intelligence (promises, playbooks, breach → Radar).  
3. Territory coverage + route assist.  
4. Memoria v1 (story engine over timeline).  
5. Notification system that people leave on.

### Year 3 — Operating system (T2)

1. Approvals + collaboration attached to objects.  
2. Recommendation engine in quote canvas.  
3. Revenue forecast managers argue with (not ignore).  
4. Fiscal integration path (Bolivia) in dual-run.  
5. Thin extension layer (custom fields + approval config).

### Year 4 — Productize (T3)

1. Second-organization pilot with true isolation.  
2. White-label L1 (tokens + logo + domain).  
3. Partner API + signed webhooks.  
4. SOC2-minded control set.  
5. Cost/economics dashboard (WhatsApp + AI).

### Year 5 — Platform (T3–T4)

1. Country pack #2 with paying design partner.  
2. Holding-group soft links (if demanded).  
3. Coaching / quality layer.  
4. Curated Connect integrations.  
5. Category narrative: “commercial OS for manufacturers & distributors.”

## C3. Sequenced mission map (post–15)

Indicative mission themes (names may change; dependency order should not):

| Mission theme | Tier | Depends on |
|---------------|------|------------|
| Auth & RBAC production | T0 | — |
| WhatsApp Cloud API hardening | T0 | Auth |
| Message identity & matching | T0 | WA ingest |
| Payment allocation & promises | T0 | Commercial loop |
| Audit & export | T0 | Auth |
| Señal ops excellence | T1 | WA |
| Radar truthfulness | T1 | Timeline events |
| Copilot drafts (shadow→assist) | T2 | Evidence store |
| Collections playbooks | T2 | Promises + WA |
| Territory routes | T2 | Visit integrity |
| Memoria stories | T2 | Timeline |
| Approvals & collab | T2 | Auth |
| Recommendations | T2 | Price memory |
| Fiscal adapter | T2/T3 | Invoicing truth |
| Multi-company pilot | T3 | Isolation + flags |
| White-label L1 | T3 | Multi-company |
| Partner API | T3 | Versioning |
| Country pack | T3 | Locale + fiscal |

## C4. Kill criteria (Linear demand)

A capability is **killed or parked** if after its pilot window:

- It does not change a weekly decision for the target role, or  
- Operators bypass it for WhatsApp native + Excel, or  
- It increases average time-to-quote / time-to-first-response, or  
- Support burden exceeds usage value.

## C5. Meta dependency (CIO demand)

| Risk | Mitigation |
|------|------------|
| API policy / pricing shocks | Abstract provider; template cost monitoring; dual-channel runbooks |
| WABA bans | Strict template governance; quality sampling; escalation playbook |
| Outage | Queue + replay; status banner; offline compose with sync honesty |
| Lock-in | Exportable message archive for org owner |

## C6. Extension layer (Salesforce demand — thin)

Before enterprise multi-company sales:

- Custom fields on Account / Opportunity / Quote (typed, limited)  
- Configurable approval thresholds (discount %, credit)  
- Not: full programmatic UI builder  

## C7. Cash application (Stripe demand)

Elevate in domain priority:

- Partial payments  
- Unallocated cash  
- Promise breach state machine  
- Dispute flag that freezes naive automation  

These are commercial OS foundations, not accounting nice-to-haves.

## C8. Surface budget (Apple demand)

Per calendar year, the product may add **at most one** top-level experience *or* major mode.  
Default investment: deepen the seven.  
Candidate future mode (not nav item yet): **Asistente** as an overlay, not an eighth sidebar religion.

---

# Part D — Operating cadence

## Product rituals

| Ritual | Cadence | Owner |
|--------|---------|-------|
| Capability review vs this doc | Monthly | CPO |
| Flag expiry review | Biweekly | Eng lead |
| WhatsApp quality + cost review | Weekly | Señal owner |
| Security gate review | Monthly | Eng + founder |
| Customer decision review (“what did Pulso change?”) | Weekly | Founder |

## Documentation law

- This file is the **parent** of post–15 missions.  
- Child missions must cite: tier, year outcome, kill criteria, flags.  
- Conflicts with Mission 11–14 experience law → experience law wins on *feel*; this file wins on *capability sequencing*.  
- Conflicts with `AI_CONSTITUTION.md` → constitution wins on architecture/reuse.

## Success metrics (company-level)

Not vanity MAU. Prefer:

1. % WhatsApp conversations with Account match  
2. Median first-response time by channel  
3. Quote→cash cycle time  
4. % cartera with fresh promise or plan  
5. Weekly active asesores using check-in + quote  
6. Owner: days/week Pulso is the morning start  
7. Bypass rate (Excel/WhatsApp-native workarounds) — drive toward zero on core loops  

---

# Part E — One-page summary

**Build:** WhatsApp OS + hard commercial money loop + trusted identity/audit.  
**Then:** Intelligence that cites evidence (Radar, Collections, Territory, Copilot drafts).  
**Then:** Collaboration/approvals/recommendations that deepen the seven experiences.  
**Only then:** Multi-company, white-label, APIs, country packs.

**Never:** CRM cosplay, dashboard sprawl, autonomous money AI, premature LATAM expansion, or a second design system.

---

**Mission 15 complete (docs only).**  
Next missions implement slices of Part C — never the whole canvas at once.
