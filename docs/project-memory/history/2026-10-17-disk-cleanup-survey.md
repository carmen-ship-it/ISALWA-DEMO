# 2026-10-17 00:47 — disk-cleanup survey (tool evidence, read-only)

Source: integrator survey in chat `6e146cf5` (request at verbatim L3600). Nothing was deleted. Inactive worktrees were identified by: no running process, no change after 2026-10-15, and handoff records that list them only as unmerged or do-not-merge branches. Excluded: the primary checkout and shared `.git`, `isalwa-wt-v1-repairs`, `isalwa-wt-t05-catalog`, `isalwa-wt-t10-demo-removal`, `isalwa-wt-t03-baseline`, and the evidence, handoff and source folders. Every candidate is git-ignored and untracked, has no multi-link files, and has no process or symlink referencing it. Each owning tree's lockfile is committed and unmodified. Restore with `pnpm install --frozen-lockfile` and then the package build.

Other findings:
- `.worktrees/ct3-journey-reproof` and `.worktrees/ct3-owner-demo` no longer exist.
- `.worktrees/wave2-visual-ops` has no `.git`; settle source preservation before touching it.
- `wave2-polish-a11y` has HEAD `0000…` (missing branch ref).

| KB | kind | path |
|---|---|---|
| 35000 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-database/dist` |
| 1660 | dir | `/Users/carmen/projects/isalwa-wt-v1-s2-reproof/packages/os-contracts/dist` |
| 1656 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-contracts/dist` |
| 1632 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-contracts/dist` |
| 1012 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/apps/os-api/dist` |
| 860 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-query/dist` |
| 756 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-query/dist` |
| 652 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-workforce/dist` |
| 572 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-workforce/dist` |
| 472 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/providers/dist` |
| 276 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-issue/dist` |
| 260 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-work/dist` |
| 252 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-read-fulfillment/dist` |
| 244 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-events/dist` |
| 236 | file | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/apps/os-web/tsconfig.tsbuildinfo` |
| 232 | file | `/Users/carmen/projects/isalwa/.worktrees/visual-commercial/apps/os-web/tsconfig.tsbuildinfo` |
| 220 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-import/dist` |
| 220 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-import/dist` |
| 212 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/ui/dist` |
| 212 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-party/dist` |
| 208 | file | `/Users/carmen/projects/isalwa/.worktrees/wave2-visual-map/apps/os-web/tsconfig.tsbuildinfo` |
| 204 | dir | `/Users/carmen/projects/isalwa-wt-v1-s2-reproof/packages/os-events/dist` |
| 188 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-delivery/dist` |
| 180 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-work/dist` |
| 180 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-events/dist` |
| 176 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-commercial/dist` |
| 164 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-commercial/dist` |
| 160 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-party/dist` |
| 132 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-finished-goods/dist` |
| 116 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-commitment/dist` |
| 116 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-commitment/dist` |
| 88 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-domain/dist` |
| 88 | dir | `/Users/carmen/projects/isalwa-wt-v1-s2-reproof/packages/os-domain/dist` |
| 88 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/os-domain/dist` |
| 64 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/os-request-session/dist` |
| 16 | dir | `/Users/carmen/projects/isalwa/.worktrees/wave2-remediation-integrate/packages/ts-utils/dist` |
| 16 | dir | `/Users/carmen/projects/isalwa-wt-v1-s2-reproof/packages/ts-utils/dist` |
| 16 | dir | `/Users/carmen/projects/isalwa-wt-v1-d1-reproof/packages/ts-utils/dist` |
| 0 | symlink | `/Users/carmen/projects/isalwa/.worktrees/ct3-oa4-conversations-durable/node_modules` |

Total: 48836 KB in 39 paths (about 47.7 MB).
