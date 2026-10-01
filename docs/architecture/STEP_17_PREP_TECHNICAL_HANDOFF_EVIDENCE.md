# Step 17-Prep — Production Operations + Technical Handoff Evidence

**Phase:** Step 17-Prep — Technical handoff gate  
**Date:** 2026-08-24  
**Gate result:** **CONDITIONAL PASS**

**Verification log (backup/restore):** `.step17-evidence/verify-20260824T130709Z.log`

**Operations index:** [`docs/operations/README.md`](../operations/README.md)

---

## Mission outcome

Prepare repository so a replacement senior developer can operate ISALWA OS using **repository evidence only**, assuming prior operator disappears.

**Deliverables:**

| Artifact | Status |
|----------|--------|
| `docs/operations/README.md` | CREATED |
| `docs/operations/ENVIRONMENT_MAP.md` | CREATED |
| `docs/operations/DEPLOYMENT_RUNBOOK.md` | CREATED |
| `docs/operations/BACKUP_RESTORE_RUNBOOK.md` | CREATED |
| `docs/operations/INCIDENT_RUNBOOK.md` | CREATED |
| `docs/operations/SECRET_ROTATION_RUNBOOK.md` | CREATED |
| `docs/operations/MAINTENANCE_RUNBOOK.md` | CREATED |
| `scripts/verify-step-17-backup-restore.sh` | CREATED + TESTED |
| `scripts/os-health-check.sh` | CREATED |
| `packages/os-database/src/step17-restore-seed.ts` | CREATED |
| `packages/os-database/src/step17-restore-verify.ts` | CREATED |

---

## Verification tiers

| Operation | DOCUMENTED | IMPLEMENTED | TESTED | INTEGRATED | PRODUCTION-VERIFIED |
|-----------|------------|-------------|--------|------------|---------------------|
| Environment map | ✓ | — | — | — | — |
| Deployment procedure | ✓ | ✓ (existing apps) | LOCAL | — | — |
| pg_dump backup | ✓ | ✓ script | ✓ | — | — |
| pg_restore + verify | ✓ | ✓ script | ✓ | ✓ os-api health | — |
| Migration runbook | ✓ | ✓ Prisma | ✓ prior steps | — | — |
| Secret rotation guide | ✓ | — | — | — | — |
| Incident recovery | ✓ | ✓ ops API (14.2/14.3) | ✓ prior steps | ✓ | — |
| Health check script | ✓ | ✓ | LOCAL | — | — |
| Centralized logging | ✓ gap doc | partial JSON stdout | — | — | — |
| Production hosting | gap | — | — | — | **NOT SELECTED** |

---

## Backup / restore drill (REAL)

**Command:**

```bash
./scripts/verify-step-17-backup-restore.sh
```

**Environment:** LOCAL Postgres `localhost:5432`, isolated DB `isalwa_step17_restore`

**Seed marker (example run):**

```json
{
  "organizationId": "01M0SY2QSJSB1G0FR2DEZ5WRD5",
  "partyId": "01M0SY2QVA424JX7PS25FDQB1D",
  "counts": {
    "businessEvents": 2,
    "outbox": 2,
    "auditLogs": 2,
    "parties": 1
  }
}
```

**What restore proved:**

| Domain | Evidence |
|--------|----------|
| Workforce | Org + admin + invited member persisted |
| PartyGraph | Party + commercial account linkage command |
| Events | 2 `os_business_events` |
| Outbox | 2 `os_outbox_messages` |
| Audit | 2 `os_audit_logs` |
| Idempotency | Table readable |
| API | `GET /v1/health` OK on restored DB (worker disabled for smoke) |

**Backup file:** `.step17-evidence/backup-20260824T130709Z.sql` (~74 KB)

---

## Health / observability map

| Signal | Exists | Location | Gap |
|--------|--------|----------|-----|
| API liveness | ✓ | `GET /v1/health` | No dependency readiness breakdown |
| Outbox worker state | ✓ | `/v1/health`, `/v1/operations/outbox` | Public health shows pending count only |
| Dead letters | ✓ | `/v1/operations/outbox/dead-letters` | Requires admin session |
| Projection freshness | ✓ | Query response `freshness` object | No global admin freshness dashboard |
| DB connectivity | partial | Implicit on API start | No dedicated `/health/db` |
| Structured logs | partial | Outbox worker JSON stdout | No log aggregation documented |
| Metrics/tracing | ✗ | — | **GAP** — acceptable for handoff prep |
| Uptime monitoring | ✗ | — | Host-level decision |

