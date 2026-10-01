# Legacy Product Salvage Register

**Step:** 9.5 — Legacy extraction + product salvage  
**Principle:** Reuse valuable **product** work. Do not inherit invalid **architecture**.  
**Legacy lane:** `packages/database`, `apps/api`, `apps/web` — **frozen** per ADR-0012 / Step 9  
**Evidence status:** EVIDENCE FOUND → CLASSIFIED → TARGET DESTINATION

---

## Summary counts

| Classification | Count |
|----------------|-------|
| **REUSE** | 18 |
| **ADAPT** | 22 |
| **EXTRACT** | 16 |
| **REBUILD** | 14 |
| **RETIRE** | 12 |
| **UNKNOWN** | 5 |

---

## 1. Legacy spine concepts (mandatory classification)

| Concept | Classification | Can influence new OS? | Evidence | Why |
|---------|----------------|-------------------------|----------|-----|
| **User** (`schema.prisma` model) | **RETIRE** as OS identity | **No** — reference only for demo | `packages/database/prisma/schema.prisma` `model User` | Collapsed identity; target is Person/Member/AuthIdentity (ADR-0010) |
| **Account** | **RETIRE** as canonical Party | **No** as master identity | `model Account` — customer-only silo with `ownerUserId`, `creditLimitCentavos` | Target: Party + PartyRoleAssignment + CommercialAccount |
| **Invoice** | **RETIRE** as finance authority | **No** for OS AR truth | `model Invoice` `balanceCentavos` authoritative | Target: FinanceProjection when Finance active (ADR-0007) |
| **Payment** | **RETIRE** as finance authority | **No** for official payment truth | `model Payment`, `PaymentAllocation` | OS ingests payment **events**; external/banking authoritative when connected |
| **ActivityEvent** | **RETIRE** as event spine | **No** — migration source only | `emitCommercialEvent` → `activityEvent` | Target: BusinessEvent (Step 9 FG-03) |
| **Territory** | **ADAPT** | **Yes** as org scope, not identity | `Territory`, `TerritoryMember`, `Account.territoryId` | Step 9: Territory + TerritoryAssignment in foundation |
| **Legacy auth** | **REBUILD** | N/A | `apps/api` — no auth middleware grep | Unauthenticated API; target Auth.js + session (EMP) |
| **API authorization** | **REBUILD** | N/A | No `assertPermission` in `apps/api/src` | Target: OS auth evaluation order (Step 9 §5.4) |
| **UserRole** (no effective dates) | **RETIRE** | **No** | `model UserRole` | Target: effective-dated RoleAssignment |
| **MessagingChannel** | **ADAPT** | **Yes** as demo pattern | `model MessagingChannel` | Target: IntegrationConnection (H lane) |
| **Task** | **ADAPT** | **Yes** as UX pattern | `model Task` | Target: WorkItem (E lane) — not same schema |
| **AttentionItem** | **ADAPT** | **Yes** concept | `model AttentionItem`, `radar.controller.ts` | Aligns with ADR-0005; rebuild on projections |
| **FeatureFlag** | **ADAPT** | **Yes** | `model FeatureFlag` | Target: CapabilityState registry |

---

## 2. Design system — `packages/ui`

