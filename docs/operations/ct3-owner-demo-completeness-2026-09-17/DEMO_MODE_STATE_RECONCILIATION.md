# DEMO MODE STATE RECONCILIATION

**At:** 2026-09-17 (read-only forensic)  
**Scope:** `apps/os-web` demo data mode only. No product code changes.  
**Companion:** `NAVIGATION_STATE_PRESERVATION_AUDIT.md`

---

## CANONICAL DEMO STATE SOURCE

**BOTH — query preferred, cookie as SSR fallback; localStorage for client chrome only.**

| Layer | What decides mode | Notes |
|---|---|---|
| **Server desks** (`resolveDemoDataMode`) | **1)** `?datos=demo` **2)** cookie `isalwa-demo-data-mode` | Does **not** read `localStorage`. Default `real`. |
| **Client chrome** (toggle, banner, Story Mode) | **1)** `?datos=demo` or `?story=1` **2)** `localStorage` key `isalwa.os-web.demo-data-mode.v1` | On mount / toggle / openStory, client **dual-writes** localStorage **and** cookie. |
| **Intended cross-nav persistence** | Cookie | Sidebar and most Links **omit** `?datos=`; design assumes cookie keeps SSR in sync. |

**Canonical label for this product:**

> **CANONICAL DEMO STATE SOURCE = query OR cookie (prefer query); localStorage is client-only mirror that must sync the cookie.**

There is **no single source**. Desks trust **query → cookie**. Chrome trusts **query → localStorage** (then forces cookie to match). If those diverge, UI can show **Demo** while lists filter as **real** (or the reverse after a bad overwrite).

---

## Symbol trace

### `resolveDemoDataMode` — `apps/os-web/lib/demo/resolve-demo-data-mode.ts`

```ts
// Prefer explicit ?datos=demo, else cookie set by the owner Demo toggle.
export async function resolveDemoDataMode(searchParams?): Promise<DemoDataMode>
```

Order:

1. Await `searchParams` (optional).
2. If `datos === 'demo'` → `'demo'`.
3. Else `cookies().get('isalwa-demo-data-mode')` via `parseDemoDataMode`.
4. On cookie API failure → `'real'`.

Callers that pass page `params` (query can win): `clientes`, `oportunidades`, `cotizaciones`, `trabajo`, `conversaciones`, `incidencias`, `compromisos`, `mapa`, `finanzas`, `inicio`.

Callers that pass `{}` (**query ignored**; cookie only): `almacen/page.tsx`, `produccion/page.tsx`, `lib/delivery/load-entregas.ts`, `lib/purchasing/load-linked-orders.ts`.

App layout is `force-dynamic`, so cookie reads are not statically cached away.

### Cookie `isalwa-demo-data-mode` — `DEMO_DATA_MODE_COOKIE`

- Defined in `apps/os-web/lib/demo/owner-demo-identity.ts`.
- Written only from the **browser** in `saveDemoDataMode` via `document.cookie` (`path=/`, `max-age=30d`, `SameSite=Lax`, **not** `HttpOnly`, **not** `Secure` flag).
- Read on the **server** by `resolveDemoDataMode` through `next/headers` `cookies()`.

### `filterByDemoDataMode` — `owner-demo-identity.ts`

```ts
items.filter((item) => (mode === 'demo' ? isDemo(item) : !isDemo(item)))
```

Never mixes modes. On Clientes, `isDemo` = `isDemoDisplayName(displayName || legalName)` (name must start with `DEMO `).

### `OwnerDemoProvider` — `components/demo/owner-demo-provider.tsx`

- Mount `useEffect`: mode = `datos=demo` OR (`story=1` && canUse) → `'demo'`, else `loadDemoDataMode(localStorage)`.
- Immediately `saveDemoDataMode(localStorage, mode)` → syncs cookie to that choice.
- Until `ready`, context exposes `dataMode: 'real'` (toggle/banner can flash Real).
- `setDataMode` / `openStory` update state + localStorage + cookie; `openStory` also `history.replaceState` with `datos=demo&story=1`.
- `closeStory` removes `story` only; leaves `datos` and mode.

Wired from `components/shell/app-shell.tsx` when role-preview / owner-demo is allowed.

### Demo toggle — `components/demo/demo-data-filter-toggle.tsx`

- Reads `dataMode` from `useOwnerDemo()` (client).
- `select('demo')`: `setDataMode('demo')` + `router.replace(pathname?…&datos=demo)`.
- `select('real')`: cookie/localStorage `real`, **deletes** `datos` from URL.
- Story Mode locks Real off.

### Banner — `components/demo/demo-fictitious-banner.tsx`

Client-only: shows when `dataMode === 'demo' || storyOpen`. **Does not prove** SSR used demo mode.

---

## Clientes path (empty-list relevant)

`apps/os-web/app/(app)/clientes/page.tsx`:

1. `dataMode = await resolveDemoDataMode(params)`.
2. If demo: `effectiveQ = q || 'DEMO'`, `limit: 50`, no cursor pagination.
3. `searchParties(...)`.
4. `filterByDemoDataMode(..., isDemoDisplayName)`.

So empty Clientes with chrome saying Demo means either:

- SSR `dataMode === 'real'` (cookie/query miss) → keeps only non-`DEMO ` names; SYNTH-heavy orgs look empty; or
- SSR `dataMode === 'demo'` but API returns no `DEMO `-prefixed parties (seed/org/search `q`), or an explicit `q`/`roleKey` excludes them.

---

## Root-cause hypothesis (empty Clientes + toggle Demo)

**Primary (state split):** Toggle/banner reflect **client** `OwnerDemoProvider` (localStorage / in-memory after toggle). Clientes list is filtered by **server** `resolveDemoDataMode`. Nearly all product navigation **drops** `?datos=demo` and relies on the cookie. If the cookie is missing, stale `real`, or not yet written when the RSC request runs, SSR filters as **real** while the header still shows **Demo** → empty list on a demo-seeded / demo-only party set.

**Secondary (true demo filter):** Cookie/query correctly `'demo'`, but `searchParties` + `isDemoDisplayName` yield zero rows (wrong org, seed absent, or a non-empty `q`/role chip that excludes DEMO names).

**Contributing design:** Dual sources without a shared server→client read of the cookie on the client (client never reads the cookie; mount can overwrite cookie from localStorage).

---

## Proof status

| Claim | State |
|---|---|
| Code path documented above | READ-ONLY TRACE |
| Hosted empty Clientes reproduction | **UNPROVEN** in this forensic (no browser) |
| Cookie always present after toggle | **ASSUMED by design**; not BV’d here |
