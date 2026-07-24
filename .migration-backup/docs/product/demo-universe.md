# Demo Universe Bible — ISALWA OS

**Seed key:** `isalwa-universe-v1`  
**As-of date:** `2026-07-24T12:00:00.000Z`  
**Cloud database:** `isalwa` on Carmen Cursor XL (`carmen-aws-dev`)  
**Verified checksum (demo):** `a651a0960b945b9c` *(M3 hero cast — re-seed after fixtures change)*

> Note: checksum changes when demo fixtures change (hero cast, name pool). Determinism is validated by double-seed equality within a fixture revision.

## What this is

A fictional but internally consistent commercial memory for ISALWA S.R.L. — not random faker data.  
Every quote → order → invoice → payment chain is coherent. Visits, WhatsApp, scores, and attention items derive from the same facts.

## Profiles

| Profile | Accounts | History | Command |
|---------|----------|---------|---------|
| `ci` | 40 | 18 months | `SEED_PROFILE=ci pnpm seed:ci` |
| `demo` | 180 | 36 months | `pnpm seed:demo` |
| `full` | 400 | 42 months | `pnpm seed:full` |

## Organization

- Legal name: ISALWA S.R.L.  
- NIT: 328376020 (public registry)  
- Locale: `es-BO` · Timezone: `America/La_Paz`

## Territories (Santa Cruz region)

SCZ-CENTRO · SCZ-NORTE · SCZ-ESTE · PORONGO · WARNES · MONTERO · LA-GUARDIA

## Team (demo emails `@isalwa.demo`)

Owner, Gerente Comercial, 2 Supervisors, 6 Asesores, 2 Operadores WhatsApp, Cobranzas, Facturación, Almacén, Admin.

## WhatsApp channels (3)

1. Ventas — `+59171348865` (public phone used as ventas line — assumption)  
2. Cobranzas — `+59176303481` (public phone used as cobranzas — assumption)  
3. Soporte — `+59170010999` (fictional third corporate line — assumption)

## Customer personas (behavior engines)

| Key | Story |
|-----|-------|
| `vip_grower` | Segment A distributor/ferretería; frequent orders; growing |
| `steady_ferreteria` | Reliable B ferretería; moderate cadence |
| `constructora_project` | Project-driven A; mixed families including urinarios |
| `declining_silent` | Going quiet last months; visit gaps |
| `negotiator` | Always pushes price; sticky negotiated unit prices |
| `specialist_tanks` | Mostly plastic tanks / toilet tanks |
| `debt_risk` | Buys well but pays poorly; attention items |
| `new_rising` | Short history; strong growth |
| `instalador_small` | Small C installer; accessories + repuestos |

## Catalog families

Inodoros · Tanques de inodoro · Lavamanos · Bidés · Urinarios · Tanques plásticos · Accesorios · Repuestos

## Consistency rules (enforced by generator)

1. Accepted quotes become orders → invoices  
2. Payments allocate to invoices; balances never exceed totals  
3. Price observations append from quote lines (memory of last prices)  
4. Relationship score computed from recency/frequency/monetary/debt/responsiveness  
5. GPS near territory city centroids  
6. Seasonal volume softens Dec/Jan (assumption)  
7. WhatsApp phones match primary contacts  
8. Radar attention items for A visit-gaps and risky debt  

## Assumptions (document / validate with client)

1. Third WhatsApp number is fictional until client provides real third line  
2. Mapping of public phones 71348865 / 76303481 to ventas/cobranzas is assumed  
3. Product SKUs and prices are synthetic sanitary-credible stand-ins until real catalog arrives  
4. Customer names are fictional; NIT pattern is synthetic (`328000000+i`)  
5. Tax lines are 0 in seed (fiscal Bolivia deferred)  
6. Lat/lng stored as decimals (PostGIS geography deferred until enabled on cloud)  
7. Demo seed runs on cloud Postgres; local Mac should SSH-tunnel, not install Postgres  

## Cloud operations

```bash
# From laptop — tunnel (optional for local Prisma Studio)
ssh -L 5433:127.0.0.1:5432 carmen-aws-dev

# On server
cd /home/ubuntu/projects/isalwa
export $(grep -v '^#' .env | xargs)
pnpm --filter @isalwa/database migrate:deploy
pnpm seed:demo
pnpm seed:validate
```

`DATABASE_URL` lives only in server `.env` (not committed).
