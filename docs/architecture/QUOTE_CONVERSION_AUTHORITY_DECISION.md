# Quote conversion — capability vs live CreateOrder

Candidate context: Wave 2 P0 operating-loop pass.

## Live CreateOrder gate (exact)

`canConvertQuoteToOrder` in `packages/os-contracts/src/commercial-authority.ts`:

1. Actor is the quote owner → **allow**
2. Actor has an **active** `commercial.customer.coverage` grant for the customer (primary owner stays; acting advisor recorded; no shared ownership) → **allow**
3. Actor holds `commercial.order.convert` → **allow**
4. Else → deny

Coverage grants are loaded from `OsCustomerCoverageGrant` (additive migration **unapplied**) via `listActiveCustomerCoverageGrants` — never client-asserted alone.

Used by `CommercialCommandService.createOrder`. Audit payload includes primaryOwnerMemberId, actingAdvisorMemberId, coverageSource, convertingActorMemberId, sharedOwnership: false.

## commercial.quote.convert.own

Disposition: **DEPRECATE_LATER**

- Own-quote semantics only (`canConvertOwnEligibleQuote`)
- **Not** covering-advisor convert
- **Not** wired into CreateOrder (`QUOTE_CONVERT_OWN_WIRED_INTO_CREATE_ORDER = false`)
- Do not silently delete

## Covering advisor

`continueCoveredCustomerWorkflow` + persisted coverage grant prove condition #2.

Coverage ≠ shared ownership ≠ global convert ≠ title authority.
