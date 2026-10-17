# Lane B — T10/T11 teacher/demo-mode removal

Worktree `/Users/carmen/projects/isalwa-wt-t10-demo-removal`, branch `ct3/t10-demo-removal`. Rules in `../LANES.md` apply. One writer.

## Scope (only this)

Exactly `REUSE_MAP.md` §11.0, §11.1, §11.3 and the T10/T11 row of §11.4, in this order:

1. **Separate shared code first (§11.3).** Split `OwnerDemoProvider`: presentation state (story open/close) stays for the Journey; data mode, cookies and company switch go. Story steps become data-agnostic (route + target over real screens; no seeded-id deep links, no forced `datos=demo`). Move generic helpers out of `lib/demo` before deleting it: `human-facing-copy.ts` (`presentHumanCopy`) and `samePathQueryNavigation` / `isNavigableAppHref` from `preserve-data-mode.ts`, to a neutral location (for example `lib/copy/` and `lib/navigation/`); rename `lib/conversations/demo-suggestion-rules.ts` / `demoRecommendedReplyFor` to neutral names (behavior unchanged). Rewire `walkthrough-help-panel.tsx` to the presentation context.
2. **Remove the full-app teacher/demo data mode (§11.0, §11.1):** DEMO/REAL switch, every-page banner, mode state (provider `dataMode`, `isalwa-demo-data-mode` cookie, `DEMO_DATA_MODE_STORAGE_KEY`, `isalwa-owner-effective-company` cookie reader/writer), routing (`?datos=demo|real`, `?story=1` forcing demo, `withStoryDemoDatos`, `preserve-explicit-data-mode`, `redirect-data-mode`), seeded-record deep links (`loadDemoSeedIdMap` in step hrefs), every fake-data substitution in §11.1 (finanzas in-memory payment, conversaciones fixture merge, quote `demoPrices`, almacén demo order list, inicio team-table hiding), the DEMO-name filters (`filterByDemoDataMode`) on the real lists in §11.1 after verifying the tenant boundary already excludes SYNTH rows, exclusive libs/fixtures and orphan components listed in §11.1.
3. **Remove the Ayuda "Modo aprendizaje" toggle** exactly as §11.0 describes (toggle, mount, `LEARNING_MODE_COPY`, `setLearningMode`, stored field ignored on read, targets, matching assertions replaced by "help panel no longer renders it").
4. **Keep:** the top Journey tab (`ver-ejemplo-completo-button.tsx`, `owner-story-mode.tsx`, `lib/demo/story-mode-steps.ts` content may move to a neutral path) with its **current audience preserved** (today `OwnerDemoProvider canUseOwnerDemo={showRolePreview}` in `app-shell.tsx`; keep the same `showRolePreview` predicate, without demo state); first-use welcome `components/walkthrough/*` + `lib/walkthrough/*` (except item 3); `lib/guidance/*`; isolated test fixtures (`setDemoSeedIdMapForTests` where still used, owner-demo guard tests); every real page and record. Journey content rewrite is T20, not here.

Not in this lane: any data deletion or SYNTH record cleanup (list only, §11.1 "Stored records"); `packages/os-database/src/owner-demo/**` and staging fixtures (integrator, untouched); API QA "Ver como" (`apps/os-api` qa controller/roster); legacy `apps/web`; T10 navigation/Cliente360/Hoy redesign; T11 inbox features; T20 walkthrough copy; the admin reassign panel copy.

## Source requirements

- `docs/operations/commercial-release/REUSE_MAP.md` §11 (l.252–301) — authoritative list of entry points, files and substitutions; owner acceptance criteria (1)–(4) in §11.0.
- `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md` "Owner decision 2026-10-16 17:58".
- `receipts/REVIEW-R3.md` (tenant selection from membership is already done; the SYNTH tenant switch in `lib/auth/actions.ts` is already gone — verify, do not edit auth) and `receipts/REVIEW-R4-JOURNEY.md` (Journey neutral; gate and data-mode filter deferred to this lane).
- V2 `docs/product/COMMERCIAL_RELEASE_V2.md` T10/T11 rows (l.271–272): no jump to the legacy app; honest empty/error states.

## Allowed files

