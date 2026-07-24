# ISALWA OS — Engineering Master Plan
### Implementation Contract for Engineers & AI Agents
**Version:** 1.0  
**Status:** BINDING until superseded by an ADR  
**Date:** 24 julio 2026  
**Product:** ISALWA OS — Enterprise commercial operating system for ISALWA S.R.L. (Bolivia)  
**Frozen inputs:** Product Vision + UX Direction (`PRODUCT_BLUEPRINT.md`, `UX_PRODUCT_REVIEW.md`)  
**Language of UI:** Spanish (Bolivia) — code, docs, ADRs: English  

> **This is Version 1 of a real platform.**  
> The first release must also be an incredible live demo.  
> Demo screens MUST NOT be hardcoded. Every UI reads from the production data model.  
> Missing credentials → adapter + mock provider. Swap provider later; never rewrite screens.

---

# 0. Executive engineering thesis

ISALWA OS is a **modular monolith first**, evolving to extract high-churn boundaries (messaging, AI, PDF) only when scale or team topology demands it.

**North-star architecture:**
- TypeScript end-to-end
- Next.js web client as the product surface
- NestJS API as the system of record boundary
- PostgreSQL + PostGIS as source of truth
- Provider adapters for WhatsApp, Maps, AI, Storage, Search, PDF
- Seeded, internally consistent demo universe that survives provider swaps

**Non-goals for V1:** multi-region active-active, microservices mesh, custom mobile native apps (PWA first), full Bolivian fiscal certification as a blocker.

---

# 1. Decision register (locked recommendations)

| Area | Decision | Rationale |
|------|----------|-----------|
| Language | TypeScript 5.x strict | One language across FE/BE/agents; hireability; AI-agent friendliness |
| Package manager | **pnpm** 9.x | Fast, strict, monorepo-native |
| Monorepo | **Turborepo** + pnpm workspaces | Simple, Vercel-grade, 30-engineer ready without Bazel tax |
| Frontend app | **Next.js 15 App Router** | SSR/CSR hybrid, routing, RSC where useful, industry default 2026 |
| UI primitives | **React 19** + Radix + custom `isalwa-ui` | Accessibility + full visual control |
| Styling | **Tailwind CSS 4** + CSS variables (design tokens) | Speed + token discipline |
| Motion | **Motion** (Framer Motion) | Premium micro-interactions; honor `prefers-reduced-motion` |
| Icons | **Lucide React** | Consistent, tree-shakeable |
| Charts | **Recharts** (+ custom wrappers) | Good enough DX; swap to Visx later if needed |
| Maps client | MapLibre GL JS | Vendor-neutral rendering; provider supplies tiles/geocoding |
| Forms | **React Hook Form** + **Zod** | Performance + shared schemas with API |
| Client server-state | **TanStack Query v5** | Cache, mutations, optimistic UI |
| Client UI state | **Zustand** (minimal) | Command palette, density mode, shell state |
| URL state | **nuqs** | Filters/lenses shareable |
| Backend | **NestJS 11** (Node 22 LTS) | Structure for 30 engineers; modules map to domains |
| API style | **REST + OpenAPI** primary; tRPC optional internal only | Clear contract for mobile/PWA/agents; OpenAPI is the law |
| Validation | **Zod** shared in `packages/contracts` | Single source of truth |
| ORM | **Prisma** + raw SQL/PostGIS where needed | DX; escape hatch for geo |
| Database | **PostgreSQL 16** + **PostGIS** | Relational truth + GPS |
| Cache / queues | **Redis 7** + **BullMQ** | SLA timers, jobs, rate limits, sessions |
| Auth | **Auth.js (NextAuth v5)** credentials + magic link + MFA TOTP for privileged roles; sessions in Redis/DB | Controllable; enterprise MFA path |
| AuthZ | Custom **RBAC + territory scopes** in API | Domain-specific; not outsourceable |
| Storage | S3-compatible (**Cloudflare R2** prod; MinIO local) | Cheap egress; adapter-ready |
| Search | Postgres FTS V1 → **Meilisearch** when >50k entities hurt | Avoid early ops; upgrade path clear |
| WhatsApp | Meta Cloud API via `MessagingProvider` | Real path; `MockMessagingProvider` for demo |
| Maps services | `MapsProvider`: Google / Mapbox / Mock | Geocode, reverse, distance matrix, static maps |
| AI | `AiProvider`: OpenAI / Anthropic / Mock | Summaries, rankings explain, reply drafts |
| PDF | `PdfProvider`: Playwright/Puppeteer render OR react-pdf server | Quote/invoice PDFs |
| Email | `EmailProvider`: Resend / Mock | Transactional only V1 |
| Notifications | In-app + email; web push P2 | Unified `NotificationService` |
| Logging | **pino** structured JSON | Correlate with request IDs |
| Errors FE | **Sentry** | Session replay optional, privacy-scrubbed |
| Errors BE | Sentry Node + OpenTelemetry traces | |
| Metrics | OpenTelemetry → Grafana Cloud / Honeycomb | Latency, queue depth, SLA breach rate |
| Analytics product | First-party events table + optional PostHog | Privacy-first; Bolivia customer data care |
| Feature flags | DB-backed flags + `packages/flags` | No LaunchDarkly tax Day 1; interface allows swap |
| i18n | **next-intl**; default locale `es-BO`; English deferred | UI Spanish; code English |
| Testing FE | Vitest + Testing Library + Playwright | |
| Testing BE | Vitest / Jest (Nest default) + Supertest | |
| E2E | Playwright against preview + seeded DB | |
| Contract tests | OpenAPI spectral + Pact optional P2 | |
| CI | GitHub Actions | |
| CD | Vercel (web) + Fly.io or Render (API/workers) + managed Postgres (Neon/Supabase/RDS) | See §14 |
| IaC | Terraform for cloud resources P1; Vercel/Fly dashboards acceptable P0 | |
| Docs | `docs/` + ADR in `docs/adr/` | |
| Storybook | Storybook 8 for `isalwa-ui` | |
| Date/time | **Temporal** polyfill or `date-fns-tz`; store UTC; display America/La_Paz | |
| Money | Integer **centavos** (`bigint`) + currency `BOB` | Never float money |
| IDs | **ULID** (string) app-level; DB uuid optional dual | Sortable, distributable |

