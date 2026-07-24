# Local development

## Prerequisites

- Node.js 22+
- pnpm 9.15.4
- Docker Desktop (optional, for Postgres/Redis/MinIO)

## Steps

1. `pnpm install`
2. `cp .env.example .env`
3. `pnpm dev:deps` (if Docker available)
4. `pnpm build`
5. `pnpm dev:api` and `pnpm dev:web`

## Health check

`GET http://localhost:4000/v1/health` must return JSON with `status: "ok"`.

The Pulso page reads this endpoint dynamically.