| Area | Artifact | Current behavior | Classification | Why | Target | Dependency |
|------|----------|------------------|----------------|-----|--------|------------|
| Tokens | `tokens/tokens.css` | Porcelain/kiln/glaze, 8px rhythm, motion | **REUSE** | Matches ISALWA AI constitution frozen language | `packages/ui` (extend) | None |
| Tokens | `tokens/chrome.css` | Shell chrome variables | **REUSE** | Visual continuity | `packages/ui` | None |
| Primitives | `Button`, `Panel`, `StatusPill` | Accessible styled controls | **REUSE** | No legacy DB coupling | `@isalwa/ui` | None |
| Patterns | `MetricCard`, `StatGroup`, `ListRow` | Dashboard metrics | **REUSE** | Used by Pulso; spine-agnostic | `@isalwa/ui` | None |
| Patterns | `Timeline`, `InsightCard`, `Chip` | Dossier/timeline UI | **REUSE** | Event display pattern | `@isalwa/ui` | Query DTO only |
| Patterns | `EmptyState`, `Skeleton` | Empty/loading UX | **REUSE** | `experience.tsx`, `experience-skeletons.tsx` pattern | `@isalwa/ui` | None |
| Layout | `PageContainer`, `DashboardGrid`, `ActionBar` | Page rhythm | **REUSE** | 8px law | `@isalwa/ui` | None |
| Layout | `ExperienceHeader`, `SectionHeader` | Kicker + title pattern | **REUSE** | Spanish enterprise feel | `@isalwa/ui` | None |
| Icons | `CommercialEventIcon`, `resolveCommercialEventIconKind` | Timeline icon map | **ADAPT** | Map to unified event registry | `@isalwa/ui` | Event type catalog |
| Search | `SearchField` | Styled search input | **REUSE** | Shell component | `@isalwa/ui` | None |

**Evidence:** `packages/ui/src/index.ts` exports; `apps/web` imports from `@isalwa/ui` throughout.

---

## 3. Shared contracts — `packages/contracts`

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| `ApiErrorSchema` | **REUSE** | Standard error envelope | `packages/os-contracts` extend | None |
| `HealthResponseSchema` | **ADAPT** | Health check shape | OS API health | Legacy providers |
| `PERMISSIONS` array | **EXTRACT** | Permission key ideas | Map to admin scopes + capability keys | RD-01 client |
| `EXPERIENCE_ROUTES` | **EXTRACT** | Spanish route vocabulary | Future shell route map | Product naming |
| `PulseResponseSchema` | **ADAPT** | Command Center vitals DTO | Projection from attention/finance | Locked finance honesty |
| `DEMO_HEROES` | **EXTRACT** | Demo scenario codes | Test fixtures only — not production facts | Demo seed |
| `CommercialEventTypeSchema` | **ADAPT** | Zod validation pattern | Merge into `os-contracts/events` | BusinessEvent registry |
| `TimelineEventSchema` | **ADAPT** | Timeline wire format | Query API for activity projection | BusinessEvent read model |

**Evidence:** `packages/contracts/src/index.ts`, `packages/contracts/src/events/schemas.ts`

---

## 4. Domain — `packages/domain`

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| `COMMERCIAL_EVENT_CATALOG` | **EXTRACT** | 17 event types + consumers map | Seed unified event registry | ActivityEvent retirement |
| `buildCommercialEvent` | **EXTRACT** | Pure event factory pattern | `os-domain` event factory | BusinessEvent fields |
| `CommercialActor` | **ADAPT** | Actor = user \| system | `actorMemberId` + system | Member not User |
| `CommercialObjectRef` types | **ADAPT** | Entity pointers in events | Generalize `primaryEntity` | Party/Work ids |
| `normalize.ts` event families | **EXTRACT** | Dot-notation taxonomy rules | Event naming governance | — |

**Evidence:** `packages/domain/src/events/catalog.ts`, `factory.ts`, `types.ts`

---

## 5. Providers — `packages/providers`

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| `ProviderRegistry` interface | **REUSE** | Adapter pattern | `packages/os-integrations` or keep `providers` | None |
| `createProviderRegistry` | **ADAPT** | Env-driven mock/live | H lane bootstrap | IntegrationConnection |
| Mock providers (6) | **REUSE** | Dev/demo without credentials | Until live adapters | Mock only |
| `createMapProvider`, Mapbox | **ADAPT** | Territory map rendering | G lane Territorio UX | Maps API keys |
| `TerritoryLayerId` type | **EXTRACT** | Future GIS layers | Territorio extension hooks | RD-04 |

**Evidence:** `packages/providers/src/index.ts`, `maps/types.ts`

---

