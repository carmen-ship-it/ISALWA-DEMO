# Review reconciliation — independent review of `2bdc81a` vs current source

- Review: `/Users/carmen/projects/isalwa-review-evidence/INDEPENDENT_REVIEW_20261016-192946/` (Claude, read-only, static). Reviewed snapshot `2bdc81a7f8b199e3a316025cb81cb84d0de41cd9`. It is input for reconciliation, **not** independent acceptance of any later commit.
- Current source at reconciliation start: `ct3/v1-repairs` HEAD `0667eb6` (implementation `7f9286f`, T03 part 3), clean tree, no later work.
- Governing decisions: owner message 2026-10-16 20:03 ("Consolidated engineering decisions"), recorded in `REUSE_MAP.md` §13. Earlier: 19:19 and 19:30 (`REUSE_MAP.md` §12).
- "Current source evidence" = file/symbol read at `0667eb6` in this session. Static reading only unless a test is cited.

Status values: **ALREADY FIXED** (fixed after the reviewed snapshot, with evidence) · **PARTLY FIXED** · **CONFIRMED OPEN** (defect present in current source) · **UNVERIFIED** (not yet checked against current source) · **DISPUTED** (finding does not match current source or decisions) · **PLAN/DEPENDENCY** (plan gap or external dependency, not a code defect).

