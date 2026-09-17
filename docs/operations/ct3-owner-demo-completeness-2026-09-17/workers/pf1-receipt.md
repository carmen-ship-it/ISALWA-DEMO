# PF-1 — Demo commercial density receipt

**Lane:** PF-1  
**Branch:** `ct3/pf1-demo-commercial`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-pf1-demo-commercial`  
**Base tip:** `6327f43c57f309227906931f6cc08ae54033410e` (`ct3/owner-demo-completeness`)  
**REAL_SEVEN_MUTATED:** **NO**  
**Target org:** SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5` only

## Goal

Demo mode shows coherent commercial density from SYNTH fixture records (opportunities / quotes / pedidos), with Inicio commercial + funnel **counts derived from filtered records** (no hardcoded totals).

## Implemented

### Fixture contract + seed (sole owner)

- `catalog.ts` — `OWNER_DEMO_COMMERCIAL_DENSITY` matrix:
  - stages: calificacion / propuesta / negociacion
  - statuses: open + won (maderas) + lost (hotel secondary)
  - quotes: draft (andina), submitted+manual send (proyectos/hotel/maderas), submitted no send (ferreteria), accepted via convert (maderas/hotel/ferreteria)
  - pedido lifecycle stories: delivered full loop · FG/note without salida · early open order
- `seed.ts` — materializes density via `ensureQuoteLoop` stages, `CloseOpportunity`, `ensureCommercialDensityExtras` (andina secondary open opp; hotel lost opp)
- `guards.test.ts` — density contract assertions; REAL_SEVEN proof unchanged

### Commercial list + Inicio filtering (PF-1 owned pages)

- `/inicio` — personal + org/team metric/funnel/team sources filtered by `allowPartyForDataMode` (demo vs real); orders party labels merged correctly as `Map`
- `/clientes` — demo mode default `q=DEMO`, wider limit, no cursor paginate across mixed pages
- `/oportunidades` — demo mode `q=DEMO` when empty, limit 100, no mixed-page cursor
- `/cotizaciones` — demo mode limit 100 + party-name filter; no mixed-page cursor

### Not touched

Conversations UI · PDF engine · map UI · ops desks · walkthrough / GuidePanel · management visual components (PF-5)

## Tests run

```text
@isalwa/os-database: node --test --import tsx src/owner-demo/guards.test.ts  → 8 pass
@isalwa/os-web: node --test --import tsx \
  lib/management/org-metrics.test.ts \
  lib/management/commercial-funnel.test.ts \
  lib/demo/owner-demo.test.ts  → 6 pass
```

## Proof states

| Subfeature | State |
|---|---|
| Density catalog + seed source | **IMPLEMENTED** + **TESTED** (guards/catalog) |
| Inicio demo-derived commercial/funnel counts | **IMPLEMENTED** (unit not page-e2e) |
| List demo surfacing | **IMPLEMENTED** |
| Seed densify applied to staging SYNTH | **UNPROVEN** — SECURITY_GATE / CREDENTIAL_BLOCKED for agent re-apply; prior CT3 seed remains live until authorized operator re-runs `fixture:owner-demo` |
| Hosted BV of densified lists | **UNPROVEN** (needs re-seed + deploy) |

## Open residuals

1. **Seed re-apply blocked** for this agent — integrator/operator must run `STAGING_FIXTURE_CONFIRM=1` `fixture:owner-demo` to materialize andina draft + secondary/lost opps + stage closes; then refresh `apps/os-web/lib/demo/seeded-ids.json` from seed output.
2. Live `seeded-ids.json` may still show `constructora_andina` null commercial IDs until re-seed (source seed already creates them).

## Integration notes (for CT3 integrator / PF-5)

- Funnel **source counts** are filtered on `/inicio` before `composeCommercialFunnelCounts` / `composeOrgMetricCards`. PF-5 owns funnel **visuals**; no map component edits in this lane.
- If map density needs extra SYNTH parties/coords beyond the five DEMO clients, file `workers/pf5-seed-requests.md` — PF-1 will consume.
- Safe to cherry-pick/merge into `ct3/owner-demo-completeness`. No migration. No REAL_SEVEN touch.
