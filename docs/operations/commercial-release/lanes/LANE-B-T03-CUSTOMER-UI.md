# Lane B builder — T03 customer UI

**Not started.** Gate (instruction 2026-10-19 01:49 §5): (1) review of the demo-removal candidate `ct3/t10-demo-removal` @ `07e536eb` with its blocking defects resolved, (2) local integration of that candidate into `ct3/v1-repairs`, then (3) the integrator creates this worktree and records the base here. That is the whole gate.

- Independent review of the C1–C8, import or L1–L4 backend contracts is **not** a prerequisite. Once the gate is met, implement against the API items below marked stable while backend reviews proceed.
- If a backend review changes a contract, the integrator updates the item here and the lane adapts.
- Final acceptance of each item still needs the backend review and combined browser evidence.

| | |
|---|---|
| Worktree | `/Users/carmen/projects/isalwa-wt-t03-customer-ui` (created by the integrator) |
| Branch | `ct3/t03-customer-ui` |
| Base | integration commit of lane B into `ct3/v1-repairs`: **TBD** |
| Ports / DB | os-web 3220, os-api 4220, `isalwa_laneb_disposable` @ `localhost:54329` (socket `/tmp`) |

The demo-removal candidate `ct3/t10-demo-removal` / `/Users/carmen/projects/isalwa-wt-t10-demo-removal` stays frozen at `07e536eb`. Don't commit there.

## Contracts

`../contracts/T03-CUSTOMER-UI-CONTRACTS.md`. Implement only contracts marked STABLE with a SHA. For PLANNED ones, prepare markup behind the existing behavior; no calls, no mocked endpoints, no local permission or business rule. A missing field goes under "Dependencies for integrator".

## Scope

1. **Coverage (C4):**
   - pass `grantableActions` and the grants into `TemporaryCoveragePanel` from `clientes/[partyId]/page.tsx`;
   - list every grant in `coverageGrants`, with helper, actions, start/end, active/scheduled status and a revoke control when `canRevoke`;
   - the grant form requires an end date (max 30 days, matching the API refusal message);
   - no single-grant display.
2. **Steward lookup (C8):** render `MasterDataLookupPanel` on `clientes/page.tsx` for stewards via `loadMasterDataLookup`.
3. **Phone and WhatsApp controls (C5–C7):**
   - change and retire per channel with country selection, reason, verification method and evidence note;
   - contact edit with no phone/WhatsApp inputs for existing contacts;
   - masked endpoint history, plus a justified reveal when `canRevealEndpoint`;
   - identity-review notice and resolution form;
   - all gated by `customerAuthority` flags.
4. **Edit reasons (C1–C2):**
   - remove "Tipo de cambio";
   - a reason is required for any name or legal-name change;
   - send `legalName` only when `canEditLegalName`, and never render it when `!canReadLegalName`;
   - "Sin cambios" for an `unchanged` result;
   - timeline shows a summary line for `detail: 'summary'` items.

