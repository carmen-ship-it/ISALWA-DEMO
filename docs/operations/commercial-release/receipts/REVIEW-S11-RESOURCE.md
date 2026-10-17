# Receipt — S11 resource-level replay recheck

Source: `RE-REVIEW_R4_QUEUE.md` §2 item 3 and §9 "schedule the S11 resource-level replay recheck" (P2), and the builder's finding in `receipts/REVIEW-R4-CORRECTIONS.md`.

## 1. Problem

An accepted replay (same actor, command, payload and key) checked only the command-level scope. An actor who had since lost authority over the record still got the stored result back. No second write happened, but the body (event payload: ids and submitted values) was disclosed after authority ended. `review-r4-lifecycle-coverage.http.test.ts` pinned this: a helper whose coverage had ended got 201 replaying `CreateQuote`.

## 2. Change

The replay first verifies the S11 binding, so a different actor or request still gets CONFLICT without the body. It then rechecks the record with the same rule and error a fresh command uses.

| Service | Recheck on replay | Error when it fails |
|---|---|---|
| commercial (all 18 commands) | The actor can still know the customer the command acted on (`customerAccess(...).knowable`). The customer comes from the payload (`partyId`, opportunity, quote, quote line, order, commercial account, coverage grant), or from the stored result when a payload record no longer exists (e.g. a removed quote line) | NOT_FOUND |
| issue (all 12 commands) | The actor is still a participant in the issue: reporter, current owner or `issue.manage` (`assertIssueParticipant`). The issue id comes from the payload or the stored result (`ReportIssue`) | PERMISSION_DENIED (NOT_FOUND if the issue is gone) |
| commitment (all 5 commands) | For a party-linked commitment, the actor still owns it or may link that party (the F07 guard: customer readers; non-customer parties open) | NOT_FOUND |
| work | `CompleteWork` / `CancelWorkItem`: owner, `people.admin`, or Compras on a prep review. `Approve` / `Reject`: approver or a delegate with current `approval.act` | PERMISSION_DENIED (NOT_FOUND if gone) |
| delivery | Already rechecked the resource on replay (`authorizeResource(ctx, replayResource(...))`); unchanged | — |
| party, location, import | No record-level rule exists: a fresh command needs only the org-wide `master_data.admin` / `org.admin` scope, which replay already rechecks | — |
| workforce | Fresh commands need `people.admin` (rechecked on replay). The structural checks (person belongs only to this org, delegable scopes, grantor reach) govern what may be created, not who may see the result. The body holds ids and submitted values | — |

Deliberately not rechecked (documented in the source):
- `ReassignWork` and `EscalateApproval` hand the record to someone else. The actor's own legitimate retry would fail any "still owner/approver" check, so they keep the command-level check only.
- `CreateWorkItem` and `RequestApproval` have no prior record to recheck.

The stored body is never returned on a failed recheck. No new write happens on any replay path.

## 3. Checks (evidence `evidence/REVIEW-S11-RESOURCE/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-work, os-issue, os-commitment, os-commercial, os-api | exit 0 each |
| New HTTP + PG `s11-resource-recheck.http.test.ts` | 4/4 |
| `review-r4-lifecycle-coverage.http.test.ts` | 4/4. The pinned 201 is now `[404, {code:'NOT_FOUND'}]`, and "replay writes nothing" still holds |
| Unit replay files | issue 9/9 (new: former owner refused, new owner CONFLICT, no write); commitment 9/9 (new: hidden customer refused, own commitment still replays); commercial 8/8 |
| Package suites | os-work 22/22, os-issue 94/94, os-commitment 19/19, os-commercial 101/101 |
| os-api suite (serial, established command) | 277/277 |
| Mutations (`mutations.txt`): each recheck neutralized, then restored with sha256 verified | All caught: W1 work complete/cancel, W2 approval decisions, I1 issue, C1 commitment, Q1 commercial |

What each new HTTP test shows:
- Every case uses the same actor, body and key. The first retry returns the first body (201) and writes nothing. After authority ends, the replay is refused and the body is withheld.
- The cases:
  - **Work completion:** the owner is refused with 403 after ownership moves.
  - **Approval:** the approver is refused with 403 after the approval names another approver.
  - **Issue journal:** a former issue owner is refused with 403 after reassignment.
  - **Commitment creation:** a team lead's commitment on a report's customer is refused with 404 after the manager assignment ends.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED (unit, HTTP + disposable PG, five mutation checks). **Not independently reviewed.** No browser surface.
- Ownership and approver changes in the HTTP tests are out-of-band updates. They simulate the authority change; the product command paths for those changes are covered elsewhere.
- **Edge cases, all safe because no body and no write:**
  - A manager who reassigns an account to someone outside their range, then retries, gets NOT_FOUND.
  - A commitment owner who reassigns a customer commitment and can't read that customer gets NOT_FOUND on retry.
- Not covered here: legacy rows without the binding remain REPLAY_REVIEW_REQUIRED (unchanged), and outbox recovery replay is unchanged.