### Explicitly rejected (and why)
| Rejected | Why |
|----------|-----|
| Salesforce-like metadata engine | Overkill; slows V1 |
| Microservices Day 1 | Team coordination tax > benefit |
| MongoDB as SoR | Relational commercial domain |
| GraphQL Day 1 | REST+OpenAPI clearer for multi-client |
| Scraping WhatsApp Web | Ban — fragile, ToS, security |
| Hardcoded demo routes | Violates product philosophy |
| Floats for money | Accounting bugs |
| CSS-in-JS runtime default | Prefer Tailwind tokens |

---

# 2. System context

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  Web (Next)  │────▶│  API (Nest)  │────▶│  PostgreSQL+PostGIS │
│  PWA         │     │              │     └─────────────────────┘
└──────┬───────┘     │  Workers     │────▶ Redis + BullMQ
       │             │  (Nest/Bull) │────▶ Object Storage (R2)
       │             └──────┬───────┘────▶ Meilisearch (P1+)
       │                    │
       │                    ├── MessagingProvider → Meta WA / Mock
       │                    ├── MapsProvider → Google/Mapbox/Mock
       │                    ├── AiProvider → OpenAI/Anthropic/Mock
       │                    ├── PdfProvider
       │                    └── EmailProvider
       │
       └── Realtime (SSE/WebSocket gateway) for Señal + live check-ins
```

**Auth flow:** Browser → NextAuth → session cookie → BFF or direct Bearer to Nest (see §7).  
**Recommendation:** Next.js calls Nest with session exchange (JWT access token short-lived + refresh). Nest trusts only signed JWTs from our auth issuer.

---

# 3. Monorepo structure

```
isalwa/
├── apps/
│   ├── web/                 # Next.js — product UI (Pulso, Radar, Personas…)
│   ├── api/                 # NestJS — HTTP API, authz, domain services
│   ├── worker/              # NestJS standalone / same codebase entry — BullMQ processors
│   └── storybook/           # Design system workshop (or packages/ui storybook host)
├── packages/
│   ├── contracts/           # Zod schemas, OpenAPI types, shared DTOs, error codes
│   ├── ui/                  # isalwa-ui design system (tokens + components)
│   ├── config-eslint/       # Shared ESLint
│   ├── config-ts/           # Shared tsconfig bases
│   ├── config-tailwind/     # Shared Tailwind preset / tokens
│   ├── database/            # Prisma schema, migrations, seed runners
│   ├── providers/           # Interfaces + mock/real adapters (messaging, maps, ai, storage, pdf, email, search)
│   ├── domain/              # Pure domain logic (scoring, SLA math, money) — no I/O
│   ├── flags/               # Feature flag client evaluation helpers
│   └── ts-utils/            # Result types, assert, ulid, phone normalize BO
├── services/                # OPTIONAL later: extract messaging-gateway if needed (empty in V1)
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   ├── security/
│   ├── deployment/
│   ├── product/
│   ├── adr/
│   ├── runbooks/
│   └── guides/
├── scripts/
│   ├── dev/
│   ├── db/
│   ├── seed/
│   └── release/
├── seed/
│   ├── fixtures/            # Canonical YAML/JSON universe definitions
│   ├── generators/          # Deterministic generators (seeded RNG)
│   └── snapshots/           # Optional frozen SQL dumps for CI
├── public/                  # Static marketing/demo assets if needed (prefer apps/web/public)
├── assets/
│   ├── brand/               # Logo placeholders until official
│   ├── illustrations/       # Empty states
│   └── fonts/
├── tests/
│   ├── e2e/                 # Playwright
│   ├── integration/         # API+DB
│   └── load/                # k6 scenarios P2
├── .github/
│   ├── workflows/
│   └── CODEOWNERS
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.worker
│   ├── Dockerfile.web      # if not using Vercel native
│   └── docker-compose.yml   # postgres, redis, minio, mailhog, meilisearch
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── README.md
└── CONTRIBUTING.md
```

### Why each top-level exists
| Path | Purpose |
|------|---------|
| `apps/` | Deployable boundaries (web, api, worker) |
| `packages/` | Shared libraries; force clean boundaries |
| `services/` | Reserved for future extractable services; keep empty until justified |
| `docs/` | Engineering contract + onboarding |
| `scripts/` | Repeatable human/CI operations |
| `seed/` | Believable universe — sacred |
| `assets/` | Brand & illustration sources |
| `tests/` | Cross-app verification |
| `.github/` | CI/CD + ownership |
| `docker/` | Local parity with prod dependencies |

**Assumption:** Single git repo `isalwa`; main branch `main`; trunk-based development + short-lived PRs.

---

# 4. Domain map (bounded contexts)

Align UX experiences → backend modules:

| UX Experience | Nest Module | Owns |
|---------------|-------------|------|
| Pulso | `PulseModule` | Aggregations, vitals, narrative sentence rules |
| Radar | `RadarModule` | Attention objects, ranking, snooze |
| Personas / Dossier | `AccountsModule` | Accounts, contacts, scores, summaries |
| Territorio | `TerritoryModule` + `FieldModule` | Geo, routes, visits, check-ins |
| Señal | `MessagingModule` | Conversations, messages, SLA, assignments |
| Cierre | `CommerceModule` | Quotes, orders, invoices, payments, promises |
| Memoria | `MemoryModule` | Stories, analytics projections |
| Comando | `SearchModule` + web command | Global search indexing queries |
| Platform | `IamModule`, `FilesModule`, `NotifyModule`, `AuditModule`, `FlagsModule`, `SettingsModule` | Cross-cutting |

**Rule:** Cross-module calls go through application services or domain events — not random Prisma access from unrelated modules.

---

# 5. Database architecture

## 5.1 Principles
- PostgreSQL 16 + PostGIS
- Soft deletes only where legally/audit required (`deleted_at`); prefer status enums for commercial docs
- All tables: `id` (ULID text PK), `created_at`, `updated_at`
- Multi-tenant ready: `organization_id` on every tenant table (V1 single org ISALWA)
- Money: `amount_centavos BIGINT`, `currency CHAR(3)` default `BOB`
- Phones: E.164 (`+591…`) normalized
- Timestamps: `timestamptz`
- Audit: immutable `audit_logs` + domain `activity_events`

## 5.2 Schema (production-ready)

### Identity & access
```
organizations
  id, name, slug, nit, timezone, locale, settings_json