5. **Client import phone review (C9): ASSIGNED, not started.** No import page exists. It starts once the lane gate above is met. Client ready at `1ffe5d02`: `executeImportCommand` (typed by `ImportCommandResultData`; originals only from `ListImportPhoneReview`, never cached). Placement: inside the existing customer list surface; no new navigation.
6. **Contact relationship ending (L1): ASSIGNED, not started.** API stable at `15e0e089`: `EndContactRelationship`, `GET …/contacts/:contactId/relationship-end-preview`, flag `canEndContactRelationship`. Show the customer's commitments as the customer's, and the exact copy "Envíos automáticos no configurados."; never show cancellable sends. Former contacts render as former with date and reason (reason note only where the timeline gives it).
7. **Follow-up preferences (L2): ASSIGNED, not started.** API stable at `9e7dc7d5`: `SetContactFollowupPreference`, `GET …/contacts/:contactId/followup-preferences`, flag `canSetFollowupPreference`. Offer "no más promociones" and "no me escriban" as distinct choices; `allowed` only as a staff record with confirmed identity and a note. Never pre-fill a preference from a message or an assistant suggestion.
8. **Archive and reactivation (L3): ASSIGNED, not started.** API stable at `2fefe96d`: `DeactivateParty` / `ReactivateParty` (version and reason now required), `GET /v1/parties/:partyId/archive-preview`, flags `canArchiveCustomer` / `canReactivateCustomer`. Show blocking obligations by kind and "Pagos: no verificados en esta versión"; never present payments as zero. Remove both commands from `CUSTOMER_SELF_SERVICE_FORBIDDEN_COMMANDS` only when this item is wired.
9. **Correction requests (L4): ASSIGNED, not started.** API stable at `cdde6603` (first at `22608eb6`): `ReportIssue` with `correction`, `AssignIssueOwner`, `ResolveIssue` with `correction.decision`, `GET /v1/issues/:issueId/correction` (`state`, `proposedValue` or `null`, `canDecide`). Labels: Pendiente, En revisión, Resuelta, Rechazada. "Resuelta" needs the customer change made first through the normal edit screens; the resolve form never edits data itself. The resolve form offers the events from `GET /v1/issues/:issueId/correction/candidate-events` (paged: `limit`, `cursor`, `nextCursor`; items carry `fields`; metadata only) with a "more" control, and may look up a pasted id at `…/candidate-events/:eventId`. It sends the chosen `eventId`. With an empty list, only Rechazada is possible. On `CORRECTION_VALUE_DIFFERS` (409) ask for `differenceExplanation` (10–500) and resend; on `CORRECTION_EVIDENCE_INVALID` (409) say the change does not match the request. The management queue is `GET /v1/issues?view=correction_attention` (`issue.manage` only; `correctionAttention: unassigned | owner_lacks_authority`). Offer no payment, quote, order or document fields. Show `proposedValue` only when the API returns it.

## Allowed files

- `apps/os-web/app/(app)/clientes/page.tsx` and `clientes/[partyId]/page.tsx` (T03 wiring only);
- `apps/os-web/components/party/**`;
- `apps/os-web/lib/party/{actions.ts, customer-self-service.ts, contact-phone.ts, master-data-lookup.ts}`;
- `apps/os-web/lib/commercial/coverage-actions.ts`;
- `apps/os-web/lib/commercial/actions.ts` (coverage actions only);
- `apps/os-web/lib/commercial/timeline-labels.ts` (party, contact and coverage summaries only);
- for item 9 only: `apps/os-web/components/issue/**` (correction display, resolve and assignment forms) and `apps/os-web/app/(app)/incidencias/**` (correction queue view);
- tests for the above;
- receipt `receipts/LANE-B-T03-CUSTOMER-UI.md`; evidence `evidence/LANE-B-T03-CUSTOMER-UI/**`.

Integrator-owned (dependency only): `lib/api/os-api-client.ts`, `lib/party/types.ts`, `lib/issue/types.ts`, `lib/party/master-data-access.ts`, every package and `apps/os-api`.

Client methods ready at `1ffe5d02` for items 5–9:

- `executeImportCommand`;
- `getContactRelationshipEndPreview`;
- `getContactFollowupPreferences`;
- `getCustomerArchivePreview`;
- `getIssueCorrection`;
- `listIssueCorrectionCandidates`;
- `getIssueCorrectionCandidate`;
- `IssueListItem.correctionAttention`.

Commands use the existing `executePartyCommand` and `executeIssueCommand`.

## Tests and evidence

- Unit tests for each builder and parser.
- os-web lib/components suite and `npx tsc --noEmit -p .`.
- A LOCAL BROWSER CHECK on 3220/4220 with synthetic members: owner, coverage with `customer.edit`, coverage with work only, steward, and a reader. It shows each control present or absent per flag, plus the refusal paths. Record the SHA, ports, database, roles and observed cases; that is valid browser evidence for that scope, not hosted verification.
- Bounded commits, receipt, then a stable snapshot report.
