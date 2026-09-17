# CR-1 / CR-5 / CR-6 gap receipt (V1 canonical consolidation)

**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**Date:** 2026-09-17  
**Method:** Source + automated test inspection only. **No implementation.**  
**Verdict vocabulary:** `PASS` · `PARTIAL` · `FAIL` · `NOT_READY` · `UNPROVEN`

---

## A) CR-1 — TENANT / COMPANY

| Check | Verdict | Evidence |
| --- | --- | --- |
| Demo → SYNTH org via owner company context + `x-os-organization-id` | **PASS** | `apps/os-web/lib/demo/owner-company-context.ts` maps `demo` → `synth` and resolves `QA_SYNTH_ORGANIZATION_ID` / `QA_REAL_ORGANIZATION_ID`. `apps/os-web/lib/auth/actions.ts` (`getServerOsAuthContext`) prefers `DEMO_DATA_MODE_COOKIE` → `companyForDemoDataMode`, else `OWNER_EFFECTIVE_COMPANY_COOKIE`, then sets `organizationId` on auth. `apps/os-web/lib/api/os-api-client.ts` sends `x-os-organization-id` when `auth.organizationId` is set. `apps/os-web/components/demo/owner-demo-provider.tsx` syncs client cookie via `saveOwnerEffectiveCompanyCookie(companyForDemoDataMode(mode))`. Tests: `apps/os-web/lib/demo/owner-company-context.test.ts`. |
| Login multi-membership probe (REAL then SYNTH, no invented org) | **PASS** | `apps/os-web/lib/auth/actions.ts` — `validateOsMembershipWithToken` tries `undefined`, REAL, SYNTH org ids; comment at L78–82. |
| Carmen SYNTH scope policy: `people.admin` / `master_data.admin` / `qa.access` / `system.admin` absent | **PARTIAL** | **Code policy PASS:** `packages/os-database/src/staging-carmen-synth-demo-scopes.ts` (`OWNER_DEMO_SYNTH_FORBIDDEN_SCOPES`, `filterOwnerDemoSynthScopes`). Tests: `packages/os-database/src/staging-carmen-synth-demo-scopes.test.ts`. **Staging apply PASS (script):** `packages/os-database/src/staging-carmen-synth-demo-membership.ts`, `staging-carmen-synth-demo-membership-scope-correct.ts`. **Runtime DB state UNPROVEN** in this pass (membership correctness depends on fixture scripts having run on staging). |
| Owner demo company context distinct from QA “Ver como” | **PASS** | `owner-company-context.ts` header comment; `packages/os-database/src/staging-carmen-synth-demo-membership.ts` L2–3. QA view is separate: `apps/os-api/src/qa-view.ts` (`x-os-qa-view`, requires `qa.access`). |
| Cross-company API isolation (docs / PDF) | **PASS** | `apps/os-api/src/quote-pdf.http.test.ts` — `cross-tenant PDF is NOT_FOUND`. `apps/os-api/src/tenant-isolation.test.ts` — foreign member 404, cross-tenant invite `TENANT_FORBIDDEN`. `packages/os-commercial/src/commercial-tenant-write.test.ts` — `getQuoteInOrg` / session org enforcement on writes. |
| Cross-company search (⌘K palette) | **PARTIAL** | `apps/os-web/lib/shell/command-search.ts` uses `getServerOsAuthContext()` + `createOsApiClient(auth)` (tenant header when org selected). Backend: `apps/os-api/src/parties.controller.ts` → `PartyQueryService.searchParties(ctx, …)`; adversarial org scoping in `apps/os-api/src/inspection-reads.adversarial.test.ts`. **No dedicated cross-tenant negative test for palette path** in this worktree → **UNPROVEN** for end-to-end web search. |
| Cross-company conversation isolation | **PASS** | `apps/os-api/src/customer-conversations.controller.ts` — `findMany({ where: { organizationId: session.organizationId, … } })`. Source proof: `apps/os-api/src/customer-conversations.controller.test.ts` asserts `organizationId: session.organizationId`. |
| Hosted cross-tenant regression script | **UNPROVEN** | `scripts/verify-staging-hosted-tenant-isolation.mjs` exists (hosted Carmen + fixture). **Not executed in this gap pass** — no fresh run output recorded here. |

**CR-1 rollup:** **PARTIAL** (policy + code paths strong; live SYNTH membership + hosted isolation + palette negative proof gaps).

---

## B) CR-5 — PROGRESS + OPS CASCADE

