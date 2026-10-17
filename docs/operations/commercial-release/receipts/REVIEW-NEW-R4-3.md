# Receipt — NEW-R4-3: timeline and detail agree under coverage

Sources:
- `RE-REVIEW_R4_WORK_READS.md` §3.5. The fix it proposes: "make the quote/order branch of `canReadApproval` and `listSubjectApprovals` use the same coverage-aware read as `CommercialQueryService.canReadRecord` (owner, coverage, range). Or have the timeline use exactly the detail rules. Do one, not both."
- §8 item 4: "align `listSubjectApprovals`, `canReadApproval` and the timeline on the same rule as quote/order detail. Add a covering-advisor test across timeline → detail."

## 1. Problem

The party timeline had its own coverage shortcut (`canReadOwner` against the covered account owner) for work and approval entries. The detail rules didn't have it:

- **`canReadApproval`:** its quote/order branch only checked owner or manager range.
- **`listSubjectApprovals`:** `canSeeAll` used owner or range only.

A covering advisor saw the owner's quote approval in the customer's timeline, but opening it returned 404. They also couldn't list the quote's approvals ("¿ya está aprobada?").

## 2. Change: one rule, used by detail and timeline

- **New shared helper:** `coveredOwnerRecordReadable` in `customer-visibility.ts`. It covers the covered account owner's own quote, order or opportunity on a customer the actor covers for commercial work (`COMMERCIAL_COVERAGE_READ_ACTIONS`, from NEW-R4-2). `CommercialQueryService.canReadRecord` now calls it instead of its inline copy, with the same behavior.
- **`canReadApproval`:** for quote and order subjects, it's now owner or range (unchanged) **or** `coveredOwnerRecordReadable`. This is the same rule as quote and order detail.
- **`listSubjectApprovals`:** `canSeeAll` uses the same rule. So a covering advisor gets 200 with an empty list on a quote without approvals, as the owner does, instead of 404.
- **Party timeline:** work and approval entries call exactly `canReadWork` and `canReadApproval`. The timeline's own coverage shortcut for them is removed. Commercial-record and account entries keep `canReadOwner`, which is already the same rule as commercial detail (owner or range, or the covered owner's record).

**Work items:** they can't take quote or order subjects (`WORK_SUBJECT_TYPES` is party, organization_member, commercial_account and work_item). No product path creates such work; the only hits are seed rows for reported facts and approvals. Customer work reaches coverage through the customer branch of `canReadWork`, so no work-specific branch was added.

## 3. Checks (evidence `evidence/REVIEW-NEW-R4-3/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-query, os-api | exit 0 each |
| New unit `work-auth.quote-coverage.test.ts` | 4/4 |
| New HTTP + PG `review-r4-timeline-detail.http.test.ts` | 4/4 |
| os-query / os-commercial / os-commitment / os-work / os-issue | 114 / 101 / 19 / 22 / 94, 0 failures |
| os-api suite (serial, established command) | 286/286 |
| os-web `lib/work/task11b-scale.test.ts` | 16/16 |

Mutations (`mutations.txt`), each restored with sha256 verified:

| Mutation | Caught by |
|---|---|
| M1: `canReadApproval` quote/order branch without coverage | unit 1, HTTP 1 |
| M2: `listSubjectApprovals` `canSeeAll` without coverage | HTTP 1 |
| M3: `coveredOwnerRecordReadable` ignores the record owner | unit 1 |

What the HTTP test shows. The quote is a real submitted quote created through commands, with an approval requested by its owner.
- **Owner:** sees the quote, its approval and the customer work in the timeline, and opens both.
- **`commercial.work` coverage:**
  - sees the approval and the work in the timeline;
  - opens both (200);
  - lists the quote's approvals;
  - gets an empty list (200) on a quote with no approvals.
- **Data-only coverage (`customer.edit`):** sees neither in the timeline and gets exactly the missing-id 404 body in detail. The subject list returns 404.
- **Unrelated member:** gets the same missing-id 404 bodies, and 404 on the subject list.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. **Not independently reviewed.** BROWSER CHECK UNPROVEN: the Cliente 360 timeline and the quote approval panel weren't opened in a browser.
- **List versus detail (review §3.5, second point):** this is unchanged by design. Pending-approval and work lists stay "mine" or `team|org`. Coverage readers reach work and approvals through Cliente 360 and the timeline, not "Mi trabajo". This is recorded here so users aren't told otherwise.
- The coverage read depends on NEW-R4-2's commercial-action rule; data-only coverage reads none of this.
