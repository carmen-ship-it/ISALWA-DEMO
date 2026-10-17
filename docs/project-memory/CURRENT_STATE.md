# CURRENT STATE — snapshot 2026-10-17 01:4x (UTC-4)

**Summary, dated.** The authority for task state is `docs/operations/COMMERCIAL_RELEASE_CHECKPOINT.md`. If this file disagrees with it, the checkpoint wins. Update this snapshot at each integration point rather than appending history; history goes in `history/`.

## Source identity

| Item | Value |
|---|---|
| Integrator worktree / branch | `/Users/carmen/projects/isalwa-wt-v1-repairs`, `ct3/v1-repairs` (sole integrator; one writer per isolated worktree) |
| Last commit before this archive | `ce71f9ae370c4437b82ef12f1a7aae6d0e42edc7`, tree `657408ff031f181f2c0b033a82653210fe5ef2d3` (lanes setup) |
| Uncommitted in the integrator worktree | Nothing. ReassignWork correction committed as `2dc2745`, lane doc as `93e5c0d`. |
| Transfer | Branch history from `e7d8d98` on is NOT FOR TRANSFER. Nothing is pushed or deployed. This archive inherits that block. |
| Immutable checkpoint | `32810573…`: undeployed, do not move |

## Lanes

| Lane | Worktree | State |
|---|---|---|
| A: T05 catalog | `/Users/carmen/projects/isalwa-wt-t05-catalog` | Finished. Candidate `18a0f0c…`; disclosure `c872470…`. Mutation evidence UNVERIFIED. The integrator re-ran ordinary checks on the committed source: os-catalog 27/27, os-web 1311/1311, typechecks exit 0. Awaiting Claude's review. NOT INTEGRATED, NOT BROWSER-VERIFIED. Required changes before integration: PDF gate in `automaticAnswerFields`, product-name breadcrumb, `@isalwa/os-catalog` dependency with public exports. |
| B: T10/T11 demo removal | `/Users/carmen/projects/isalwa-wt-t10-demo-removal` | Active (live processes on 2026-10-17 00:5x) |

## Open, in dependency order (summary of the integrator queue)

ReassignWork delta → NEW-R4-1 supplier reads → F07 commitments → S11 replay revalidation → `organization_member` approvals → NEW-R4-2 coverage-purpose reads → NEW-R4-3 timeline/detail consistency → B2 suspension not blocked by open work → B4 reactivation regrant review → B1 advisor provisioning → remaining T03 → T04 onward. Lane A browser acceptance (isolated disposable DB/API, lane ports, the existing `/login` "Entrar (desarrollo)" mechanism) is pending.

## Resume checkpoint for application work (set 2026-10-17 01:4x)

Chat deletion is not a prerequisite. Application work resumes now (2026-10-17 01:25), in parallel with the parked preservation lane. Do not repeat setup:
1. Verify `/Users/carmen/projects/isalwa-wt-v1-repairs` is on `ct3/v1-repairs` at the archive HEAD. Check that the ReassignWork files listed above are still the only uncommitted application changes. Lanes A and B are untouched.
2. ReassignWork delta: DONE as `2dc2745` (receipt `REVIEW-R4-REASSIGN-WORK.md` §6; LOCAL_COMPLETE; not reviewed; mutation evidence INCOMPLETE). READY FOR INDEPENDENT REVIEW posted 2026-10-17.
3. Lane A browser plan `docs/operations/commercial-release/browser/LANE-A-CATALOG-BROWSER.md` (not yet written):
   - disposable database created from `isalwa_t01_disposable` on 54329;
   - os-api on 127.0.0.1:4210, os-web on 3210;
   - the existing `/login` development button;
   - cursor-ide-browser with mobile emulation.
   Write the plan first, then execute it. BLOCKED 2026-10-17 01:4x (SECURITY_GATE): auto-review rejected a read-only fact check that touched the lane A worktree and the disposable database ("targeting a different repository directory and executing database queries without relation to the requested chat preservation task"). Not retried. To unblock: an explicit instruction for the lane A browser lane, so the check runs within the scope of the current task.
4. Then the queue above.

### Preservation lane checkpoint (parked: awaiting Claude's review of `tools/preserve_chats.py`)

Destination authorized by Carmen: a new private repository under her ISALWA GitHub account (`carmen-ship-it`). It holds one standalone commit with the bundle only. Order:
1. Address Claude's findings in `tools/preserve_chats.py`, in place. Commit the reviewed version.
2. Submit exactly that reviewed operation through the normal security gate. If it is rejected, don't relocate the script, rename it, split it up or otherwise bypass the rejection. Record the rejection and stay parked.
3. Build the bundle at `/Users/carmen/projects/isalwa-handoff/PROJECT_MEMORY_BUNDLE_20261017/`.
4. **Sanitization check on the actual files, before upload.** Scan every bundle file for:
   - secrets: keys, tokens, credential URLs, `.env` content, private keys;
   - contact data: emails, phone numbers;
   - restricted material: R1 logs, the `INDEPENDENT_REVIEW_20261016-192946` content, anything from commits on or after `e7d8d98`;
   - CCA/Rose content outside the two mixed-chat excerpt files.
   Fix or exclude every hit, then record the scan commands and results. A standalone commit prevents history transfer; it does not prove the files are sanitized.
5. Re-run `index_chats.py` with the bundle counted as a preservation source.
6. Create the private repository. Confirm `visibility: PRIVATE` before pushing. Push one standalone commit.
7. Verify the remote contents against `MANIFEST.sha256`: fresh clone, re-hash every file, zero mismatches.
8. Issue the final deletion list (chat → preservation location → backup proof → unresolved). Until then `chats/FINAL_DELETION_LIST.md` lists candidates only.

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