users
  id, organization_id, email, name, phone, status, password_hash,
  mfa_enabled, last_login_at

roles
  id, organization_id, key, name, description

permissions
  id, key, description

role_permissions
  role_id, permission_id

user_roles
  user_id, role_id, territory_id NULL

sessions / auth tables per Auth.js + refresh_tokens
  id, user_id, token_hash, expires_at, revoked_at
```

### Sales force & territories
```
territories
  id, organization_id, name, code, parent_id NULL, geom (optional MultiPolygon)

sales_reps
  id, organization_id, user_id UNIQUE, employee_code, hire_date, status

territory_members
  territory_id, user_id, role_in_territory
```

### Accounts (customers)
```
accounts
  id, organization_id, code, legal_name, trade_name, nit,
  account_type (ferreteria|constructora|distribuidor|instalador|otro),
  segment (A|B|C), status, credit_limit_centavos, credit_status,
  relationship_score, relationship_score_components_json,
  owner_user_id, territory_id,
  favorite_products_json, purchase_stats_json,
  predicted_next_order_start, predicted_next_order_end, prediction_confidence,
  ai_summary, ai_summary_at, ai_summary_evidence_json,
  last_visit_at, last_purchase_at, last_whatsapp_at,
  tags_json

contacts
  id, organization_id, account_id, name, title, phone, email, is_primary, notes

account_addresses
  id, account_id, label, line1, line2, city, department, country,
  is_primary, location_id NULL

account_locations
  id, organization_id, account_id, label,
  geog geography(Point,4326), accuracy_m, geofence_radius_m,
  source (manual|geocode|checkin), is_primary

account_assignments
  id, account_id, user_id, assigned_at, unassigned_at, reason
```

### Catalog
```
product_categories
  id, organization_id, parent_id, name, sort_order

products
  id, organization_id, sku, name, category_id, description,
  unit, is_active, attributes_json, image_file_id NULL

price_lists
  id, organization_id, name, currency, valid_from, valid_to, is_default

price_list_items
  id, price_list_id, product_id, unit_price_centavos UNIQUE(price_list_id, product_id)

account_price_overrides
  id, account_id, product_id, unit_price_centavos, valid_from, valid_to

price_observations  -- IMMUTABLE commercial memory
  id, organization_id, account_id, product_id,
  source (quote|order|invoice|manual), source_id,
  unit_price_centavos, observed_at, created_by
```

### Commerce
```
opportunities
  id, organization_id, account_id, owner_user_id, name, stage, amount_centavos,
  probability, expected_close_date, status

quotes
  id, organization_id, number, account_id, owner_user_id, status,
  valid_until, subtotal_centavos, tax_centavos, total_centavos, currency,
  notes, sent_at, accepted_at, rejected_at, pdf_file_id

quote_items
  id, quote_id, product_id, description, qty, unit_price_centavos,
  discount_bps, line_total_centavos, position,
  last_price_shown_centavos NULL

orders
  id, organization_id, number, account_id, quote_id NULL, status,
  ordered_at, subtotal/tax/total_centavos, currency

order_items
  id, order_id, product_id, qty, unit_price_centavos, line_total_centavos, position

invoices
  id, organization_id, number, account_id, order_id NULL, status,
  issued_at, due_at, subtotal/tax/total_centavos, balance_centavos, currency,
  fiscal_payload_json NULL  -- future Bolivia e-invoicing

invoice_items
  id, invoice_id, product_id, qty, unit_price_centavos, line_total_centavos

payments
  id, organization_id, account_id, invoice_id NULL, amount_centavos, currency,
  method, paid_at, reference, recorded_by

payment_allocations
  id, payment_id, invoice_id, amount_centavos

payment_promises
  id, organization_id, account_id, invoice_id NULL, amount_centavos,
  promised_at, due_at, status, notes, owner_user_id

credit_terms
  id, account_id, net_days, notes
```

### Field
```
visits
  id, organization_id, account_id, sales_rep_user_id, status,
  planned_at, started_at, completed_at, result, notes,
  checkin_geog, checkin_accuracy_m, within_geofence bool,
  photos_json, route_stop_id NULL

routes
  id, organization_id, sales_rep_user_id, route_date, status, name