## 6. Database & seed — `packages/database`

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| Prisma schema (full) | **RETIRE** for OS extension | Demo commercial only | Frozen — ADR-0012 | Legacy demo |
| `emitCommercialEvent` | **RETIRE** at Step 16 | Writes ActivityEvent | `os-events` outbox emitter | BusinessEvent |
| `listAccountTimeline` | **EXTRACT** | Timeline read pattern | F lane query | BusinessEvent projection |
| `seed/universe.ts` | **EXTRACT** | Coherent demo universe generator | Fixture generator for E2E | Legacy models |
| `seed/validate.ts` | **EXTRACT** | Integrity rules (invoice/order/WA heroes) | Contract tests for commercial flows | Demo data |
| Money as bigint centavos | **REUSE** | ADR/EMP alignment | All OS packages | None |
| ULID via `@isalwa/ts-utils` | **REUSE** | ID generation | `packages/ts-utils` | None |

**Evidence:** `packages/database/src/timeline/emit.ts`, `seed/validate.ts` lines 11–48 hero checks

---

## 7. API — `apps/api` (legacy demo API)

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| Entire `AppModule` | **REBUILD** | No auth, direct Prisma | New OS API on `os-*` | Step 15+ |
| `CommerceService` quote flow | **EXTRACT** + **REBUILD** | Quote create/send/accept + events | G lane commands | Party, products catalog |
| `CommerceService` lastPrice | **EXTRACT** | Price observation memory | G lane PriceObservation | CommercialAccount |
| `AccountsService.dossier` | **EXTRACT** | Dossier field set (contacts, visits, quotes) | Commercial 360 query projection | Party graph |
| `PulseService` | **EXTRACT** | Vitals + narrative sentence | Command Center projection | Capability-gated finance |
| `RadarController` | **EXTRACT** | Attention list ranking | Command Center / Radar lens | AttentionItem projection |
| `TerritorioController` | **EXTRACT** | Map points from accounts | Territorio query | Territory + locations |
| `VisitsController` check-in | **EXTRACT** | Geofence check-in flow | G lane field events | WorkItem optional |
| `ConversationsController` | **EXTRACT** | WhatsApp inbox list | Señal lens on Party | IntegrationConnection |
| `SearchController` | **EXTRACT** | Cross-entity search | F lane search index | Party search |
| `money()` helper | **REUSE** | BOB formatting | `apps/api/src/lib/money.ts` → shared util | None |
| REST route shapes `/v1/*` | **EXTRACT** | EMP route examples | Inform OS OpenAPI — not copy legacy handlers | — |

**Evidence:** `apps/api/src/commerce/commerce.service.ts`, `pulse/pulse.service.ts`, `accounts/accounts.service.ts`

---

## 8. Web UI — `apps/web` (legacy demo UI)

