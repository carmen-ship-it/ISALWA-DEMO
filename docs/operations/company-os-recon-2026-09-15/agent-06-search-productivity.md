# AGENT 6 — Search & Productivity reconciliation receipt

**Lane:** Company OS recon 2026-09-15 · AGENT 6 ONLY  
**Repo:** `.worktrees/wave2-remediation-integrate`  
**Mode:** Read-only code reconciliation (no implementation)  
**Scope root:** `apps/os-web`  
**Date:** 2026-09-15  

Proof vocabulary (do not collapse): **IMPLEMENTED** · **TESTED** · **INTEGRATED** · **HOSTED** · **BROWSER-VERIFIED** · **UNPROVEN** · **MISSING** · **DEFERRED**

---

## 1. ⌘K / Ctrl+K Command Palette — exact state

### Wiring (LIVE / INTEGRATED in code)

| Concern | State | Evidence |
|--------|--------|----------|
| Shortcut | **IMPLEMENTED + INTEGRATED** | `apps/os-web/components/shell/app-shell.tsx` — `metaKey`/`ctrlKey` + `k` toggles palette; trigger shows `⌘K` with `aria-keyshortcuts="Control+K Meta+K"` |
| Shell mount | **INTEGRATED** | Same file imports `CommandPalette` / `CommandPaletteTrigger` |
| UI | **IMPLEMENTED** | `apps/os-web/components/shell/command-palette.tsx` |
| Model / grouping | **IMPLEMENTED + TESTED** | `apps/os-web/lib/shell/command-palette.ts`, `…/command-palette.test.ts` |
| Remote entity search | **IMPLEMENTED + INTEGRATED** | `apps/os-web/lib/shell/command-search.ts` → `searchPalette` |
| Phone/contact enrichment | **IMPLEMENTED + INTEGRATED** | `apps/os-web/lib/productivity/actions.ts` → `extendPaletteSearch`; merge via `lib/productivity/search-extensions.ts` |

**HOSTED / BROWSER-VERIFIED:** this receipt does not claim either (code-only).

### Entities searchable (min query length = 2)

From `PaletteKind` + `searchPalette` / extensions:

| Kind | In empty palette | Remote search (≥2 chars) | Notes |
|------|------------------|---------------------------|--------|
| Actions | yes | filtered by query | create / invite gated by existing access |
| Recents | yes | no (replaced by remote) | localStorage, actor-scoped |
| Nav (“Ir a”) | yes | yes | admin nav gated by `showAdmin` |
| Customers | — | yes | `searchParties`; phone annotate via extension |
| Customer contacts | — | partial | only when party detail already fetched for enrichment; **no global contact index** (`PRODUCTIVITY_NOT_IMPLEMENTED.global-contact-search`) |
| Opportunities | — | yes (open) | own + probed `team`/`org` lenses |
| Quotes | — | yes (non-cancelled) | own + lenses |
| Orders | — | yes | default list only (no team/org lens fan-out in `command-search.ts`) |
| Work / follow-ups | — | yes (open) | follow-up kind when subject is `party` / `commercial_account` |
| Products / WhatsApp / locations / payments | — | **MISSING** as palette entities | explicit gaps in `lib/productivity/not-implemented.ts` |

Related-party expansion: after customer hits, up to 2 party ids pull related open opp/quote/order/work (`relatedForParty`).

Ops-search **authorization helper exists** (`lib/shell/ops-search.ts`) for client/quote/order/product candidates but **does not wire the palette** (file comment: “Does not wire the palette”).

### Recent items

- Storage prefix `isalwa-os-palette-v1:{actorKey}` — `recentsStorageKey` in `lib/shell/command-palette.ts`
- Cap `RECENTS_LIMIT = 6`
- Written on activate for entity kinds only (not action/nav/recent) — `rememberUsefulRecent` path in palette UI
- Rejects external/`//` hrefs — **TESTED**

### Quick actions (Acciones)

Always offered when access allows (`paletteActions` / `contextualPaletteActions`):

- `Agregar cliente` → `/clientes/nuevo` — only if `canCreateCustomer`
- `Nueva oportunidad` — pick customer **or** direct href when already on `/clientes/{id}`
- `Crear cotización` — pick opportunity **or** direct when on opportunity path
- `Registrar seguimiento` — pick customer **or** `#trabajo` on open customer
- `Invitar empleado` — only if `canInvite` (`showAdmin` / people.admin probe)
- `Cómo trabajamos` → `/ayuda`

Productivity extras (same dialog, group “Productividad”):

