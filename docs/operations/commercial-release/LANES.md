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