| Area | Artifact | Classification | Why | Target | Dependency |
|------|----------|----------------|-----|--------|------------|
| `app-shell.tsx` NAV | **ADAPT** | 7-experience nav (Pulso…Memoria) | Role-aware shell — Command Center first | OS session |
| `command-palette.tsx` | **ADAPT** | Search + nav + shortcuts | Global command/search on OS queries | Auth |
| `global-hotkeys.tsx`, `shortcut-sheet.tsx` | **REUSE** | Power-user patterns | Production shell | None |
| `guided-tour.tsx`, `intro-experience.tsx` | **ADAPT** | Onboarding | First-run for real company — not demo tour | UNKNOWN depth |
| `quote-canvas.tsx` | **ADAPT** | Full quote builder UX (~800 lines) | Rebind to `POST /v1/commands/CreateQuote` etc. | Product catalog projection |
| `quote-actions.tsx` | **ADAPT** | Send/accept quote actions | Command buttons | Quote commands |
| `payment-form.tsx` | **REBUILD** | Payment against legacy Invoice | Finance ingest or manual event — not inline ledger | Finance LOCKED |
| `personas/[id]/page.tsx` | **REBUILD** | Account dossier (~1200 lines) | Customer 360 on Party/CommercialAccount | Query projections |
| `personas/page.tsx` | **ADAPT** | Customer list/table | Party search with customer role filter | PartyGraph query |
| `pulso/page.tsx` | **ADAPT** | Command Center vitals layout | Projection-driven; honest when Finance LOCKED | Pulse projection |
| `radar/page.tsx` | **ADAPT** | Attention/opportunity list | Attention projection | Capability state |
| `territorio/*` | **ADAPT** | Map + filter + drawer | Territory scope query | Maps provider |
| `senal/*`, `signal-conversation.tsx` | **ADAPT** | WhatsApp thread UI | Message lens on Party | Messaging integration |
| `cierre/*` | **ADAPT** | Quotes/invoices list | Quote list + **no fake AR** when Finance locked | Finance projection |
| `memoria/page.tsx` | **ADAPT** | Narrative timeline stories | BusinessEvent projection + AI summaries | Event spine |
| `check-in-button.tsx` | **ADAPT** | Field check-in CTA | Visit/check-in command | Geolocation |
| `experience-skeletons.tsx` | **REUSE** | Layout-matched loading | All list routes | None |
| `toast-provider.tsx` | **REUSE** | Feedback pattern | Shell | None |
| `animated-value.tsx` | **REUSE** | Metric animation | Dashboard vitals | None |
| `reading-progress.tsx` | **REUSE** | Long dossier scroll affordance | Dossier pages | None |
| `lib/api.ts` | **REBUILD** | Unauthenticated fetch to legacy API | OS API client + session + error parsing | Auth |
| `lib/preferences.ts` | **ADAPT** | Favorites/recents for palette | User prefs projection | Member id |
| `lib/motion.ts` | **REUSE** | Reduced-motion aware motion | Shell | None |
| `lib/demo-mode.ts` | **RETIRE** | Demo flag helper | Production has no demo mode in OS tenant | — |

**Evidence:** `apps/web/src/components/*`, `apps/web/src/app/*/page.tsx`

---

## 9. Product terminology (Spanish) — **EXTRACT**

| Term | Legacy route | Future user language | Spine mapping (hidden from user) |
|------|--------------|--------------------|----------------------------------|
| Personas | `/personas` | **Clientes** | Party + customer role + CommercialAccount |
| Pulso | `/pulso` | **Centro de mando** / Command Center | Attention + capability vitals |
| Radar | `/radar` | **Prioridades** | AttentionItem |
| Territorio | `/territorio` | **Territorio** | Territory scope |
| Señal | `/senal` | **Mensajes** / WhatsApp | Message artifacts on Party |
| Cierre | `/cierre` | **Cotizaciones** | Quote/Order — not "cierre" as finance authority |
| Memoria | `/memoria` | **Historial** | BusinessEvent timeline |

**Classification:** **EXTRACT** — preserve UX words; do not expose PartyRoleAssignment in UI.

---

## 10. Tests & validation

| Artifact | Classification | Evidence |
|----------|----------------|----------|
| `apps/web` automated tests | **UNKNOWN** | No `*.test.ts` in apps/web |
| `apps/api` automated tests | **UNKNOWN** | No test files in apps/api |
| `seed/validate.ts` | **EXTRACT** | Integrity script — `packages/database/src/seed/validate.ts` |
| Architect planificación tests | **REUSE** (process) | Honest empty workspace pattern — not product UI |
| E2E Playwright (EMP planned) | **UNKNOWN** | Not found in repo |

---

## 11. Extraction plan (REUSE / ADAPT / EXTRACT → steps)

