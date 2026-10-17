# Lane B — T10/T11 teacher/demo-mode removal

Branch `ct3/t10-demo-removal`, worktree `/Users/carmen/projects/isalwa-wt-t10-demo-removal`. Base `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7`. Scope: `REUSE_MAP.md` §11.0, §11.1, §11.3 and the T10/T11 row of §11.4, per `lanes/LANE-B-T10-DEMO-REMOVAL.md`.

State: **IMPLEMENTED + LOCALLY TESTED (os-web unit suite, tsc, local `next build`)**. Not integrated, deployed, hosted or browser-verified. No local visual check was run. Not independently reviewed.

## Commits

1. `083cc7b257252b3342dc29e067e24b0d17310799` — move shared copy and navigation helpers out of `lib/demo` (no behavior change).
2. `31b5e02dc9a047a7c7ee1e0b03ad2bf5d18771df` — remove the demo data switch, banner and `datos` routing; keep the Journey tab; middleware.
3. `33a24503ba2e3d0c7bb92ae10bc40887000beae1` — drop DEMO-name filters, demo fixtures and demo prices from real screens.
4. `7b4a92e9d3c731ed76f4788242f5762722275b22` — remove Modo aprendizaje.
5. `3eb31d8684e9f50dd2f9fa5349717a91fdb99aba` — drop the last `datos` reader (command palette) and guard URL `datos` readers.
6. This receipt and the evidence.

The three setup-generated Prisma files (`packages/os-database/src/generated/client/{edge,index,wasm}.js`) are modified in the worktree and are **not** committed.

## Behavior

**Owner acceptance (1): Journey tab accessible.**
- The top tab (`components/journey/ver-ejemplo-completo-button.tsx`) and its step panel (`components/journey/owner-story-mode.tsx`) are kept.
- They now use `JourneyProvider` (`components/journey/journey-provider.tsx`), which holds only `storyOpen`, `openStory`, `closeStory` and `canOpenJourney`.
- `app-shell.tsx` mounts `<JourneyProvider canOpenJourney={showRolePreview}>`. The tab renders under `{showRolePreview ? … : null}`, the same `canUseRolePreview(grantedScopes)` predicate as before, without demo state.
- `?story=1` opens the panel only when `canOpenJourney` is true. No other URL value is read.
- Story steps moved to `lib/journey/story-steps.ts`. `withStoryDemoDatos` is removed.
- Journey content is unchanged; the rewrite is T20.

**Owner acceptance (2): nothing reactivates the mode.**
- **Middleware.** `middleware.ts` no longer reads `?datos=` and no longer sets or pins a mode cookie or header. When the browser sends the old `isalwa-demo-data-mode` or `isalwa-owner-effective-company` cookies, they are expired, and only then (`lib/navigation/retired-data-mode.ts`). Session, auth, redirect and public-path logic are untouched.
- **Shell.** The shell clears the old localStorage key `isalwa.os-web.demo-data-mode.v1` on mount.
- **Navigation.** No nav link, breadcrumb, palette result, redirect or form carries `datos` any more. The command palette no longer re-runs on a `datos` change.
- **Removed entry points.** The DEMO/REAL switch, the every-page banner and `PreserveExplicitDataMode` are deleted.
- **Organization.** It still comes only from membership selection in `lib/auth/actions.ts` (R3). Verified that file has no SYNTH id, `datos` or data-mode reference; it was not edited.

