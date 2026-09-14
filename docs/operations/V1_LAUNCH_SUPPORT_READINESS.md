# V1 launch support readiness

**Status:** operator prep. Not a hosted acceptance record.  
**Does not replace** `docs/operations/INCIDENT_RUNBOOK.md`. Use that file for live incident triage. This note only fills gaps that file does not own, and records what must not be mutated before Isa/Álvaro use staging.

Do not execute the importer. Do not reverse the real client import batch. Do not create Isa or Álvaro accounts from this note.

## Where to look first

| Symptom | Existing procedure | This note |
| --- | --- | --- |
| API down, DB down, auth 401/403, outbox, dead letter, overdue clock, stale projection, bad deploy | `INCIDENT_RUNBOOK.md` | Health checks below |
| Deploy / migration rollback | `DEPLOYMENT_RUNBOOK.md` | Forward-fix if a migration already applied. Do not delete `_prisma_migrations`. |
| Backup / restore | `BACKUP_RESTORE_RUNBOOK.md` | Logical `pg_dump` is the documented copy. PITR is not a proven runbook. |
| Attention clock | `OVERDUE_ATTENTION_CLOCK.md` | Ready when `/v1/health/ready` shows `attentionClock.running` and `lastError` null |
| Secrets | `SECRET_ROTATION_RUNBOOK.md` | Invite uses the service role. After rotation, one test invite on a synthetic member only |

## Health

- Web: process up, login page loads, no `OS_AUTH_MODE=dev` on the public host.
- API: `GET /v1/health` and `GET /v1/health/ready`.
- Ready should show the attention clock running when the clock is enabled, and no last error.
- Outbox: `GET /v1/operations/outbox` and dead letters at `GET /v1/operations/outbox/dead-letters` (people.admin). Retry is the existing recovery command, not a new event.

## Login / auth failure

1. Confirm the host is `OS_AUTH_MODE=supabase` and the web flag matches.
2. Staff see Spanish copy only. A raw provider or Supabase message is a defect, not a diagnosis to paste into chat.
3. Wrong password stays on login. No membership after a valid provider login signs the provider session out and shows the membership message.
4. Suspended or revoked access must not bounce between Inicio and login. The recovery button clears the web session, then login explains the reason.
5. Session expired mid-form: nothing from that submit was saved. The form says to sign in again.
6. There is no in-app password reset. Recovery is the access provider (invite / reset in the auth project). That is an acceptable pilot limitation, not a SQL fix.

## Invite failure

1. Confirm `SUPABASE_SERVICE_ROLE_KEY` is present on the API. Missing key fails at invite time.
2. The UI does not create or reset passwords. The person finishes access in the provider.
3. If the provider invite fails, do not invent a second membership. Use the existing retry path only if the product exposes it. `RetryAuthProviderSync` is not in the employee UI.
4. Role comes from a key already on the directory. Cargo does not create a role. `ChangeRole` ends every active assignment and inserts one key. Do not use it to add a leadership scope on top of another role.

## Command failure

A single failed action is not an outage.

- Session expired: nothing saved.
- Conflict: the action already landed, or the page is stale. Refresh. Do not submit again expecting a second order or a second approval.
- Validation: the record was not changed.
- Do not repair a wrong command by editing rows. Use the existing command (reassign, suspend, deactivate) if the actor holds that scope.

## Incorrect owner

Reassignment is `commercial.account.reassign` only. `people.admin`, team read, and org read do not grant it. There is no ops SQL for this. If nobody holds the scope, that is a one-time additive role-assignment outside `ChangeRole`, recorded and reversible by ending that assignment. Do not infer it from Cargo.

## Incorrect customer data

Edit in Cliente 360 if the actor holds `master_data.admin`. Deactivate is the reversible path for a wrong party. Do not delete. Do not run `ReverseImportBatch` against the real workbook batch: that deactivates batch-created customers, contacts, and locations.

Extra phone numbers that did not import are an import receipt (`EXTRA_PHONE_NOT_IMPORTED`). They are not a staff banner. Do not re-import to “fix” them.

## Capability grant / revoke

- A scope is a role assignment. Ending it removes the scope on the next read.
- `ChangeRole` replaces the whole set. It is not an additive grant.
- Delegation (`approval.act`) is separate and is revoked with `RevokeDelegation`.
- Suspend drops access immediately at the OS gate. Reactivation does not prove the old provider token is dead until it expires.
- There is no staff UI to grant a scope that nobody on the directory already holds.

## Synthetic residue — identification only

Do not delete. Do not mutate staging from this document.

Protect:

- Parties linked from `os_import_rows` of the real `xls_datos_clientes` imported batch (`createdByBatch`).
- The staging operator membership still required to sign in.
- Isolation fixture: org name containing `ISOLATION Tenant B`, customer `Isolation Customer B S.R.L.`, member email `isolation.b.…@isalwa.demo` (no Supabase user), opportunity title `Isolation opp B — do not use in UAT`.

Candidates to classify, then deactivate only after a written id list that is disjoint from the import-created set:

| Marker | Why it is synthetic |
| --- | --- |
| `Cliente Step17 S.A.`, NIT `987654321` | Staging / Step17 seed |
| `carmen.staging@isalwa.demo`, person Carmen Staging | Staging bootstrap admin — protect if this is still the operator |
| `maria.quispe.stg-…@isalwa.demo`, María Quispe | Staging synthetic employee |
| Opportunity `Reposición sanitarios — El Alto` | Staging seed |
| Quote notes `Cotización sintética de staging` | Staging seed |
| Quote notes `isolation fixture` | Tenant B — do not touch |
| Playwright notes `Nota smoke Playwright`, `Línea browser smoke` | Browser smoke |
| Provider subjects `ui-live-3-…`, `ui-live-3b-…` | Live UI smoke |

Work and approvals have no synthetic flag. Classify them only by subject or owner already on the list above.

Rollback of a mistaken deactivation is the existing reactivate/activate command for that entity, not a restore of the whole database, unless the wrong set was touched. Then use the logical backup, not the importer.

## What still needs Carmen before accounts exist

See the launch handoff for Isa and Álvaro field lists. Do not create those users until name, email, manager, and each scope are confirmed. Do not map Cargo to a scope.
