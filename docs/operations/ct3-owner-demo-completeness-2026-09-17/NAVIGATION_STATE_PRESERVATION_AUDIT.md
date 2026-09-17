# NAVIGATION STATE PRESERVATION AUDIT (`datos=demo`)

**At:** 2026-09-17 (read-only forensic)  
**Scope:** In-app navigations that can omit or keep `?datos=demo`.  
**Companion:** `DEMO_MODE_STATE_RECONCILIATION.md`  
**No product code changes.**

---

## Method

- **PRESERVES** — target URL sets or keeps `datos=demo` (or mutates other params without removing an existing `datos`).
- **DROPS** — navigable target / href builder omits `datos` (cookie fallback may still apply on SSR; query state is still dropped).
- **N/A** — locked/non-navigable, auth gate, or login/reset flows outside owner-demo desk chrome.

Cookie fallback does **not** change DROPS classification for the **query** param. See reconciliation doc for cookie vs client chrome.

---

## Counts

| Metric | Value |
|---|---:|
| **DEMO_NAV_LINKS_AUDITED** | **89** |
| **DEMO_NAV_LINKS_DROPPING_STATE** | **82** |
| PRESERVES | 4 |
| N/A | 3 |

### DROPS composition (82)

| Group | n | file:function (representative) |
|---|---:|---|
| Sidebar PRIMARY_NAV | 24 | `lib/navigation/nav-config.ts:PRIMARY_NAV` → `components/shell/app-nav.tsx:NavLink` |
| Brand home | 1 | `components/shell/app-shell.tsx` `<Link href="/inicio">` |
| Story Mode CTAs | 20 | `lib/demo/story-mode-steps.ts:STORY_MODE_STEPS[*].hrefFor` |
| Breadcrumbs | 2 | `lib/navigation/breadcrumbs.ts:deriveShellBreadcrumbs`; `components/shell/shell-breadcrumbs.tsx:ShellBreadcrumbs` |
| Approval / work | 4 | `aprobaciones/[approvalRequestId]/page.tsx:resolveSubjectLink`; `lib/work/navigation.ts:approvalHref`; `workItemHref`; `attentionTargetHref` |
| Commercial / party / list builders + mutation redirectTo | 14 | See §6 |
| Interactive router/Link/redirect call sites | 14 | See §7 |
| Command palette (excl. `paletteNav` dup of PRIMARY_NAV) | 3 | `paletteActions`; entity palette factories; `applyPick` / contextual |
| **Sum** | **82** | |

---

## 1. PRESERVES (4)

| file:function | Evidence |
|---|---|
| `components/demo/demo-data-filter-toggle.tsx:DemoDataFilterToggle.select` (`mode==='demo'`) | `next.set('datos','demo'); router.replace(...)` |
| `components/demo/owner-demo-provider.tsx:OwnerDemoProvider.openStory` | `url.searchParams.set('datos','demo')` + `story=1` |
| `components/demo/inicio-owner-demo-card.tsx` (Link) | `href="/inicio?datos=demo&story=1"` |
| `components/conversations/conversations-workspace.tsx:replaceParams` | Rebuilds from current `searchParams` (keeps `datos` if present) |

---

## 2. Sidebar / nav-config (DROPS 24 + brand 1; N/A 1)

| file:function | Class | Evidence |
|---|---|---|
| `lib/navigation/nav-config.ts:PRIMARY_NAV` ×24 via `app-nav.tsx:NavLink` | DROPS ×24 | `/inicio`, `/clientes`, `/oportunidades`, `/cotizaciones`, `/cotizaciones?status=accepted`, `/mapa`, `/trabajo`, `/conversaciones`, `/aprobaciones`, `/incidencias`, `/compromisos`, `/produccion`, `/almacen`, `/compras`, `/entregas`, `/finanzas`, `/salud-datos`, `/auditoria`, `/productos`, `/coordinacion`, `/memoria-decisiones`, `/administracion`, `/ayuda` — no `datos` |
| `components/shell/app-shell.tsx` brand Link | DROPS | `href="/inicio"` |
| `lib/navigation/nav-config.ts:FUTURE_NAV` (`mensajes`) | N/A | Locked; not navigable |

---

## 3. Story Mode CTAs (DROPS 20)

| file:function | Class | Evidence |
|---|---|---|
| `lib/demo/story-mode-steps.ts:STORY_MODE_STEPS[i].hrefFor` ×20 | DROPS ×20 | Paths / `?tab=` / `?lente=gerencia` / PDF APIs only. Consumed by `components/demo/owner-story-mode.tsx`. Never appends `datos=demo`. |

---

## 4. Breadcrumbs (DROPS 2)

| file:function | Class | Evidence |
|---|---|---|
| `lib/navigation/breadcrumbs.ts:deriveShellBreadcrumbs` | DROPS | Path-only `rootHref` / cliente / opportunity / back hrefs |
| `components/shell/shell-breadcrumbs.tsx:ShellBreadcrumbs` | DROPS | Renders those hrefs with no query merge |

---

## 5. Approval redirects (DROPS 4)