**Owner acceptance (3): real screens use authorized data or honest empty, setup and error states.**
- The `filterByDemoDataMode` / `filterByPartyDemoMode` / DEMO-name filters are removed from: clientes, cotizaciones, oportunidades (+nueva), pedidos, trabajo, compromisos, incidencias (counts included), mapa, inicio, almacén, producción, and `lib/postsale/load-pedidos.ts`, `lib/delivery/load-entregas.ts`, `lib/purchasing/load-linked-orders.ts`, `lib/finance/load-subject-options.ts`.
- Tenant boundary verified before removal. SYNTH demo rows exist only in the SYNTH org (`assertOwnerDemoSynthOrg` refuses the REAL org), and lists are scoped to the session's organization. So removing the name filters does not surface SYNTH rows in a real tenant.
- Fabrications removed:
  - **Finanzas:** the in-memory 4.500,00 BOB "reported payment" and seeded order prefill.
  - **Conversaciones:** the fixture merge. The page now shows only recorded conversations for the organization, or an empty list.
  - **Quotes:** the `demoPrices` prefill. Starter products now prefill an empty unit price.
  - **Almacén:** the demo order list and the demo-only "Ingreso PT" column. Without the demo citation map that column could only show "Sin ingreso citado".
  - **Inicio:** the team-table hiding and the `?datos=demo` home link.
- The engineering-fixture filters (`isEngineeringFixtureCopy`) remain.

**Owner acceptance (4): real records intact.** No data was changed or deleted. Stored records are listed below.

**Modo aprendizaje removed.**
- Deleted: the toggle (`components/walkthrough/learning-mode-toggle.tsx`), its mount in `walkthrough-help-panel.tsx`, its export, `LEARNING_MODE_COPY`, `toggleLearningMode`/`setLearningMode` (progress, provider, index), and the targets `learning-mode` / `help-learning-mode`.
- The `learningModeEnabled` field is removed from `GuideRecord`. Old stored values are ignored on read and never written back.
- The "Modo aprendizaje" entry was dropped from `INTRO_COPY.ayuda.affordances`. That list feeds collected guide copy, and the entry named the removed control. No other walkthrough copy changed (T20).
- `lib/guidance/*` (including `LEARNING_MODE_LABELS` inline-help labels) is kept, as the lane requires.

## Removed files

- `components/demo/`: `demo-data-filter-toggle.tsx`, `demo-fictitious-banner.tsx`, `inicio-owner-demo-card.tsx`, `owner-demo-provider.tsx`, `preserve-explicit-data-mode.tsx`, `owner-story-mode.test.ts`.
- `lib/demo/`: `owner-demo-identity.ts`, `owner-demo-registry.ts`, `resolve-demo-data-mode.ts`, `owner-demo.test.ts`, `pf4-pdf-same-implementation.test.ts`. Their surviving assertions (story steps, PDF route proxy) moved to `lib/journey/story-steps.test.ts`.
- `components/commercial/demo-preview-cards.tsx` (orphan) and `lib/commercial/demo-starter-prices.ts`.
- `components/conversations/conversation-demo-badge.tsx` and its mounts; `DEMO_WHATSAPP_BADGE`/`BANNER` in `lib/conversations/model.ts`; the fixture registry and `DEMO_PROVIDER_CAPABILITY` in `lib/conversations/adapters.ts`.
- `lib/warehouse/demo-fg-citations.ts` (+ test), `lib/management/demo-lens.ts` (+ test), `lib/audit/demo-coherence.ts` (+ test).
- `components/walkthrough/learning-mode-toggle.tsx`.

## Moved or renamed (behavior unchanged)

- `lib/demo/human-facing-copy.ts` (+ test) moved to `lib/copy/human-facing-copy.ts`. The old path is a re-export kept for out-of-lane importers.
- `samePathQueryNavigation` and `isNavigableAppHref` moved to `lib/navigation/same-path-navigation.ts` (+ test).
- `lib/demo/story-mode-steps.ts` moved to `lib/journey/story-steps.ts`. `components/demo/owner-story-mode.tsx` and `ver-ejemplo-completo-button.tsx` moved to `components/journey/`.
- `lib/conversations/demo-suggestion-rules.ts` was renamed to `suggestion-rules.ts`, with matching symbol renames:
  - `matchSuggestionRules`
  - `suggestionRuleIds`
  - `SuggestionMatchInput`
  - `recommendedReplyFor`
