# Database (Milestone 2)

## Host

Production-shaped demo DB runs on **Carmen Cursor XL** (`carmen-aws-dev`):

- Postgres 16
- Database: `isalwa`
- Role: `isalwa_app`
- Listens on server localhost `:5432` only

## Commands (on server)

```bash
cd /home/ubuntu/projects/isalwa
export $(grep -v '^#' .env | xargs)
pnpm --filter @isalwa/database migrate:deploy
pnpm seed:demo
pnpm seed:validate
```

## Schema

See `packages/database/prisma/schema.prisma` and migration  
`packages/database/prisma/migrations/20260724120000_m2_living_model/`.

## Universe

See `docs/product/demo-universe.md`.
