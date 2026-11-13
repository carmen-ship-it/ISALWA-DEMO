# Independent review packet — Lane B T10/T11 demo-mode removal (PRIORITY 1)

Prepared 2026-11-13 by the integrator. **The integrator is not the reviewer**, and neither is the lane B builder. A passing review plus local integration is the whole start gate for Lane B2 (T03 customer UI, `lanes/LANE-B-T03-CUSTOMER-UI.md`).

## Source pins (frozen; do not commit there)

| | |
|---|---|
| Candidate | `ct3/t10-demo-removal` @ `07e536eb3a53522bc217c5367bdf6310153022d6`, tree `0054f46bfd33411c5f8870940d09736f7b35251a` |
| Base | `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7`, tree `657408ff031f181f2c0b033a82653210fe5ef2d3` |
| Worktree (read-only for review) | `/Users/carmen/projects/isalwa-wt-t10-demo-removal` (3 path-only generated Prisma files modified, never committed) |
| Commits | `083cc7b2` separation · `31b5e02d` switch/banner/`datos` routing + middleware · `33a24503` DEMO filters/fixtures/prices · `7b4a92e9` Modo aprendizaje · `3eb31d86` last `datos` reader · `07e536eb` receipt/evidence |
| Size | 116 files, +1293 / −2420 |
| Integration target | `ct3/v1-repairs` @ `44958998caa778782a0b466b807510212d532f1d` |
| Source-only bundle (no history, no evidence) | `/Users/carmen/projects/isalwa-transfer-readiness/review-packets/lane-b-07e536eb-source.patch` (`git diff base..candidate -- apps`, sha256 `da0e8b4c0d5e0d1d94244e3de37ea04e2bbad46d615969e884a873e030503c64`) |

## Governing decisions

- `REUSE_MAP.md` §11 (owner decision 2026-10-16 17:58: remove artifact A, keep and update B), §11.0 (owner clarification 18:04, acceptance criteria (1)–(4)), §11.1 (entry points, substitutions, stored records), §11.3 (separate shared code first), §11.4 (T10/T11 row).
- `docs/product/COMMERCIAL_RELEASE_V2.md` T10/T11 rows: no jump to the legacy app; honest empty/error states.
- `receipts/REVIEW-R3.md` (organization only from membership; auth not edited) and `receipts/REVIEW-R4-JOURNEY.md` (Journey neutral; gate and filter deferred to this lane).
- Owner authorization 2026-10-18 21:22 (`LANES.md`): the narrow `lib/auth/organization-selection.test.ts` path correction and the `components/journey/**` changes are accepted file-ownership exceptions; independent review still required.
- Owner correction 2026-10-18 21:58 (`LANES.md` delivery §3): what counts as a LOCAL BROWSER CHECK.
- Instruction 2026-10-19 01:49 §5: this review plus local integration is Lane B2's only gate.

## Allowed scope

`lanes/LANE-B-T10-DEMO-REMOVAL.md` "Allowed files", the coordinated exceptions (`middleware.ts` demo imports and `datos`/cookie blocks only; `lib/workforce/labels.ts` import path only), the two 21:22 exceptions above, and "tests touching the above". Prohibited: integrator-owned paths in `LANES.md`, `lib/qa/**`, all lane A files, data deletion.

## Integrator pre-review checks (mechanical; not a review)

| Check | Result |
|---|---|
| Files outside the explicit allowed globs | 11, all tests: `lib/commercial/{opportunity-list-query,pedidos-index,quote-builder-hosted-corrective,quote-builder-usability}.test.ts`, `lib/executive/command-center.test.ts`, `lib/mobile/mobile-390-proof.test.ts`, `lib/operations/{ops-desks-phone,ops-desks-task9}.test.ts`, `lib/shell/{global-search-task10,greeting,shell-compact}.test.ts`. Confirm each only follows an allowed source change. |
| Overlap with lane A | none |
| Files also changed by the integrator since base | none |
| Textual merge into `44958998` (`git merge-tree --write-tree`) | clean, result tree `559e909ed4ebc5d1af16655cd73a82b41c3f3f58` |
| Imports of deleted files in the merged tree | none unresolved: 4 files remain under `lib/demo/` as no-op compatibility shims (`preserve-data-mode.ts` type `never`, returns `null`/href unchanged; `redirect-data-mode.ts`; `human-facing-copy.ts` re-export), still imported by ~20 files outside the lane |

## Known findings to verify (from the lane receipt and the pre-checks)

1. **Integrator-owned test edited** (`lib/auth/organization-selection.test.ts`): now reads `components/journey/journey-provider.tsx` instead of the deleted provider. Owner-accepted exception; confirm the assertion is equivalent or stricter.
2. **`app/(app)/entregas/page.tsx` still reads `?datos`** from the URL and passes it to child components (l.45, 53, 112, 122, 137, 145), outside the lane. Confirm it changes no data, mode, organization or link (owner acceptance (2)); otherwise it is an integrator fix before integration.
3. **`lib/commercial/actions.ts`** keeps a stale comment and calls the no-op `redirectKeepingDataMode` (outside the lane).
4. **Compatibility shims** under `lib/demo/` with ~20 out-of-lane importers: integrator follow-up to repoint them to `lib/copy/` and `lib/navigation/` and delete the shims. Confirm the shims can never reintroduce a mode.
5. **Tenant boundary claim** behind removing DEMO-name filters: SYNTH rows exist only in the SYNTH org, and lists are scoped to the session organization. Verify on the code paths for clientes, cotizaciones, oportunidades, pedidos, trabajo, compromisos, incidencias, mapa, inicio, almacén, producción and the four loaders.
6. **Removed fabrications:** finanzas in-memory 4.500,00 BOB payment, conversaciones fixture merge, quote `demoPrices`, almacén demo orders and "Ingreso PT" column, inicio team-table hiding. Confirm honest empty states replace them.
7. **Journey audience** is unchanged (`canUseRolePreview(grantedScopes)`) and `?story=1` opens only for that audience. Proven by unit tests only.
8. **Mutation evidence** (M1–M3+) was produced in the lane worktree with in-memory restore, not from committed patch files in a disposable copy. Treat it as supporting evidence only.
9. **No browser or visual check** was run. Browser evidence is still owed after integration (combined with B2).
10. **Stored SYNTH/owner-demo records** are listed, none deleted. Cleanup needs a separate owner decision.
11. Lane checks were os-web 1296/1296, tsc exit 0, and local `next build`, at source `3eb31d86`. Re-run on the merged result at integration.

## Reviewer output expected

A receipt `receipts/REVIEW-LANE-B-T10-07e536eb.md` with: reviewer identity and independence statement, pins reviewed, each finding above marked confirmed/refuted/blocking, new findings with file:line, and a verdict **PASS / PASS WITH FOLLOW-UPS / BLOCKING**. Blocking defects are fixed on a new branch from `07e536eb` (the candidate stays frozen), then re-reviewed. The integrator then merges into `ct3/v1-repairs`, runs os-web suite + tsc + `next build` on the merged tree, records the integration SHA, and creates `/Users/carmen/projects/isalwa-wt-t03-customer-ui` on `ct3/t03-customer-ui` from that SHA.