| Check | Verdict | Evidence |
| --- | --- | --- |
| Shared progress strip components | **PARTIAL** | Shared **step logic:** `apps/os-web/lib/progress/process-steps.ts` (`resolveCommercialProcessSteps`, `resolveDeliveryProcessSteps` with **Nota / Salida / Entrega** chain). Shared **UI primitive:** `apps/os-web/components/progress/process-step-indicator.tsx` — used in `apps/os-web/components/map/map-quick-view-compact.tsx` only. **Parallel strip implementations (not unified):** `apps/os-web/components/commercial/commercial-progress-strip.tsx`, `apps/os-web/components/delivery/delivery-progress-strip.tsx`, `apps/os-web/components/operations/pedido-lifecycle-strip.tsx` (each own markup). |
| Pedido convert auto-creates Production / Almacén / Compras Work | **PASS (NO)** | `packages/os-commercial/src/commercial-command-service.ts` `createOrder` (L978–1094): `insertOrder`, `insertOrderLines`, `updateQuote`, emit `order.created` — **no** `CreateWorkItem` / work APIs. No `CreateWorkItem` references under `packages/os-commercial/`. Explicit prep work is user-triggered only (below). |
| Explicit review / update request paths | **PASS** | **Order prep (Producción / Almacén / Compras):** `apps/os-web/components/commercial/order-prep-work.ts` (`buildOrderPrepReviewWork`, marker `[[order-prep:…]]`); `apps/os-web/lib/commercial/order-prep-actions.ts` → `CreateWorkItem`; UI `apps/os-web/components/commercial/order-prep-card.tsx` on `apps/os-web/app/(app)/clientes/[partyId]/pedidos/[orderId]/page.tsx`. Tests: `apps/os-web/lib/commercial/order-prep.test.ts`. **Production “Solicitar actualización”:** `apps/os-web/lib/production/update-request-actions.ts`, `production-ops-table.tsx`. **Commercial approval:** `apps/os-web/components/commercial/commercial-approval-panel.tsx` (“Solicitar aprobación”). Desks consume open prep markers: `produccion/page.tsx`, `almacen/page.tsx`, `compras/page.tsx` (`findOpenOrderPrepReviews`). |
| Nota ≠ Salida ≠ Entrega (distinct facts / labels) | **PARTIAL** | **PASS (delivery surfaces):** `apps/os-web/lib/delivery/delivery-progress.ts` — separate `nota` / `salida` / `entrega` steps; `apps/os-web/lib/progress/process-steps.ts` L70–76; `apps/os-web/lib/operations/pedido-known-state.ts` + `pedido-known-state.test.ts` — separate `hasDeliveryNote`, `hasSalida`, `hasEntrega`; timeline labels `apps/os-web/lib/commercial/timeline-labels.ts` (`delivery_note.*`, `warehouse_exit.recorded`, `customer_delivery.recorded`). **Divergence:** Pedido lifecycle strip uses **Preparación** not **Nota** — `apps/os-web/lib/operations/pedido-lifecycle.ts` (`cotizacion → pedido → preparacion → salida → entrega`). Delivery list uses Nota chain via `DeliveryProgressStrip`. Two progress vocabularies coexist. |
| Production not owned by Pedido id | **PASS** | `packages/os-pedido-case/src/readers.ts` — `orderOwnsProduction: false`; `reader-adapter.ts` / tests assert production not queried by order id (`get-pedido-operating-case.test.ts`, `reader-adapter.test.ts`). |
| Ops cascade UI (links only, no invented progress) | **PASS** | `apps/os-web/components/operations/pedido-ops-lane-cards.tsx` comment: “links only, no invented progress”. `pedido-lifecycle-strip.tsx` L45–46: empty steps do not invent prep/salida/entrega. |

**CR-5 rollup:** **PARTIAL** (correct NO auto-work + explicit review paths; progress UI/logic split across strips; Preparación vs Nota on Pedido detail vs Entregas).

---

## C) CR-6 — AI / JARVIS

