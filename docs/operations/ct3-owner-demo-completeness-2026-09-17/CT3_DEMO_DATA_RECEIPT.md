# CT3_DEMO_DATA_RECEIPT

**Org:** SYNTH `01M2JKF77TXMJNDTKNCYNHH9G5`  
**SeededAt (densify re-apply):** `2026-09-17T04:09:03.115Z`  
**REAL_SEVEN_MUTATED:** **NO**  
**Marker:** `DEMO · DATOS FICTICIOS` / `[is_demo]` catalog notesTag  
**FINAL code SHA for seed apply + hosted:** `e5f6d3aaabf95c49d5358caee5dba9058d97197f`

## Apply command (already run)

```bash
STAGING_FIXTURE_CONFIRM=1 ./scripts/ct3-owner-demo-seed-authorized.sh
```

Artifacts: `~/.isalwa-secrets/isalwa-os-owner-demo-seed.json`, `apps/os-web/lib/demo/seeded-ids.json`.

## Required clients — present + hosted visible

| Key | Display name | Hosted list (PF-8) |
|---|---|---|
| maderas_oriente | DEMO MADERAS ORIENTE | YES |
| constructora_andina | DEMO CONSTRUCTORA ANDINA | YES |
| proyectos_del_sur | DEMO PROYECTOS DEL SUR | YES |
| hotel_central | DEMO HOTEL CENTRAL | YES |
| ferreteria_norte | DEMO FERRETERÍA NORTE | YES |

## Density / desks

`OWNER_DEMO_DESK_DENSITY ok` · `OWNER_DEMO_COMMERCIAL_DENSITY ok` after origin fix (`customer_reported`).

PF-8: demo cue on **15/15** coverage routes with `?datos=demo`.

## Story support

| Client | Intended story | Seed support |
|---|---|---|
| MADERAS ORIENTE | Full loop Cliente→…→Entrega | YES (quote Q-000002, order O-000002, DN, commitment, work) |
| CONSTRUCTORA ANDINA | Conversation → possible Opportunity | YES |
| PROYECTOS DEL SUR | Conversation → Quote acceptance | YES |
| HOTEL CENTRAL | Delivery question + certainty | YES |
| FERRETERÍA NORTE | Problem → possible Issue | YES |

## REAL seven

Seed refuses REAL org and REAL_SEVEN name matches before writes. Receipt `REAL_SEVEN_MUTATED=NO`.

## Contamination

Demo filter / fictitious banner gate demo facts away from REAL metrics when `datos=demo` / demo mode is on. Real lens remains default for day-to-day.
