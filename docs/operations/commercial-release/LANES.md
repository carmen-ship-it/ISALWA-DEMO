# Isolated implementation lanes (authorized 2026-10-16 23:39)

One writer per isolated worktree. The integrator worktree `/Users/carmen/projects/isalwa-wt-v1-repairs` (branch `ct3/v1-repairs`) is the only place lanes are merged, serially, with conflicts resolved and the combined result tested before a parent task is marked complete. Lanes do not merge themselves. Claude reviews a stable lane snapshot (commit SHA + tree) before integration.

Local only: no push, deploy, real data change, external activation, or transfer of branch history. The branch carries restricted evidence (`evidence/REVIEW-R1/UNREVIEWED-NOT-FOR-TRANSFER.md`): lanes never copy, quote or package any file under `docs/operations/commercial-release/evidence/REVIEW-R1/` and never export branch history.

Base for both lanes: the commit that adds this file (on top of `36e1d10`, R4 ReassignWork). Base contains every committed R1–R4 repair; R4 part B repairs 2 and 3 are not needed by either lane.

| Lane | Worktree | Branch | Assignment |
|---|---|---|---|
| A — T05 catalog reconciliation and product presentation | `/Users/carmen/projects/isalwa-wt-t05-catalog` | `ct3/t05-catalog` | `lanes/LANE-A-T05-CATALOG.md` |
| B — T10/T11 teacher/demo-mode removal | `/Users/carmen/projects/isalwa-wt-t10-demo-removal` | `ct3/t10-demo-removal` | `lanes/LANE-B-T10-DEMO-REMOVAL.md` |

## Ownership

Integrator-owned (lanes report a dependency, never edit): auth and session (`apps/os-web/lib/auth/**`, `apps/os-web/middleware.ts` session parts, `apps/os-api/src/os-session*`, `trusted-member-context*`), workforce (`packages/os-workforce/**`, `apps/os-web/lib/workforce/**`, `app/(app)/administracion/**`), `packages/os-contracts/**`, `packages/os-database/**` (schema, migrations, generated client, stores), `packages/os-query/**`, `packages/os-work/**`, `packages/os-commercial/**`, `apps/os-api/**`, `packages/ui/**` and tokens, global styles (`apps/os-web/app/globals.css`, `app/layout.tsx`), every `package.json`, `pnpm-lock.yaml`, tsconfig/next/eslint config, and these shared records: `COMMERCIAL_RELEASE_CHECKPOINT.md`, `REVIEW_RECONCILIATION.md`, `REUSE_MAP.md`, `LANES.md`.

Lane A and lane B file sets are disjoint (listed in each assignment). Files neither lane lists are integrator-owned.

Integrator's own concurrent work stays outside both lane sets: R4 part B repair 2 (`organization_member` approvals: os-query/os-api), repair 3 (F07 commitments: os-api/os-query). If repair 3 needs `app/(app)/compromisos/page.tsx`, the integrator waits for lane B's snapshot and applies it at integration.

## Isolation

| Resource | Integrator | Lane A | Lane B |
|---|---|---|---|
| os-web dev port | 3200 | 3210 | 3220 |
| os-api dev port | default | not used | 4220 if needed |
| Postgres | `isalwa_t01_disposable` @ `localhost:54329` (socket `/tmp`) | none (report if needed) | `isalwa_laneb_disposable` @ `localhost:54329` (socket `/tmp`) |
| Build outputs (`dist`, `.next`, `tsconfig.tsbuildinfo`) | own worktree | own worktree, never committed | own worktree, never committed |

Never: port 5432, `/tmp:5432`, the staging database, `pnpm install` without `--frozen-lockfile`, `prisma format`, `prisma migrate`, reset/stash/clean, force operations, `rm -rf` of a worktree.

## Lane delivery (each lane)

1. Bounded commits with conventional messages, in the lane branch only.
2. Receipt `docs/operations/commercial-release/receipts/LANE-<A|B>-….md` and evidence `docs/operations/commercial-release/evidence/LANE-<A|B>-…/` (allowlisted output only: ✔/✖/ℹ lines, exit codes, sha256 manifests; no env values, tokens, headers or personal data).
3. States kept separate: IMPLEMENTED, LOCALLY TESTED; never INTEGRATED/DEPLOYED/BROWSER-VERIFIED by the lane.
4. A stable snapshot report: full commit SHA, tree, receipt path, checks run, open dependencies. Then stop or take the next item in the same assignment.
5. Shared change needed → write it under "Dependencies for integrator" in the receipt with the exact file and the reason; do not edit the file or build an alternative.

## Lane status

### Lane A — snapshot `18a0f0c25dd93d6916288261d993ccf4a3c0e355` (tree `6632eda4446df12680361cf6df38ffe812d3fda8`)

