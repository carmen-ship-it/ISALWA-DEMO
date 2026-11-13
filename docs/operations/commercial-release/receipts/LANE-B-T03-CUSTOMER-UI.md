# Lane receipt — Lane B T03 customer UI

Local only, 2026-11-13. No push, no merge, no deployment, no hosted data, no real messages, no paid services.

Worktree `/Users/carmen/projects/isalwa-wt-t03-customer-ui`, branch `ct3/t03-customer-ui`. Starting HEAD matched `95def36aae9f1ccc43116b6d40ba6da069fdfe94` on a clean tree. UI commits end at `edcdfe555e1b664fddc70da3a76599e817220019` (tree `b7fd491e72ca4a5759f3f265e65b88c5229a3f74`). This receipt is the following commit.

## Commits

| Commit | Item |
|---|---|
| `f390ff7de7dd1a09eeb6f0559646b7b1b06233a4` | 1. Every coverage grant, required end date |
| `30e38d7ddf990830b1a45004992cb51d72767529` | 2. Steward identity lookup on the customer list |
| `9aa6b635906d2e123539d3dc5d64b04dd741077e` | 3. Phone and WhatsApp controls gated on authority |
| `8b7144d2762f7a2b530d3453e7526eca46641e75` | 4. Reason required for a name change; no change kind |
| `2ca0a2ddfb93c837018fcc9ad045205319980d3b` | 5. Import phone review on the customer list |
| `ff3f6113b2c8d2e51cde646b681c578133351e92` | 6. End a contact relationship |
| `f43422250202edd1ce5bda940d5136adb23160be` | 7. Follow-up preferences as separate choices |
| `29e6c9e8e8547ff8f6ecad209b2b56c78eee39b3` | 9. Correction request, resolve form, and attention queue |
| `edcdfe555e1b664fddc70da3a76599e817220019` | 8. Archive and reactivation preview |

Item 8's page wiring is in `29e6c9e8` and the panel module is in `edcdfe55`. Review the snapshot HEAD, not `29e6c9e8` alone.

## Checks

| Check | Result | Evidence sha256 |
|---|---|---|
| `pnpm test` in `apps/os-web` | 1328/1328 pass, exit 0 | `6e437b17ca36f74806d9f67d940342a7ef8992dfe9ee51acddb8b93dfd10a09d` |
| `pnpm typecheck` in `apps/os-web` | exit 0 | `4153eaf6563d4e44dab4c212d29d6820f2ba6c67b88e6e00561a52cd548ef4d7` |
| Local browser check | cases in `evidence/LANE-B-T03-CUSTOMER-UI/browser-check.md` | `d05b365167f3f30d581a837a6887b40ec75c1dac788f6ab8b80357d83663a471` |

Ports: os-web 3220, os-api 4220. Database: `isalwa_laneb_disposable` at `localhost:54329` (socket `/tmp`). It was 35 migrations behind and the missing columns were absent, so `prisma migrate deploy` applied the four additive T03 migrations. The drifted template `isalwa_t01_disposable` was not used. No reset.

## Item states

Each item is IMPLEMENTED and covered by the os-web suite. LOCAL BROWSER CHECK covers presence and absence of the controls for the five synthetic roles, the correction-queue denial, the other-organization denial, and one `UpdateParty` 403. It does not cover submitting grant, revoke, reveal, identity resolution, relationship end, follow-up, archive, reactivation, an import batch, or a correction decision. Those browser actions remain UNPROVEN. Nothing here is INTEGRATED, DEPLOYED, HOSTED, or owner-accepted. The customer UI lane is not the whole app.

## Dependencies for the integrator

- `components/cliente/cliente-360-actions-menu.tsx` and `cliente-360-header.tsx` are outside this lane. They still render `CustomerEditForms` without `canEditLegalName`, so the drawer edits the display name and omits the legal name. The resumen form on the allowed page is the one that can edit the legal name when the flag is true. Pass `canEditLegalName={customerAuthority.canEditLegalName}` into that drawer form.
- `lib/party/types.ts` contacts do not declare `relationEndedAt` or `relationEndReason`. A former contact uses `status !== 'active'` plus the `contact.relation.ended` timeline fact.
- `load-cliente-360.ts` still labels only the deprecated `activeCoverage`. The page resolves member labels for `coverageGrants` itself.
- There is no spreadsheet parser in os-web. The review opens an existing batch id from `?lote=`.
- Correction server actions live in `components/issue/correction-actions.ts` because `lib/issue/actions.ts` is not in the allowed set. The correction tab uses a literal href because `issueListHref` is not in the allowed set.