- `Cobertura de ausencia` (authorized summary; does not reassign)
- `Qué cambió` (per-customer timeline mode)
- `Guardar esta vista` when current URL is pin-eligible

### Authority — palette never creates authority

**Claim holds in code.**

| Rule | Evidence |
|------|----------|
| Create/invite affordances require **already held** scopes | `paletteActions({ canCreateCustomer, canInvite })`; shell loads via `actorCanMutateMasterData` / `probeAdminAccess` in `lib/shell/load-shell-context.ts` |
| Admin nav hidden without people.admin probe | `paletteNav(showAdmin)` — **TESTED** |
| Search visibility uses API probes (`team`/`org`); denial → no lens, not invented grant | `probeLens` in `command-search.ts` |
| Path context “Does not infer owner, price, approver, or stage” | comment + `palettePathContext` in `command-palette.ts` |
| Coverage explicitly does not reassign | `PRODUCTIVITY_NOT_IMPLEMENTED.coverage-reassignment`; UI detail “sin reasignar” |
| Contact match evidence tenant-scoped | `CONTACT_MATCH_SCOPE` + `matchingContactsRead` in `search-extensions.ts` — **TESTED** (`search-extensions.tenant.test.ts`) |
| Labels never promote raw ids | **TESTED** in `command-palette.test.ts` |

Palette **navigates** and **opens existing command pages**; it does not mint roles, owners, approvers, or scopes.

---

## 2. Saved / Quick Views

### Built-in saved views (palette group “Vistas”)

Source: `apps/os-web/lib/productivity/saved-views.ts` → `BUILT_IN_SAVED_VIEWS`

| Label (exact) | href |
|---------------|------|
| Cotizaciones enviadas | `/cotizaciones?status=submitted` |
| Cotizaciones aceptadas | `/cotizaciones?status=accepted` |
| Oportunidades abiertas | `/oportunidades?status=open` |
| Trabajo vencido | `/trabajo?view=overdue` |
| Clientes activos | `/clientes?status=active` |

Pinned views: browser localStorage `isalwa-os-saved-views-v1:{actor}` (≤6), allowlisted paths/keys only. Map is **not** pin-eligible (test asserts).

### Named expectations vs reality

| Expected label (recon brief) | Exact state |
|------------------------------|-------------|
| **Mis clientes** | **MISSING** as saved/quick view. Gap id `my-customers-view`: “La lista de clientes no filtra por responsable.” (`not-implemented.ts`). Closest: `Clientes activos` (status only). |
| **Mis pendientes** | **MISSING** as named saved view. Closest LIVE surfaces: Inicio attention (“Necesita su atención”) + `/trabajo` default tab **Míos**. |
| **Vencidos** | **LIVE** as (1) Inicio attention group title, (2) `/trabajo` tab `Vencidos`, (3) built-in vista `Trabajo vencido`. |
| **Sin responsable** | **NOT** a saved view. LIVE as data-health issue title / owner-absent copy (`lib/party/data-health.ts`, `customer-self-service.ts` `OWNER_ABSENT_LABEL`). No URL filter `ownerMemberId` (stripped by `canonicalViewHref`). |
| Other list tabs | Trabajo: `Míos` / `Vencidos` (+ `Equipo`/`Empresa` only after successful lens request). Cotizaciones/oportunidades use status query params, not “Mis …” labels. |

Customer/quote **entity Quick Views** (drawer panels) are separate product surfaces: `CustomerQuickView`, `QuoteQuickView`, map compact quick view — not the saved-views system.

---

## 3. Global Search coverage

| Surface | Coverage | State |
|---------|----------|--------|
| ⌘K palette | customers, open opps, quotes, orders, open work/follow-ups, nav, actions, recents, saved views, coverage, qué cambió | **IMPLEMENTED + INTEGRATED** |
| List `q` params | clientes / trabajo / commercial lists via url-state | **IMPLEMENTED** per list pages |
| Party search form | name + role chips + status | **IMPLEMENTED** (`components/party/party-search-form.tsx`) |
| Member typeahead | `/members/active-options` when authorized | **IMPLEMENTED** (server typeahead); full admin directory remains people.admin |
| Ops-search decision helper | client/quote/order/product auth filter | **IMPLEMENTED**, **not wired** to palette |
| Global contacts | | **MISSING** (`global-contact-search`) |
| Global locations / map search | | **MISSING** (`global-location-search`) |
| WhatsApp / conversation search | | **MISSING** (`whatsapp-search`); Mensajes page states WhatsApp auto channel not enabled |
| Org-wide “what changed” feed | | **MISSING** (`org-what-changed`) |
| Products in ⌘K | | **MISSING** (ops-search candidate kind exists unused) |

