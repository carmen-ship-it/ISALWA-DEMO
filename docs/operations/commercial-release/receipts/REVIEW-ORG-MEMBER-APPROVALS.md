# Receipt — `organization_member` approval reads

Sources:
- the 23:27 instruction §2: "Define a subject-specific policy using the relevant existing workforce permissions. Requester identity alone is insufficient for continued read. … Delegates must satisfy current delegation rules. If subject semantics are ambiguous, identify the exact approval types before choosing the minimum policy";
- `RE-REVIEW_R4_WORK_READS.md` §3.4 item 3 and §6.6 (smallest rule: requester only while holding `people.admin`, plus the approver or delegate).

## 1. Problem

`canViewApproval` let the requester read any approval whose subject type had no read rule. `organization_member` was the only such type. A member who once requested an approval about another member kept reading it, including its personnel context, for as long as they were active. That held even if they never had, or had since lost, `people.admin`.

## 2. Approval types with this subject

There is no approval-type field: an `organization_member` approval is a generic `RequestApproval` whose subject is a member, with free-form context. The product has no dedicated create flow for it. The only seeded example is the synthetic Wave A continuity fixture, where a people admin requests approval about a member ahead of termination preflight. No workforce command creates one. So the subject rule is the same for every such approval; there are no type-specific variants to choose between.

## 3. Change

`packages/os-query/src/work/work-auth.ts`, `canViewApproval`, for `organization_member` subjects:

- **approver, or a delegate whose delegation currently confers `approval.act`:** unchanged (`canActAsApproverDelegate`);
- **requester:** only while currently holding `people.admin`, directly or through a delegation that still confers it (the query context's role keys and delegated scopes, computed by `buildQueryContext` under the current delegation rules);
- **readers of a linked work item:** through `canReadWork`, unchanged;
- **nobody else.** Another `people.admin`, the subject member and commercial managers get the missing-id 404.

`organization_member` joins the subjects with a read rule, so the old requester-by-authorship branch no longer applies to any registered approval subject. The party timeline and the approver list use the same function. The subject-approval list serves only quotes and orders.

## 4. Checks (evidence `evidence/REVIEW-ORG-MEMBER-APPROVALS/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-query, os-api | exit 0 each |
| New unit `work-auth.member-subject.test.ts` | 6/6 |
| HTTP + PG `review-r4-work-reads.http.test.ts` (new case) | 8/8 |
| os-query suite | 105/105 |
| os-api suite (serial, established command) | 278/278 |
| os-web `lib/work/task11b-scale.test.ts` | 16/16 |
| Mutation (`mutations.txt`): requester reads unconditionally, then restored with sha256 verified | Caught: unit 2 failures, HTTP 1 failure |

What the new unit tests cover:
- the requester with `people.admin` reads; without it, no;
- `people.admin` held through a delegation counts;
- the approver and an `approval.act` delegate read;
- another `people.admin`, the subject member and another tenant don't;
- a linked work item's reader reads; the requester without the scope doesn't;
- `work_item` subjects are unchanged.

What the new HTTP case covers:
- A requester with `people.admin` gets 200, and so does the approver.
- The subject member, a team lead, org.read, a different `people.admin` and an unrelated member get exactly the missing-id 404 body.
- A requester without `people.admin` can't read their own request; its approver can.
- After the requester's `people.admin` role ends, they get the 404 body and the approver keeps 200.

## 5. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. **Not independently reviewed.** No browser surface (there is no `organization_member` approval screen).
- **Behavior change:** a member without `people.admin` can still *request* an `organization_member` approval (the command gate is `member_active`) but can't read it back. Whether requesting should itself require `people.admin` is a command-policy question; it isn't changed here.
- Approvers keep reading decided approvals indefinitely (review §3.4 item 2, accountability). Unchanged.