- `apps/os-web/lib/demo/**`, `apps/os-web/components/demo/**` (delete/move).
- `apps/os-web/components/shell/**` (`app-shell.tsx`, `app-nav.tsx`, …).
- `apps/os-web/components/walkthrough/**`, `apps/os-web/lib/walkthrough/**` (item 3 and the provider rewire only).
- `apps/os-web/lib/conversations/**`, `apps/os-web/components/conversations/**` (demo fixtures, badge, rename only).
- `apps/os-web/lib/commercial/demo-starter-prices.ts` (delete), `apps/os-web/lib/commercial/starter-quote-products.ts` and its test (demo price references only), `apps/os-web/components/commercial/quote-product-picker.tsx`, `apps/os-web/components/commercial/quote-editor.tsx`, `apps/os-web/components/commercial/demo-preview-cards.tsx` (demo parts only).
- `apps/os-web/lib/management/demo-lens.ts`, `lib/audit/demo-coherence.ts`, `lib/warehouse/demo-fg-citations.ts`, `lib/postsale/load-pedidos.ts`, `lib/delivery/load-entregas.ts`, `lib/purchasing/load-linked-orders.ts`, `lib/finance/load-subject-options.ts` (demo filter removal only).
- Pages under `apps/os-web/app/(app)/` that carry demo code: `clientes/**`, `cotizaciones/**`, `oportunidades/**`, `pedidos/**`, `trabajo/**`, `compromisos/**`, `incidencias/**`, `mapa/**`, `inicio/**`, `almacen/**`, `produccion/**`, `finanzas/**`, `conversaciones/**`, `ayuda/**`, `layout.tsx` (only the `preserve-explicit-data-mode` mount) — demo removal only, no unrelated edits.
- New neutral helper locations (e.g. `apps/os-web/lib/copy/**`, `apps/os-web/lib/navigation/**`, `apps/os-web/lib/journey/**`) and the import-path updates in their importers within the allowed set.
- Tests touching the above; `docs/operations/commercial-release/receipts/LANE-B-T10-DEMO-REMOVAL.md`; `docs/operations/commercial-release/evidence/LANE-B-T10-DEMO-REMOVAL/**`.

**Coordinated exceptions (agreed, limited to these lines):**
- `apps/os-web/middleware.ts`: only the two demo imports (l.6–7) and the `?datos=` / demo-cookie blocks (l.42–50, l.69–80). You may expire the old demo cookies there. Do not change session, auth, redirect or public-path logic.
- `apps/os-web/lib/workforce/labels.ts`: only the `presentHumanCopy` import path.

## Prohibited (report a dependency instead)

Everything integrator-owned in `../LANES.md` (auth incl. `lib/auth/**`, workforce beyond the one import line, `administracion/**`, contracts, database, os-query, os-work, os-commercial, os-api, `packages/ui`, global styles, all `package.json`, lockfile, configs), `lib/qa/**`, and all lane A files: `apps/os-web/app/(app)/productos/**`, `components/catalog/**`, `lib/catalog/**`, `lib/production/load-catalog.ts`, `packages/os-catalog/**`.

## Tests and evidence

- os-web full suite (`node --import tsx --test --test-concurrency=1 "lib/**/*.test.ts" "components/**/*.test.ts" "components/**/*.test.tsx" "app/**/*.test.ts" "app/**/*.test.tsx"`) and `npx tsc --noEmit -p .`, both green; `next build` for os-web if feasible locally (report separately). Counts reported separately per check.
- Tests that assert demo behavior are replaced by tests asserting its absence; tests for Journey/onboarding/guidance stay green. Do not weaken unrelated tests.
- New tests prove owner acceptance (2): `?datos=demo`, `?datos=demo&story=1`, `?datos=real`, a stale `isalwa-demo-data-mode` cookie, a stale `isalwa-owner-effective-company` cookie and a stale localStorage key produce no demo state, no SYNTH organization, and no sample data (middleware unit test + provider/page-level tests); opening the Journey does not change data mode or organization; the Journey tab renders for the `showRolePreview` audience and not for others.
- Reference check in the receipt: `rg -n "datos=|DEMO_DATA_MODE|filterByDemoDataMode|owner-effective-company|demoPrices|DEMO_FICTITIOUS|LearningModeToggle|learningModeEnabled" apps/os-web` (excluding tests asserting absence) returns nothing; list of removed files and entry points.
- If an HTTP+PG check is needed: DB `isalwa_laneb_disposable` on `localhost:54329` (socket `/tmp`) only; os-api on port 4220; os-web dev on 3220.
- At least 3 mutation checks (re-add a `datos` reader, re-add a fixture merge, gate the Journey on demo state) each caught; `mutations.txt`.
- Optional local visual check on port 3220: LOCAL VISUAL CHECK only, never BROWSER-VERIFIED.

## Acceptance

Owner acceptance (1)–(4) from §11.0 shown by the tests above; removed-file list; reference check clean; stored records listed, none deleted; dependencies for integrator listed; stable snapshot report (SHA + tree); `git diff --name-only <base>..HEAD` contains only allowed files and the two coordinated-exception files.

## Bounded commits (suggested)

1. Separation (§11.3), no behavior change. 2. Mode/routing/cookies/switch/banner removal + middleware. 3. Substitutions and DEMO filters. 4. Modo aprendizaje. 5. Receipt + evidence.
