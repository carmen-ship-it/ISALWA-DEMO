# Incident Runbook — ISALWA OS

Simple recovery procedures. **No step says "ask Carmen."** Escalate to ISALWA engineering lead or on-call role defined at handoff.

---

## API DOWN

| | |
|-|-|
| **Symptom** | `GET /v1/health` fails; users cannot reach OS |
| **Confirm** | `./scripts/os-health-check.sh`; check process/container logs |
| **First action** | Restart os-api process; verify `OS_DATABASE_URL` reachable |
| **Recovery** | Roll back to last known-good deploy if restart fails |
| **Escalate when** | Restart + rollback fail twice; DB also unreachable |

---

## DATABASE UNAVAILABLE

| | |
|-|-|
| **Symptom** | API errors; health may show `pending: null`; Prisma connection errors in logs |
| **Confirm** | `psql "$OS_DATABASE_URL" -c 'SELECT 1'` from API host |
| **First action** | Check Postgres service, connection limits, disk full |
| **Recovery** | Restore connectivity; if data corrupt — restore from backup ([BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md)) |
| **Escalate when** | Data corruption suspected; need point-in-time recovery beyond documented procedure |

---

## AUTH FAILURE

| | |
|-|-|
| **Symptom** | 401 `AUTH_REQUIRED`; 403 `TENANT_FORBIDDEN`; login works but API rejects |
| **Confirm** | `GET /v1/dev/status` (mode + persistence); verify `OS_AUTH_MODE` matches os-web |
| **First action** | Supabase: verify JWT not expired; check `os_auth_identities` maps `providerSubject` |
| **Recovery** | Dev: re-bootstrap `POST /v1/dev/bootstrap`. Prod: fix AuthIdentity + Member rows; rotate keys if compromised |
| **Escalate when** | Mass user lockout; suspected credential leak |

See [SECRET_ROTATION_RUNBOOK.md](./SECRET_ROTATION_RUNBOOK.md).

---

## OUTBOX BACKLOG

| | |
|-|-|
| **Symptom** | Growing pending outbox; stale projection freshness on queries |
| **Confirm** | `GET /v1/operations/outbox` (admin) or `/v1/health` pending count |
| **First action** | Confirm worker running (`outboxWorker.running: true` in health) |
| **Recovery** | If disabled: remove `OS_OUTBOX_WORKER=0` and restart. If failing: inspect dead letters |
| **Escalate when** | Pending grows after worker healthy; consumer errors repeat |

Reference: [`STEP_14_2_OUTBOX_RUNTIME_OPERABILITY_EVIDENCE.md`](../architecture/STEP_14_2_OUTBOX_RUNTIME_OPERABILITY_EVIDENCE.md)

---

## DEAD LETTERS

| | |
|-|-|
| **Symptom** | `dead_letter` rows; projections not updating for specific events |
| **Confirm** | `GET /v1/operations/outbox/dead-letters` |
| **First action** | Read `lastError` on affected row; fix consumer bug or downstream cause |
| **Recovery** | `POST /v1/operations/outbox/dead-letters/:outboxId/retry` with `{ "reason": "..." }` + `x-idempotency-key` |
| **Escalate when** | Same outboxId dead-letters repeatedly after fix claimed |

Reference: [`STEP_14_3_DEAD_LETTER_RECOVERY_EVIDENCE.md`](../architecture/STEP_14_3_DEAD_LETTER_RECOVERY_EVIDENCE.md)

---

## FOLLOW-UP NOT OVERDUE AFTER DUE TIME

| | |
|-|-|
| **Symptom** | Open follow-up with a past `dueAt` never shows `overdue_work` until someone edits the work item |
| **Confirm** | `GET /v1/health/ready` → `attentionClock.running` and `lastError` |
| **First action** | If `enabled: false`, remove `OS_ATTENTION_CLOCK=0` and restart os-api. If `lastError` is set, restore database connectivity and wait for the next tick |
| **Recovery** | Restart os-api. The first tick catches up from `dueAt < now`. No CLI and no replay command |
| **Escalate when** | Clock is running, `lastError` is null, and an open past-due work item still has no `overdue_work` row after one interval |

Reference: [OVERDUE_ATTENTION_CLOCK.md](./OVERDUE_ATTENTION_CLOCK.md)

---

## PROJECTION STALE

