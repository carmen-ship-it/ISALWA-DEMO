# Receipt — NEW-R4-1: work and approvals about non-customer parties

Source: Claude's targeted re-review `RE-REVIEW_R4_WORK_READS.md` §3.6.2, table row NEW-R4-1 ("Introduced by R4", P2), and recommendation §6.2.

## 1. Problem (as reviewed at `a1ed587`)

`canReadWork` / `canReadApproval` used `canReadCustomer` for every `party` subject. `customerFactsReadable` returns true for a party outside the customer boundary, meaning one whose active roles are all non-customer, such as a supplier, and which has no commercial account. So **any active member** could read work items and approvals about a supplier. Before R4 those were limited to owner, creator, approver and people.admin.

## 2. Change

`packages/os-query/src/work/work-auth.ts`, `customerOfSubjectReadable`: the customer-scope branch applies only when the subject party is customer-bound (`isCustomerBoundParty`: customer role, commercial account, or no active role). For a non-customer or missing party, that branch grants nothing. The other rules are unchanged:

- work: owner; Compras on open purchasing prep reviews; `canReadOwnedRecord` (owner's manager with `commercial.team.read`, `commercial.org.read`);
- approvals: approver or a delegate whose delegation confers `approval.act`; readers of the linked work item.

Because the party timeline filters entries through `canReadWork` / `canReadApproval`, it stops showing supplier work to members who can't read it. The supplier's own record (master data and timeline page) stays open to members, as before; only work and approvals about it are withheld.

Unclassified parties (no active role) stay inside the customer boundary and fail closed.

## 3. Checks (evidence `evidence/REVIEW-NEW-R4-1/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0 |
| Typecheck os-query, os-api | exit 0 each |
| New unit `work-auth.party-subject.test.ts` | 7/7: supplier work and approval denied to an unrelated member; owner and approver kept; Compras prep review kept; customer scope still works; unclassified party fails closed; missing party unreadable |
| HTTP + PG `review-r4-work-reads.http.test.ts` (new case) | 7/7. Supplier party with an active `supplier` role, work created by `CreateWorkItem`, approval by `RequestApproval`. Work: owner, owner's team lead and org.read get 200. Approval: approver gets 200. Outsider, unrelated team lead and people.admin get exactly the missing-id 404 body for work and approval; org.read and the requester get the 404 body for the approval. Supplier timeline: 200 for the outsider without the work entry, and the owner sees it |
| os-query suite (serial) | 89/89 |
| os-api suite (serial, established command) | 268/268 |
| os-web `lib/work/task11b-scale.test.ts` (imports os-query) | 16/16 |
| Mutations (`mutations.txt`) | guard removed in the editor and restored. Unit: 3 failures, caught. HTTP: 1 failure, caught. Restore verified by `git diff` and reruns |

The default-parallel os-api command was not used as evidence. It fails intermittently, the cause is not established, and it fails before this change too (`REVIEW-R4-REASSIGN-WORK.md` §6.1).

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED (unit, HTTP + disposable PG, two mutation checks). **Not independently reviewed. Not browser-verified**: there is no supplier work screen to check in the browser.
- **Open policy point (not decided here):** for a supplier-subject approval with no linked work item, only the approver or delegate reads it. The requester does not (R4: authorship isn't authority), and neither do `commercial.org.read` holders (commercial scope doesn't cover supplier matters). Pre-R4 behavior let the requester read. Whether a purchasing scope (Compras) should read supplier approvals is a business decision; no new authority was invented.
- The other review items (NEW-R4-2 coverage purpose, NEW-R4-3 timeline vs detail, F07, `organization_member` approvals) are unchanged by this task.
