# Integration receipt — Lane B T10/T11 demo-mode removal

Integrator, 2026-11-13. Authorized by Carmen 2026-11-13 13:57. Local only: no push, no deployment.

## Commits on `ct3/v1-repairs`

| Commit | Tree | What |
|---|---|---|
| `becbc3d7` | — | Pre-merge head (docs: review verdict recorded) |
| `1be6d9e537f1b6f76408555326f7c0723509ca8e` | `d3f88b756e1a187d8a26e485a463ec32ef57947a` | `--no-ff` merge of reviewed candidate `07e536eb`. The tree equals the `git merge-tree --write-tree` preview; no conflicts. |
| `c36c23463485474ed33ea4d66096239a0c0cda90` | `2b837f26ace0fecdc61215e8594f68c95491dadb` | Integrator fix required by the review: Entregas no longer forwards `?datos` (`app/(app)/entregas/page.tsx`, `components/delivery/entrega-operational-write-desk.tsx`, `lib/lists/ops-collection.ts`). The guard test list and `task11c-operations-scale.test.ts` are updated in the same commit. |
| `02d0432608` | — | Integration regression fix. The candidate deleted `lib/audit/demo-coherence.test.ts`, which also held the only tests for live helpers (`auditResourceHref`, `auditResourceHrefForEntry`, `partyIdFromAuditSnapshot`, `presentAuditActionLabel`/`presentAuditResourceLabel`, `conversationIdFromFacts`, `provenanceKindFromEventType`). Restored without demo fixtures as `lib/audit/resource-href-presentation.test.ts` (5 tests). |

Review: `isalwa-transfer-readiness/review-packets/REVIEW-LANE-B-T10-07e536eb.md` (PASS WITH FOLLOW-UPS, sha256 prefix `75714d0ed536e476`). The candidate worktree stays frozen at `07e536eb`. The 7 regenerated Prisma client files and `.tmp/` were left untouched.

## Automated checks on `02d04326` (`evidence/LANE-B-T10-INTEGRATION/`)

| Check | Result | Log sha256 prefix |
|---|---|---|
| os-web `pnpm test` | 1319/1319 pass | `os-web-test.txt` `9d173a4650237cd9` |
| os-web `pnpm typecheck` | exit 0 | `os-web-tsc.txt` `83f5e2d1eb690134` |
| os-web `pnpm build` (`next build`) | exit 0 | `os-web-build.txt` `d9a9a27bd762a3ad` |

Test count: the pre-merge head had 1323 (measured in a temporary detached worktree, since removed). After the merge: 1314; after `02d04326`: 1319. A name-level diff shows the missing tests are the demo-only tests the candidate deleted or replaced (owner demo, demo lens, FG citations, learning mode, data-mode compatibility). The only live-code coverage lost was restored in `02d04326`.

## Local browser check (valid for this scope; not hosted)

- Code: `02d04326`. os-web served the production build with `next start` on `localhost:3200`. os-api ran from source on `127.0.0.1:4001` with `OS_AUTH_MODE=dev`. Both are the integrator's port allocation and the build's defaults.
- Database: a new `isalwa_integration_browser_disposable` on the disposable cluster `localhost:54329` (socket `/tmp`), all 39 migrations applied with `prisma migrate deploy`. The template `isalwa_t01_disposable` has drifted (migration `20261018220000` fails on an existing column); the one copy made from it was dropped and was not used.
- Identity: "Entrar (desarrollo)", which creates a fresh synthetic organization and admin. No cookie forging.
- Browser: Playwright MCP, desktop 1440×900 and mobile 390×844.

| # | Case | Result |
|---|---|---|
| 1 | Without a session: `/inicio?datos=demo`, `/inicio?datos=demo&story=1`, `/clientes?datos=real`, `/entregas?datos=demo` | PASS. 307 to `/login?next=<path>` with `datos` dropped; no `Set-Cookie`. |
| 2 | Stale `isalwa-demo-data-mode` and `isalwa-owner-effective-company` cookies plus storage key `isalwa.os-web.demo-data-mode.v1` planted after login, then `/inicio?datos=demo` | PASS. The response expires the retired cookies; neither remains; the storage key is removed; no sample-data badge. |
| 3 | `/inicio?datos=demo`, `/clientes?datos=real`, `/entregas?datos=demo` | PASS. 200; 0 links with `datos=`, 0 `input[name=datos]`; no error screen; no console errors. |
| 4 | Entregas search submitted from `/entregas?datos=demo` | PASS. The resulting URL is `/entregas?q=abc` with no `datos`; honest empty "no match" state. |
| 5 | Journey for the audience (bootstrap admin has `people.admin`): `/inicio?datos=demo&story=1` and `/inicio?story=1` | PASS. The "Recorrido de ISALWA" dialog opens at step 1 of 20 with generic copy; without `story=1` it does not open. |
| 6 | Journey outside the audience | **UNPROVEN in browser.** The development login creates only an admin. Covered by unit tests (`canUseRolePreview`). |
| 7 | Main pages ×2 viewports: inicio, clientes, oportunidades, cotizaciones, pedidos, entregas, produccion, compras, conversaciones, trabajo, productos, auditoria, mapa, sistema | PASS. 200, no error screen, no `datos` links, no horizontal overflow. `/compras` shows "Sin permiso para la cola de compras" for the development admin; the permission path is unchanged by the merge, so this is existing behavior. (`/personas` was a mistyped route, not a page.) |

Screenshots: `entregas-datos-demo-desktop.png`, `inicio-story-journey-desktop.png`, `clientes-datos-real-mobile.png`.

Teardown: both servers stopped, ports 3200 and 4001 free, disposable cluster stopped. `isalwa_integration_browser_disposable` is left for normal cleanup.

## State

Lane B T10/T11: REVIEWED, INTEGRATED (local), TESTED, LOCAL BROWSER CHECK PASS within the scope above. Not pushed, not deployed, not hosted, not owner-accepted. The non-blocking review follow-ups stay open (see the review receipt).