**Tiny improvement added:** `./scripts/os-health-check.sh` — portable curl liveness.

---

## Carmen-disappearance drill (repository-only)

| # | Question | Answer location | Result |
|---|----------|-----------------|--------|
| 1 | How to run everything? | `docs/operations/README.md`, `ENVIRONMENT_MAP.md` | ✓ |
| 2 | Authoritative database? | `OS_DATABASE_URL` → `packages/os-database` | ✓ |
| 3 | Who owns passwords? | Supabase Auth (`OS_AUTH_MODE=supabase`); dev headers LOCAL only | ✓ |
| 4 | Tenant isolation? | ADR-0003; session resolver; org-scoped stores | ✓ |
| 5 | Events/outbox? | ADR-0008; Step 11/14.2 evidence | ✓ |
| 6 | Verify health? | `/v1/health`, `os-health-check.sh` | ✓ |
| 7 | Backup? | `BACKUP_RESTORE_RUNBOOK.md`, pg_dump | ✓ |
| 8 | Restore? | Verified script + marker | ✓ |
| 9 | Recover dead letter? | Step 14.3 + `INCIDENT_RUNBOOK.md` | ✓ |
| 10 | Deploy migration? | `DEPLOYMENT_RUNBOOK.md`, `migrate:deploy` | ✓ |
| 11 | Architecture decisions? | `docs/adr/`, `ARCHITECTURE_EVIDENCE_REGISTER.md` | ✓ |
| 12 | Package ownership? | `docs/operations/README.md`, handoff manifest | ✓ |

**Drill result:** **PASS** (one CONDITIONAL: production host-specific steps intentionally unknown)

---

## HANDOFF_GAP items

| ID | Gap | Severity |
|----|-----|----------|
| HG-17-01 | Production hosting provider not selected | Expected — CONDITIONAL |
| HG-17-02 | Supabase JWT E2E not production-verified | Medium — code exists |
| HG-17-03 | No centralized log/metrics platform | Low — document JSON stdout |
| HG-17-04 | `/v1/dev/bootstrap` exposed if dev mode on public network | **CLOSED (Step 17.0)** | App fail-closed; edge block still recommended |
| HG-17-05 | Legacy `DATABASE_URL` vs `OS_DATABASE_URL` coexistence | **CLOSED (Step 17.0)** | Explicit startup error; docs updated |
| HG-17-06 | Automated scheduled backups not in repo (policy only) | Medium — ISALWA must configure at host |

**FOUNDATION_GAP:** None discovered requiring architecture change.

---

## Cross-lane changes

**NONE** — documentation and isolated test/ops scripts only. No changes to Commercial domain, os-web, or projection behavior.

---

## Architecture drift

**NO**

---

## PASS standard assessment

| Criterion | Result |
|-----------|--------|
| Complete environment map | ✓ |
| Deployment procedure | ✓ |
| Backup procedure | ✓ |
| Real local restore drill | ✓ |
| Migration runbook | ✓ |
| Secret rotation guidance | ✓ |
| Incident recovery | ✓ |
| Dependency maintenance | ✓ |
| Replacement-developer drill | ✓ (CONDITIONAL on production host) |

**Gate:** **CONDITIONAL PASS** — production-provider-specific hosting steps remain intentionally unknown.

---

## Exact next action

**ISALWA:** Select production Postgres + API hosting; configure scheduled pg_dump per BACKUP_RESTORE_RUNBOOK; run first staging deploy using DEPLOYMENT_RUNBOOK.

---

## Exact next Cursor prompt (Agent 1)

```
STEP 17.1 — STAGING DEPLOY SMOKE (after ISALWA selects host)

Deploy os-api + os-web to chosen staging host with OS_DATABASE_URL and OS_AUTH_MODE=supabase.
Run DEPLOYMENT_RUNBOOK post-deploy smoke, document PRODUCTION-VERIFIED tier in
STEP_17_1_STAGING_DEPLOY_EVIDENCE.md. Do not modify Commercial or projection code.
```