route_stops
  id, route_id, account_id, position, planned_arrival, visit_id NULL, purpose
```

### Messaging (WhatsApp)
```
messaging_channels
  id, organization_id, provider, provider_channel_id, display_name,
  phone_e164, is_active, metadata_json
  -- V1: exactly 3 WhatsApp channels for ISALWA

conversations
  id, organization_id, channel_id, account_id NULL, contact_phone_e164,
  status, assigned_user_id, last_message_at,
  sla_policy_id, sla_due_at, sla_status, first_response_at

messages
  id, organization_id, conversation_id, direction (in|out),
  provider_message_id, body, body_json, sent_at, delivered_at, read_at,
  sender_type (customer|user|system|ai_draft), sender_user_id NULL,
  status

message_templates
  id, organization_id, channel_id NULL, name, body, provider_template_name, status

sla_policies
  id, organization_id, name, first_response_seconds, business_hours_json
```

### Collaboration
```
tasks
  id, organization_id, title, description, status, priority,
  due_at, assignee_user_id, created_by,
  link_type, link_id  -- polymorphic account|quote|invoice|conversation|visit

notes
  id, organization_id, body, author_user_id, link_type, link_id

files
  id, organization_id, storage_key, filename, mime, size_bytes,
  uploaded_by, checksum

file_links
  file_id, link_type, link_id

notifications
  id, organization_id, user_id, type, title, body, payload_json,
  read_at, created_at

activity_events  -- Timeline spine
  id, organization_id, account_id NULL, actor_user_id NULL,
  type, title, body, payload_json, occurred_at

audit_logs
  id, organization_id, actor_user_id, action, resource_type, resource_id,
  ip, user_agent, before_json, after_json, created_at

ai_summaries
  id, organization_id, subject_type, subject_id, summary, evidence_json,
  model, created_at, expires_at

feature_flags
  id, organization_id NULL, key, description, enabled, rules_json

organization_settings
  organization_id PK, settings_json

attention_items  -- Radar materialization optional
  id, organization_id, kind, subject_type, subject_id, score, reason_json,
  status, snoozed_until, assignee_user_id
```

## 5.3 Relationships (cardinalities — summary)
- Organization 1—* all tenant entities  
- Account 1—* contacts, locations, quotes, orders, invoices, visits, conversations  
- Quote 1—* quote_items; Quote 0..1→ Order; Order 0..1→ Invoice  
- Invoice 1—* payment_allocations; Payment 1—* allocations  
- User 1—0..1 sales_rep; User *—* roles; User *—* territories via membership/assignments  
- Channel 1—* conversations 1—* messages  
- Route 1—* stops; Stop 0..1 visit  

## 5.4 Indexes (critical)
```
accounts (organization_id, legal_name)
accounts (organization_id, nit) UNIQUE where nit not null
accounts (organization_id, owner_user_id)
accounts (organization_id, segment, last_visit_at)
account_locations USING GIST (geog)
contacts (organization_id, phone)
products (organization_id, sku) UNIQUE
price_observations (account_id, product_id, observed_at DESC)
quotes (organization_id, number) UNIQUE
invoices (organization_id, number) UNIQUE
invoices (organization_id, status, due_at)
payments (organization_id, paid_at)
visits (organization_id, sales_rep_user_id, planned_at)
visits (account_id, completed_at DESC)
conversations (organization_id, sla_status, sla_due_at)
conversations (channel_id, last_message_at DESC)
messages (conversation_id, sent_at)
activity_events (account_id, occurred_at DESC)
audit_logs (organization_id, created_at DESC)
attention_items (organization_id, status, score DESC)
```

## 5.5 Constraints & integrity
- CHECK amounts >= 0  
- CHECK quote/invoice status enums  
- FK ON DELETE RESTRICT for financial docs; CASCADE for items  
- Partial unique indexes for primary contact/location  
- Trigger or app rule: append-only `price_observations`, `audit_logs`, `activity_events`  

## 5.6 Scalability path
1. Verticalize Postgres + read replica for Pulso/Memoria  
2. Materialized views / nightly `kpi_snapshots`  
3. Partition `messages`, `activity_events`, `audit_logs` by month when >50M rows  
4. Extract Messaging to service when throughput/team demands  
5. Search → Meilisearch; keep Postgres SoR  

**Assumption:** V1 stays comfortably on one primary Postgres (16GB+ RAM class) for ISALWA single-tenant scale.

---

# 6. Integration architecture (adapters)

## 6.1 Law
```
App/Domain → Port (interface in packages/providers) → Adapter (mock|vendor)
```
No vendor SDK imports inside Nest domain modules — only inside adapter files.

## 6.2 Ports
```
MessagingProvider
  sendText, sendTemplate, listInbound(webhook), markRead, getChannelHealth

MapsProvider
  geocode, reverseGeocode, distanceMatrix, snapToRoad?, staticMapUrl

AiProvider
  summarizeAccount, draftReply, explainRadarScore, generateMemoryStory

StorageProvider
  putObject, getSignedUrl, deleteObject

SearchProvider
  index, remove, search

PdfProvider
  renderQuote, renderInvoice

EmailProvider
  send

Clock / Random / IdGenerator
  injectable for tests & deterministic seeds