| | |
|-|-|
| **Symptom** | Query responses show `freshness.isStale: true` |
| **Confirm** | Check outbox pending; compare authoritative store vs read model |
| **First action** | Drain outbox backlog (worker running) |
| **Recovery** | If checkpoint corrupt: projection rebuild path (Lane F — `ProjectionRunner` consumers); may require engineering runbook extension |
| **Escalate when** | Stale persists with empty backlog; rebuild not documented for affected consumer |

---

## FAILED MIGRATION

| | |
|-|-|
| **Symptom** | `migrate deploy` exits non-zero mid-way |
| **Confirm** | Read Prisma error; inspect `_prisma_migrations` table |
| **First action** | **Stop deploy.** Do not run partial manual DDL without backup |
| **Recovery** | Prefer forward-fix migration. If DB inconsistent — restore pre-migration backup |
| **Escalate when** | Migration partially applied and forward-fix unclear |

---

## BAD DEPLOY

| | |
|-|-|
| **Symptom** | Errors after release; health fails or commands break |
| **Confirm** | Compare release tag; check logs since deploy time |
| **First action** | Roll back API/web artifact |
| **Recovery** | If migration ran — assess DB compatibility; may need forward fix instead of app rollback alone |
| **Escalate when** | Rollback does not restore service |

---

## EXPIRED / ROTATED SECRET

| | |
|-|-|
| **Symptom** | Auth failures; DB connection refused; Supabase admin ops fail |
| **Confirm** | Match symptom to secret category ([SECRET_ROTATION_RUNBOOK.md](./SECRET_ROTATION_RUNBOOK.md)) |
| **First action** | Update secret in host env store; restart os-api |
| **Recovery** | os-web: redeploy if public Supabase keys changed |
| **Escalate when** | Service role leak suspected — rotate all Supabase keys |

---

## DISK / STORAGE PRESSURE

| | |
|-|-|
| **Symptom** | Postgres writes fail; backup fails; API 500 on persist |
| **Confirm** | DB host disk usage; Postgres logs |
| **First action** | Free space or expand volume; pause non-essential writes |
| **Recovery** | Vacuum/analyze if bloat; archive old audit if policy exists (not automated in repo) |
| **Escalate when** | Imminent data loss |

---

## Structured logs

os-api outbox worker emits JSON logs:

```json
{"level":"info","component":"outbox-worker","message":"..."}
```

Collect stdout from API process. No centralized log platform is configured in repo (gap — see Step 17 evidence).

---

## TRIAGE: WEB VS API VS CLOCK VS AUTH VS COMMAND VS STALE

Use this to tell the failure apart before the sections above. Do not paste tokens, customer names, SQL, or stack traces into tickets. Staff screens already hide those.

| What you see | Usually | Confirm | Then |
|-|-|-|-|
| Browser blank or unreachable, and `./scripts/os-health-check.sh` prints `HEALTHY` | Web | `GET /v1/health` still returns liveness `ok` (`check: liveness`) | Restart the web process. The API is up. If this started after a release, see BAD DEPLOY |
| `./scripts/os-health-check.sh` prints `FAIL` or `UNHEALTHY` | API | `GET /v1/health` does not return liveness | API DOWN |
| Lists load, but a past-due follow-up never becomes overdue | Attention clock | `GET /v1/health/ready` → `attentionClock.running` and `lastError`. Optional: `OS_HEALTH_CHECK_READINESS=1 ./scripts/os-health-check.sh` | FOLLOW-UP NOT OVERDUE AFTER DUE TIME |
| Health is OK, but sign-in fails or a saved action says the session expired; API 401/403 | Auth or access provider | `GET /v1/health/ready` → `runtime.authMode`. Do not copy cookies or keys | AUTH FAILURE and EXPIRED / ROTATED SECRET |
| One action fails; lists still load. The form says to sign in, that permission is missing, to refresh, or to fix the data | Command | Not a platform outage. Nothing was saved on a session-expired command | Correct the form, permission, or sign-in. Do not treat as API down |
| Pages load and say the information may be outdated | Stale read | `GET /v1/health/ready` → `outboxWorker` and `pending` | PROJECTION STALE and OUTBOX BACKLOG. Do not tell ordinary staff about queues or dead letters |

Liveness is `GET /v1/health`. Readiness (database, worker, attention clock) is `GET /v1/health/ready`. The portable check is `./scripts/os-health-check.sh` (liveness only unless `OS_HEALTH_CHECK_READINESS=1`). Neither check mutates data.
