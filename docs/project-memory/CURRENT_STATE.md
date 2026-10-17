# CURRENT STATE — snapshot 2026-10-17 01:xx (UTC-4)

**Summary, dated.** The authority for task state is `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md`. If this file disagrees with it, the checkpoint wins. Update this snapshot at each integration point rather than appending history; history goes in `history/`.

## Source identity

| Item | Value |
|---|---|
| Integrator worktree / branch | `/Users/carmen/projects/isalwa-wt-v1-repairs`, `ct3/v1-repairs` (sole integrator; one writer per isolated worktree) |
| Last commit before this archive | `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7`, tree `657408ff031f181f2c0b033a82653210fe5ef2d3` (lanes setup) |
| Uncommitted in the integrator worktree (not part of this archive commit) | ReassignWork contract delta (B12 in `DECISIONS.md`): IMPLEMENTED; targeted HTTP test 8/8 before mutations; full suites not yet run. The mutation run aborted midway and left one mutated line; it was restored from the backup, and all 4 sources match the pre-run hashes. Mutation evidence for this delta: **INCOMPLETE**. Also `LANES.md` lane A status edits. |
| Transfer | Branch history from `e7d8d98` on is NOT FOR TRANSFER. Nothing is pushed or deployed. This archive inherits that block. |
| Immutable checkpoint | `32810573…`: undeployed, do not move |

## Lanes

| Lane | Worktree | State |
|---|---|---|
| A: T05 catalog | `/Users/carmen/projects/isalwa-wt-t05-catalog` | Finished. Candidate `18a0f0c…`; disclosure `c872470…`. Mutation evidence UNVERIFIED. The integrator re-ran ordinary checks on the committed source: os-catalog 27/27, os-web 1311/1311, typechecks exit 0. Awaiting Claude's review. NOT INTEGRATED, NOT BROWSER-VERIFIED. Required changes before integration: PDF gate in `automaticAnswerFields`, product-name breadcrumb, `@isalwa/os-catalog` dependency with public exports. |
| B: T10/T11 demo removal | `/Users/carmen/projects/isalwa-wt-t10-demo-removal` | Active (live processes on 2026-10-17 00:5x) |

## Open, in dependency order (summary of the integrator queue)

ReassignWork delta → NEW-R4-1 supplier reads → F07 commitments → S11 replay revalidation → `organization_member` approvals → NEW-R4-2 coverage-purpose reads → NEW-R4-3 timeline/detail consistency → B2 suspension not blocked by open work → B4 reactivation regrant review → B1 advisor provisioning → remaining T03 → T04 onward. Lane A browser acceptance (isolated disposable DB/API, lane ports, the existing `/login` "Entrar (desarrollo)" mechanism) is pending.

## Proof state

Nothing is DEPLOYED, HOSTED, BROWSER-VERIFIED or USER-ACCEPTED in the current release work. Every LOCAL_COMPLETE row in the checkpoint is NOT INDEPENDENTLY REVIEWED unless the row says otherwise.

## Missing material (exact)

| Missing | Where it should be | Status |
|---|---|---|
| `CatalogoVitriCompleto2026.pdf` (expected sha256 `4de2f923f96942fa0f2612d857b11e8aa20bf42e5129e931e9ee834de16c25b0`), `Vitri2026.2027.pdf` | `/Users/carmen/projects/isalwa-source/2026-09-14-vitri-catalog-pricing/` (exists, **empty**) | Owner must supply |
| Architect owner export (`ws_isalwa`) | `/Users/carmen/projects/isalwa-source/2026-10-16-architect-export/` (exists, **empty**) | Owner-run export pending (takeover `10`) |
| Questions behind Isa's 8 answers; Álvaro's verbatim answers | Architect export | Unrecovered |
| Photos/scans of Isa's paper forms | none | Owner must supply |
| Three historical "Pasted markdown" engineering documents (08-23, 09-13, 09-14) | held by the receiving engineer | Not on this Mac |
| Full wording of the 2026-10-16 23:57 and 2026-10-17 00:08 messages | `history/2026-10-live-only-messages.md` | Partial verbatim / summary only; not in any transcript store |
