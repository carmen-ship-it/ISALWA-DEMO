# ADR 0002 — Cloud Postgres on Carmen Cursor XL

## Status

Accepted — Milestone 2

## Context

Local Mac disk pressure and missing Docker made local Postgres unsuitable. An existing AWS cloud server (`carmen-aws-dev`) already runs Postgres 16 for other projects.

## Decision

- Host ISALWA database `isalwa` / role `isalwa_app` on Carmen Cursor XL
- Run `migrate deploy` and `seed` on the server under `/home/ubuntu/projects/isalwa`
- Developers may SSH-tunnel `5432` → local `5433` for tooling; do not install Postgres on laptops by default

## Consequences

- Demo/production-shaped data lives in the cloud (disk + CPU)
- Secrets remain in server `.env` (not committed)
- CI later should use a service container or the same cloud DB with isolation
