# Independent review packet — Lane A T05 catalog presentation (PRIORITY 2)

Prepared 2026-11-13 by the integrator. **The integrator is not the reviewer**, and neither is the lane A builder. Scope is the bounded catalog data and presentation delivery, **not** complete T05.

## Source pins (frozen; do not commit there)

| | |
|---|---|
| Implementation candidate | `ct3/t05-catalog` @ `18a0f0c25dd93d6916288261d993ccf4a3c0e355`, tree `6632eda4446df12680361cf6df38ffe812d3fda8` |
| Disclosure (docs only) | `c8724702189b5626facae3ee6f8eb317e1228648`, tree `a0dd224a89658d98eb6d8f7e606b8851c58b0063`. Adds only `evidence/LANE-A-T05-CATALOG/SUPPLEMENTAL-RECEIPT-1.md`; `git diff 18a0f0c c872470` outside `docs/` is empty |
| Base | `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7` |
| Worktree (read-only for review) | `/Users/carmen/projects/isalwa-wt-t05-catalog` (3 path-only generated Prisma files modified, never committed) |
| Commits | `346bea05` reconcile preview25 with starter21 + sourced presentation · `5bdd4c6b` catalog page and product sheet · `18a0f0c2` receipt/evidence · `c8724702` disclosure |
| Size | 27 files, +4075 / −307 (code: 11 under `apps/os-web`, 7 under `packages/os-catalog`) |
| Integration target | `ct3/v1-repairs` @ `44958998caa778782a0b466b807510212d532f1d` |
| Source-only bundle | `/Users/carmen/projects/isalwa-transfer-readiness/review-packets/lane-a-18a0f0c-source.patch` (`-- apps packages`, sha256 `4ac04eb8746f3abf65040c3172f31bef0428fe7d284b1e56fb2eb11b14947d7c`) |

## Governing decisions

- `docs/product/COMMERCIAL_RELEASE_V2.md` §5.5 (l.107–117) and T05 rows (l.266, l.471).
- `REUSE_MAP.md` rows for Catalog / Price list / `/productos` (l.17–18, l.84).
- Transfer note `O06_PRODUCT_SERVICE_CATALOG_TRUTH_DISCOVERY.md` (read-only, takeover package).
- `lanes/LANE-A-T05-CATALOG.md` (assignment, input blocker DATA_CONFIRMATION_REQUIRED on the catalog PDF).
- `LANES.md` Lane A status: finished 00:12; mutation result UNVERIFIED (auto-review incident, not to be retried by relocation); integrator source check and pre-integration requirements.
- Owner 2026-10-17 01:36 §C, local browser check: `browser/LANE-A-CATALOG-BROWSER.md`.
- 2026-10-18: follow-up fixes F1–F3 assigned to lane A2 (`lanes/LANE-A-CATALOG-FIXES.md`). **Not implemented**: `ct3/t05-catalog-fixes` is still at the base `c8724702`.

## Allowed scope

`lanes/LANE-A-T05-CATALOG.md` "Allowed files": `packages/os-catalog/src/**`, `packages/os-catalog/preview/**` (additive), `apps/os-web/app/(app)/productos/**`, `components/catalog/**`, `lib/catalog/**`, `lib/production/load-catalog.ts` (exports unchanged), tests, receipt and evidence. Integrator pre-check 2026-10-17: all 27 changed files are inside this set.

## Integrator pre-review checks (mechanical; not a review)

| Check | Result |
|---|---|
| Textual merge into `44958998` | clean, result tree `64f8640d12eb687466bad488e51176472f394320` |
| Overlap with lane B | none |
| Tested-source manifest (19 entries) vs blobs at `18a0f0c` | 19/19 match (2026-10-17) |
| Integrator re-run on committed source (2026-10-17) | os-catalog 27/27, os-web 1311/1311, typecheck os-catalog and os-web exit 0 |

## Known findings to verify

1. **Package boundary (required change):** os-web imports `packages/os-catalog/src/*` and `packages/os-contracts/src/product-catalog` by relative path. Integration declares `@isalwa/os-catalog` in `apps/os-web/package.json`, updates the lockfile with a frozen install, and uses public exports. Integrator-owned.
2. **Breadcrumb (required change):** the shell trail shows the raw `productId`. Integration resolves it to the authorized product name or a generic label. Integrator-owned.
3. **Automatic-answer gate (required change, `presentation.ts`):** `automaticAnswerFields` does not gate on `sheet.pdfCheck.status`. It must return nothing while the PDF check is unverified or the content is unpublished. No consumer exists yet.
4. **Browser findings (2026-10-17, local, synthetic admin):** F1 accent-sensitive search; F2 internal repository paths shown as sources on the ficha; F3 no price statement on the ficha. Assigned to A2, not done. F4 hydration mismatch and F5 clipped mobile top bar are shell issues for the integrator. Role-specific access and the "Solo activos" effect are unproven.
5. **Mutation evidence UNVERIFIED** (script relocated after an automatic rejection). It is not acceptance evidence. If needed, use a new inspectable method (committed patch files applied in a disposable copy).
6. **Catalog PDF missing:** `CatalogoVitriCompleto2026.pdf` (expected sha256 `4de2f923…c25b0`) is not on this Mac (`isalwa-source/2026-09-14-vitri-catalog-pricing/` is empty). JSON page references are inherited claims pending PDF verification. No invented specs, pages or prices.
7. **Route access:** `/productos` and `/productos/[productId]` sit behind the session middleware and read only the shared reviewed JSON (no tenant price, publication or customer data). Verify.
8. **Pricing:** every card and sheet must show "Precio por confirmar" and never a historical transaction, cost or margin.

## Reviewer output expected

`receipts/REVIEW-LANE-A-T05-18a0f0c.md`: reviewer identity and independence, pins, each finding confirmed/refuted/blocking, new findings with file:line, verdict. Integration additionally needs the three required changes (1–3). F1–F3 can land through A2 before or after integration, per owner choice; the catalog stays labelled incomplete until the PDF is supplied.
