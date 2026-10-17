# Receipt — NEW-B1-D1: commercial detail answers like a missing id

Found during B1 (`REVIEW-B1-ADVISOR-PROVISIONING.md` §4). Priority: confirmed disclosure defect, taken before remaining T03 per 23:47 §B ("prioritize confirmed access/disclosure defects").

## 1. Problem

`CommercialQueryService.getOpportunity`, `getQuote` and `getOrder` threw `NOT_FOUND` for a missing id and `PERMISSION_DENIED` (403) for an existing record the actor may not read. A same-tenant member who learns an id, for example from a shared link, could tell whether it exists. Quote PDF (`GET /v1/quotes/:id/pdf`) goes through `getQuote` and had the same behavior.

Work and approval detail already answer unrelated members with the missing-id body (NEW-R4-3, T02 rule), so commercial detail was the odd one out.

## 2. Change

In those three methods, an unreadable record now throws `NOT_FOUND`. The read rule (`canReadRecord`) is unchanged.

List endpoints are unchanged on purpose: asking for `visibility=team|org` without the scope still returns 403. That refuses the requested range and reveals no record.

Pinned tests flipped (detail calls only):
- `leadership-visibility.test.ts`: three cases;
- `order-owner-eval-read.test.ts`: case D.

## 3. Checks (evidence `evidence/REVIEW-NEW-B1-D1/`, allowlisted lines; sources in `tested-source-manifest.sha256`)

| Check | Result |
|---|---|
| Build os-query | exit 0 |
| Typecheck os-query, os-api, os-web | exit 0 each |
| os-query (4 pinned cases flipped) | 114/114 |
| New HTTP + PG `review-new-b1-d1-detail-oracle.http.test.ts` + B1 test | 2/2 + 3/3 |
| os-api (serial) | 297/297 |
| os-database (serial) | 305/305 |
| os-web lib + components | 1301/1301 |

Mutations (`mutations.txt`), run inline; source restored with sha256 verified:

| Mutation | Caught by |
|---|---|
| `getOpportunity` back to PERMISSION_DENIED | os-query 2, HTTP 1 |
| `getQuote` back to PERMISSION_DENIED (also covers PDF) | os-query 1, HTTP 1 |
| `getOrder` back to PERMISSION_DENIED | os-query 1, HTTP 1 |

What the HTTP test shows, for opportunity, quote, quote PDF and order:
- the owner and their team manager (`commercial.team.read` over the owner) get 200;
- a peer advisor and a people.admin get a status and body byte-identical to a random missing id (404 `{"code":"NOT_FOUND"}`), with no id in the body.

The B1 test now also asserts the identical answer for another advisor's quote.

## 4. Status and limitations

- IMPLEMENTED; LOCALLY TESTED. Not independently reviewed. Browser: UNPROVEN. The web detail pages already treat 404 as "no encontrado"; the "sin permiso" screen is no longer reached for these records.
- **Commands are unchanged.** For example, `CreateOrder` on another advisor's quote is still refused with 403 or 404, depending on the existing command rules. Command-side non-disclosure follows T02 `canKnowCustomer` and was not re-audited here.
