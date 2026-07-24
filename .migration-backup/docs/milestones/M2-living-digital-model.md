# Milestone 2 — Living Digital Model

**Status:** ✅ Complete — awaiting approval for Milestone 3  
**Completed:** 24 julio 2026  
**Runtime:** Carmen Cursor XL cloud (`carmen-aws-dev`) · DB `isalwa`

## Dual goals

1. Production commercial schema + migration  
2. Believable multi-year seeded universe every later screen will read  

## Delivered

- Full Prisma schema (IAM, territories, accounts, catalog, commerce, field, WhatsApp, collaboration, audit, AI summaries, attention, seed_meta)
- Migration `20260724120000_m2_living_model` applied on cloud Postgres 16
- Deterministic seed (`SEED_KEY=isalwa-universe-v1`) with personas, price memory, seasonal cadence
- Integrity validator `seed:validate`
- Universe bible + assumptions documented

## Verified on cloud

| Check | Result |
|-------|--------|
| `prisma migrate deploy` | ✅ |
| `SEED_PROFILE=demo` seed | ✅ 180 accounts |
| `seed:validate` | ✅ |
| Determinism (2× seed) | ✅ checksum `61bc4e9098d72060` both runs |

### Demo counts (checksum `61bc4e9098d72060`)

- accounts 180 · quotes 4087 · orders 2750 · invoices 2750 · payments 1959  
- visits 7846 · conversations 99 · messages 561 · activity 18062 · price observations 10300 · attention 53  

## Files

- `packages/database/prisma/schema.prisma`
- `packages/database/prisma/migrations/20260724120000_m2_living_model/`
- `packages/database/src/seed/*`
- `docs/product/demo-universe.md`

## Known limitations

- PostGIS geography not enabled yet (lat/lng decimals)
- Fiscal/tax lines = 0 in seed
- Catalog/prices synthetic until client provides real SKUs
- Full profile (400 accounts) available but not required for M2 acceptance

## Stop

Do **not** begin Milestone 3 until approved.
