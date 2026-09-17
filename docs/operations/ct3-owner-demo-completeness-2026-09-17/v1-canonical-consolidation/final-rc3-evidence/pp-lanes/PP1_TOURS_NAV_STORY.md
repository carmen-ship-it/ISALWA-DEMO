# PP-1 — Walkthrough / tour / Story Mode + navigation + removed UI

**Lane:** PP-1 (read-only audit)  
**Date:** 2026-09-17  
**Tree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-owner-demo`  
**LIVE baseline:** RC2 tip `8f1ac76185af432bb244ea94b7ae6a647eaa0ebc` (= current `HEAD`)  
**LOCAL:** dirty tree exists for other RC3 lanes; **tour/Story Mode app sources match HEAD** (no uncommitted diffs under `components/demo/*story*`, `ver-ejemplo*`, `inicio-owner-demo*`, `components/walkthrough/**`, `lib/walkthrough/**`, `lib/demo/story-mode-steps.ts`, or Story mounts in `app-shell.tsx`).  
**Assumption:** LIVE ≡ what is at `8f1ac76`. For PP-1 surfaces: **LIVE = LOCAL**.

---

## Verdict

**ONE canonical full owner walkthrough:** Story Mode (`OwnerStoryMode` + `STORY_MODE_STEPS`) labeled **「Ver recorrido completo」** / title **「Recorrido completo de ISALWA」**.

Multiple chrome buttons open the **same** `openStory()` — they are entry duplicates, not competing full tours.

**Still live (intentionally separate, not Story Mode):** first-use intro (`IntroWelcome` / `IntroCoach`) and page **micro-tours** (`MicroTourCoach` + Ayuda section launchers).

**Already removed from UI:** floating multi-journey **「Mostrar recorrido」** / `GuidePanel` (stub returns `null`).

---

## 1. Grep inventory (app-relevant)

Search terms: `walkthrough`, `tour`, `recorrido`, `guía`/`guiado`, `guided`, `coachmark`, `onboarding`, `paso a paso`, `Mostrar recorrido`, `Ver recorrido`, `Ver recorrido completo`, `micro-tour`, `tooltip tour`, `Story Mode`, `owner-story`, `Ver ejemplo`.

Hits in generated Prisma types / docs ledgers / BV JSON snippets are evidence-only and omitted from the KEEP/REMOVE table unless they name a UI surface.

| ID | FILE | COMPONENT | VISIBLE LABEL | ROUTE | LIVE? | LOCAL vs HEAD | CANONICAL? | REMOVE? | KEEP? |
|----|------|-----------|---------------|-------|-------|---------------|------------|---------|-------|
| S1 | `apps/os-web/components/demo/owner-story-mode.tsx` | `OwnerStoryMode` | Overlay title **Recorrido completo de ISALWA**; footer **Salir del recorrido**; CTAs per step | Overlay (any app route); CTAs → normal routes / PDF APIs | LIVE | same as HEAD | **YES — sole full walkthrough UI** | No | **KEEP** |
| S2 | `apps/os-web/lib/demo/story-mode-steps.ts` | `STORY_MODE_STEPS` (data) | Step titles / CTA labels (see §4) | See §4 | LIVE | same | **YES — step source of truth for UI** | No | **KEEP** |
| S3 | `apps/os-web/components/demo/owner-demo-provider.tsx` | `OwnerDemoProvider` | (none) — `?story=1` + `?datos=demo` open Story | URL query on current path | LIVE | same | YES (state) | No | **KEEP** |
| E1 | `apps/os-web/components/demo/ver-ejemplo-completo-button.tsx` | `VerEjemploCompletoButton` | **Ver recorrido completo** | Shell header (global; `showRolePreview`) | LIVE | same | Entry → S1 (not a second tour) | No | **KEEP** (primary chrome entry) |
| E2 | `apps/os-web/components/shell/app-shell.tsx` | mounts `VerEjemploCompletoButton`, `OwnerStoryMode`, `WalkthroughShell` | (via children) | All `(app)` routes | LIVE | same | Wiring | No | **KEEP** |
| E3 | `apps/os-web/components/demo/inicio-owner-demo-card.tsx` | `InicioOwnerDemoCard` | Kicker **Recorrido de evaluación**; primary **Ver recorrido completo**; secondary **Abrir con enlace** | `/inicio` card; link `/inicio?datos=demo&story=1` | LIVE | same | Entry → S1 | No | **KEEP** |
| E4 | `apps/os-web/app/(app)/inicio/page.tsx` | mounts `InicioOwnerDemoCard` when `canUseRolePreview` | (via E3) | `/inicio` | LIVE | same | Mount | No | **KEEP** |
| E5 | `apps/os-web/components/walkthrough/walkthrough-help-panel.tsx` | `WalkthroughHelpPanel` | Section **Recorrido completo de evaluación** + **Ver recorrido completo**; also intro replay / section micro-tours / learning mode | `/ayuda` | LIVE | same | Story entry + light help | No | **KEEP** Story CTA; keep section tours as non-Story |
| E6 | `apps/os-web/app/(app)/ayuda/page.tsx` | mounts `WalkthroughHelpPanel` | (via E5) | `/ayuda` | LIVE | same | Mount | No | **KEEP** |
| W1 | `apps/os-web/components/walkthrough/walkthrough-shell.tsx` | `WalkthroughShell` | (children coaches) | Global under shell | LIVE | same | **Not** Story Mode — first-use + micro | No | **KEEP** |
| W2 | `apps/os-web/components/walkthrough/intro-welcome.tsx` | `IntroWelcome` | **Bienvenido a ISALWA**; **Conocer ISALWA**; **Explorar por mi cuenta** | First login overlay | LIVE | same | Short onboarding (real data) | No | **KEEP** (distinct from Story) |
| W3 | `apps/os-web/components/walkthrough/intro-coach.tsx` | `IntroCoach` | Step titles from `INTRO_COPY`; **Continuar recorrido**; **Salir del recorrido**; **Cerrar recorrido** | Routes: `/inicio` → `/clientes` → `/clientes/:id` → `/mapa` → `/ayuda` | LIVE | same | Short guided intro | No | **KEEP** (distinct; do not market as full owner demo) |
| W4 | `apps/os-web/components/walkthrough/micro-tour-coach.tsx` | `MicroTourCoach` | **Recorrido · n/m**; **Continuar recorrido de página**; **Cerrar recorrido de página** | First visit to section routes in `PAGE_TOUR_ROUTES` | LIVE | same | Page micro-tour | No | **KEEP** (small; not Story duplicate) |
| W5 | `apps/os-web/lib/walkthrough/copy.ts` | `GUIDE_CHROME` / `INTRO_COPY` / `PAGE_MICRO_TOURS` | Chrome kicker **Modo guiado** (Ayuda); `show: 'Ver recorrido completo'` (string; Story label); legacy title string **Recorrido del piloto** (not launched as full tour) | n/a | LIVE | same | Label constants | Soft-clean legacy title later | **KEEP** active copy |
| W6 | `apps/os-web/components/walkthrough/guide-panel.tsx` | `GuidePanel` | **none** (`return null`) | n/a | LIVE (dead stub) | same | Retired | **YES — delete stub when safe** | No UI |
| W7 | `apps/os-web/lib/walkthrough/journeys.ts` | `JOURNEYS` / `journeysForViewer` | Legacy journey titles (e.g. Vender) — **no floating launcher** | Data only; still wired in `GuideProvider` | LIVE (backend of retired UI) | same | **NO — legacy Recorrido del piloto** | Prefer retire after progress API slim | Keep until dead-code pass |
| W8 | `apps/os-web/components/walkthrough/guide-provider.tsx` | `GuideProvider` | (none) | Persistence for intro/micro + leftover journey fields | LIVE | same | Support for W1–W4 | Slim journeys later | **KEEP** for intro/micro |
| W9 | `apps/os-web/components/walkthrough/learning-mode-toggle.tsx` | `LearningModeToggle` | **Modo aprendizaje** | `/ayuda` | LIVE | same | Help affordance | No | **KEEP** |
| W10 | `apps/os-web/components/walkthrough/role-quickstart-panel.tsx` | `RoleQuickstartPanel` | Would show **Capacitación** + steps | **UNMOUNTED** (no imports) | Not visible | same | Dead | **YES (dead component)** | No |
| W11 | `apps/os-web/components/walkthrough/contextual-micro-tip.tsx` + `lib/walkthrough/micro-tips.ts` | `ContextualMicroTipCoach` | Tip titles (e.g. Siguiente paso) | **UNMOUNTED** | Not visible | same | Dead | **YES (dead component)** | Data optional |
| W12 | `apps/os-web/lib/walkthrough/chapters/global.ts` | `homeAttentionMarker` | none | Marker only | LIVE | same | Hook marker | No | **KEEP** (tiny) |
| W13 | `apps/os-web/lib/walkthrough/targets.ts` + many pages | `data-tour=…` / `TOUR_TARGET` | (attributes, not labels) | Various desks | LIVE | same | Anchors for intro/micro | No | **KEEP** |
| D1 | `apps/os-web/components/demo/demo-data-filter-toggle.tsx` | `DemoDataFilterToggle` | **Datos reales** / **Demo** (Story locks Demo) | Shell header | LIVE | same | Demo context | No | **KEEP** |
| D2 | `apps/os-web/components/demo/demo-fictitious-banner.tsx` | `DemoFictitiousBanner` | Demo fictitious banner copy | Global when demo/story | LIVE | same | Honesty chrome | No | **KEEP** |
| M1 | `apps/os-web/components/management/management-example-preview.tsx` | `ManagementExamplePreviewTrigger` | **Ver ejemplo** (static metrics/table preview) | `/inicio` gerencia / org metrics | LIVE | same | **NOT Story Mode** | No | **KEEP** (rename confusion only if owners mix terms) |
| C1 | `packages/os-database/src/owner-demo/catalog.ts` | `OWNER_DEMO_STORY_STEPS` | Seed narrative parallel (no UI) | Seed catalog | LIVE | same | Seed twin of S2 | No | **KEEP** (seed; UI uses S2) |
| X1 | Comments / tests mentioning **Mostrar recorrido** | e.g. `walkthrough-shell`, `guide.test.ts` | Assert absence | n/a | LIVE | same | Regression guard | No | **KEEP** tests |
| X2 | Docs / BV JSON (`Ver recorrido completo` in hosted snippets) | evidence | Hosted chrome label confirmed in RC BV snippets | Hosted | LIVE (hosted RC2) | n/a | Confirms E1 live | — | — |

**Terms with no live product UI match in `apps/os-web`:** `coachmark`, `paso a paso`, `tooltip tour`, `Mostrar recorrido` (removed), `guía` as product name (only **Modo guiado** / **recorrido guiado** copy).

---

## 2. ONE intended Story Mode entry vs legacy / small tours

### Canonical product

| Item | Decision |
|------|----------|
| **Intended full walkthrough** | **Story Mode** — `OwnerStoryMode` driven by `STORY_MODE_STEPS` (20 steps), DEMO · ficticios |
| **Canonical visible CTA** | **Ver recorrido completo** |
| **Canonical open API** | `useOwnerDemo().openStory()` (+ URL `?story=1&datos=demo`) |

### Entry points that all open the SAME Story Mode (do not treat as competing tours)

1. Shell header `VerEjemploCompletoButton` (evaluation / owner chrome) — **primary always-available**
2. Inicio card `InicioOwnerDemoCard` primary button
3. Inicio card deep link **Abrir con enlace** → `/inicio?datos=demo&story=1`
4. Ayuda `WalkthroughHelpPanel` Story section button

### Not Story Mode (keep as smaller / different products)

| Surface | Why not Story |
|---------|----------------|
| `IntroWelcome` + `IntroCoach` | First-use real-company intro (~6 steps on normal routes) |
| `MicroTourCoach` + Ayuda “Recorridos de sección” | 2–4 step page coaches |
| `LearningModeToggle` | Persistent tips mode |
| `ManagementExamplePreviewTrigger` **Ver ejemplo** | Static illustration overlay, not a recorrido |

### Legacy / removed / dead

| Surface | Status |
|---------|--------|
| Floating **Mostrar recorrido** / multi-journey **Recorrido del piloto** `GuidePanel` | **REMOVED** (null stub); do not reintroduce |
| `JOURNEYS` in `journeys.ts` | Data still loaded by `GuideProvider`; **no UI launcher** → legacy |
| `RoleQuickstartPanel`, `ContextualMicroTipCoach` | Implemented but **unmounted** → remove candidates |

---

## 3. Story Mode steps (from code)

**Source of UI steps:** `apps/os-web/lib/demo/story-mode-steps.ts` → `STORY_MODE_STEPS`  
**Renderer:** `apps/os-web/components/demo/owner-story-mode.tsx` (overlay only; does not replace the router — CTA `Link` navigates then `closeStory()`).

App-page CTAs append `?datos=demo` via `withStoryDemoDatos`. PDF API hrefs (`/api/.../pdf`) stay unchanged.

| # | Title | CTA label | Normal route? | Href pattern (seeded Maderas when available) |
|---|-------|-----------|---------------|-----------------------------------------------|
| 1 | Llega una conversación | Ver cliente demo | **YES** (fallback `/conversaciones`) | `/clientes/:partyId` |
| 2 | ISALWA identifica contexto | Abrir Cliente360 | **YES** | `/clientes/:partyId` |
| 3 | Oportunidad sugerida | Ver oportunidades | **YES** | `/clientes/:partyId?tab=comercial` or `/oportunidades` |
| 4 | Oportunidad creada | Abrir oportunidad | **YES** | `/clientes/:partyId/oportunidades/:opportunityId` |
| 5 | Cotización creada | Abrir cotización | **YES** | `/clientes/:partyId/cotizaciones/:quoteId` |
| 6 | PDF generado | Descargar PDF cotización | **API** (not page) | `/api/quotes/:quoteId/pdf` |
| 7 | Envío registrado | Ver cotización enviada | **YES** | quote page |
| 8 | Seguimiento programado | Ver trabajo | **YES** | `/trabajo/:followUpWorkId` or cliente / `/inicio` |
| 9 | Cliente acepta | Ver cotización aceptada | **YES** | quote page |
| 10 | Pedido creado | Abrir pedido | **YES** | `/clientes/:partyId/pedidos/:orderId` |
| 11 | Preparación operativa | Ver preparación | **YES** | pedido page |
| 12 | Producción / Almacén / Compras review | Ver revisión | **YES** | `/trabajo/:orderPrepWorkId` or pedido |
| 13 | Producto terminado | Ver pedido / FG | **YES** | pedido page |
| 14 | Nota de entrega | Descargar PDF nota | **API** | `/api/delivery-notes/:deliveryNoteId/pdf` |
| 15 | Salida | Ver pedido | **YES** | pedido page |
| 16 | Entrega | Ver entrega | **YES** | pedido page |
| 17 | Documentos | Abrir documentos | **YES** | `/clientes/:partyId?tab=documentos` |
| 18 | Cliente360 historial | Abrir historial | **YES** | `/clientes/:partyId?tab=historial` |
| 19 | Auditoría | Ver Inicio | **YES** | `/inicio` (copy says auditoría via Inicio) |
| 20 | Gerencia / métricas | Ver gerencia | **YES** | `/inicio?lente=gerencia` |

**Summary:** 18/20 steps target **normal app routes** (with `datos=demo`). Steps **6** and **14** are **PDF download APIs** (documented exception). Null href if seed IDs missing → message to apply DEMO seed.

**Walkthrough shell is not a second 20-step Story:** intro coach uses `INTRO_STEPS` on `/inicio`, `/clientes`, Cliente360, `/mapa`, `/ayuda` only.

Parallel seed narrative: `packages/os-database/src/owner-demo/catalog.ts` → `OWNER_DEMO_STORY_STEPS` (same 20 titles; no hrefs — seed/recordKey twin).

---

## 4. Navigation / removed UI notes

- **Shell:** Demo toggle + **Ver recorrido completo** only when evaluation/role-preview chrome is on (`showRolePreview` / `canUseOwnerDemo`).
- **Inicio:** evaluation card is the in-page Story pitch.
- **Ayuda:** explicitly points full guided evaluation recorrido to Story Mode; keeps short intro + section micro-tours.
- **Removed:** `GuidePanel` multi-journey floating launcher (**Mostrar recorrido**).
- **View As desks:** `EvaluationDeskExcluded` is projection gating, not a tour system.

---

## 5. Consolidation recommendation (for later RC3 cut — not implemented here)

1. **KEEP** Story Mode as the only full owner demo recorrido; keep multi-entry buttons calling `openStory()`.
2. **KEEP** first-use intro + page micro-tours; do not brand them as “recorrido completo”.
3. **REMOVE (cleanup lane):** unmounted `RoleQuickstartPanel` / `ContextualMicroTipCoach`; eventually null `GuidePanel` + unused `JOURNEYS` UI fields if progress API allows.
4. **Do not** reintroduce **Mostrar recorrido** or a second full-tour overlay.
5. Optional UX clarity: **Ver ejemplo** (management preview) ≠ Story Mode — leave unless owners confuse labels.

---

## 6. Proof status (feature-proof matrix)

| Subfeature | State |
|------------|-------|
| Story Mode code + 20 steps on normal routes (+ 2 PDF APIs) | **IMPLEMENTED** at `8f1ac76` |
| Unit coverage (`owner-demo.test.ts`, OA-5 datos=demo, guide retirement tests) | **TESTED** (local; not re-run this audit) |
| Hosted chrome label “Ver recorrido completo” | Seen in RC BV snippets → **HOSTED chrome present**; full 20-step click-through **not re-proven this lane** → treat interactive Story BV as **UNPROVEN** until RC3 hosted pass |

---

*PP-1 read-only. No app code edited. Evidence only under `final-rc3-evidence/pp-lanes/`.*
