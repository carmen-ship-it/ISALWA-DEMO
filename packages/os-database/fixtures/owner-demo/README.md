# Owner demo fixtures (CT3-E)

SYNTH org only: `01M2JKF77TXMJNDTKNCYNHH9G5`

## Apply seed

```bash
# Requires staging DB URL + confirm flag. Refuses REAL tenant / REAL seven names.
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
```

Or from repo root (after prepare/build if needed):

```bash
STAGING_FIXTURE_CONFIRM=1 corepack pnpm run fixture:owner-demo
```

## Outputs

- Full receipt (mode 600): `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json`
- Public id map: `packages/os-database/fixtures/owner-demo/last-seed-ids.json`
- Story Mode map (copy into web): `apps/os-web/lib/demo/seeded-ids.json` (seed also writes this when possible)
- Conversation text fixtures: `conversations.json`

## Clients

1. DEMO MADERAS ORIENTE — full healthy loop (quote PDF + delivery note PDF)
2. DEMO CONSTRUCTORA ANDINA — sales conversation (20 units / next week)
3. DEMO PROYECTOS DEL SUR — acceptance of Q-DEMO-001
4. DEMO HOTEL CENTRAL — Pedido+FG, missing Salida/Entrega
5. DEMO FERRETERÍA NORTE — issue conversation (3 broken pieces)

## Safety

`REAL_SEVEN_MUTATED` must remain `NO`. Seed asserts SYNTH org and refuses REAL org + REAL seven names before any write.