Partial results: palette sets `partial` when APIs fail non-sessionally or `hasMore` — honest incompleteness, not silent authority expansion.

---

## 4. Impact / dependency awareness

| Capability | Code | Mounted in product UI? | State |
|------------|------|------------------------|--------|
| Escalation derive: blockers, `mayAffect`, related people, awareness note | `lib/escalation/derive.ts`, `copy.ts` (“Impacto”, “Bloqueado por”, “Puede afectar”) | Panel component exists: `components/escalation/escalation-guidance-panel.tsx` | **IMPLEMENTED + TESTED**; **NOT INTEGRATED** into any `app/(app)/**` page (no imports outside lib/tests/panel). Treat as **UNPROVEN** for operators. |
| Quote approval inline impact | “Bloqueado por” / “A quién acudir” on pending approval | `components/commercial/commercial-approval-panel.tsx` | **INTEGRATED** on approval UX for that subject |
| Cliente 360 blockers | composed blockers (e.g. sin responsable comercial) | `lib/party/next-action.ts` + `cliente-360-now.tsx` | **INTEGRATED** |
| Coverage summary | open/overdue work, follow-ups, opps, quotes, approvals — read-only | palette mode + `CoverageSummaryPanel` | **INTEGRATED** in palette; does not reassign |

Cross-lane note: recorded “Escalado” stage requires an explicit recorded fact; not invented from attention rows (`lib/escalation/cross-lane-request.ts`).

---

## 5. Who should I talk to (current authority vs previously involved)

### Escalation “A quién acudir” (full model)

Designed rungs in `ESCALATION_COPY.rungs` / `derive.ts`:

1. **Quien tiene la acción** — current approver if pending approval, else current work/attention **owner** (`roles.owner` / `roles.approver`)
2. **Jefe registrado** — inform-only when approved policy says so (`informOnly`: does not change owner/approver)
3. **Persona ejecutiva indicada** — policy + prolonged case only

**Personas relacionadas** can also list requester, creator, attention holder, manager — i.e. previously involved facts — without transferring authority.

**Product mount:** full panel **not wired** → operators do **not** get this ladder on Inicio attention today. **UNPROVEN / not INTEGRATED.**

### Live partial equivalent

- Pending commercial approval: shows **current approver** under “A quién acudir” (`commercial-approval-panel.tsx`).
- Cliente 360: shows **Responsable comercial** (assigned or absent note); reassignment only when `canReassignOwner` already true.
- Awareness copy (when guidance derived): “Esto informa. No reasigna…” — authority stays where it already is.

---

## 6. Executive / Manager / Operator lenses on Inicio

Page: `apps/os-web/app/(app)/inicio/page.tsx`

| Lens (recon language) | Exact Inicio surface | State |
|-----------------------|----------------------|--------|
| **Operator** | `OperatingHomes` (asesor / jefe / gerente / department desks from scopes) + Centro de mando `InicioAttentionPanel` + “Su responsabilidad” (own open opps/quotes) + “Próximos” | **INTEGRATED** — `lib/roles/homes.ts`, `load-operating-homes.ts`, `components/management/operating-homes.tsx` |
| **Manager (team)** | `InicioLeadershipSection` variant `team` when `loadInicioLeadership` probe allows `visibility: 'team'` — kicker “Equipo”, title “Atención del equipo” | **INTEGRATED** when scope probe succeeds; otherwise omitted (not offered as fake tab) |
| **Executive / org** | Same component variant `org` — kicker “Empresa”, title “Vista comercial”; includes `ExecutiveCommandCenter` composition | **INTEGRATED** when org visibility probe succeeds |
| **Management exceptions** | `InicioManagementLens` inside Centro de mando | **INTEGRATED** — org figures hidden without `canReadOrg` |
| Standalone `ExecutiveLens` (“Lectura comercial” money strip) | `components/commercial/executive-lens.tsx` | **IMPLEMENTED** but **NOT imported** by Inicio (or any other app page found) — unused parallel surface |

Leadership sections are labeled **Solo lectura**. Team/org do not approve or mutate from this page.

---

## 7. Mobile field workflow friction

No service worker / `navigator.onLine` / offline cache found under `apps/os-web` → **offline stack = MISSING**.