```

## 6.3 Config
```
MESSAGING_PROVIDER=mock|meta
MAPS_PROVIDER=mock|google|mapbox
AI_PROVIDER=mock|openai|anthropic
STORAGE_PROVIDER=minio|r2|s3
SEARCH_PROVIDER=postgres|meilisearch
PDF_PROVIDER=playwright|reactpdf
EMAIL_PROVIDER=mock|resend
```

## 6.4 Webhook pattern
- Public `/webhooks/messaging/meta` verifies signature  
- Enqueue BullMQ job → normalize → persist → emit realtime  
- Idempotency keys on `provider_message_id`  

## 6.5 Mock fidelity requirement
Mocks MUST:
- Persist to the same DB tables as real providers  
- Simulate latency & failure modes behind flags  
- Support the demo script end-to-end without visual “demo mode” forks  

---

# 7. API architecture

## 7.1 Style
- REST `/v1/...`  
- OpenAPI 3.1 generated from Nest decorators + Zod  
- Error envelope:
```json
{ "error": { "code": "QUOTE_INVALID", "message": "...", "details": {}, "requestId": "..." } }
```
- Pagination: cursor-based (`cursor`, `limit`) for lists  
- Idempotency-Key header on payments, message sends, quote sends  

## 7.2 Resource examples
```
GET  /v1/pulse
GET  /v1/radar/items
POST /v1/radar/items/:id/snooze
GET  /v1/accounts
GET  /v1/accounts/:id
GET  /v1/accounts/:id/timeline
POST /v1/accounts/:id/summaries/refresh
GET  /v1/territorio/points
POST /v1/visits/:id/checkin
POST /v1/quotes
POST /v1/quotes/:id/send
GET  /v1/conversations
POST /v1/conversations/:id/messages
GET  /v1/search?q=
GET  /v1/comando/suggestions?q=
```

## 7.3 Realtime
- Prefer **SSE** for Pulso vitals + notifications (simpler ops)  
- **WebSocket** for Señal thread if SSE insufficient  
- Channel auth via short-lived ticket  

## 7.4 AuthZ middleware
Every request resolves:
`Actor { userId, orgId, roles, permissions, territoryIds, scopes }`  
Services call `assertPermission` + `assertAccountAccess`.

---

# 8. Frontend architecture

## 8.1 App structure (`apps/web`)
```
app/
  (auth)/login
  (shell)/
    pulso/
    radar/
    personas/
    personas/[accountId]/
    territorio/
    senal/
    cierre/...
    memoria/
    settings/
components/   # app-specific compositions
features/     # feature folders (dossier, quote-canvas, command)
lib/          # api client, auth, query keys
```

## 8.2 Rules
- Feature folders may compose `packages/ui` — they do not re-implement tokens  
- All data via TanStack Query keys namespaced (`accounts.detail`, etc.)  
- Optimistic updates for check-in, read notifications, snooze  
- Command palette uses same search API as Personas  
- **No alternate demo data hooks** — only env-selected API  

## 8.3 Experience ↔ routes (Spanish URLs)
`/pulso` `/radar` `/personas` `/territorio` `/senal` `/cierre/cotizaciones` `/memoria`  

---

# 9. Design system implementation (`packages/ui`)

## 9.1 Tokens
```
tokens/
  color.css      # porcelain, kiln, glaze, copper, semantic
  typography.css
  space.css      # 4pt grid
  radius.css
  shadow.css     # restrained
  motion.css     # durations/easing
  z.css
```
Exported as Tailwind theme extension + CSS variables.

## 9.2 Components (build order)
Primitives → Patterns → Experience blocks  
Examples: Button, Input, Table, DataRow, KpiVital, Timeline, SLAArc, MapChrome, QuoteLineEditor, CommandDialog, EmptyState, SkeletonPulse, ToastUndo  

## 9.3 Variants
CVA (class-variance-authority) for variants; no ad-hoc class stacks in apps.

## 9.4 Themes
- `light` default (owner emotional target)  
- `dark` token set prepared; ship behind flag P1  
- `high-contrast` accessibility variant  

## 9.5 White-label future
`organization.branding_json` → runtime CSS variable overrides (logo URL, glaze hex). V1 ships ISALWA tokens only but architecture supports override.

## 9.6 Motion
Wrapper `<MotionConfig reducedMotion="user">`; shared transitions in tokens.

## 9.7 Charts / Tables / Maps / Forms
All wrapped in UI package façades so apps never import Recharts/MapLibre directly (except rare escapes approved by CODEOWNERS).

---

# 10. Demo data strategy — “Universe ISALWA”

## 10.1 Law
Deterministic seed. Same seed → same universe.  
Internally consistent for **3+ years** of history.

## 10.2 Fictional but coherent company snapshot
**Assumption (documented):** Demo org mirrors ISALWA S.R.L. as manufacturer-distributor of ceramic sanitary ware + plastic tanks in Santa Cruz / Porongo region.

### Scale targets (V1 seed)
| Entity | Count |
|--------|------:|
| Users (reps, operators, managers, owner) | ~25 |
| Territories | 6–8 |
| Accounts | 350–500 |
| Contacts | ~900 |
| Products | 80–120 SKUs across categories |
| Price observations | 15k+ |
| Quotes | 4k+ |
| Orders | 3k+ |
| Invoices | 3k+ |
| Payments | 2.5k+ |
| Visits | 12k+ |
| Conversations | 800+ |
| Messages | 25k+ |
| Tasks / activities | tens of thousands |

### Categories (sanitary-credible)
Inodoros, Tanques de inodoro, Lavamanos, Bidés, Urinarios, Tanques plásticos, Asientos/Accesorios, Repuestos

### Consistency rules
1. Every invoice belongs to an account that has ≥1 prior quote or order path (mostly)  
2. Visits cluster on owner territory and near `account_locations`  
3. WhatsApp phones match contacts  
4. Relationship score recomputed from facts (not random)  
5. Seasonal sales: construction cycles; dips around known Bolivian holiday windows (assumption)  
6. GPS within Santa Cruz metro + satellite towns (Porongo, La Guardia, Warnes, Montero…)  
7. Three WhatsApp channels with distinct roles (ventas / cobranzas / soporte) — assumption  
8. Advisors have quotas & realistic conversion rates  
9. Debt aging distributes believably; a few dramatic A-account risks for demo  

## 10.3 Seed pipeline
```
fixtures (canonical orgs, users, products)
  → generators (accounts, geo, commerce timelines)
  → scorer (relationship, predictions)
  → messaging simulator (threads)
  → freeze checksum
