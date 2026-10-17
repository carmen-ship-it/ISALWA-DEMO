# Receipt — F07: commitments readable tenant-wide

Source: `REVIEW_FINDINGS.md` F07 (P1) and the 23:27 instruction §3: "Complete F07 across list/detail and related query paths, not only the controller's main list. Preserve legitimate responsibility/customer/manager access and equivalent missing-versus-hidden responses."

## 1. Problem (as reviewed at `2bdc81a`)

`GET /v1/commitments` (by org, by `partyId`, by `ownerMemberId`) and `GET /v1/commitments/:id` checked only the session's organization. Any active member could read every commitment in the company: customer promises, internal text and owners. The AI `summarize_commitments` path loaded the same records and let `issue.manage` holders see all of them. Creation accepted any party in the organization, so a member could attach a commitment to a customer they cannot see.

## 2. Change

One shared rule in `packages/os-query/src/commitment/commitment-auth.ts`.

`CommitmentReadAuthorizer.canRead` makes a commitment readable by:
- its owner, or a manager in range of the owner (`commercial.team.read` over a current direct report, or `commercial.org.read`), through `canReadOwnedRecord`;
- for a customer-bound party, whoever can read that customer (account owner, active coverage, team lead of the account owner, `commercial.org.read`), through `canReadCustomer`;
- for no party or a non-customer party (e.g. a supplier), `issue.manage` holders.

Membership, `people.admin` and having created the commitment authorize nothing. A party with no visibility facts fails closed; only the owner rule applies.

`canLinkCommitmentParty` means a customer-bound party can be linked on create only by someone who can read that customer. Non-customer parties stay linkable by any active member.

Applied at:

| Path | Change |
|---|---|
| `apps/os-api/src/commitments.controller.ts` list (org / party / owner / owner+open) | Records filtered by the authorizer before paging, so counts and pages contain only readable commitments |
| `commitments.controller.ts` detail | Unreadable gives `NOT_FOUND`, the same body as a missing id |
| `apps/os-api/src/ai.controller.ts` `summarize_commitments` (party and commitment subjects) | Loaded commitments are filtered before evidence is built. The two new dependencies are `@Optional()`; without them only the owner rule applies (fail closed) |
| `packages/os-commitment/src/commitment-command-service.ts` create (employee and customer-reported) | Optional `CommitmentPartyLinkGuard` port. A false answer is `NOT_FOUND`, like a missing party. os-api wires it in `os-store.module.ts` with `buildQueryContext` + `canLinkCommitmentParty`. No new package dependency, no lockfile change |

Other commitment surfaces checked, unchanged:
- the memory timeline shows only a label and a short id, behind the organization memory scope;
- the adapter list methods have no callers outside the command service;
- there is no separate commitment count endpoint.

## 3. Checks (evidence `evidence/REVIEW-F07/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (`@isalwa/os-api^...`) | exit 0; no generated-client changes left |
| Typecheck os-query, os-commitment, os-api | exit 0 each |
| New unit `commitment-auth.test.ts` | 10/10 |
| HTTP + PG `review-f07-commitment-reads.http.test.ts` (new) | 4/4 |
| AI `summarize_commitments` | 2/2. New case: an `issue.manage` actor summarizing a customer party gets its own commitment, not another advisor's |
| os-query suite | 99/99 |
| os-commitment suite | 18/18 |
| os-api suite (serial, established command) | 273/273 |
| os-web `lib/work/task11b-scale.test.ts` | 16/16 |
| Mutations (`mutations.txt`), each restored with sha256 verified | All caught: M1 by HTTP; M2 by unit, HTTP and AI; M3 by HTTP |

What the new unit tests cover:
- another advisor is denied;
- the owner, the manager in range and org.read are kept;
- a manager out of range is denied;
- `issue.manage` reads only non-customer commitments;
- another tenant is denied;
- a party link fails closed without facts;
- list filtering;
- create links: hidden customer refused, owner and supplier allowed, unknown party refused.

What the new HTTP + PG tests cover:
- **Detail:** advisor A, A's team lead and org.read get 200. Advisor B, an unrelated team lead, `issue.manage`, `people.admin` and another tenant (org.read + issue.manage) get exactly the missing-id 404 body.
- **List:** by org, by owner, by owner+open and by party, B, the unrelated team lead, `issue.manage` and `people.admin` don't see A's customer commitment; A, the team lead and org.read do; the other tenant gets an empty list.
- **Non-customer commitments:** a supplier commitment is read by its owner and `issue.manage`, and is 404 for others.
- **Create:** B creating on A's customer gets the same 404 body as a missing party, also when naming A as owner. B creating on the supplier gets 201, and A's team lead creating on A's customer gets 201.

Mutations:
- M1: removed the list filter.
- M2: let `issue.manage` read customer commitments.
- M3: removed the create guard.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED (unit, HTTP + disposable PG, AI controller, three mutation checks). **Not independently reviewed. Not browser-verified**: `/compromisos` in os-web was not opened. It reads the same list endpoint, but the screen wasn't checked.
- **Behavior change to note:**
  - `issue.manage` holders no longer see commitments about customers they can't read, in the API list, the detail or AI summaries. Before, the AI evidence service let them see all of them.
  - `people.admin` no longer reads other members' commitments through this API.
- **Not changed (outside F07's stated scope):** the termination-impact preview still lists the departing member's open commitments with text truncated to 60 characters for whoever runs termination (`packages/os-workforce/src/termination-impact.ts`). Recorded as a follow-up observation, not fixed here.
- Fulfill, cancel and reassign remain owner-only (no manager path). That's T08 territory and unchanged.
- The default-parallel os-api command was not used as evidence (`REVIEW-R4-REASSIGN-WORK.md` §6.1).
