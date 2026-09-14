# Quote conversion — capability vs live CreateOrder

Candidate context: Wave 2 P0 pass.

## Live CreateOrder gate (exact)

`canConvertQuoteToOrder` in `packages/os-contracts/src/commercial-authority.ts`:

1. Actor is the quote owner → **allow** (no scope required)
2. Else actor holds `commercial.order.convert` → **allow**
3. Else → deny

Used by `CommercialCommandService.createOrder`.

## Unused / unwired

`commercial.quote.convert.own` + `canConvertOwnEligibleQuote`:

- Requires actor === owner
- Requires quote status `submitted`
- Requires `commercial.quote.convert.own`

**Not called by CreateOrder.**

## Covering advisor

`continueCoveredCustomerWorkflow` allows continuing customer work without shared ownership.

It does **not** grant quote→order conversion.

## Disposition

**D. CROSS_LANE_CHANGE_REQUEST** (also **C. SEPARATE_SEMANTICS_REQUIRED**)

Wiring `commercial.quote.convert.own` into CreateOrder is **not** a mechanical OR:

- OR-ing it is redundant for owners (they already pass without it)
- Replacing owner-always with own-scope would **narrow** pilot behavior and needs Carmen approval
- Covering advisors must not silently gain convert via coverage

**This pass:** fail closed — no CreateOrder authority change. Document divergence. Do not claim `commercial.quote.convert.own` is live convert authority.

## Carmen decision needed

1. Should quote owners convert without a convert scope (current)?  
2. Or must owners hold `commercial.quote.convert.own` for submitted quotes?  
3. Should `commercial.order.convert` remain the only non-owner path?  
4. Does coverage ever include convert? (Recommended: **no** unless explicit)