- Test-only fixtures moved under `lib/conversations/__fixtures__/`: `sample-conversations.ts` (formerly `demo-fixtures.ts`), `conversations.json` and `seeded-ids.json`. A guard test fails if any production file imports them.
- `lib/demo/preserve-data-mode.ts` and `lib/demo/redirect-data-mode.ts` are now **no-op compat modules** for out-of-lane call sites: hrefs pass through unchanged, no mode is ever recognised, and no cookie, Referer or form field is read. A test asserts this.

## Tests

New:
- `lib/navigation/middleware-retired-data-mode.test.ts`. Real middleware in dev auth mode:
  - `?datos=demo`, `?datos=demo&story=1` and `?datos=real` set no mode cookie and pin no mode header. The redirect location carries no `datos`.
  - The stale `isalwa-demo-data-mode` and `isalwa-owner-effective-company` cookies are expired.
  - Absent cookies are not touched.
  - An unauthenticated `?datos=demo` request still goes to `/login`.
- `lib/navigation/retired-data-mode.test.ts`: the stale localStorage key is removed; only the cookies the browser sent are expired.
- `components/journey/journey-provider.test.tsx`:
  - The tab renders for the `showRolePreview` audience and renders nothing for others.
  - The shell uses the same predicate.
  - `?story=1` is honoured only for the audience, and `datos` is ignored.
  - The provider has no data-mode, cookie, storage or organization state.
- `lib/journey/story-steps.test.ts`: story steps link generic pages with no `datos`; the PDF route proxy test.
- `lib/navigation/retired-demo-mode-guard.test.ts`. A repo scan of non-test production files that fails when any of these appear:
  - a data-mode reader (`resolveDemoDataMode`, `filterByDemoDataMode`, `filterByPartyDemoMode`, `DATA_MODE_REQUEST_HEADER`, `x-isalwa-data-mode`, `DEMO_DATA_MODE_COOKIE`, `clientDataMode(`);
  - a new URL `datos` reader beyond the exact out-of-lane list under "Dependencies";
  - a `__fixtures__`/seed-json import;
  - a demo price;
  - the learning mode switch or field;
  - data-mode, storage or organization code in the Journey provider.
- `lib/walkthrough/guide.test.ts`: the learning-mode assertions are replaced by checks that the help panel no longer renders the switch, the toggle file is gone, and guide copy has no "Modo aprendizaje". A stored `learningModeEnabled: true` is ignored on read and not written back.

Retargeted from demo behavior to its absence:
- `lib/demo/preserve-data-mode.test.ts`
- `lib/commercial/{opportunity-list-query,pedidos-index,quote-builder-hosted-corrective,quote-builder-usability,starter-quote-products}.test.ts`
- `lib/conversations/{conversaciones-shell,conversation-context,model,smart-context}.test.ts`
- `lib/shell/{shell-compact,global-search-task10,greeting}.test.ts`
- `lib/executive/command-center.test.ts`
- `lib/mobile/mobile-390-proof.test.ts` and `lib/operations/ops-desks-phone.test.ts`: almacén asserts that the demo citation column is absent instead of `hideOnMobile`, because that column was the only phone-hidden one.
- `lib/operations/ops-desks-task9.test.ts`
- `lib/auth/organization-selection.test.ts` (see Dependencies)

## Checks (`apps/os-web`, source commit `3eb31d8684e9f50dd2f9fa5349717a91fdb99aba`)

- Full suite: 1296 tests, 1296 pass, 0 fail (baseline at `ce71f9a`: 1298/1298; the difference is deleted demo-only tests plus the new absence tests).
- `npx tsc --noEmit -p .`: exit 0, 0 errors.
- `npx next build`: exit 0 ("Compiled successfully"), reported separately; `.next` is gitignored and not committed.
- `@isalwa/ui` had to be built locally (`packages/ui` dist) before tsc and tests could run. That is a worktree setup step and nothing was committed.

