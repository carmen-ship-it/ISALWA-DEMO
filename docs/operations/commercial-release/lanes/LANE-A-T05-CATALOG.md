# Lane A — T05 catalog reconciliation and product presentation

Worktree `/Users/carmen/projects/isalwa-wt-t05-catalog`, branch `ct3/t05-catalog`. Rules in `../LANES.md` apply. One writer.

## Scope (only this)

1. **Reconcile the two existing product lists into one catalog with stable ids.** Sources in the repo: `packages/os-catalog/preview/vitri-2026-reviewed.json` (25 reviewed candidates, "preview25") and `apps/os-web/lib/commercial/starter-quote-products.ts` (`STARTER_QUOTE_PRODUCTS`, 21 entries, "starter21"). Produce, in `packages/os-catalog`, an explicit mapping: each starter key → catalog id, or "no catalog match" with reason. Do not infer that the 25 are 25 distinct SKUs; keep historical keys as explicit aliases; never delete a historical key; contradictions recorded as pending, not resolved by guess.
2. **Provenance per value:** every presented field carries its source (file and page/section where the source has it). Fields with inconsistent sources show "Especificación pendiente de revisión" and are flagged as excluded from automatic answers.
3. **`/productos` presentation per V2 §5.5:** title "Catálogo"; search "Buscar producto o modelo"; filters by recovered categories and active; cards with photo (only if an approved image exists, else none), name, category, approved variants/condition, "Ver ficha"; price only when an approved list/context exists, otherwise "Precio por confirmar" (none exist today, so every card shows "Precio por confirmar"); never a historical transaction as a current price; never cost or margin. Ficha (detail) with description, measures with units, confirmed compatibility, condition, source/page and review date. Reuse `@isalwa/ui` primitives (`PageContainer`, `Panel`, `Chip`, `SearchField`, `EmptyPanel`, `StatusPill`, …) and the existing `PageHeader`; no new visual language.

Not in this lane (integrator, later): "Agregar a cotización" from the catalog and any quote-editor/picker change; DB-backed catalog (`OsCatalogProduct`), price lists (`OsPriceList`/`OsPriceEntry`), knowledge draft/publish, payment instructions, new scopes (`commercial.knowledge.publish`, …), os-api endpoints, AI "published only" wiring, "Compartir catálogo", navigation/menu.

## Source requirements

- `docs/product/COMMERCIAL_RELEASE_V2.md` §5.5 (l.107–117) and T05 row (l.266, l.471).
- `docs/operations/commercial-release/REUSE_MAP.md` rows for Catalog/Price list/`/productos` (l.17–18, l.84).
- Transfer note `/Users/carmen/projects/isalwa-handoff/ISALWA_ENGINEERING_TAKEOVER_20261016_TRANSFER/originals/O06_PRODUCT_SERVICE_CATALOG_TRUTH_DISCOVERY.md` (read-only).
- **Input blocker (DATA_CONFIRMATION_REQUIRED):** `CatalogoVitriCompleto2026.pdf` is not present locally (not in the transfer folder). Reconcile against the reviewed JSON and record "PDF check pending" per item; do not invent page numbers. Unblock: Carmen provides the PDF path.

## Allowed files

- `packages/os-catalog/src/**` (new files allowed) and `packages/os-catalog/preview/**` (additive: new reconciliation/alias files; do not rewrite reviewed values without a recorded reason).
- `apps/os-web/app/(app)/productos/**` (new subroutes such as a ficha page allowed).
- `apps/os-web/components/catalog/**`.
- `apps/os-web/lib/catalog/**` (new).
- `apps/os-web/lib/production/load-catalog.ts`: only with its exported names and signatures unchanged (it is used by `produccion/page.tsx`, which belongs to lane B).
- New tests under the paths above; `docs/operations/commercial-release/receipts/LANE-A-T05-CATALOG.md`; `docs/operations/commercial-release/evidence/LANE-A-T05-CATALOG/**`.

## Prohibited (report a dependency instead)

Everything integrator-owned in `../LANES.md`, plus all lane B files: `apps/os-web/lib/commercial/**` (including `starter-quote-products.ts`, `demo-starter-prices.ts` — read only), `components/commercial/**` (quote editor, `quote-product-picker.tsx`), `lib/demo/**`, `components/demo/**`, `components/shell/**`, `middleware.ts`, every `app/(app)/**` page other than `productos`, `lib/work/visual-depth.test.ts`. No `package.json`/lockfile change: if `apps/os-web` needs a declared dependency on `@isalwa/os-catalog`, report it.

## Tests and evidence

- `cd packages/os-catalog && pnpm run build && node --import tsx --test --test-concurrency=1 "src/**/*.test.ts"`; `npx tsc --noEmit -p .`.
- os-web: full suite (`node --import tsx --test --test-concurrency=1 "lib/**/*.test.ts" "components/**/*.test.ts" "components/**/*.test.tsx" "app/**/*.test.ts" "app/**/*.test.tsx"`) and `npx tsc --noEmit -p .`, both green; report counts separately.
- New tests prove: every starter key maps or is explicitly unmatched; aliases resolve to the stable id; no historical key lost; every card without an approved price renders "Precio por confirmar"; no field renders without provenance; inconsistent fields render the pending label; no cost/margin field reachable; `/productos` empty/missing-file state is honest.
- At least 3 mutation checks (break mapping, drop a provenance, show a price without approval) each caught; record in `mutations.txt`.
- Optional local visual check on port 3210 (390px and 1440px, keyboard reachable, no horizontal scroll): screenshots stay local; report as LOCAL VISUAL CHECK, never BROWSER-VERIFIED.

## Acceptance

All items in Scope implemented with the tests above green, receipt listing mapping table summary (counts: matched, alias, unmatched, pending contradictions), the PDF blocker stated, dependencies for integrator listed, and a stable snapshot report (SHA + tree). No file outside "Allowed files" changed (`git diff --name-only <base>..HEAD` in the receipt).
