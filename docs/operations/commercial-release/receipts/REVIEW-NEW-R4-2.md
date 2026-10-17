# Receipt — NEW-R4-2: coverage action on customer-linked reads

Source: `RE-REVIEW_R4_WORK_READS.md` NEW-R4-2. Smallest correction, quoted: "work/approval reads through coverage require a grant that names `commercial.work` (or the relevant action). Data-only coverage keeps customer master-data reads."

## 1. Problem

`coverageApplies` in `packages/os-query/src/party/customer-visibility.ts` called `continueCoveredCustomerWorkflow` without an `action`, so any active coverage grant counted. That included a data-only grant naming only `customer.edit`. Every reader built on it inherited that:

- work and approval reads (`work-auth.ts`, customer-subject branch);
- commitment reads and party links (`commitment-auth.ts`);
- the covered owner's quotes, opportunities and orders (`commercial-query-service.ts`, `canReadRecord`);
- timeline entries for the owner's records (`party-timeline-query-service.ts`, `TimelineVisibility`).

As a result, an advisor covering a customer only to fix master data could read the owner's commercial work about that customer.

## 2. Change

- New constant `COMMERCIAL_COVERAGE_READ_ACTIONS = ['commercial.work', 'quote.convert']`.
- `coverageApplies`, `coveredAccountOwner`, `customerFactsReadable` and `canReadCustomer` accept an optional `coverageActions`:
  - **when it's set**, the grant must cover at least one of the listed actions;
  - **when it's unset**, any active grant applies, as before (master data).
- These readers now pass `COMMERCIAL_COVERAGE_READ_ACTIONS`:
  - work and approval customer-subject reads;
  - commitment reads and commitment party links;
  - commercial record reads through coverage;
  - the timeline's covered-owner entries.
- Unchanged, still any active grant:
  - party detail and list (`resolveCustomerReadScope`);
  - the timeline header check;
  - the duplicate-counterpart redaction;
  - customer conversations.
- Owner, manager-range and org-read paths are untouched.

`quote.convert` is included because a covering advisor allowed to convert quotes has to see the quote, its approval state and the related work. Grants that never covered commercial work (`customer.edit`, archive, reactivate) don't open these reads.

## 3. Checks (evidence `evidence/REVIEW-NEW-R4-2/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-query, os-api | exit 0 each |
| New unit `customer-visibility.coverage-actions.test.ts` | 5/5 |
| New HTTP + PG `review-r4-coverage-actions.http.test.ts` | 4/4 |
| os-query / os-commercial / os-commitment / os-work / os-issue | 110 / 101 / 19 / 22 / 94, 0 failures |
| os-api suite (serial, established command) | 282/282 |
| Mutation M1: `coverageApplies` ignores the required actions, restored with sha256 verified | Caught: unit 2 failures, HTTP 2 failures |

What the HTTP test shows:
- **Data-only coverage (`customer.edit`):**
  - reads the customer record (200);
  - gets exactly the missing-id 404 body on the owner's work item, the party approval and the commitment;
  - reads the timeline without any of their entries.
- **`commercial.work` coverage:** reads all three and sees the work entry in the timeline.
- **Owner and approver:** unchanged.

## 4. Status, decision and limitations

- IMPLEMENTED; LOCALLY TESTED. **Not independently reviewed.** BROWSER CHECK UNPROVEN.
- **BUSINESS_DECISION_REQUIRED (open):** what data-only coverage may read. The safe default implemented here is master data only: party record, contacts, timeline header and non-commercial entries. If the business wants data-only coverage to see, say, open work titles, that's a policy change to record first.
- **Not covered here:** the covered owner's quotes and orders read through `commercial-query-service` take the same rule. That path is exercised by the existing os-api suites but has no new dedicated HTTP case.
- **NEW-R4-3** (timeline versus detail consistency under coverage) is the next task.