## Mutation checks (`evidence/LANE-B-T10-DEMO-REMOVAL/mutations.txt`)

| Mutation | Caught by |
|---|---|
| M1 middleware pins `?datos=` into the mode cookie | middleware-retired-data-mode: 3 fail |
| M2 a real page (inicio) reads `params.datos` again | retired-demo-mode-guard: 1 fail |
| M3 conversations adapter merges the test fixtures again | retired-demo-mode-guard: 1 fail |
| M4 Journey `?story=1` gated on `datos=demo` | journey-provider + guard: 3 fail |
| M5 Journey audience widened to every viewer | journey-provider: 1 fail |
| M6 stored `learningModeEnabled` restored on read | guide + guard: 2 fail |
| M7 DEMO-name filter re-added on oportunidades | opportunity-list-query + guard: 2 fail |

M2 was first **not caught**. The guard was then extended to URL `datos` readers, which also exposed and removed the command-palette reader (commit 5). Each source file was restored after each run, and `git status` showed no residue.

## Reference check

`rg -n "datos=|DEMO_DATA_MODE|filterByDemoDataMode|owner-effective-company|demoPrices|DEMO_FICTITIOUS|LearningModeToggle|learningModeEnabled" apps/os-web` at commit 5. All test-file hits assert absence, except two out-of-lane tests noted below. The non-test hits are:

- `lib/navigation/retired-data-mode.ts:7` names the `isalwa-owner-effective-company` cookie only to expire it. This is the allowed exception.
- `app/(app)/entregas/page.tsx:112,122` passes `datos` through (out of lane; dependency).
- `lib/commercial/actions.ts:41` is a stale doc comment above the no-op `redirectKeepingDataMode` call (out of lane; dependency).

Out-of-lane tests that still use `datos=demo` as an ordinary query value, not as a mode:
- `lib/lists/task11c-operations-scale.test.ts:69` (ops pagination keeps extras);
- `lib/navigation/shell-polish.test.ts:194,203` (nav active state ignores unrelated query).

They pass, and they will change when the integrator drops `datos` from `lib/lists/ops-collection.ts`.

No hit for `DEMO_DATA_MODE`, `filterByDemoDataMode`, `demoPrices`, `DEMO_FICTITIOUS`, `LearningModeToggle` or `learningModeEnabled` exists in any non-test file.

## Changed-file scope

`git diff --name-only ce71f9a..HEAD` contains only lane B allowed paths, the two coordinated-exception files (`middleware.ts`: demo import and the `datos`/cookie blocks only; `lib/workforce/labels.ts`: the `presentHumanCopy` import path only), and one integrator-owned test (`lib/auth/organization-selection.test.ts`, below).

## Stored records (listed, none deleted)

- `packages/os-database/src/owner-demo/seed.ts` (`fixture:owner-demo`, staging-only, `STAGING_FIXTURE_CONFIRM=1`): 5 DEMO customers with their opportunity, quote, order, delivery, FG, work, commitment and conversation rows in the SYNTH org. It writes `apps/os-web/lib/demo/seeded-ids.json`, and that path is no longer read by os-web.
- `packages/os-database/src/owner-demo/seed-journey-customer.ts` ("DEMO TALLER SAN LORENZO").
- Staging grants `staging-carmen-synth-demo-*.ts` and `staging-carmen-owner-evaluation-grant.ts`.

Any cleanup requires a separate owner decision with per-record provenance.

## Dependencies for integrator (not edited here)

