# Receipt — T03 data-steward (custodian) lookup UI

Second sub-task of remaining T03 (`T03.md` §9): "UI de consulta de custodio dentro de la ficha existente". T03 part 3 delivered the API only (`GET /v1/master-data/parties?q=|?nit=`, `GET /v1/master-data/parties/:partyId`, `master_data.admin` only, identity fields only).

## 1. Change (os-web only; API unchanged)

- `lib/api/os-api-client.ts`: `searchMasterDataParties({q}|{nit})`, `getMasterDataParty(partyId)`.
- `lib/party/types.ts`: `MasterDataPartySummary`, `MasterDataPartySearchResponse`, `MasterDataPartyDetailResponse`.
- `lib/party/master-data-lookup.ts`, `loadMasterDataLookup(client, { isSteward, term, partyId })`:
  - returns null for a non-steward without calling the API, and null on a 403;
  - a digits-only term (5–15) searches by NIT, other terms of 2+ characters search by name;
  - the selected id loads fiscal identities, and a 404 shows "Registro no encontrado".
- `components/party/master-data-lookup-panel.tsx` (server component; `SectionHeader`, `SearchField`, `Button`, `ListRow`, `StatusPill`, `EmptyPanel`):
  - a GET form (`?custodio=`) and results linking to `?custodio=…&custodioId=…`;
  - shows name, razón social, relation, status, NIT and whether the NIT is current;
  - states that it shows no owner, phones or contacts and gives no commercial access.

## 2. Checks (evidence `evidence/T03-CUSTODIAN-LOOKUP-UI/`; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Typecheck os-web | exit 0 |
| New `master-data-lookup.test.ts` | 4/4 |
| os-web lib + components | 1308/1308 |
| API behavior (unchanged) | covered by T03 part 3 HTTP+PG (`T03.md` §6 item 9); os-api serial 300/300 at `60c7278` |

Mutations (`mutations.txt`), run inline; source restored with sha256 verified: steward gate removed, 403 not treated as non-steward, NIT never detected, missing selected id rethrown. Each one was caught by one test.

There is no render test for the panel: the repo has no component render tests, and the test runner's JSX setup (`jsx: preserve`) does not support them.

## 3. Status and limitations

- IMPLEMENTED; LOCALLY TESTED (lib). Not independently reviewed. Browser: UNPROVEN.
- **CROSS_LANE_COLLISION (integration dependency, lane B).** `apps/os-web/app/(app)/clientes/page.tsx` is lane B-owned and already changed on lane B's branch, so it was not edited. Merging lane B is not authorized. Until the page wires the panel, a data steward sees no lookup screen. The wiring, which uses the existing `actorCanMutateMasterData(client)` the page already calls, is:
  ```tsx
  const lookup = await loadMasterDataLookup(client, {
    isSteward: await actorCanMutateMasterData(client),
    term: searchParams.custodio,
    partyId: searchParams.custodioId,
  });
  // …
  <MasterDataLookupPanel lookup={lookup} path="/clientes" />
  ```
  Unblock: wire this at the lane B integration point, then browser-check it as a `master_data.admin`-only member and as a seller (no panel).
- The spec says "dentro de la ficha existente". A steward cannot open `/clientes/:id` (T02: `master_data.admin` alone does not read customers), so the list page is the place to wire the panel. This is recorded as a placement decision for the reviewer.