| Check | Verdict | Evidence |
| --- | --- | --- |
| Hosted AI interactively proven | **NOT_READY** / **UNPROVEN** | `apps/os-web/components/ai/hosted-state.ts` L5–8: hosted live Ask remains **UNPROVEN** until CT3-I browser proof; local env ≠ hosted proof. `apps/os-web/lib/ai/actions.ts` gates on `resolveAiHostedVisibility()` + `isAiEnabled()`. Product handoff documents assist **NOT LIVE** / hosted assist fail pending provider param fix: `docs/handoff/ISALWA_HANDOFF_MASTER_V1.md` (AI row). **No BROWSER-VERIFIED receipt in this worktree for interactive assist PASS.** |
| AI gateway filters by tenant + resource before retrieval | **PASS** | `apps/os-api/src/ai.controller.ts` `assist`: `resolveSession` → `organizationId`; `loadIssuesForSubject(organizationId, …)` uses `getIssueInOrg` / `findIssuesByReference(organizationId, …)`; `loadCommitmentsForSubject` uses org-scoped store methods; `buildAuthorizedAssistPacket` + `MemoryEvidenceService` scope filter (`apps/os-api/src/ai-evidence-packet.ts`). Certainty shaping drops cross-tenant facts: `apps/os-api/src/ai/conversation-context-adapter.ts` L258–261. Test: `apps/os-api/src/ai.controller.test.ts` “does not send hidden issue evidence to the provider”. Mutation intents denied: `apps/os-api/src/ai/ai-features.ts` (`AI_DENIED_MUTATION_FEATURES`). |
| Bounded features / subject binding | **PASS** | `apps/os-api/src/ai/ai-features.ts` — feature catalog + `assertFeatureSubject`. Web mirror: `apps/os-web/lib/ai/limits.ts` (`AI_ALLOWED_INTENTS`, subject types). |
| View As filter for AI | **PARTIAL** | AI uses same session stack as rest of app: `getServerOsAuthContext()` may attach `qaViewCookie` → `x-os-qa-view` (`os-api-client.ts` L103–105); API `apps/os-api/src/os-session.ts` → `applyQaViewIfPresent` (`qa-view.ts`) swaps to SYNTH target member **only if** actor has `qa.access`. Carmen SYNTH owner-demo policy **forbids** `qa.access` (`staging-carmen-synth-demo-scopes.ts`). **No AI-specific View As filter** beyond global QA session swap; **no test** proving assist under QA view vs owner company context. Owner demo path = org header + cookies, not QA cookie. |
| Conversation ingestion / WhatsApp AI coupling | **NOT_READY** | `apps/os-api/src/ai/future-ingestion-adapter.ts` — port types only; `customer-conversations.controller.ts` — manual/company-entered list, no provider send. |

**CR-6 rollup:** **NOT_READY** for hosted interactive proof; **PASS** for in-code tenant/resource gating; **PARTIAL** on View As semantics vs owner-demo.

---

## Cross-cutting summary

| Area | Rollup | Primary gap |
| --- | --- | --- |
| **CR-1** | **PARTIAL** | Runtime proof that staging Carmen SYNTH lacks forbidden scopes; hosted/palette cross-tenant negatives not re-run here. |
| **CR-5** | **PARTIAL** | Multiple progress strip implementations; Pedido lifecycle “Preparación” vs delivery “Nota” naming split. |
| **CR-6** | **NOT_READY** | Hosted interactive assist not proven; AI code-path tenant filter is implemented and unit-tested. |

---

## Evidence index (absolute paths)

- Tenant / company: `apps/os-web/lib/demo/owner-company-context.ts`, `apps/os-web/lib/auth/actions.ts`, `apps/os-web/lib/api/os-api-client.ts`, `packages/os-request-session/src/canonical-request-session.ts`, `packages/os-database/src/staging-carmen-synth-demo-scopes.ts`
- Isolation tests: `apps/os-api/src/tenant-isolation.test.ts`, `apps/os-api/src/quote-pdf.http.test.ts`, `packages/os-commercial/src/commercial-tenant-write.test.ts`, `apps/os-api/src/customer-conversations.controller.ts`
- Ops cascade: `packages/os-commercial/src/commercial-command-service.ts`, `apps/os-web/components/commercial/order-prep-work.ts`, `apps/os-web/lib/commercial/order-prep-actions.ts`, `apps/os-web/lib/production/update-request-actions.ts`, `apps/os-web/lib/delivery/delivery-progress.ts`, `apps/os-web/lib/operations/pedido-lifecycle.ts`
- AI: `apps/os-api/src/ai.controller.ts`, `apps/os-api/src/ai-evidence-packet.ts`, `apps/os-api/src/ai/conversation-context-adapter.ts`, `apps/os-web/lib/ai/actions.ts`, `apps/os-web/components/ai/hosted-state.ts`, `apps/os-api/src/qa-view.ts`

**Implementation performed in this task:** none (receipt only).