| Finding | Reviewed snapshot | Current source evidence (`0667eb6`) | Status | Decision applied (20:03 §) | Task | Acceptance evidence |
|---|---|---|---|---|---|---|
| F01 approval after freeze, free approver, self-approval, unbound | 2bdc81a | `os-work/src/approval-subjects.ts:37` still requires `isQuoteApprovalEligible` (`submitted`); `work-command-service.ts:546` `canDecideApproval` returns true when actor = named approver; approver taken from payload | CONFIRMED OPEN | §5 (draft → approval of exact terms → issuance → reviewed send → acceptance → conversion; bound to terms/version; routed to authorized approvers; requester cannot choose freely or self-approve) | T04 | pending: HTTP+PG list in REUSE_MAP §13.5 |
| F02 no price list; approver identity | 2bdc81a | `price-source.ts` entries empty (not re-read; reviewer [AR]) | PLAN/DEPENDENCY | §5 (approver = explicitly authorized Jefatura Comercial / Gerencia via grants, never account owner or Carmen by default; manual price stays approval-routed); §9 (price matrix is a real configuration dependency) | T04/T05/T20 | pending; price matrix: DEPENDENCY (not on this Mac) |
| F03 GrantAdditionalRole self-escalation | 2bdc81a [AR, unverified by reviewer] | `os-workforce/src/workforce-command-service.ts:826–871` `grantAdditionalRole`: only `authorize` (people.admin) + allowlist; **no `assertRoleKeyAssignable`**, no self check. `ChangeRole` (805) and `InviteMember` (556, 1113) do call it. `changeManager` (910–939): self-as-manager allowed, client `effectiveAt` accepted | CONFIRMED OPEN | §3 | T03b (grants) | pending: unit + HTTP+PG (self/other escalation denied; authorized grantor provisions manager who completes HTTP workflow) |
| F04 manager authority unprovisionable | 2bdc81a | `os-contracts/src/scopes.ts:48–51` `ADDITIONAL_ASSIGNABLE_SCOPE_KEYS` = team.read, org.read, order.convert, quote.convert.own, account.reassign only; `ChangeRole` ends all assignments (808). No product path to hold `commercial.customer.edit` + `commercial.work.manage` + range | CONFIRMED OPEN | §3 (legitimate combinations without one-role limits; existing machinery; no auto-grants) | T03b (grants) | pending |
| F05 reassignment strands open work | 2bdc81a | `7f9286f`: coverage ended on reassignment; new account owner continues pending records (`assertCanEditOwnedRecord` account-owner path); prior owner 404 (HTTP test 10, `evidence/T03/part3/run5-os-api-t03-http.log.txt`). Still open: new owner cannot convert an inherited submitted quote with `convert.own` (`createOrder` own path requires quote owner = actor) | PARTLY FIXED | §1 (current account responsibility + action permission authorizes; historical creator/owner/conversion actor preserved separately; no attribution rewrite) | T03b | part: `7f9286f` HTTP test 10; pending: inherited conversion, former-owner denial, attribution unchanged, concurrent conversion → one order |
| F06 coverage unbounded / self-grant / opportunity self-take | 2bdc81a | `7f9286f`: grant/revoke need reassign + reach (team/org/intake), grantor delegation bound, convert only with explicit `quote.convert` + own permission (REUSE_MAP §12.1–12.2; tests in `evidence/T03/part3`). Not yet checked: self-grant when actor has org reach; `assignOpportunityOwner` by a covering advisor | PARTLY FIXED | §2 (keep repairs) | T03b | part: `7f9286f`; pending: self-grant and opportunity-owner checks |
| F06 quote work needs no action scope (`member_active`) | 2bdc81a | unchanged: quote/opportunity commands `member_active` + work access (T03 receipt §3.4) | DISPUTED as a defect under current decisions | §2 says coverage never creates permission; V2 defines no quote-work scope; adding `commercial.quote.work` would be a new permission model. Recorded, not implemented | — (reserve for owner if wanted) | n/a |
| F07 commitments readable tenant-wide | 2bdc81a | `apps/os-api/src/commitments.controller.ts:107–189`: list by org/party/owner and detail use `resolveSession` + `getCommitmentInOrg` only; no visibility filter | CONFIRMED OPEN | §4 | T02-delta (reads) | pending: HTTP+PG list/detail/by-owner/by-party/count, 404 for unknowable |
| F08 payment contract granularity / range / exception | 2bdc81a | not implemented (T07 not started) | PLAN | §6 (component-level verification, derived summary states, bounded accounting access, exception as separate decision) | T07 | mapping first (REUSE_MAP §13.6) |
| F09 hard-coded tenant selection; Journey switches org | 2bdc81a [AR; reviewer's direct read was blocked] | `apps/os-web/components/demo/owner-demo-provider.tsx` mount effect calls `saveOwnerEffectiveCompanyCookie(companyForDemoDataMode(mode))` for every user, `openStory` sets demo mode; `apps/os-web/lib/auth/actions.ts` `getServerOsAuthContext` maps cookie/header → `organizationIdForCompany` → `QA_REAL_ORGANIZATION_ID` / `QA_SYNTH_ORGANIZATION_ID` (`lib/qa/constants.ts`) | CONFIRMED OPEN (verified directly in current source) | §7 | Tenant-selection correction (pulled forward; T10/T11 keeps full demo removal) | pending: unit + server-side rejection of tampered/stale selection; browser check |
| F10 delegation survives suspended delegator | 2bdc81a | `os-domain/src/authorization.ts:33–53` `computeEffectiveScopes` ignores delegator status/holding; `work-command-service.ts:546–556` same for approval delegation | CONFIRMED OPEN | §4 ("expired/revoked delegations lose effective access"; delegator must be active and hold the scope) | T02-delta | pending |
| F10 authorship read | 2bdc81a | `os-query/src/work/work-auth.ts:26` creator reads work forever | CONFIRMED OPEN (work items) | §4, §2 (authorship is not authority) | T02-delta | pending |
| F11 people.admin sees all work/approvals | 2bdc81a | `os-query/src/work/work-auth.ts:6–8,24,35,47,57` `isOrgAdmin` = people.admin → all work and approvals | CONFIRMED OPEN | §4 | T02-delta | pending |
| F12 steward oracle / archive bypass | 2bdc81a | `7f9286f`: restricted lookup `GET /v1/master-data/parties` (REUSE_MAP §12.3). Still: `os-party/src/customer-authority.ts` returns early when `memberHasScope(snap, required)` for archive/reactivate (steward passes) | PARTLY FIXED | §2 (no master_data.admin commercial bypass) | T03 (archive/reactivate, remaining scope) | part: `7f9286f`; pending |
| F13 peer attending | 2bdc81a | n/a | PLAN (D5 reserved) | not decided 20:03; safe default: managers grant coverage | T06/T11 | — |
| F14 PDF discounts / unique order per quote / idempotency per form | 2bdc81a | not re-read | UNVERIFIED | §1 requires "no duplicate order under concurrent conversion" | T03b (concurrency proof) / T04 / T15 | pending |
| F15 order cancellation authority | 2bdc81a | not re-read | PLAN (D7) | §1 "existing orders remain actionable through their specific permitted commands; no blanket cancellation or dispatch authority" | T15 | — |
| F16 escalation outside hours | 2bdc81a | n/a | PLAN | §9 (hours are configuration) | T09 | — |
| F17 WhatsApp topology / automation eligibility / A16 | 2bdc81a | n/a | PLAN + DEPENDENCY | §8 (automatic deterministic public responses while enabled and no takeover; human confirmation for definitive changes) | T12/T13 | — |
| F18 AI defects | 2bdc81a | not re-read | UNVERIFIED | — | T14 | — |
| F19 Inicio metrics | 2bdc81a | not re-read | UNVERIFIED | — | T16 | — |
| F20 catalog PDFs | 2bdc81a | PDFs not on this Mac | DEPENDENCY (transfer, not proof of absence) | §9 | T05 | — |
| F21 committed date / Pedido especial / stock enquiry | 2bdc81a | n/a | PLAN | — | T08/T15 | — |
| F22 activation data load | 2bdc81a | n/a | PLAN | §9 | T20/T21 | — |
| F23 readiness scripts untracked | 2bdc81a | not re-read | UNVERIFIED | — | T17 | — |
| F24 outbox fencing | 2bdc81a | not re-read | UNVERIFIED | — | T12/T17 | — |
| F25 conversation write uses read visibility | 2bdc81a | not re-read | UNVERIFIED | — | T06 | — |
| F28/F29 over-specification / sequencing | 2bdc81a | n/a | PLAN (not adopted wholesale) | §10 ("do not implement every reviewer recommendation wholesale") | — | — |
| F30–F33 | 2bdc81a | not re-read | PLAN/low | — | T01 follow-up, T05, T10/T20 | — |
| Coverage conversion (reviewer: "code disallows coverage conversion entirely") | 2bdc81a | `7f9286f` `canConvertCoveredQuote` | ALREADY FIXED | 19:30, §2 | T03 part 3 | `evidence/T03/part3/run5-*`, mutation `run5-mutation-coverage-convert-uses-work.log.txt` |
| Reassign/coverage org-wide without reach | 2bdc81a | `7f9286f` `resolveAccountAssignmentAuthority` | ALREADY FIXED | 19:30, §2 | T03 part 3 | `run5-os-api-t03-http.log.txt` test 10; mutation `run5-mutation-team-target-not-required.log.txt` |
| Steward lookup without commercial read | 2bdc81a | `7f9286f` `master-data.controller.ts` | ALREADY FIXED (API); UI entry pending (§2) | 19:30, §2 | T03 part 3 / UI task | HTTP test 9 |
| people.admin / master_data.admin commercial command bypass | 2bdc81a | removed in T03 parts 1–2 (`receipts/T03.md` §3.4) | ALREADY FIXED for commercial commands | §2 | T03 | `evidence/T03/part2/run4-*` |

## Unresolved evidence (exact)

- Reviewer's direct read of three web files was rejected in their session (REVIEW_SCOPE §8). This builder read the same files in current source without rejection; F09 is now verified at `0667eb6`.
- Catalog PDFs (`CatalogoVitriCompleto2026.pdf`, `Vitri2026.2027.pdf`) and the August 2026 price matrix: supplied to Carmen's ChatGPT workspace per owner; not present on this Mac. Transfer dependency. No substitute is fabricated.
- Hosted grants (staging/production): not inspected (staging access forbidden in this lane). UNVERIFIED.
- Real configuration still missing: numeric prices, live phone setup, named role holders, published hours, payment destinations. Development uses clearly synthetic fixtures only.

## Progress log

Updated as each bounded task closes; see `REUSE_MAP.md` §13.8 for the task order.
