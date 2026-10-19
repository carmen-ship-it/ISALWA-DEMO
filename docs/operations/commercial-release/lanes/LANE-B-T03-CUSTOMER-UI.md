# Lane B builder — T03 customer UI

**Not started.** This begins only after (1) the independent review of lane B `07e536eb` is complete and its blocking defects are resolved, and (2) the integrator has integrated lane B into `ct3/v1-repairs`. The integrator then creates the worktree and records the base here.

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

5. **Client import phone review (C9): ASSIGNED, not started.** No import page or os-web import client exists. It starts after the lane's review gate. Dependencies for integrator: the `os-api-client` methods for the C9 commands, and the page placement (inside the existing customer list surface; no new navigation).

## Allowed files

- `apps/os-web/app/(app)/clientes/page.tsx` and `clientes/[partyId]/page.tsx` (T03 wiring only);
- `apps/os-web/components/party/**`;
- `apps/os-web/lib/party/{actions.ts, customer-self-service.ts, contact-phone.ts, master-data-lookup.ts}`;
- `apps/os-web/lib/commercial/coverage-actions.ts`;
- `apps/os-web/lib/commercial/actions.ts` (coverage actions only);
- `apps/os-web/lib/commercial/timeline-labels.ts` (party, contact and coverage summaries only);
- tests for the above;
- receipt `receipts/LANE-B-T03-CUSTOMER-UI.md`; evidence `evidence/LANE-B-T03-CUSTOMER-UI/**`.

Integrator-owned (dependency only): `lib/api/os-api-client.ts`, `lib/party/types.ts`, `lib/party/master-data-access.ts`, every package and `apps/os-api`.

## Tests and evidence

- Unit tests for each builder and parser.
- os-web lib/components suite and `npx tsc --noEmit -p .`.
- A LOCAL BROWSER CHECK on 3220/4220 with synthetic members: owner, coverage with `customer.edit`, coverage with work only, steward, and a reader. It shows each control present or absent per flag, plus the refusal paths. Record the SHA, ports, database, roles and observed cases; that is valid browser evidence for that scope, not hosted verification.
- Bounded commits, receipt, then a stable snapshot report.
