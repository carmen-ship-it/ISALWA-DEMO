# CT3_DEMO_DATA_RECEIPT

**SYNTH_ORG:** `01M2JKF77TXMJNDTKNCYNHH9G5`  
**REAL_ORG (protected):** `01M2DV9F0V5DXS4G89AKF4D5SR`  
**REAL_SEVEN_MUTATED:** **NO**  
**Seed apply on staging:** **UNPROVEN** (script exists; not run as part of this receipt)  
**Label:** `DEMO · DATOS FICTICIOS` / client names `DEMO …`

## Seed command

```bash
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
```

IDs after seed: `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json`, `apps/os-web/lib/demo/seeded-ids.json`.

## Demo clients

| DEMO CLIENT | PURPOSE | RECORDS (catalog/seed intent) | CONVERSATION | QUOTE | PDF | PEDIDO | OPS | NOTA | DELIVERY | ISSUE/WORK | STORY STEP(S) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| DEMO MADERAS ORIENTE | Full healthy loop | party, contact, coords, opp, quote+lines, send, follow-up, order, prep, FG, DN, salida, entrega, commitment | — | Y | Quote+DN paths | Y | Y | Y | Y | work/commitment | full-loop steps |
| DEMO CONSTRUCTORA ANDINA | New sales conversation | party + fixture conversation | 20 units / next week | — | — | — | — | — | — | — | conversation→opp |
| DEMO PROYECTOS DEL SUR | Quote acceptance | party + `Q-DEMO-001` | acceptance msg | Q-DEMO-001 | path | — | — | — | — | — | acceptance |
| DEMO HOTEL CENTRAL | Delivery question | party, order, FG, DN; **no** Salida/Entrega | ¿Cuándo llega…? | — | — | Y | FG | Y | missing | — | delivery Q |
| DEMO FERRETERÍA NORTE | Issue | party, order | 3 piezas quebradas | — | — | Y | — | — | — | issue signal | issue |

## Story Mode

Title: `Recorrido completo de ISALWA` · 20 steps · Next/Prev/Exit · DEMO banner · durable CTAs require seed IDs.

## Hosted demo walk

**NOT DONE** — see `CT3_HOSTED_BV.md`.
