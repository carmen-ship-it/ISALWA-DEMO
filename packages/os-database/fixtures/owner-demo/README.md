# Owner demo fixtures (CT3-E)

SYNTH org only: `01M2JKF77TXMJNDTKNCYNHH9G5`

## Apply seed (staging DB — no deploy)

Requires staging DB URL + confirm flag. Refuses REAL tenant / REAL seven names.

```bash
# Requires staging DB URL + confirm flag. Refuses REAL tenant / REAL seven names.
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
```

Or from repo root (after prepare/build if needed):

```bash
STAGING_FIXTURE_CONFIRM=1 corepack pnpm run fixture:owner-demo
```

Script name: **`fixture:owner-demo`**  
Entry: `packages/os-database/src/owner-demo/seed.ts`  
This writes durable `OsCustomerConversation` rows (and the rest of the owner-demo loop). It does **not** deploy web/API.

### Dry-run conversation plan (no DB)

Prove the seed will create **5** conversation rows without touching staging:

```bash
corepack pnpm --filter @isalwa/os-database exec node --import tsx src/owner-demo/seed-conversations-dry-run.ts
```

Or: `corepack pnpm --filter @isalwa/os-database run fixture:owner-demo:conversations-dry-run`

## Expected entity counts (SYNTH)

| Entity | Count |
|---|---|
| DEMO clients (`OsParty`) | **5** — MADERAS ORIENTE, CONSTRUCTORA ANDINA, PROYECTOS DEL SUR, HOTEL CENTRAL, FERRETERÍA NORTE |
| Durable conversations (`OsCustomerConversation`) | **5** — natural keys `owner-demo-conversation:<clientKey>` |
| One conversation per client | required; seed fails if incomplete |

UI (`/conversaciones`) prefers `GET /customer-conversations` durable rows. JSON fixtures (`conversations.json` / `ownerDemoConversationFixtures`) are used **only** when the durable list is empty.

## Outputs

- Full receipt (mode 600): `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json` (includes `conversationCount` + `conversationIds`)
- Public id map: `packages/os-database/fixtures/owner-demo/last-seed-ids.json` (includes `conversationId` per client)
- Story Mode map (copy into web): `apps/os-web/lib/demo/seeded-ids.json` (seed also writes this when possible)
- Conversation text fixtures (JSON fallback only): `conversations.json`

## Clients

1. DEMO MADERAS ORIENTE — full healthy loop (quote PDF + delivery note PDF)
2. DEMO CONSTRUCTORA ANDINA — sales conversation (20 units / next week)
3. DEMO PROYECTOS DEL SUR — acceptance of Q-DEMO-001
4. DEMO HOTEL CENTRAL — Pedido+FG, missing Salida/Entrega
5. DEMO FERRETERÍA NORTE — issue conversation (3 broken pieces)

## Safety

`REAL_SEVEN_MUTATED` must remain `NO`. Seed asserts SYNTH org and refuses REAL org + REAL seven names before any write.
