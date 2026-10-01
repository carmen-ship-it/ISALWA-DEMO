# ISALWA Operations — Technical Handoff Index

**Purpose:** Low-maintenance operational reference for ISALWA OS and supporting apps. A replacement developer should be able to run, deploy, back up, restore, and recover the system using **repository evidence only**.

**Status tiers:** DOCUMENTED · IMPLEMENTED · TESTED · INTEGRATED · PRODUCTION-VERIFIED — do not collapse these. Most operations below are **LOCAL/TEST verified** unless stated otherwise.

---

## Start here

| Document | Use when |
|----------|----------|
| [ENVIRONMENT_MAP.md](./ENVIRONMENT_MAP.md) | Configuring LOCAL / TEST / STAGING / PRODUCTION |
| [DEPLOYMENT_RUNBOOK.md](./DEPLOYMENT_RUNBOOK.md) | Build, migrate, start services, rollback |
| [BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md) | PostgreSQL backup + restore |
| [INCIDENT_RUNBOOK.md](./INCIDENT_RUNBOOK.md) | API down, DB, auth, outbox, migrations |
| [OVERDUE_ATTENTION_CLOCK.md](./OVERDUE_ATTENTION_CLOCK.md) | Follow-ups becoming overdue without a later event |
| [SECRET_ROTATION_RUNBOOK.md](./SECRET_ROTATION_RUNBOOK.md) | Rotating credentials safely |
| [MAINTENANCE_RUNBOOK.md](./MAINTENANCE_RUNBOOK.md) | Dependency and runtime updates |

---

## ISALWA OS (authoritative production path)

| Component | Location | Default port |
|-----------|----------|--------------|
| API + outbox worker | `apps/os-api` | `4001` |
| Web shell | `apps/os-web` | `3200` |
| Database schema | `packages/os-database/prisma` | Postgres |
| Contracts | `packages/os-contracts` | — |

**Build once → host where ISALWA chooses.** Provider topology is **PLANNED** (Render + managed Postgres + isolated Supabase Auth) in [`PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md`](../architecture/PRODUCTION_STAGING_IMPLEMENTATION_PLAN.md) — **not deployed**. Do not treat that plan as production-verified.

---

## Quick local start (TEST)

```bash
pnpm install
pnpm dev:deps                          # docker compose postgres (optional if DB already reachable)
export OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa
pnpm --filter @isalwa/os-database migrate:deploy
pnpm dev:os-api                        # terminal 1
pnpm dev:os-web                        # terminal 2 (Agent 4 owned)
./scripts/os-health-check.sh           # liveness
```

---

## Verification scripts

| Script | Proves |
|--------|--------|
| `./scripts/verify-step-10-*.sh` … `verify-step-15-1.sh` | Foundation through projections |
| `./scripts/verify-step-14-2.sh` | Outbox runtime |
| `./scripts/verify-step-14-3.sh` | Dead-letter recovery |
| `./scripts/verify-step-17-backup-restore.sh` | Backup + restore drill |
| `./scripts/verify-step-17-0.sh` | Production safety preconditions |
| `./scripts/os-production-preflight.sh` | Pre-deploy env validation |
| `./scripts/os-health-check.sh` | API liveness |

Evidence log for Step 17: [`STEP_17_PREP_TECHNICAL_HANDOFF_EVIDENCE.md`](../architecture/STEP_17_PREP_TECHNICAL_HANDOFF_EVIDENCE.md).

---

## Related (separate products)

| Product | Runbook |
|---------|---------|
| Architect (consulting workspace) | [`docs/OPERATIONS_RUNBOOK.md`](../OPERATIONS_RUNBOOK.md) |
| Legacy demo web/API | Root `.env.example` (`DATABASE_URL`, `apps/web`, `apps/api`) — **not** ISALWA OS |

---

## Architecture decisions

- ADRs: [`docs/adr/`](../adr/)
- Evidence register: [`docs/architecture/ARCHITECTURE_EVIDENCE_REGISTER.md`](../architecture/ARCHITECTURE_EVIDENCE_REGISTER.md)
- Handoff manifest: [`docs/architecture/ISALWA_OS_HANDOFF_MANIFEST.md`](../architecture/ISALWA_OS_HANDOFF_MANIFEST.md)

---

## Package ownership (multi-agent)

| Lane | Owns |
|------|------|
| Foundation / ops docs | Lane A + Step 17 prep |
| Commercial domain | Agent 2 — `packages/os-commercial` |
| OS web UI | Agent 4 — `apps/os-web` |
| Projections / query | Lane F — `packages/os-query` |
| Architect | Separate app — `apps/architect` |
