# Lane A catalog — local browser verification plan

Authorization: Carmen, 2026-10-17 01:36 §C. Read-only inspection of the catalog lane, the test harness and the metadata needed to pick an isolated disposable database. Local browser checks use synthetic identities and an isolated database and API on verified ports. No default database targets, hosted data or production sessions. Authentication is not weakened. No secret values in output.

## Target

- Lane A candidate: `18a0f0c25dd93d6916288261d993ccf4a3c0e355`. Lane A HEAD `c872470` adds only `SUPPLEMENTAL-RECEIPT-1.md`, so the code is identical.
- The lane A worktree is **not used to run servers**. `apps/os-web/next-env.d.ts` is tracked there, and `next dev` (15.5) rewrites it. A separate, detached, disposable worktree at `c872470` runs the app, so lane-owned files stay untouched.

## Isolation

| Item | Value | Check |
|---|---|---|
| Run tree | `/Users/carmen/projects/isalwa-wt-lanea-browser` (detached `c872470`) | new path; `pnpm install --frozen-lockfile --offline`; no lockfile change |
| Database | `isalwa_lanea_browser_disposable` @ `localhost:54329` (socket `/tmp`), created from the template `isalwa_t01_disposable` | template idle; schema identical (`git diff c872470 HEAD -- packages/os-database/prisma` is empty; 35 migrations) |
| os-api | `127.0.0.1:4210` (`OS_API_HOST=127.0.0.1`, `OS_API_PORT=4210`, `OS_AUTH_MODE=dev`, no `NODE_ENV=production`) | port free before start; lane B uses 3220/4220, the integrator 3200/4001 |
| os-web | `127.0.0.1:3210` (lane A's allocation, `LANES.md`), `NEXT_PUBLIC_OS_API_URL=http://127.0.0.1:4210`, `NEXT_PUBLIC_OS_AUTH_MODE=dev` | port free before start |
| Env files | none. The run tree has only `.env.example`; every value is passed on the command line, none is secret | |
| Identity | `/login` → "Entrar (desarrollo)" → `POST /dev/bootstrap` seeds a new synthetic organization and admin in the disposable database | existing development path; no cookie forging or auth change |
| Browser | Cursor's built-in browser (cursor-ide-browser); CDP device emulation for mobile. No Playwright install | |

Never: port 5432, `/tmp:5432`, the staging database, hosted URLs, Supabase.

## Checks

1. Route authorization: `/productos` and `/productos/<id>` without a session redirect to `/login`.
2. Login through the development button, then `/productos`.
3. List: cards render, "Precio por confirmar" appears on every card, and the pending-review label appears on inconsistent fields.
4. Search and filters change the results; an empty result shows the empty state.
5. Detail page (ficha) by stable id: fields, source-pending labels, back link or breadcrumb to `/productos`.
6. Alias redirect: `/productos/sanitario-capri` and `/productos/inodoro-capri` land on the stable id.
7. Unknown id shows the not-found state.
8. Layout at 1440px and 390px: no horizontal scroll; controls keyboard reachable.

## Teardown

Stop both servers. The disposable database and run tree stay until the integrator removes them through the normal process; no `rm -rf` of a worktree.

## Execution (2026-10-17 01:44–01:52)

What actually ran, including deviations from the plan above:

- Run tree `isalwa-wt-lanea-browser` at `c872470`. Offline frozen install exit 0, no lockfile change. Builds of the os-api and os-web dependency sets exit 0. The build regenerated the three Prisma generated-client files in the run tree; lane A's worktree has the same three pre-existing modifications. Lane A itself was not touched: HEAD `c872470` and its status were identical before and after.
- Servers: os-api `127.0.0.1:4210` (`/v1`, health 200) and os-web `127.0.0.1:3210`, both ports free before start and after stop. The first start used the wrong API base (missing `/v1`, CORS variable name). After a restart the servers still died when their launching shell call ended, so they were rerun as supervised background jobs. No environment file was used.
- Browser: **Cursor's built-in browser (cursor-ide-browser) could not reach the local ports** (`chrome-error://chromewebdata/` on localhost and 127.0.0.1, no error text). The Playwright MCP, which was already installed, was used instead; nothing new was installed.
- Identity: `/login` → "Entrar (desarrollo)" → a fresh synthetic organization and admin in `isalwa_lanea_browser_disposable`. Only that admin identity was exercised.

## Result: LOCAL BROWSER CHECK, PARTIAL PASS with findings (local, synthetic; not HOSTED, not OWNER ACCEPTED)

| # | Check | Result |
|---|---|---|
| 1 | Route authorization: no session → `/productos`, `/productos/sanitario-capri` | PASS. 307 to `/login?next=…`, both before login and after "Cerrar sesión" |
| 2 | Development login → `/productos` | PASS |
| 3 | List | PASS. 25 cards; "Precio por confirmar" 25/25; source with pages 25/25; "Ver ficha" link 25/25; pending-review label on 7 cards; "Revisión contra PDF pendiente" banner with review date; "Nombrado, sin ficha" region (Tanque Alto) |
| 4 | Search | PASS with finding F1. "capri" → 6; "cadiz" → 4; nonsense → "Sin coincidencias / Ningún producto coincide…"; empty → 25. Search matches name, category, description, aliases and attribute values. Set Cadiz and Tanque Cádiz match "capri", and Sanitario Capri matches "cadiz", through printed compatibility attributes ("Capri, Cadiz") |
| 4b | Filters | PASS. Lavamanos 14, Sanitarios 6, Tanques 4, Urinarios 1, Todas 25 (sum matches); `aria-pressed` follows the selection. "Solo activos" toggles `aria-pressed`, but no inactive product exists, so its filtering effect is UNPROVEN |
| 5 | Ficha by stable id | PASS with findings F2, F3. Name, category, "Revisión contra PDF pendiente", "1 dato pendiente de revisión", per-field values with source and page, "Especificación pendiente de revisión" with an explanation, "Sin condición aprobada", back link "Volver al catálogo" |
| 5b | Breadcrumbs | PASS. Desktop: "Productos" (→ `/productos`) › "Detalle". Mobile: "Volver · Productos · Detalle". Rendered by the shell outside `main`; no breadcrumb `aria-label` was found |
| 6 | Alias redirects | PASS. `/productos/sanitario-capri` and `/productos/inodoro-capri` → `/productos/prd_e17388cd59ee592d6ec5b87c` |
| 7 | Unknown id | PASS. "Producto no encontrado" with a back link |
| 8 | Layout 1440px / 390px | PASS for catalog content: list, ficha and not-found have `scrollWidth == innerWidth` at both widths, and no element in `main` overflows. Shell finding F5 |
| 8b | Keyboard | PASS. Tab reaches the search box, all six filter buttons and "Ver ficha", each with a visible focus style; Enter opens the ficha |

Findings (not fixed here; lane A is frozen and the shell is integrator-owned):

- **F1 (lane A, search):** matching is case-insensitive but not accent-insensitive. "cádiz" returns only Tanque Cádiz and misses Sanitario Cadiz and Set Cadiz (`packages/os-catalog/src/browse.ts` uses `toLowerCase()` without accent folding).
- **F2 (lane A, ficha copy):** every field shows an internal repository path as a user-facing source, e.g. "Fuente: packages/os-catalog/preview/vitri-2026-reviewed.json · products[inodoro-capri].attributes.ancho" (9 on Sanitario Capri), next to the PDF page source.
- **F3 (lane A, ficha):** the ficha has no price statement. "Precio por confirmar" appears on the cards but not on the product sheet.
- **F4 (shell, not lane A):** React hydration mismatch on every page checked (`/productos`, the ficha, `/inicio`). A sidebar link renders `href="/productos"` on the server and `"/productos?datos=real"` on the client (data-filter parameter).
- **F5 (shell, not lane A):** at 390px the top bar is clipped ("Ver recorrido comp…"). It doesn't cause page-level horizontal scroll.

Unproven: role-specific access (only the bootstrap admin was used; no restricted member), the "Solo activos" effect, screen-reader pass, hosted environment.

Screenshots (local only, `/Users/carmen/projects/isalwa-evidence/lane-a-browser/`; synthetic session, public catalog content):

```
d59528a75457d601618735931dc3953ab1150a96b873e04528b7a87b8860c5ce  01-list-1440.png
c53dbc93ea9efd1e031e69c3354dc04ffc4e8cc4a669aa231222c1add5b9c506  02-list-390.png
715a179c39a7ecbd23dc244a66ebd62bffe398e92fd97da18a81d696ef538634  03-ficha-390.png
```

Left in place for the integrator's normal cleanup: run tree `isalwa-wt-lanea-browser` and database `isalwa_lanea_browser_disposable`. Servers stopped; ports 3210 and 4210 free.
