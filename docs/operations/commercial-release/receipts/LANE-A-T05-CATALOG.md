# Lane A — T05 catalog reconciliation and product presentation (receipt)

Worktree `/Users/carmen/projects/isalwa-wt-t05-catalog`, branch `ct3/t05-catalog`, base `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7`. Assignment `lanes/LANE-A-T05-CATALOG.md`.

States: **IMPLEMENTED, LOCALLY TESTED.** Not integrated, not deployed, not browser-verified. No push, no merge, no database, no port 5432.

## Input blocker (DATA_CONFIRMATION_REQUIRED) — still open

- Blocked lane: re-checking catalog facts against `CatalogoVitriCompleto2026.pdf`.
- Evidence: the file is not in the transfer folder (`isalwa-handoff/.../TRANSFER/`) and a Spotlight search for the name returns nothing.
- Safe work done: reconciliation and presentation built from the reviewed JSON (`packages/os-catalog/preview/vitri-2026-reviewed.json`, reviewed 2026-09-14). Every page shown is the page that JSON already records. No page, price or value was added.
- Every reconciliation row and every product sheet carries `pdfCheck.status = "pending"`; the UI shows "Revisión contra PDF pendiente".
- Unblock: Carmen provides the PDF path (expected SHA-256 `4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0`, as recorded in the reviewed JSON).

## What was implemented

1. **One catalog, stable ids, explicit mapping.** `packages/os-catalog/src/reconciliation.ts` + additive `packages/os-catalog/preview/starter21-reconciliation.json` (generated, checked byte-for-byte by a test). Every starter key from `starter-quote-products.ts` (21 active + 8 retired keys still stored on quote lines) maps to a stable id (`stableProductId(canonicalKey)`) or is explicitly unmatched with a reason. `resolveCatalogKey` resolves stable ids, canonical keys and every historical starter key to one id; an unmatched key returns its recorded reason. No key is deleted; the 25 candidates are not treated as 25 SKUs.
2. **Provenance per value.** `packages/os-catalog/src/presentation.ts`. Name, category, description and every attribute carry sources: the reviewed JSON path plus each PDF file/page/section the JSON cites. Inconsistent fields (same field with different values or units across sources, or a contradiction recorded in the JSON review notes) show "Especificación pendiente de revisión", carry no value, and are excluded from `automaticAnswerFields`. Measures without a printed unit show "(unidad no impresa)" and are also excluded from automatic answers.
3. **`/productos` per V2 §5.5.** Title "Catálogo"; search "Buscar producto o modelo" (matches names, printed aliases, starter names and historical keys); category chips plus "Solo activos". Cards show a photo only when an approved image exists (none do), the name, category, "Variantes y condición por confirmar", the price state, a count of pending fields, a source line, and "Ver ficha". The price shows only from an approved, active price list (`catalogPriceDisplay`); none exists, so every card shows "Precio por confirmar". Historical transactions and source-document amounts are rejected. The model has no cost or margin field (`assertNoForbiddenProductFields`).
   New ficha `/productos/[productId]` shows the description, measures with units, printed compatibility, condition ("Sin condición aprobada"), source/page per field, review date, historical keys and review notes. Historical keys redirect to the stable id. Unmatched and unknown keys, and a missing file, show honest empty states.
   Reuses `PageContainer`, `PageHeader`, `PageSection`, `SectionHeader`, `Panel`, `Chip`, `SearchField`, `StatusPill`, `EmptyState`. `catalogSurface` was extended (generic + `activeOnly`), not replaced.
4. `apps/os-web/lib/catalog/reviewed-preview.ts` is the one preview reader. `lib/production/load-catalog.ts` now uses it with its exported name, signature and behaviour unchanged.

## Mapping table summary

| | count |
|---|---|
| Starter keys reconciled | 29 (21 active, 8 retired) |
| Matched (starter key = canonical key) | 25 (17 active + 8 retired) |
| Alias (historical starter key → other canonical key) | 3: `sanitario-capri`→`inodoro-capri`, `sanitario-alti`→`alti`, `urinario`→`urinario-acqua` |
| Unmatched | 1: `tanque-alto` (index p.3 only in the JSON, no sheet; not merged with `alti`) |
| Pending reconciliation contradictions | 2: `tanque-alto` is selectable without a sheet; `tanque-alto` vs the `alti` alias "Sanitario Alti (tanque alto)" |
| Catalog candidates | 25; 5 with no active starter key (`bowl-domino-embutir`, `bowl-luma`, `set-cadiz`, `set-capri`, `tanque-milan`), reachable through retired keys |

Field-level fields shown as pending (computed from the JSON): espejo de agua for `set-cadiz`, `alti` and `sanitario-verso`; descarga for `sanitario-verso`; measures for `domino` and `kayak`; weights for `lavamanos-pedestal-capri`; desagüe distance unit (cm label vs 305 mm installation) for `inodoro-capri`, `alti` and `sanitario-verso`.

## Checks (evidence in `evidence/LANE-A-T05-CATALOG/`)

| Check | Result |
|---|---|
| os-catalog `pnpm run build` | exit 0 (`build.txt`) |
| os-catalog suite | 27/27 pass (10 existing + 17 new) (`suite-os-catalog.txt`) |
| os-catalog `tsc --noEmit` | exit 0 (`typecheck-os-catalog.txt`) |
| os-web full suite | 1311/1311 pass; baseline 1298/1298 at `ce71f9a` (`suite-os-web.txt`, `baseline-os-web.txt`) |
| os-web `tsc --noEmit` | exit 0 (`typecheck-os-web.txt`) |
| Mutations | 5/5 caught, sources restored by SHA-256 (`mutations.txt`): break mapping, drop historical key, drop provenance, price without approval, inconsistent field shows value |
| Local visual check (port 3210) | Not performed; `/productos` sits behind session middleware. No BROWSER-VERIFIED claim. |

Local setup (worktree only, nothing committed): `pnpm install --frozen-lockfile --offline` (no lockfile change) and `pnpm --filter @isalwa/ui build` (`dist/` is gitignored). The three `packages/os-database/src/generated/client/{edge,index,wasm}.js` files differ from base only in absolute worktree paths written during setup; they were left uncommitted and untouched.

## Dependencies for integrator

1. `apps/os-web/lib/navigation/breadcrumbs.ts`: there's no label for `/productos/[productId]`, so the crumb shows the raw `prd_…` id. Add the product name or "Ficha".
2. `apps/os-web/package.json`: optional `"@isalwa/os-catalog": "workspace:*"`. os-web imports os-catalog by relative path, as the existing code already did; this works without the change.
3. Integrator-owned follow-ups for T05 (not built here): "Agregar a cotización" from cards; DB-backed catalog (`OsCatalogProduct`) and aliases column; approved price lists (`OsPriceList`/`OsPriceEntry`) feeding `catalogPriceDisplay`; knowledge publish and AI "published only" wiring through `automaticAnswerFields`; "Compartir catálogo"; navigation entry (`lib/navigation/requests/productos.ts`).
4. Lane B: `lib/work/visual-depth.test.ts` still passes. `catalog-browser.tsx` keeps the literal "Ver ficha" and avoids `underline-offset-2 hover:underline`.

## Files changed vs base

See `git diff --name-only ce71f9a..HEAD` in the snapshot report. All files are inside the allowed set.
