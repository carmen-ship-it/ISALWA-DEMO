# CT3_DEMO_DATA_RECEIPT

**Org:** SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5`  
**SeededAt:** `2026-09-17T02:53:12.658Z`  
**REAL_SEVEN_MUTATED:** **NO**  
**Marker:** `DEMO · DATOS FICTICIOS` / `[is_demo]` catalog notesTag  
**FINAL code SHA for seed apply:** post-seed-fix tip then redeployed FINAL `bd8b070…`

## Apply command (already run)

```bash
export OS_DATABASE_URL="$(cat ~/.isalwa-secrets/isalwa-os-staging.external-database-url)"
pnpm --filter @isalwa/os-database fixture:owner-demo
```

Artifacts: `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json`, `apps/os-web/lib/demo/seeded-ids.json`.

## Required clients — present

| Key | Display name | Hosted list |
|---|---|---|
| maderas_oriente | DEMO MADERAS ORIENTE | YES |
| constructora_andina | DEMO CONSTRUCTORA ANDINA | YES |
| proyectos_del_sur | DEMO PROYECTOS DEL SUR | YES |
| hotel_central | DEMO HOTEL CENTRAL | YES |
| ferreteria_norte | DEMO FERRETERÍA NORTE | YES |

## Story support

| Client | Intended story | Seed support |
|---|---|---|
| MADERAS ORIENTE | Full loop Cliente→…→Entrega | YES (opportunity, quote Q-000002, order O-000002, DN, finished goods, commitment, work) |
| CONSTRUCTORA ANDINA | Conversation → possible Opportunity | YES (conversation fixture) |
| PROYECTOS DEL SUR | Conversation → Quote acceptance | YES (Q-DEMO-001) |
| HOTEL CENTRAL | Delivery question + certainty | YES |
| FERRETERÍA NORTE | Problem → possible Issue | YES |

## REAL seven

Seed refuses REAL org and REAL_SEVEN name matches before writes. Receipt `REAL_SEVEN_MUTATED=NO`. REAL customers (COMERCIAL ALVAREZ, ASTRIX, GARCIA, MICRISTAL, TORREZ, VAINSA, IMPORTAMEC) were not targeted.

## Contamination

Demo filter / fictitious banner gate demo facts away from REAL metrics when `datos=demo` / demo mode is on. Real lens remains default for day-to-day.
