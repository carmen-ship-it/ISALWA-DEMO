# Wave 2 P0 first-pilot blocker pass — receipt

**Start SHA:** `fea519369eca49f19485d569a4e786d3df101840`  
**End SHA:** `8aa82c32bfeb3112ce8a5a81983afb3757c10379`  
**Integration pin (unchanged):** `316426f272bce29924ffd4991da88ffe7d421bbd`  
**Deploy / migrate / pin move:** NO  
**Pushed:** NO

## Quote conversion

- Live CreateOrder: owner **OR** `commercial.order.convert`
- `commercial.quote.convert.own` / `canConvertOwnEligibleQuote`: **NOT wired** (`QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = false`)
- Disposition: **D. CROSS_LANE_CHANGE_REQUEST** (+ C. SEPARATE_SEMANTICS_REQUIRED)
- Covering advisor ≠ convert authority
- Decision: `docs/architecture/QUOTE_CONVERSION_AUTHORITY_DECISION.md`

## Member selector

- Reusable: `apps/os-web/components/operating/server-member-typeahead.tsx`
- Server search: `MemberQueryService.searchActiveMembers` + Prisma org-first name contains
- `GET /members/active-options` requires `q` ≥ 2; empty otherwise
- Replaced pickers: opportunity create/assign, commercial approval, reassign owner, admin manager/delegate
- Inventory: `docs/architecture/P0_MEMBER_SELECTOR_INVENTORY.md`

## Other P0 UI

- Warehouse product/pedido selects: P1 (journeys blocked on writers)
- Remaining first-pilot blockers: Gate C, persistent writers, quote authority decision, hosted proof

## Gates

- Gate A: LOCAL DEPLOYMENT CANDIDATE READY (candidate work)
- Gate C: HOLD / BLOCKED_DB_STATE_UNKNOWN
- SAFE FOR ISA / ÁLVARO: NO
- Staging prep: READY_FOR_STAGING_PREP (prep only — not deploy)