```
Commands: `pnpm seed:demo`, `pnpm seed:demo --reset`, `pnpm seed:ci` (smaller).

## 10.4 Privacy
No real personal data. If client later imports real data, separate `seed:prod-migrate` path with anonymization tools.

---

# 11. Development strategy (phases)

## P0 — Platform spine + demo-capable core (weeks 1–6)
**Goals:** Real architecture; owner demo magic; no fake screens.  
**Deliverables:**
- Monorepo, CI, docker compose, auth, RBAC skeleton  
- Schema v1 migrated  
- Seed universe  
- UI shell + tokens  
- Pulso, Personas list+dossier spine, Quote canvas (create/send mock), Visits check-in, Territorio basic, Señal with MockMessagingProvider, Comando search  
- Provider interfaces + mocks wired  
**Dependencies:** Design tokens from UX freeze; brand placeholder OK  
**Risks:** Scope creep into Memoria/AI polish; WhatsApp credentials delay (mitigated by mock)  
**Acceptance:**
- Demo script 8 min runs on seeded DB  
- Turning `MESSAGING_PROVIDER=meta` does not require UI changes  
- Lighthouse / perf budgets preliminary green on Pulso  
- E2E covers login → pulso → dossier → quote → check-in  

## P1 — Daily driver (weeks 7–12)
**Goals:** Team can work daily.  
**Deliverables:** Radar, collections/promises, invoice views, tasks/notifications, roles polished, file uploads, PDF quotes, Maps real provider, SLA workers, audit log UI for admins, dark mode flag, PWA offline check-in queue  
**Acceptance:** One sales team pilot criteria defined; uptime targets; backup/restore drill documented  

## P2 — Operations scale (weeks 13–20)
**Goals:** Inventory light, automations, Memoria stories, Meilisearch, BI exports, route optimization assist, web push  
**Acceptance:** Automation rules for visit gaps & SLA escalation live; Memoria stories cite evidence  

## P3 — Platform (weeks 21+)
**Goals:** AI quality, portal B2B, fiscal Bolivia integration, native mobile if needed, white-label branding, multi-org SaaS hardcening  
**Acceptance:** Multi-tenant isolation test suite passes; fiscal adapter certified path decided with client  

---

# 12. Quality system

## 12.1 Architecture principles
1. Production data model only  
2. Ports & adapters for all vendors  
3. Money as integers  
4. Explicit authz on every query  
5. Idempotent writes for external side effects  
6. Feature flags for risky surface area  
7. Prefer modular monolith  
8. Observability before cleverness  

## 12.2 Coding standards
- TypeScript `strict`, no `any` without eslint disable + justification  
- ESLint + Prettier + Husky / lint-staged  
- Conventional Commits  
- Max PR size guideline: <400 LOC preferred; >1000 requires TPM note  
- No silent catch; never log secrets  

## 12.3 Naming
- DB: `snake_case` tables/columns  
- TS: `PascalCase` types, `camelCase` values  
- React components: PascalCase files  
- Nest modules: match domain names  
- Permissions: `resource.action` (`quotes.send`)  
- UX copy: Spanish; code identifiers English  

## 12.4 Testing requirements
| Layer | Requirement |
|-------|-------------|
| Domain pure functions | Unit tests mandatory |
| API critical flows | Integration tests with Testcontainers Postgres |
| Providers | Contract tests per adapter |
| UI components | Storybook + Interaction tests for critical |
| E2E | Playwright smoke + demo script automation |
| Coverage | Critical domain ≥80%; vanity 100% not required |

## 12.5 Accessibility
WCAG 2.2 AA target; keyboard paths for Comando, tables, Señal; axios contrast checks in CI for tokens.

## 12.6 Performance budgets
| Surface | Budget |
|---------|--------|
| Pulso LCP | < 2.5s on broadband |
| Comando open → results | < 150ms local cache; < 400ms network p95 |
| Dossier first paint | < 2.0s |
| API p95 read | < 200ms |
| API p95 search | < 350ms |
| Check-in API | < 300ms p95 |

## 12.7 Security checklist (every release)
- [ ] AuthZ tests for horizontal privilege escalation  
- [ ] Webhook signature verified  
- [ ] Secrets only in vault/CI  
- [ ] Dependency audit CI  
- [ ] PII scrubbing in logs/Sentry  
- [ ] Rate limits on auth & webhooks  
- [ ] Backup encryption verified  

## 12.8 Definition of Done
1. Spec linked (feature doc or issue)  
2. Types + OpenAPI updated  
3. Migrations backward-safe  
4. Tests per §12.4  
5. Audit events for sensitive mutations  
6. Feature flag if risky  
7. Docs/runbook if ops-facing  
8. Accessibility smoke  
9. Product acceptance on preview URL  
10. CODEOWNERS review  

---

# 13. Documentation set (must exist)

| Doc | Path |
|-----|------|
| Architecture overview | `docs/architecture/overview.md` |
| C4 diagrams | `docs/architecture/c4.md` |
| API guidelines | `docs/api/guidelines.md` |
| OpenAPI | generated `docs/api/openapi.json` |
| Database ERD + schema notes | `docs/database/schema.md` |
| Security model | `docs/security/model.md` |
| Threat model (lite) | `docs/security/threat-model.md` |
| Deployment | `docs/deployment/overview.md` |
| Environments | `docs/deployment/environments.md` |
| Onboarding | `docs/guides/onboarding.md` |
| Contributing | `CONTRIBUTING.md` |
| Coding standards | `docs/guides/coding-standards.md` |
| Design system | `docs/product/design-system.md` |
| Feature specs template | `docs/product/features/_template.md` |
| UX experience specs | `docs/product/experiences/*.md` |
| ADRs | `docs/adr/NNNN-title.md` |
| Release notes | `docs/releases/` |
| Demo script | `docs/product/demo-script.md` |
| Admin guide | `docs/guides/admin.md` |
| User guide (Spanish) | `docs/guides/usuario.md` |
| Runbooks | `docs/runbooks/*.md` |
| Provider setup | `docs/deployment/providers.md` |
| Seed universe bible | `docs/product/demo-universe.md` |

**ADR rule:** Any rejected alternative in this Master Plan that later changes requires an ADR.

---

# 14. Deployment & DevOps

## 14.1 Environments
| Env | Purpose | Data |
|-----|---------|------|
| `local` | docker-compose deps | seed demo |
| `preview` | per-PR ephemeral | seed demo subset |
| `staging` | pre-prod | seed or anonymized |
| `production` | ISALWA | real |

## 14.2 Topology (recommended P0/P1)
- **Web:** Vercel  
- **API + Worker:** Fly.io (or Render) — 2+ machines API, 1+ worker  
- **Postgres:** Neon or Supabase Postgres or RDS; PostGIS enabled  
- **Redis:** Upstash or Redis Cloud  
- **R2:** Cloudflare  
- **Sentry + OTEL backend**  

**Assumption:** Prefer Neon+PostGIS **if** PostGIS supported on chosen plan; otherwise RDS/Supabase. Validate in week 1 (listed in unknowns).

## 14.3 CI/CD (GitHub Actions)
On PR: lint, typecheck, unit, integration (testcontainers), build, Playwright smoke, Storybook build  
On merge `main`: migrate staging → deploy staging → e2e  
On tag `v*`: prod migrate → deploy → smoke → Slack/WhatsApp notify eng  

## 14.4 Secrets
- GitHub Environments secrets  
- Runtime: platform secret store  
- `.env.example` exhaustive; never commit `.env`  
- Separate Meta/Google/OpenAI keys per env  

## 14.5 Backups & rollback
- Automated daily Postgres backups + PITR  
- Weekly restore drill in staging  
- App rollback: previous image/deployment instant  
- Migrations: expand/contract pattern; no break-and-fix on prod  

## 14.6 Monitoring & alerting
- Burn alerts: API 5xx, worker failures, webhook fail spikes, SLA breach rate, disk, lag  
- Product health: Pulso generation errors, seed checksum drift in non-prod  

## 14.7 Local DX
```
pnpm install
pnpm dev:deps     # docker compose up
pnpm db:migrate
pnpm seed:demo
pnpm dev          # turbo web+api+worker
```

---

# 15. Security architecture

- TLS everywhere  
- Security headers on web  
- CSRF protection for cookie session flows  
- JWT access tokens short-lived (15m); refresh rotation  
- MFA TOTP mandatory for `Propietaria`, `Admin Sistema`  
- Field-level: `prices.view_cost` permission  
- Encryption at rest (provider default) + app-level encrypt for WA message bodies option P2  
- Rate limit: auth, webhooks, AI endpoints  
- Audit every read of sensitive exports + all financial mutations  
- Employee GPS: retention policy setting; access limited by role  
- Dependency scanning + secret scanning (gitleaks)  

**Assumption:** Legal basis for employee location tracking & chat storage to be validated with client (unknowns).

---

# 16. IAM model (engineering)

Roles (seed): Propietaria, Gerente Comercial, Supervisor Zona, Asesor Ventas, Operador WhatsApp, Cobranzas, Facturación, Almacén, Auditor, Admin Sistema  

Scopes:
- `own` (owner_user_id / assignee)  
- `territory`  
- `organization`  

Permission keys live in DB + mirrored const in `packages/contracts`.

---

# 17. Background jobs (BullMQ)

| Queue | Jobs |
|-------|------|
| `messaging` | ingest, send, status sync |
| `sla` | tick conversations, escalate |
| `radar` | rebuild attention items |
| `ai` | summarize, stories |
| `search` | index updates |
| `pdf` | render |
| `seed` | maintenance |
| `notifications` | fanout |

All jobs: idempotent, structured logs, dead-letter + admin replay.

---

# 18. Observability standards

- Every request: `requestId` propagated FE→BE→worker  
- Log fields: orgId, userId, route, latencyMs  
- Metrics: RED + queue depth + provider error rates  
- Traces: sample 10% prod, 100% staging  

---

# 19. Internationalization

- UI: `es-BO` messages in `apps/web/messages/es-BO.json`  
- No string literals in components without i18n wrapper  
- Dates: `es-BO` locale formatting; currency `Bs`  
- Code comments English  

---

# 20. Team topology (30 engineers — suggested)

| Squad | Owns |
|-------|------|
| Platform | monorepo, auth, CI/CD, providers |
| Experience Shell | UI kit, Comando, nav, motion |
| Accounts & Pulse | Personas, Dossier, Pulso, Radar |
| Field & Maps | Territorio, visits, routes |
| Messaging | Señal, SLA, WA adapters |
| Commerce | Quotes, invoices, payments |
| Data & Seed | schema, seed universe, Memoria |
| QA & Reliability | e2e, perf, chaos mocks |

TPM maintains this Master Plan + phase burndown.

---

# 21. Risk register (engineering)

| Risk | Mitigation |
|------|------------|
| PostGIS hosting mismatch | Validate provider week 1; fallback RDS |
| Meta WA approval delays | Mock provider first-class |
| Scope explosion | P0 acceptance locked to demo script |
| Seed unbelievability | Universe bible + owner review session |
| AuthZ bugs | Automated horizontal access tests |
| Realtime complexity | SSE first |
| Money/tax Bolivia | Keep fiscal_payload nullable; adapter later |
| 30-engineer collisions | CODEOWNERS + module boundaries + turborepo |

---

# 22. Self-review panel (improvements applied)

### Google Staff Engineer
“Modular monolith good. Ensure `packages/domain` has zero I/O — yes. Add explicit API versioning and deprecation policy.”  
→ **Added** `/v1` + OpenAPI as contract law.

### Stripe Principal Engineer
“Money as integer centavos — correct. Idempotency keys on payments/sends — correct. Expand/contract migrations — correct. Add ledger mindset later if cash-applied complexity grows.”  
→ **Noted** payment_allocations as mini-ledger; full ledger P3 if needed.

### Vercel Staff Engineer
“Next on Vercel + separate API is right. Avoid putting BullMQ on Vercel serverless.”  
→ **Workers on Fly/Render**, not Vercel serverless.

### Supabase Architect
“If using Supabase, prefer Postgres features carefully; don’t couple to Supabase Auth if Auth.js chosen — stay consistent.”  
→ **Auth.js locked**; Supabase only optional as Postgres host.

### Security Auditor
“Mock providers must not be enabled in production without hard guard.”  
→ **Boot check:** refuse `MESSAGING_PROVIDER=mock` when `NODE_ENV=production` unless `ALLOW_MOCK_PROVIDERS=1` emergency break-glass audited.

### Senior DevOps
“Preview DBs per PR can be expensive; use shared preview DB with schema-per-PR or truncated seed.”  
→ **Recommendation:** shared staging-like preview DB + namespace / reset job for P0 cost control.

### Product Owner
“Engineering must protect UX nouns: Pulso/Radar/Señal in routes and docs.”  
→ **Routes locked** to experience names.

### QA Director
“Automate the demo script as Playwright suite — that’s the product contract.”  
→ **P0 acceptance includes demo e2e.**

### Remaining pushback addressed
- Search: start Postgres FTS to reduce moving parts — **accepted**  
- GraphQL: deferred — **accepted**  
- Microservices: deferred — **accepted**  

---

# 23. Implementation Readiness Score

## Score: **86 / 100**

| Dimension | Score | Notes |
|-----------|------:|-------|
| Stack clarity | 95 | Locked with rationale |
| Repo structure | 92 | Ready for scaffolding |
| Data model | 90 | Production-shaped; fiscal TBD |
| Adapter architecture | 94 | Strong |
| Phasing | 88 | P0 crisp |
| Security | 84 | Needs client legal validation |
| DevOps | 82 | Hosting PostGIS choice pending |
| Seed strategy | 85 | Needs universe bible pass with owner |
| UX→eng translation | 90 | Experiences mapped |
| Unknowns debt | 70 | See list below |

---

# 24. Remaining unknowns to validate with client (before / during week 1)

1. Official logo, brand colors, typography permissions  
2. Real product catalog (SKU list, families, price lists)  
3. Real territory definitions & advisor roster size  
4. Exact 3 WhatsApp numbers + Meta Business ownership status  
5. Current invoicing tool / Bolivia e-invoicing requirement timeline  
6. Credit policies (terms, hold rules)  
7. Whether employee GPS tracking is contractually/legally approved  
8. Data residency preferences (must Bolivia-only or LatAm OK?)  
9. Preferred cloud billing entity / existing vendors (Google Maps vs Mapbox already purchased?)  
10. AI vendor preference / data sharing comfort for chat summaries  
11. SSO requirement (Google Workspace / Microsoft) timeline  
12. Offline field policy (how long store PII on device)  
13. Demo data: fictional only vs anonymized real accounts  
14. SLA target minutes for WhatsApp first response  
15. Fiscal NIT validation rules / SIN integration partner  
16. PostGIS-capable managed DB preference (Neon vs Supabase vs AWS)  
17. Production domain / email sending domain  
18. Who is break-glass admin human  
19. RPO/RTO targets formal  
20. Multi-company future (SaaS) vs single-tenant forever — confirms `organization_id` investment level  

**Rule:** Engineering proceeds on documented assumptions in this plan; client validation updates via ADR, not silent rewrites.

---

# 25. First Monday morning plan (for 30 engineers)

1. Read: Vision, UX Review, **this Master Plan**  
2. Platform squad scaffolds monorepo to match §3 (implementation starts only after TPM “go”)  
3. Data squad implements Prisma schema §5 + first migration  
4. Providers squad stubs all ports + mocks  
5. Experience Shell squad tokens + app chrome  
6. Seed squad starts universe bible + generators  
7. TPM pins P0 demo script as acceptance oracle  

**Until TPM says go: no application feature code beyond scaffolding aligned to this contract.**

---

# 26. Document control

| Version | Date | Notes |
|---------|------|-------|
| 1.0 | 2026-07-24 | Initial Engineering Master Plan — binding |

Supersession: only via ADR + bumped Master Plan version.

---

*End of Engineering Master Plan. No application code. No scaffolding performed under this document’s delivery.*
