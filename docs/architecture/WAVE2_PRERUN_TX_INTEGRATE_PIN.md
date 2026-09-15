# Wave 2 pre-rerun integration pin (fixture + TX hardening)

**Do NOT deploy from this pin.** Hosted app remains `ef7eeab…`.

## Integrated pre-rerun SHA

**`0875f06a53fee03fa11ab499f1b8b529b9966ed5`** (`wave2/prerun-tx-integrate`)

Contains (ancestors):

| Piece | SHA |
|---|---|
| Fixture seed-actor repair | `eca1130ed6c057bdc2cf7b47ac0e09a3567db354` |
| Fixture docs pin tip (prior) | `21b4b3082bce008a378f187b1fb8e953ead3c84f` |
| Party interactive TX harden | `d83406cd88d940cfd8b12d9c2c39811a58d60cb9` |
| Workforce interactive TX harden | `cae2e41…` (from `84cf544`) |
| Commercial interactive TX harden | `f2211b2…` (from `e518877`) |
| Work interactive TX harden | `f02dc2b…` (from `fd04f3c`) |
| Fixture orgId typecheck fix | `5a1512d…` (from `4f03286`) |

## Shared TX config (`OS_INTERACTIVE_TX`)

- `maxWait: 10_000`
- `timeout: 20_000`

Applied to: Party, Workforce, Commercial, Work stores.

## Fixture commercial seed sequence (seed actor)

1. CreateParty  
2. CreateOpportunity  
3. CreateQuote  
4. AddQuoteLine  
5. SubmitQuote  

No Order / production / warehouse / purchasing / finance / coordination / work / approvals in this fixture plan.

## Migrations

**NONE** — staging count remains **29**.