| Field job | Online | Offline |
|-----------|--------|---------|
| **Find** customer / work | **LIVE** — ⌘K + Clientes search + lists | **MISSING** |
| **Call** | Phone shown as **text** on Cliente 360 / sticky header — **no `tel:` link** found under party components → click-to-call **MISSING** | **MISSING** |
| **Maps** | Provenance external link (“Abrir origen en Maps”) when stored URL exists; coordinates shown when present — **LIVE** (online browser) | **MISSING** (no offline tiles/cache) |
| **Next action** | **LIVE** — `composeCliente360` / sticky + `Cliente360Now` | **MISSING** |
| **Update** party/contact (authorized) | **LIVE** — edit forms on customer page | **MISSING** / would fail without network |
| **Report issue** (field incident) | No dedicated “reportar problema” field command found | **MISSING** / treat as **DEFERRED** relative to commercial/work flows |

WhatsApp: displayed as stored contact field; auto channel **not enabled** (`app/(app)/mensajes/page.tsx`, guidance `WHATSAPP_UNWIRED`). Not a live send path.

Sticky mobile-friendly chrome exists (`Cliente360Sticky`, shell safe-area) but does not imply offline capability.

---

## 8. Change Log / Qué hay de nuevo

| Expected | Exact state |
|----------|-------------|
| Product **“Qué hay de nuevo”** / release changelog | **MISSING** — no matching route, copy, or component under `apps/os-web` |
| Per-customer **“Qué cambió”** | **IMPLEMENTED + INTEGRATED** in Command Palette (`mode: 'changed'` → `loadWhatChanged` → party timeline filtered by `CHANGE_EVENTS` in `lib/productivity/what-changed.ts`) |
| Org-wide what-changed feed | **MISSING** (`org-what-changed`) |

Do not equate “Qué cambió” with a product changelog.

---

## 9. Gap register (productivity lane, as coded)

From `apps/os-web/lib/productivity/not-implemented.ts` (authoritative absence list):

- `org-what-changed`
- `commitments`
- `overdue-follow-up-view` (no URL key)
- `my-customers-view`
- `unconfirmed-reported-payments`
- `report-builder`
- `whatsapp-search`
- `global-contact-search`
- `global-location-search`
- `team-coverage-picker` / `other-member-list-deeplink`
- `coverage-reassignment`

---

## 10. Key paths (apps/os-web)

```
components/shell/app-shell.tsx
components/shell/command-palette.tsx
lib/shell/command-palette.ts
lib/shell/command-palette.test.ts
lib/shell/command-search.ts
lib/shell/ops-search.ts
lib/shell/load-shell-context.ts
lib/productivity/saved-views.ts
lib/productivity/actions.ts
lib/productivity/search-extensions.ts
lib/productivity/what-changed.ts
lib/productivity/not-implemented.ts
lib/productivity/coverage.ts
components/productivity/coverage-summary.tsx
components/productivity/what-changed-list.tsx
app/(app)/inicio/page.tsx
components/work/inicio-attention-panel.tsx
lib/work/inicio-attention.ts
components/management/inicio-management-lens.tsx
components/management/operating-homes.tsx
lib/roles/homes.ts
components/commercial/inicio-leadership-section.tsx
components/commercial/executive-lens.tsx          # unused by pages
components/executive/command-center-panel.tsx
lib/leadership/load-inicio-leadership.ts
lib/escalation/*                                 # derive + panel; panel unmounted
components/escalation/escalation-guidance-panel.tsx
components/commercial/commercial-approval-panel.tsx
app/(app)/clientes/[partyId]/page.tsx
components/party/cliente-360-now.tsx
lib/party/next-action.ts
app/(app)/trabajo/page.tsx
lib/i18n/es.ts                                   # Inicio attention / lens copy
```

---

## 11. AGENT 6 verdict (concise)

1. **⌘K is real and authority-safe:** search + recents + gated actions + saved views; never invents grants.  
2. **Named quick views “Mis clientes / Mis pendientes / Sin responsable” are not shipped** as that vocabulary; use built-ins + Trabajo/Inicio instead.  
3. **Impact / who-to-talk ladder is coded but not mounted** on attention; only approval-panel and Cliente 360 give partial live guidance.  
4. **Inicio lenses (operator homes, team, org, management) are composed on one page** when scopes allow; unused `ExecutiveLens` component is a parallel leftover.  
5. **Field mobile friction is online-only;** call deep-link and offline are **MISSING**; product changelog **MISSING**; customer “Qué cambió” **LIVE** in palette only.

**AGENT 6 status:** receipt complete · no code changes · hosted/browser proof **UNPROVEN** by design of this pass.
