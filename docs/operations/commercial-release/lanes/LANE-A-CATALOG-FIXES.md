# Lane A — catalog browser fixes F1–F3

Worktree `/Users/carmen/projects/isalwa-wt-t05-catalog-fixes`, branch `ct3/t05-catalog-fixes`, base `c8724702189b5626facae3ee6f8eb317e1228648` (lane A candidate plus its docs-only disclosure). `../LANES.md` rules apply. One writer.

The candidate branch `ct3/t05-catalog` and worktree `/Users/carmen/projects/isalwa-wt-t05-catalog` stay frozen at `c872470` for review. Don't commit there.

## Scope (only these three, from `browser/LANE-A-CATALOG-BROWSER.md`)

1. **F1 accent-insensitive search.** `packages/os-catalog/src/browse.ts` folds case but not accents. Fold both the query and the haystack (Unicode NFD and strip combining marks, then lowercase). "cádiz", "cadiz" and "CÁDIZ" must return the same set (Sanitario Cadiz, Set Cadiz, Tanque Cádiz, plus the Capri items matched through compatibility attributes). Displayed text is unchanged.
2. **F2 no internal paths as sources.** The ficha shows "Fuente: packages/os-catalog/preview/…json · products[…]…" per field. User-facing sources show only the document source and page (e.g. "Catálogo VITRI 2026 · pág. N", or the existing pending label when no page is verified). The internal JSON path may stay in data, but no rendered text or accessible name contains `packages/`, `.json`, or `products[`.
3. **F3 price statement on the ficha.** The product sheet shows the same `PRICE_TO_CONFIRM_LABEL` ("Precio por confirmar") the cards use, with no invented price.

## Allowed files

`packages/os-catalog/src/browse.ts`, `packages/os-catalog/src/presentation.ts` (F2 display value only), their tests; `apps/os-web/components/catalog/**`, `apps/os-web/lib/catalog/**`, `apps/os-web/app/(app)/productos/**` and their tests; receipt `docs/operations/commercial-release/receipts/LANE-A-CATALOG-FIXES.md`; evidence `docs/operations/commercial-release/evidence/LANE-A-CATALOG-FIXES/**`.

Not in scope: the `automaticAnswerFields` PDF gate, package-boundary imports, breadcrumb resolution, shell F4/F5 (integrator), anything else in T05.

## Tests and evidence

- Unit tests per fix:
  - F1: accented, unaccented and uppercase queries return identical ids;
  - F2: rendered sheet text and accessible names contain no `packages/`, `.json` or `products[`;
  - F3: the sheet renders "Precio por confirmar" exactly once.
- os-catalog suite, os-web catalog tests, `npx tsc --noEmit -p .` for os-catalog and os-web. Counts reported separately. No full-suite rerun beyond these.
- Mutation evidence is optional. If you do it, apply committed patch files in a disposable copy, never by relocating a rejected script.
- Local browser recheck of F1–F3 on port 3210 with `isalwa_lanea_browser_disposable` and the `/login` "Entrar (desarrollo)" mechanism; screenshots outside the repo with sha256 in the receipt. This is a LOCAL BROWSER CHECK, never BROWSER-VERIFIED.

## Delivery

Bounded commits (one per fix plus the receipt). Then a stable snapshot report: SHA, tree, receipt path, checks, open dependencies. Stop after that.
