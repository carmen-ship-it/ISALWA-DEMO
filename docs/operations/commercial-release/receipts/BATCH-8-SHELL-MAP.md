# Receipt — Batch 8: shell, map and design consistency

Date: 2026-11-16. Integrator `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD: `51cc88c0`. Authority: `CONTINUATION-2026-11-16.md` §13.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit/static tests + `tsc` + production `next build`). Not independently reviewed. **Not browser-verified.** Not pushed, not deployed. No schema change, no API change, no new dependency.

Scope: the existing shell, `@isalwa/ui` and the existing map adapter, extended. No new component system, no new visual language, Architect untouched.

## Shipped

| Requirement | What exists |
|---|---|
| **Navigation** | `nav-config.ts` is still the single source. Groups: Principal (**Hoy** `/inicio`, **Conversaciones** `/conversaciones`, **Clientes** `/clientes`) · Comercial (`/oportunidades`, `/cotizaciones`, `/pedidos`) · Catálogo y mapa (**Catálogo** `/productos`, **Mapa** `/mapa`) · Mi trabajo · Operaciones · Control · Más. All routes and deep links are unchanged. |
| **Secondary areas permission-controlled** | Producción, Almacén, Compras, Entregas, Finanzas, Salud de datos, Coordinación and Excepciones now declare `requiresAnyScope` (their own operational scopes plus the organization-oversight scopes). A link is shown only when the actor holds one; Administración/Auditoría still depend only on the `people.admin` probe. The six everyday destinations are never scope-gated. The same filter feeds the sidebar, mobile menu, command palette and the QA access matrix. When scopes are not yet known (undefined) nothing is hidden, and in role-preview "evaluation" the preview scopes drive the nav. Operations/control/more groups start collapsed (the active group stays open). **Hiding a link never removes the route:** every page and API keeps its own gate, so deep links behave as before. |
| **Journey audience** | Unchanged: `canUseRolePreview(grantedScopes)`; no demo mode, cookie, storage or tenant state (tests pin it). |
| **Journey steps** | Rewritten to 15 steps that describe only behavior demonstrated in Batches 2–8 (attention log, customer search/dedup, Cliente 360, commitments, draft/approval/issue/PDF/acceptance, order, reported payment and per-tender verification, reschedule/reassign, map, Hoy) plus a last step that states what is **not** connected (WhatsApp send, automation, production/warehouse/delivery). Removed claims with no demonstrated behavior behind them. Every step links to a generic, existing desk, never to a seeded record, PDF, tenant or `?datos=`. Opening it calls no API and writes nothing (static test over the Journey files). |
| **V2 tokens** | Already present as the existing CSS variables (os-web `globals.css` + `@isalwa/ui` tokens): #F6F1E8/#FFFFFF, #18324B/#12263D, #287A78/#1D635F, #E2F0ED/#EDF5F8, #4A5D73, #3A7A52/#E7F4EC, #B8872E/#FFF5DB, #A63D36/#FBE9E7. Nothing new was invented; `v2-tokens.test.ts` pins every value. |
| **44px controls, 16px field text** | New tokens `--isalwa-control-height` and `--isalwa-field-font-size` in `@isalwa/ui` (defaults 40px / 14px so **Architect and `apps/web` do not change**); os-web sets 44px / 16px. `Button` md and `.isalwa-field` use them; the compact Button and `.isalwa-chip` keep their visual size and gain a 44px hit area (pseudo-element). A control floor in os-web `globals.css` gives native `input`/`select`/`textarea` 44px and 16px (also prevents mobile focus-zoom). |
| **Focus, radii, padding, metadata** | Teal 2px outline + ring (shape plus colour, not colour alone) already global; 8px control / 16px panel radii and 13px `text-sm` already tokens; desktop page gutter was 32px and is now **24px** (16px mobile unchanged). |
| **Contrast** | `v2-tokens.test.ts` computes WCAG ratios for the V2 pairs (text ≥ 4.5:1, focus ring ≥ 3:1): all pass. |
| **Hoy** | Title "Hoy", subtitle "Tu atención y tus próximos compromisos"; empty "No tienes pendientes en esta sección"; failure "No pudimos cargar estos datos." + **Reintentar** (`SectionLoadFailed`, refresh). A failed source shows "—" on its summary card and an unavailable panel; it is never rendered as zero or as an empty day. |
| **Consistent error copy** | `lib/copy/action-failure.ts` holds the exact lines and the classifier; the central `mapCommandError` (used by every form) maps through it. An unknown outcome (5xx/network) says it could not confirm and asks the person to reconcile, never "not saved"; an unknown send never invites a blind re-send; idempotent replay and validation keep their own precise messages. |
| **Map** | Title "Mapa de clientes". Pins only from `loadConfirmedMarkers` (active, finite, in-range coordinates; (0,0) rejected), one authorized `listPartyLocations` read per customer the actor can already see in the customer search, bounded concurrency. The old local helper treated `latitude === 0` as missing and fell back to non-active locations: fixed. Read failures are **counted and shown** ("No pudimos cargar la ubicación de algunos clientes (N)…"), the customer stays in the list. Customers without coordinates appear as **"Pendiente de ubicación"** in the accessible list. Removed `dataMode`/demo-boundary remnants. Value disclaimers now say values are not closed sales, accounting income or confirmed funds. |
| **Missing map credentials** | See blocker below: honest empty state, no pins, no call to any map service. |

## Map credential blocker (honest)

- **No Mapbox token is configured in this environment and none was invented.** `resolveMapProviderStatus` is `live` only with provider `mapbox` **and** a token; otherwise the page shows "Vista geográfica en preparación" with the explicit reason ("Falta la credencial del proveedor de mapas, por eso no se dibuja ningún pin ni se usa un servicio de mapas…"), and the customer list stays fully usable. With provider unset, the copy says no pin is drawn.
- **The live map canvas was therefore not exercised against Mapbox.** Pin plotting is verified by unit tests of the marker pipeline, not by looking at a rendered map. To unblock: an owner supplies a Mapbox public token (a provider decision and possible cost, not made here), sets the maps provider/token env vars, and a person checks the rendered map in a browser.
- No paid service was started, no geocoding was added, no centroids, phone geolocation or tracking.

## Checks

| Check | Result |
|---|---|
| `os-web` tests, `--test-concurrency=1` | **1443/1443** (was 1415 before the batch's new tests; 10 stale pins updated to the new contract, none weakened: nav order/groups, empty-state copy, "Hoy", provider copy, list label, disclaimer) |
| New tests | `nav-batch8` (10), `v2-tokens` (21, incl. contrast), `action-failure` (6), `confirmed-markers` (+map honesty, 9), `summary-cards-failure` (3), rewritten `story-steps` |
| `os-web` `tsc --noEmit` | exit 0 |
| `os-web` `next build` | exit 0 |
| `@isalwa/ui` `tsc` build and `--noEmit` | exit 0 (dist rebuilt; it is git-ignored) |
| `apps/architect` `tsc --noEmit` | exit 0 (token defaults keep its density) |
| `apps/web` `tsc --noEmit` | Pre-existing errors unrelated to this batch (`@isalwa/contracts` not built, implicit `any` in `pulso`); not touched |
| Lint | Not run: `os-web` has no ESLint config |

## Honest gaps

1. **Not browser-verified.** 44px targets, collapse behavior, the hit-area pseudo-elements, 16px fields and the map list were checked by source/CSS tests, not by rendering at 390px and 1440px.
2. **Cliente 360 next-step header** — closed in Batch 8B (`BATCH-8B-CLIENTE360-STATUS-HEADER.md`): next step, owner, last attention and open issues above the tabs with honest absent/error states.
3. **"Mi equipo" / "Empresa" labels** exist as lens names on Hoy; a full authorization audit of where they appear was not done.
4. **Persistent-label audit** (placeholders never used as labels) was not run across all 80+ forms; the 44px/16px floor is global, label markup is not re-verified per form.
5. **Panel padding 16/24** is the existing `Panel` default; `PageSection` and ad-hoc `p-*` classes were not audited.
6. Nav scope lists are an explicit mapping, not derived from page guards; a new scope needs adding to `requiresAnyScope`. Wrong omissions hide a link, never grant access.
7. Error-copy mapping covers forms using `mapCommandError`; bespoke message strings elsewhere were not rewritten.
8. Map marker loading is one read per listed customer (bounded batches); there is no server-side bulk coordinates endpoint, so very large customer lists are limited by the existing search cap.
9. Not independently reviewed, not pushed.
