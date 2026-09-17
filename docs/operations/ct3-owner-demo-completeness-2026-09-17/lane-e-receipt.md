# CT3-E lane receipt — owner demo + Story Mode

**Lane:** CT3-E  
**Branch:** `ct3/lane-e-demo`  
**Worktree:** `/Users/carmen/projects/isalwa/.worktrees/ct3-lane-e-demo`  
**Base:** `4b85b11`  
**At:** 2026-09-17  

## Scope delivered

| Item | Status |
|---|---|
| 5 DEMO clients catalog + SYNTH-only seed | IMPLEMENTED (seed script; hosted apply UNPROVEN) |
| Story Mode 20 steps «Recorrido completo de ISALWA» | IMPLEMENTED |
| Ver ejemplo completo (owner/evaluation) | IMPLEMENTED |
| Inicio card «Ver recorrido completo» | IMPLEMENTED |
| DEMO · DATOS FICTICIOS banner | IMPLEMENTED |
| Datos reales / Demo filter (default real) | IMPLEMENTED |
| Quote PDF + Delivery Note PDF paths for full loop | IMPLEMENTED in seed/hrefs (hosted UNPROVEN) |
| Deploy | NOT DONE (integrator only) |

## SYNTH / REAL safety

| Field | Value |
|---|---|
| SYNTH_ORG | `01M2JKF77TXMJNDTKNCYNHH9G5` |
| REAL_ORG (refused) | `01M2DV9F0V5DXS4G89AKF4D5SR` |
| REAL_SEVEN_MUTATED | **NO** |
| Proof approach | Seed `assertOwnerDemoSynthOrg` + `assertOwnerDemoNotRealOrg` + `assertNotProtectedRealSevenName` before writes; DEMO-prefixed names only; receipt field `REAL_SEVEN_MUTATED: NO` |

## Demo clients

1. **DEMO MADERAS ORIENTE** — full healthy loop (party, contact, coords, opp, quote+lines, manual send, follow-up work, order, order-prep work, FG, delivery note, salida, entrega, fulfilled commitment)
2. **DEMO CONSTRUCTORA ANDINA** — party + conversation fixture (20 units / next week)
3. **DEMO PROYECTOS DEL SUR** — submitted quote numbered `Q-DEMO-001` + acceptance conversation
4. **DEMO HOTEL CENTRAL** — order + FG + delivery note; **no** Salida/Entrega
5. **DEMO FERRETERÍA NORTE** — order + issue conversation (3 broken pieces)

## Fixture IDs

Populated after seed into:

- `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json` (full)
- `packages/os-database/fixtures/owner-demo/last-seed-ids.json`
- `apps/os-web/lib/demo/seeded-ids.json` (Story Mode CTAs)

Until seed runs, `seeded-ids.json` has empty `clients[]` — Story Mode still opens; CTAs fall back or prompt to seed.

## How to seed

```bash
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
```

See `packages/os-database/fixtures/owner-demo/README.md`.

## Files (primary)

- `packages/os-database/src/owner-demo/{guards,catalog,seed,guards.test}.ts`
- `packages/os-database/fixtures/owner-demo/{README.md,conversations.json}`
- `apps/os-web/lib/demo/*`
- `apps/os-web/components/demo/*`
- `apps/os-web/components/shell/app-shell.tsx` (provider + banner + toggle + story + Ver ejemplo)
- `apps/os-web/app/(app)/inicio/page.tsx` (owner card + demo/real list filter)

## Tests

- `packages/os-database/src/owner-demo/guards.test.ts`
- `apps/os-web/lib/demo/owner-demo.test.ts`

## Residuals

- Hosted seed apply + browser Story Mode walk: **UNPROVEN**
- Conversation rows not yet durable DB entities (structured JSON for CT3-C/D; commercial/ops records are persisted by seed)
- FG/delivery for Maderas use fixture-tooling Prisma rows (command-equivalent shapes) — re-verify PDF routes on hosted after seed
- Integrator merge + deploy not in this lane
- Do not mutate REAL seven

## Hosted proof

**UNPROVEN** — worker does not deploy.