| file:function | Class | Evidence |
|---|---|---|
| `app/(app)/aprobaciones/[approvalRequestId]/page.tsx:resolveSubjectLink` | DROPS | `quoteHref` / `orderHref` / `partyHref` |
| `lib/work/navigation.ts:approvalHref` | DROPS | `/aprobaciones/{id}` |
| `lib/work/navigation.ts:workItemHref` | DROPS | `/trabajo/{id}` |
| `lib/work/navigation.ts:attentionTargetHref` | DROPS | Delegates to above |

---

## 6. Commercial / list / party builders + redirectTo (DROPS 14)

| file:function | Class |
|---|---|
| `lib/commercial/navigation.ts:opportunityHref` | DROPS |
| `lib/commercial/navigation.ts:quoteHref` | DROPS |
| `lib/commercial/navigation.ts:orderHref` | DROPS |
| `lib/commercial/navigation.ts:newOpportunityHref` | DROPS |
| `lib/commercial/navigation.ts:newQuoteHref` | DROPS |
| `lib/commercial/navigation.ts:clienteSectionHref` | DROPS (`?tab=` only) |
| `lib/party/navigation.ts:partyHref` | DROPS |
| `lib/party/navigation.ts:newCustomerHref` | DROPS |
| `lib/party/navigation.ts:clientesSearchHref` | DROPS (search chips / Buscar) |
| `lib/party/navigation.ts:trabajoForPartyHref` | DROPS |
| `lib/lists/url-state.ts:listHref` | DROPS (`LIST_KEYS` has no `datos`; covers panel/cursor wrappers) |
| `lib/inicio/page-lens.ts:inicioLensTabHref` | DROPS |
| `lib/commercial/actions.ts` (`redirectTo` returns) | DROPS |
| `lib/party/actions.ts` (`redirectTo`) | DROPS |

---

## 7. Interactive `router` / Link / `redirect()` call sites (DROPS 14)

| file:function | Class | Evidence |
|---|---|---|
| `demo-data-filter-toggle.tsx:select` (`mode==='real'`) | DROPS | Deletes `datos` |
| `party-search-form.tsx:onSubmit` | DROPS | `router.push(clientesSearchHref(...))` |
| `party-search-form.tsx` Limpiar Link | DROPS | `href="/clientes"` |
| `map/map-experience.tsx` | DROPS | `panelHref` / `hrefWithoutPanel` |
| `cliente/cliente-360-nav.tsx` | DROPS | `clienteSectionHref` push/replace |
| `shell/command-palette.tsx` | DROPS | `router.push(item.href)` |
| `walkthrough/intro-coach.tsx` | DROPS | Hard-coded `/inicio`, `/clientes`, `/mapa`, `/ayuda` |
| `walkthrough/walkthrough-help-panel.tsx` | DROPS | `router.push(entry.prefix)` |
| `operating/quick-view-host.tsx` | DROPS | `hrefWithoutPanel` |
| `operating/quote-quick-view.tsx` | DROPS | Close href without `datos` |
| `app/page.tsx` | DROPS | `redirect(DEFAULT_POST_LOGIN)` |
| `lib/auth/actions.ts` | DROPS | `redirect(next)` |
| `lib/qa/actions.ts` | DROPS ×2 | `/inicio`, `/sistema/pruebas-acceso` |

Form `router.push(result.redirectTo)` sites (quote/opportunity/customer create, convert-quote) are covered by §6 `redirectTo` emitters, not double-counted here.

---

## 8. Command palette (DROPS 3; PRIMARY_NAV dup excluded)

| file:function | Class | Evidence |
|---|---|---|
| `lib/shell/command-palette.ts:paletteActions` | DROPS | Static action hrefs |
| Entity palette item factories (`customerPaletteItem`, quote/order/work/…) | DROPS | Deep links without `datos` |
| `applyPick` / `contextualPaletteActions` | DROPS | Rewrites to commercial hrefs without `datos` |

`paletteNav` copies `PRIMARY_NAV` hrefs — **not** added again (already in §2).

---

## 9. N/A (3)

| file:function | Class | Why |
|---|---|---|
| `nav-config.ts:FUTURE_NAV` mensajes | N/A | Locked |
| `middleware.ts` auth redirects | N/A | Session gate |
| Auth forms (login / reset / invite) | N/A | Outside demo desk |

---

## High-signal findings

1. **82/89 audited navigations DROP `datos=demo`.** Only toggle→Demo, Story open, Inicio demo card, and Conversaciones in-place param edits PRESERVE query state.
2. **Sidebar is the main drop vector** for empty Clientes: `NavLink` → `/clientes` with no query; SSR then depends entirely on cookie `isalwa-demo-data-mode`.
3. **`listHref` / `clientesSearchHref` / commercial hrefs / breadcrumbs** never carry `datos`.
4. **Story CTAs** also omit `datos`; they rely on cookie after `openStory`.

---

## Root-cause hypothesis (empty Clientes + toggle Demo)

Chrome (toggle/banner) is **client** (`OwnerDemoProvider` / localStorage). Clientes list filtering is **server** (`resolveDemoDataMode` = query then cookie). Sidebar and most CTAs **DROP** the query, so the cookie is the only bridge. If the cookie is missing, still `real`, or not yet written when the RSC runs, SSR filters as **real** while the toggle still shows **Demo** → empty list on a demo-seeded / DEMO-named party set.

**Alternate:** SSR mode is correctly `demo`, but `searchParties` + `isDemoDisplayName` (or an explicit `q` / `roleKey`) yield zero rows.