Scope: bounded catalog data/presentation delivery (receipt `receipts/LANE-A-T05-CATALOG.md`), **not** complete T05. States: IMPLEMENTED, LOCALLY TESTED (lane). **Not independently reviewed. Not integrated. Not browser-verified.** Lane A is finished (00:12); no further implementation work is assigned to it.

Supplemental disclosure: `c8724702189b5626facae3ee6f8eb317e1228648` (docs only; `evidence/LANE-A-T05-CATALOG/SUPPLEMENTAL-RECEIPT-1.md`). The implementation candidate stays `18a0f0c`.

**Mutation result (5/5 caught, `evidence/LANE-A-T05-CATALOG/mutations.txt`): UNVERIFIED.** The lane ran an unchanged script after a specific automatic rejection, by relocating it. That execution is not acceptance evidence. The script is not retried or relocated again. If mutation evidence becomes necessary, it needs a new, inspectable method (mutations committed as reviewable patch files, applied in a disposable copy rather than the lane worktree, through the normal approval process). Mutation testing is supporting evidence only.

Integrator source check after the mutation operation (read-only, 00:1x):

| Check | Result |
|---|---|
| `git diff c872470 18a0f0c` outside `docs/` | empty: the disclosure commit changes no source |
| Lane worktree vs `c872470` | only the 3 path-only generated Prisma files differ; no other tracked change; the untracked script copy (`.lane-a-local/`) is gone |
| `tested-source-manifest.sha256` (19 entries) vs committed blobs at `18a0f0c` | 19/19 match; every non-doc file changed in `ce71f9a..18a0f0c` is in the manifest |
| Ordinary checks re-run by the integrator on that committed source | os-catalog 27/27, os-web 1311/1311, typecheck os-catalog exit 0, typecheck os-web exit 0; source hashes, `git status` and the index identical before and after the run |

Integrator pre-integration check (read-only, 2026-10-17 00:1x):

| Check | Result |
|---|---|
| Changed files vs lane A allowed set (`ce71f9a..18a0f0c`, 3 commits) | All inside the lane set; no lane B or integrator-owned file touched. |
| Uncommitted generated Prisma client (`packages/os-database/src/generated/client/{edge,index,wasm}.js`) | Present in the lane worktree, path-only. Excluded: never integrated. |
| Route auth/tenant | `/productos` and `/productos/[productId]` are behind the session middleware (not in `PUBLIC_PATHS`). They read only the shared reviewed reference JSON; no tenant price, publication or customer data. Shared reference data stays distinct from tenant data. Tenant price lists/publication remain T05 integrator work. |
| Package boundary | **Required change.** os-web imports `packages/os-catalog/src/*` and `packages/os-contracts/src/product-catalog` by relative path (`components/catalog/*`, `lib/catalog/*`). Integration declares `"@isalwa/os-catalog": "workspace:*"` in `apps/os-web/package.json` (+ lockfile importer entry, frozen install) and switches imports to `@isalwa/os-catalog` / `@isalwa/os-contracts` public exports (adding `presentation`, `reconciliation` exports to `packages/os-catalog/src/index.ts` as needed). Relative imports are not kept. |
| Breadcrumb | **Required change.** The shell trail (`lib/navigation/breadcrumbs.ts`, shared/integrator-owned) shows the raw `productId` segment for `/productos/<id>`. Integration resolves it to the authorized product name (or the generic label when unresolved), never the raw ID. |
| PDF-unverified content and automatic answers | **Required change (lane A file `packages/os-catalog/src/presentation.ts`).** `automaticAnswerFields` filters per-field eligibility but does not gate on `sheet.pdfCheck.status`; it must return nothing while the PDF check is not verified. No consumer exists yet, so no current exposure. JSON page references are inherited claims pending PDF verification. |
| Catalog PDF | Transfer dependency. Repo-only reconciliation stays labelled incomplete; no invented specs, page numbers or prices. |

Before integration: Claude targeted review of exactly `18a0f0c`; the `automaticAnswerFields` PDF gate applied (required change, not yet assigned; lane A receives no new work until directed); integrator recheck of changed interfaces and permissions against the integrator branch head.

Remaining T05 items (assigned, integrator-owned, not built by lane A): DB-backed catalog (`OsCatalogProduct`, aliases), approved price lists (`OsPriceList`/`OsPriceEntry`), knowledge publication and AI published-only filtering through `automaticAnswerFields`, "Agregar a cotización", "Compartir catálogo", navigation entry.

UI acceptance additionally requires browser verification: list, detail, search/filter, alias redirects, breadcrumbs, pending-source labels, access control, mobile layout. The plan is `browser/LANE-A-CATALOG-BROWSER.md`: isolated disposable database and API, lane ports, and the existing `/login` "Entrar (desarrollo)" mechanism; no production targets, shared sessions or auth bypass. Status: **PENDING**.

### Lane B

Interim: keeps the Journey's current audience. Final role-appropriate Journey visibility is tracked for the main UI task.
