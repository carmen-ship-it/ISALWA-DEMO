# LANE UX-7 — FINANCE / WORK / OPS VISUAL DENSITY

| Field | Value |
|---|---|
| LANE | UX-7 |
| BRANCH | `ct2/lane-ux7-ops-density` |
| BASE_SOURCE_SHA | `1244d84ef75142d973c8f7aa44caeadd66361768` |
| WORKTREE | `/Users/carmen/projects/isalwa/.worktrees/ct2-lane-ux7-ops` |
| SCOPE | Visual density + copy cleanup only |

## Boundaries honored

- `/entregas` preserved; summary counts from mounted fulfillment reads only.
- No invented stock, SLA, revenue, or official accounting claims.
- Single finance disclaimer on `/finanzas` (`FinanceDisclaimer`); desk deduplicated.

## Deliverables

| Surface | Change |
|---|---|
| `/finanzas` | Contabilidad kicker, one disclaimer banner, reported-payment flow + date field, tighter desk grid |
| `/trabajo` | Permission-probed Equipo/Empresa tabs; calmer empty copy via i18n description |
| `/aprobaciones` | Pending approval cards with primary actions |
| `/entregas` | `EntregaSummaryStrip` (salidas / entregas / hoy); tighter write desk padding |
| `/salud-datos` | Actionable CTA per hallazgo (`dataHealthCta`) |
| `/incidencias` | Assigned empty state clarifies responsibility without SLA fiction |
| `/produccion` | Denser intro + steps spacing |

## Files touched

- Pages: `finanzas`, `trabajo`, `aprobaciones`, `entregas`, `salud-datos`, `incidencias`, `produccion`
- New: `finance-disclaimer`, `approval-pending-cards`, `entrega-summary-strip`, `data-health-cta`, `trabajo-lens`, `count-deliveries-today`
- Updated: `finance-operational-desk`, `manual-payment-form`, `entrega-operational-write-desk`, `finance/copy`, `reported-fact` copy, `i18n/es` trabajo description

## Proof matrix

| Check | State |
|---|---|
| IMPLEMENTED | YES |
| TESTED (unit) | YES — `data-health-cta.test.ts`, `entrega-summary-strip.test.ts`, `trabajo-lens.test.ts` (5 passing) |
| INTEGRATED | Lane branch only |
| HOSTED / BROWSER-VERIFIED | UNPROVEN — CT integrator |

## Tests run

```text
npx tsx --test lib/party/data-health-cta.test.ts lib/delivery/entrega-summary-strip.test.ts lib/work/trabajo-lens.test.ts
# pass 5 / fail 0
```
