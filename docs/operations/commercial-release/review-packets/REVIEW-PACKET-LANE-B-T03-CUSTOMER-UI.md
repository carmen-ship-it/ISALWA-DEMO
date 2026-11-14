# Review packet — Lane B T03 customer UI

Prepared by the integrator 2026-11-13. The integrator did not build this candidate. The reviewer must be distinct from the lane B builder and from the integrator. Review the **complete final snapshot**, not an intermediate commit: item 8's page wiring is in `29e6c9e8`, but its panel is in `edcdfe55`.

## Pins (frozen)

| | |
|---|---|
| Candidate | `ac132021591bc818ebf666a5f0e124bcd9360796`, tree `b6950b9df7a5ff5095178a07e502f27c91062341`, branch `ct3/t03-customer-ui`, local tag `review/t03-customer-ui-ac132021` |
| Base | `95def36aae9f1ccc43116b6d40ba6da069fdfe94` (lane B integration; code verified at `02d0432608`) |
| Source diff | `git diff 95def36a ac132021 -- apps`: 28 files, +2375 −290. Patch outside the repo: `isalwa-transfer-readiness/review-packets/lane-b-t03-customer-ui-ac132021-source.patch`, sha256 `936072126773870bc1340a1c6cc808628c029e3ac8c4636d331553cd056a1a29` |
| Merge preview | `ct3/v1-repairs` HEAD = base, so a fast-forward; merge tree = candidate tree |
| Builder worktree | `/Users/carmen/projects/isalwa-wt-t03-customer-ui`. Do not edit or commit there. Read-only copy: `/Users/carmen/projects/isalwa-wt-t03-acceptance` (detached at the tag) |

## Integrator pre-checks (done; repeat if in doubt)

- Clean tree at the pin; 10 commits on the base (9 UI commits plus the receipt).
- Changed files: all in the assignment's allowed set (`lanes/LANE-B-T03-CUSTOMER-UI.md` "Allowed files"). No integrator-owned file (`lib/api/os-api-client.ts`, `lib/party/types.ts`, `lib/issue/types.ts`, `master-data-access.ts`, packages, `apps/os-api`) is touched. `lib/party/customer-edit-reason.test.ts` tests `customer-self-service.ts`, which is allowed.
- Re-run on the frozen snapshot (packages built fresh): os-web 1328/1328, `tsc --noEmit` clean. This matches the receipt.

## Governing contracts

- `contracts/T03-CUSTOMER-UI-CONTRACTS.md`: C1 UpdateParty reason / no-op / legal name; C2 timeline visibility; C3 authority flags; C4 coverage grants (all, bounded at 30 days, revocable); C5 endpoints change/retire; C6 masked history and justified reveal; C7 identity review; C8 steward lookup; C9 import phone review (API `39b6a9b8`, client `1ffe5d02`).
- `contracts/T03-LIFECYCLE-CONTRACTS.md`: L1 relationship end (`15e0e089`); L2 follow-up preferences (`9e7dc7d5`); L3 archive/reactivate (`2fefe96d`); L4 correction requests (`22608eb6`, candidate events `639c4dc1`, completion `cdde6603`).
- Assignment rules (`lanes/LANE-B-T03-CUSTOMER-UI.md` §Scope 1–9). Exact copy required: "Envíos automáticos no configurados.", "Pagos: no verificados en esta versión", and the labels Pendiente / En revisión / Resuelta / Rechazada. Never pre-fill a preference. Never show payments as zero. The resolve form never edits data. Offer no payment, quote, order or document fields.

## Known gaps and findings to confirm or refute

1. **Legal name in the header drawer.** `cliente-360-actions-menu.tsx` and `cliente-360-header.tsx` (integrator-owned) render `CustomerEditForms` without `canEditLegalName`, so the "Editar cliente" drawer never offers the legal name. Integrator fix prepared separately (see the integration-fix section).
2. **Coverage labels.** `lib/cliente/load-cliente-360.ts` (integrator-owned) labels only the deprecated `activeCoverage`. The page resolves `coverageGrants` labels with a second lookup. Integrator fix prepared.
3. **Former-contact line.** `formerContactLine` uses `status !== 'active'` plus the date and reason from the first `contact.relation.ended` timeline entry. The API returns `relationEndedAt` and `relationEndReason` on contacts (`prisma-party-store.ts` `mapContact`), but `lib/party/types.ts` does not declare them. L1 asks for the date and reason; only the note comes from the timeline. Check whether a contact inactive for another reason, or a relation-end event outside the loaded timeline window, renders incorrectly.
4. **Follow-up select empty by default.** Integrator reading: this matches L2 and the assignment ("never pre-fill a preference"); the current value shows above the form. Confirm or refute.
5. **Import review.** There is no spreadsheet parser in os-web; the panel opens an existing batch from `?lote=`. Check that C9 requires only review of an existing batch (counts, masked items, originals only from `ListImportPhoneReview`, correct/omit decisions) and that nothing caches originals.
6. **Correction actions location.** The server actions are in `components/issue/correction-actions.ts` because `lib/issue/actions.ts` is not in the allowed set. The Correcciones tab uses a literal href. Check for duplicated logic or a parallel implementation.
7. **`CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS`.** `DeactivateParty` and `ReactivateParty` may be removed only together with item 8's wiring. Verify.
8. **Browser evidence scope.** The builder's check (`evidence/LANE-B-T03-CUSTOMER-UI/browser-check.md`) proves presence and absence for 5 roles, the correction-queue denial, the other-organization denial and one `UpdateParty` 403. No submit flow was exercised. Member sessions were dev-mode `os_dev_session` cookies for seeded members, with server-side role rows. Confirm that no auth code changed in the candidate.
9. **Database statement.** The receipt says "35 migrations behind". The integrator verified 35 applied and 4 missing (`20261018220000`, `20261018230000`, `20261019000000`, `20261019010000`), applied 2026-11-13 16:16 to `isalwa_laneb_disposable` only. A documentation correction, not a code finding.

## Specific questions

a. Is every control gated by the API flag the contract names (C3 `customerAuthority`, `commercialAuthority.canManageCoverage`, `canRevealEndpoint`, `canEndContactRelationship`, `canSetFollowupPreference`, `canArchiveCustomer`/`canReactivateCustomer`, `canDecide`, `issue.manage` queue)? Is there no local permission or business rule?
b. Do commands send the contract payloads exactly (versions, reasons, `endsOn` ≤ 30 days, `identityConfirmed`, `eventId`, `differenceExplanation` 10–500 on `CORRECTION_VALUE_DIFFERS`)?
c. Are error codes mapped to honest messages (409 stale version, `CORRECTION_EVIDENCE_INVALID`, 403, 404) without leaking other-organization data?
d. Are masked numbers never unmasked without the justified reveal, and is revealed data never cached or logged?
e. Is the design system reused (`@isalwa/ui` and existing components), with no new visual language or parallel components?
f. Do the tests prove the builders and parsers, including negative paths?

## Verdict format

PASS, PASS WITH FOLLOW-UPS, or FAIL, with blocking findings separated from follow-ups and file:line evidence. Write the receipt to `isalwa-transfer-readiness/review-packets/REVIEW-LANE-B-T03-ac132021.md`. Read-only: no edits, commits, installs, server starts or test runs in any worktree.