1. **`apps/os-web/lib/auth/organization-selection.test.ts`** (integrator-owned) was edited in commit 2. The "Journey never changes organization or data mode" test read `components/demo/owner-demo-provider.tsx`, which this lane deletes. It now reads `components/journey/journey-provider.tsx`, with the same intent and a stricter pattern. Approve or rewrite it. Without the edit the suite fails with ENOENT.
2. **`presentHumanCopy` importers**: repoint to `@/lib/copy/human-facing-copy` and delete `lib/demo/human-facing-copy.ts`. Files:
   - `lib/shell/command-palette.ts`, `lib/shell/command-search.ts`
   - `lib/productivity/actions.ts`, `lib/inicio/today-queue.ts`
   - `lib/work/staff-subject.ts`, `lib/work/member-resolver.ts`
   - `lib/delivery/display-labels.ts`
   - `components/warehouse/warehouse-desk.tsx`, `components/inicio/inicio-command-queue-sections.tsx`
   - `components/issue/incidencias-desk-panel.tsx`, `components/issue/issue-list.tsx`
   - `components/party/party-list.tsx`, `components/commitments/commitment-list.tsx`, `components/postsale/pedido-handoff-panel.tsx`
   - `components/commercial/opportunity-list.tsx`, `opportunity-org-list.tsx`, `order-prep-work.ts`
   - `app/(app)/compras/page.tsx`
3. **No-op data-mode call sites**: remove them and delete `lib/demo/preserve-data-mode.ts` and `lib/demo/redirect-data-mode.ts`.
   - `hrefWithClientDataMode` in `components/commercial/{commercial-approval-panel,quote-create-form,convert-quote-form,opportunity-create-form}.tsx`, `components/party/customer-create-form.tsx` and `components/issue/report-issue-drawer.tsx`.
   - `redirectKeepingDataMode` in `lib/commercial/actions.ts` (and its stale comment at l.41) and `lib/party/actions.ts`.
   - `explicitDataMode`/`withExplicitDataMode` and the `datos` parameter of `clienteSectionHref` in `lib/commercial/navigation.ts`.
   - `explicitDataMode(params.get('datos'))` in `components/cliente/cliente-360-nav.tsx`. It also imports `samePathQueryNavigation` from the shim; repoint that to `@/lib/navigation/same-path-navigation`.
4. **Ops `datos` pass-through**: `app/(app)/entregas/page.tsx` (`datos` param, prop and hidden input), `components/delivery/entrega-operational-write-desk.tsx` (`datos` prop and hidden input), and `lib/lists/ops-collection.ts` (`OpsExtraParams.datos`). Then update the exact list in `lib/navigation/retired-demo-mode-guard.test.ts` and the two out-of-lane tests named under the reference check.
5. **Dead props and styles**:
   - `dataModeLabel` in `components/commercial/quote-create-form.tsx` (no caller passes it now).
   - `dataMode` in `components/map/map-experience.tsx` (no longer passed; defaults to `'real'`; `data-demo-data-mode` / `data-map-demo-boundary` attributes).
   - `[data-shell-demo-toggle]` / `[data-shell-demo-banner*]` selectors in `styles/shell-compact.css`.
6. **Seed output path**: `packages/os-database/src/owner-demo/seed.ts` still writes `apps/os-web/lib/demo/seeded-ids.json`, which nothing reads now. Decide whether to keep the seed output.
7. **Conversation model leftovers (T11/T13)**: `isDemo`, the `'demo_fixture'` source kind, provider id `'demo'`, and "Demo" wording in suggestion types and cards (`lib/conversations/{model,adapters,project-manual,build-context-panel,suggestion-rules,suggestion-types,search}.ts`, `components/conversations/suggestion-card.tsx`). This lane was limited to fixtures, badge and rename. No production path creates such rows any more.

## Not done here (by scope)

Journey content rewrite (T20); any data deletion or SYNTH cleanup; `packages/os-database/src/owner-demo/**`; API QA "Ver como"; legacy `apps/web`; no push, merge, deploy, or hosted/browser verification.

Evidence: `evidence/LANE-B-T10-DEMO-REMOVAL/`: `os-web-suite.txt`, `os-web-tsc.txt`, `os-web-next-build.txt`, `mutations.txt`, `tested-source-manifest.sha256`.
