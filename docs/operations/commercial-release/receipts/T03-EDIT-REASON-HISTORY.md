# Receipt — T03 customer edit with reason and field history

Third sub-task of remaining T03 (`T03.md` §9): "Edición con motivo e historial de campo". Scope: the customer identity edit (`UpdateParty`: commercial name, razón social). Phone and contact edits are the next sub-tasks (update/retire phone, end contact relation), with their own reasons and verification methods (A2 §58, §66).

## 1. Rule (A2 §46)

The reason is mandatory for sensitive changes and corrections, and optional for a descriptive typo. Implemented as:
- `UpdateParty` accepts `changeKind` (`typo` | `correction` | `update`, default `update`) and `changeReason` (1–500 characters, trimmed).
- `partyChangeNeedsReason` (contracts, used by server and form) requires a reason whenever a value changes, except a `typo` that only touches the commercial name. Razón social is identity, so it always needs a reason, even when marked as a typo.
- A change without a required reason gets `400 {"code":"VALIDATION_FAILED"}`, and no row or event is written. Edits that change no value still need no reason, as before.

## 2. History

- `party.updated` now records:
  - previous and new values (`previousDisplayName`, `previousLegalName`, `displayName`, `legalName`);
  - `changedFields`, `changeKind`, `reason`, `version`, `source: "manual"`;
  - actor and time from the event itself.
- The audit before/after values are unchanged.
- The existing customer timeline is reused rather than adding a new history store: its allowlist (`party-timeline-facts.ts`) now passes these facts through under the timeline's read policy.
- os-web `partyUpdateSummary` shows, for example: "Nombre: Andina → Andina Construcciones · Razón social: — → Andina SRL · Corrección · Motivo: … · Versión 4". Entries recorded before this change show "Cambio anterior sin detalle".
- **Redaction:** both fields are already visible to every reader of the customer detail, so old and new values are shown to the same readers. Phone history will need redaction and comes with the phone sub-task.

## 3. Form

`customer-edit-forms.tsx` adds "Tipo de cambio" and "Motivo" fields, and hidden previous values so the action can ask for the reason before sending. The server rechecks.

## 4. Checks (evidence `evidence/T03-EDIT-REASON-HISTORY/`; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build (os-api dependency graph) | exit 0 |
| Typecheck os-contracts, os-party, os-query, os-api, os-web | exit 0 each |
| os-party (2 new tests, 1 pinned test updated) | 36/36 |
| New os-web `customer-edit-reason.test.ts` | 3/3 |
| HTTP + PG: T03 authority file (payload, refusal with no write, timeline facts) + R1 file | 18/18 |
| os-api (serial) | 299/300. The failure is the known rate-limit burst timing test under suite load (as in B1); it passes alone (3/3) |
| os-database (serial) | 305/305 |
| os-query | 114/114 |
| os-contracts | 185/185 |
| os-web lib + components | 1311/1311 |

Mutations (`mutations.txt`), run inline; sources restored with sha256 verified and builds redone from restored sources:

| Mutation | Caught by |
|---|---|
| Reason never needed | os-party 2, os-web 1 |
| Server reason check removed | os-party 2, HTTP 2 |
| Typo exception extended to razón social | os-party 1, os-web 1 |
| `reason` dropped from timeline allowlist | HTTP 1 |
| History line drops the previous value | os-web 1 |

**Test hardening:**
- Existing HTTP edits now send a reason. Without it, the R1 denial checks (`notEqual 201`) would have passed for the wrong reason (400 for a missing reason instead of the authority refusal).
- The stale-version check still expects `CONFLICT`.

## 5. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN. The edit form renders inside lane B's `clientes/[partyId]/page.tsx`, which was not touched; the form component itself is not lane-owned.
- **Behavior change:** any caller of `UpdateParty` that changes a value must now send a reason, unless it is a name typo. In this tree the only callers are the os-web form (updated) and tests.
- Not covered here: fiscal identity (`UpdateFiscalIdentity`, steward-only, end-and-insert history already kept), contact and phone edits, and AI/import provenance. Only `manual` exists today.