| Source | Target package/app | Legacy DB? | Legacy API? | Independent? | Owner | Step |
|--------|-------------------|------------|-------------|--------------|-------|------|
| `packages/ui` tokens/components | `@isalwa/ui` extend | No | No | **Yes** | UI/J | Ongoing |
| `packages/providers` registry | `os-integrations` or keep | No | No | **Yes** | H | 16+ |
| `packages/domain` event catalog | `os-contracts/events` | No | No | **Yes** | D | 11 |
| `money()` formatting | `ts-utils` or `os-contracts` | No | No | **Yes** | G | 10 |
| Quote canvas UX | `apps/os-web` feature | No | **Yes** today | After commands | G | 16+ |
| Dossier layout | `apps/os-web` personas feature | No | **Yes** today | After Party query | G | 16+ |
| Command palette pattern | OS shell | No | No | After search API | F/G | 15–16 |
| Pulse/Radar logic | Command Center projection | **Yes** today | **Yes** | Rebuild services | F/G | 15–16 |
| Seed validate rules | Commercial contract tests | Demo only | — | — | J | 16+ |
| Territory map UI | Territorio feature | **Yes** | **Yes** | After territory query | G | 16+ |

---

## 12. Critical legacy risks

| Risk | Mitigation |
|------|------------|
| Reusing `Account` types in new UI | **REBUILD** all DTOs from OS query contracts |
| Copying `Invoice.balance` into dashboards | Use FinanceProjection + LOCKED honesty |
| Extending `ActivityEvent` for workforce events | **Forbidden** — BusinessEvent only (Step 9) |
| Two permanent UIs (demo web + os-web) | Demo **RETIRE** when os-web reaches parity; single production app |
| Quote canvas direct `API_BASE` posts | Replace with command client + auth |

---

## 13. Valuable reusable assets (top)

1. **`packages/ui`** — full design system aligned with constitution  
2. **Quote builder interaction** (`quote-canvas.tsx`) — price memory, line editor, discount display  
3. **Customer dossier information architecture** (`personas/[id]`) — sections users expect  
4. **Command palette + hotkeys** — power-user navigation  
5. **Commercial event taxonomy** — 17 types with consumer map  
6. **Provider adapter pattern** — mock/live swap  
7. **Attention/Radar ranking UX** — maps to Command Center  
8. **Territory map experience** — operational for field sales  
9. **Spanish product vocabulary** — Pulso/Radar/Personas/Señal  
10. **Seed narrative coherence** — demo heroes for E2E scenarios (not production data)

---

## 14. Challenge answers (Step 9.5 §12)

| Question | Answer |
|----------|--------|
| Throwing away useful product work unnecessarily? | **No** — UI/components/workflows classified REUSE/ADAPT/EXTRACT |
| Carrying legacy architecture into OS? | **Blocked** by ADR-0012 + explicit RETIRE on User/Account/Invoice/ActivityEvent |
| Legacy components depend on User/Account? | **Yes** — all `apps/web` data pages; must REBUILD bindings |
| UX separable from old model? | **Yes** — `packages/ui` and layout patterns have zero DB coupling |
| Two UIs permanent? | **No** — demo retires at Commercial parity on `apps/os-web` (planned) |
| One coherent Commercial UX? | **Yes** — Customer → Opportunity → Quote → Order user language |
| Employees without architecture knowledge? | **Required** — UI_REBUILD_PRINCIPLES.md |
| ISALWA admins without Carmen? | **Yes** after Steps 10–14 + admin shell (spec exists) |
| Department intelligence without silos? | **Yes** — capability-gated lenses on shared spine |
| AI cross-company with auth? | **Yes** — Step 9 AI contract |
| Training risk? | Exposing spine terms, fake finance KPIs, fragmented nav — mitigated in UI principles |
| Not yet thought about? | **UNKNOWN:** mobile field offline depth, full a11y audit, E2E test suite existence |

---

## Related

- [`STEP_9_SHARED_CONTRACTS_SPEC.md`](./STEP_9_SHARED_CONTRACTS_SPEC.md)
- [`UI_REBUILD_PRINCIPLES.md`](./UI_REBUILD_PRINCIPLES.md)
- [`ARCHITECTURE_EVIDENCE_REGISTER.md`](./ARCHITECTURE_EVIDENCE_REGISTER.md)
