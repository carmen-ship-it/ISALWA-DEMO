# Receipt — Stage A customer finishing

Date: 2026-11-16. Integrator worktree `/Users/carmen/projects/isalwa-wt-v1-repairs`, branch `ct3/v1-repairs`. Parent HEAD before this work: `aada53963fce921a51faf22ed0b1230e436b45d9`. Continuation: `CONTINUATION-2026-11-16.md` §6.

States: **IMPLEMENTED** · **TESTED LOCALLY** (unit/HTTP/typecheck/build + local browser actions). Not independently reviewed. Not hosted. Not owner-accepted. Broader T03 backend review queue remains open.

## Starting identity

Preserved before edits at `/Users/carmen/projects/isalwa-handoff/STAGE-A-PRESERVE-20261116/` (manifest + tracked diff + `use-preserved-form.ts` copy). Dirty Stage A source from the recovery report was kept and finished; unrelated dirty files were not staged.

Generated Prisma client: regenerated from `packages/os-database/prisma/schema.prisma` (99 models equal). Absolute `sourceFilePath` strings are the same class of machine path already present at `aada5396`; included so the client matches the schema used by `listFollowupPreferencesForParty`.

## What changed (user outcomes)

| Follow-up | Behavior |
|---|---|
| Archived customers | Flags keep maintenance edits for archived parties; UI gates phone/contact mutations with `customerActive` / `isCurrentContact`. Reactivation path kept. |
| Former contacts | No change/retire/identity/follow-up set forms when `!isCurrentContact`. Former line uses Bolivia date + “Sin fecha registrada” when absent. |
| Legal names | Single name form in the actions drawer with `canEditLegalName`; resumen no longer duplicates `CustomerEditForms`. |
| Forms | `use-preserved-form` restores values after validation errors; field errors for short optional notes. |
| Corrections | Issue detail exposes `isCorrectionRequest`; failed/forbidden correction load never falls through to generic resolve. |
| Coverage | All grants listed with labels and last-day display helper. |
| Bulk follow-up read | `GET /v1/parties/:partyId/followup-preferences` (party-scoped); page uses one request. |

## Checks (exact commands)

Disposable DB: `isalwa_stage_a_disposable` @ `localhost:54329` / socket `/tmp` (39 migrations applied). Never 5432 / staging.

| Check | Result | Evidence |
|---|---|---|
| HTTP: follow-up + authority flags + correction | 20/20 | `evidence/STAGE-A-CUSTOMER-FINISHING/http-results.txt` |
| Mutation: remove party filter on bulk follow-up | caught (6 pass / 1 fail); source hash restored | `evidence/STAGE-A-CUSTOMER-FINISHING/mutation-party-filter.txt` |
| os-web suite | 1340/1340 | `evidence/STAGE-A-CUSTOMER-FINISHING/web-test.txt` |
| os-web / os-api `tsc --noEmit` | exit 0 | `.tmp/stage-a-verify/web-tsc.txt`, `api-tsc.txt` (local) |
| `next build` (with `NEXT_PUBLIC_OS_AUTH_MODE=dev`, `NEXT_PUBLIC_OS_API_URL=http://127.0.0.1:4001/v1` for browser build) | exit 0 | `.tmp/stage-a-verify/web-build-dev2.txt` |
| Local browser (Chrome channel, synthetic sessions) | `ok: true` | `evidence/STAGE-A-CUSTOMER-FINISHING/browser-results.json` + PNGs |

Browser actors exercised: owner (former line, short-note preserve, end relationship), steward (archive/reactivate), issue manager (correction section, no generic resolve), reader (no mutation controls), other-tenant (Cliente no disponible). Ports 3200/4001; seed refused any DB other than `isalwa_stage_a_disposable`.

## Limits

- Independent review of Stage A and of C1–C9/L1–L4 backend: not done.
- Import file→batch UI still a tracked gap (Batch 2).
- Hosted / live: UNPROVEN.
- Screenshot-only checks from 2026-11-13 were superseded by this action browser run.

## Next

Batch 2 — customer entry / everyday self-service gaps per `CONTINUATION-2026-11-16.md` §7, then T04.
