# T03 failing-test baseline comparison (2026-10-16)

Method: isolated review copy `git worktree add --detach /Users/carmen/projects/isalwa-wt-t03-baseline 4934a09` (exact parent of T03 part 1 `3183c36`). Same lockfile (`pnpm install --frozen-lockfile --offline`, no lockfile change), same package build set (`@isalwa/os-api^...`, `@isalwa/os-pedido-case^...`, `@isalwa/os-domain^...`, `@isalwa/domain...`), same disposable Postgres (`54329/isalwa_t01_disposable`), same machine clock and TZ, suites run back to back by `/tmp/t03-compare.sh`. The active writer was not reverted.

Logs: `isalwa-wt-t03-baseline.*.log.txt` vs `isalwa-wt-v1-repairs.*.log.txt`; failing names: `*.fail`. The failing sets are identical by name in both copies (diff empty). No T03 regression.

`os-pedido-case` (2 files) and `packages/database` (1 file) pass in both copies once their dependency packages are built: the earlier failures were missing `dist` (environment), not tests.

| # | Test (file) | Cause | Class | Approved rule | Fix |
|---|---|---|---|---|---|
| 1 | effective roles respect asOf (`os-domain/src/authorization.test.ts`) | expects title labels `sales_rep`/`sales_manager` as scopes | Outdated test | V2 §scopes "Ningún permiso conferido por Cargo"; commit `6b29ab3`; `os-contracts/src/grant-scopes.test.ts` asserts both titles are non-grants | Same date windows with recognized scopes (ended, active, future) + an active title row asserted absent |
| 2 | expired delegation excluded (same file) | role `sales_rep` expected as scope | Outdated test | same | recognized scope; expired delegation still excluded |
| 3 | keeps an active additional grant… (`os-domain/src/trusted-member-context.test.ts`) | expects `sales_rep` label and a delegated `coordination.decision.record` | Outdated test | `6b29ab3`: only `DELEGABLE_SCOPE_KEYS` are delegable (approval.act, people.admin, master_data.admin, fiscal.admin, org.admin) | delegable `approval.act` delegation kept; non-delegable coordination delegation and title asserted absent; ended/foreign rows still dropped |
| 4 | omits a role row … session org (`os-query/src/query-context.tenant.test.ts`) | expects `sales_rep` label; foreign row was a label, so its omission proved nothing | Outdated test | same | session row = `commercial.team.read`, foreign row = real scope `commercial.org.read` (omission now meaningful), title row asserted absent |
| 5–9 | GrantDelegation/RevokeDelegation atomic (workforce-admin-mutation-api), RevokeDelegation atomic (workforce-transaction), approval flow with delegation (work-prisma), suspended delegate (suspend-open-work-lifecycle), expired delegation (approval-security-prisma) | grantor holds only `people.admin` but delegates `approval.act` → `PERMISSION_DENIED` | Outdated fixtures | `6b29ab3`: a delegator may delegate only a recognized scope they hold (`assertScopesDelegable`, unit-proven in `workforce-delegation-escalation.test.ts`) | grantor receives an explicit `approval.act` assignment before delegating; added PG negative: without it the grant is `PERMISSION_DENIED`, 0 delegation rows, 0 events |
| 10 | POST GrantDelegation and RevokeDelegation succeed (`apps/os-api/src/workforce-admin-mutation-http.test.ts`) | same | Outdated fixture | same | same |

No test skipped; no authorization code changed for these ten. No real pre-existing authorization/date defect found among them: in each case the product behaviour matches the approved rule and the expectation predates it.

## 11. Intermittent: import claim-first race (`os-database/src/s11-replay-prisma.integration.test.ts`)

Observed once in `after-fix-os-database.log.txt` (288 pass / 1 fail); passed 6/6 isolated in both the baseline copy and the active copy. Cause: the test assumed the first actor always claims the idempotency key (`results[3]` must be rejected). When the other actor's request claims first it legitimately owns the key; the product still wrote exactly one batch and returned only `CONFLICT` to the losing actor (both assertions passed before the order assumption). Class: pre-existing nondeterministic test (identical source at `4934a09`), not a product defect. Fix: the test determines the winning actor and asserts one batch id, all of the loser's requests rejected with `CONFLICT`, the winner's retry replays the same batch, the loser's retry is `CONFLICT`. 10/10 runs pass after the fix.
