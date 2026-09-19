# Staging maintainer runbook

Minimum notes so another engineer can operate **staging** without chat history. This is not a production runbook.

**Production ownership and access are not evidenced in this repository.** Do not deploy production from these steps. Do not invent production service IDs, database URLs, or backup policy.

Secrets stay in the operator vault (`~/.isalwa-secrets/`, mode 600) and in the host dashboard. Never commit them.

## Repo layout

pnpm workspace. The employee product is the OS apps, not the legacy demo.

| Path | Role |
|------|------|
| `apps/os-web` | Employee web shell (Next.js). Talks only to `apps/os-api`. |
| `apps/os-api` | Commands, queries, session. |
| `packages/os-database` | Prisma schema, migrations, `OS_DATABASE_URL`. |
| `packages/os-contracts` | Shared command and read-model contracts. |
| `packages/ui` | Design system. Do not add a second component system. |
| `apps/web`, `apps/api` | Legacy. Not the staging OS. |
| `docs/operations/` | Operator notes, including this file and `BACKUP_RESTORE_RUNBOOK.md`. |

Root `README.md` still orients to the legacy apps. For the OS shell, start at `apps/os-web/README.md`.

## Auth

Login is Supabase Auth. Business rows live in Render Postgres (`OS_DATABASE_URL`), not in the Auth database.

Documented staging Auth project: `isalwa-os-auth-staging`, ref `qbpxuywtoycjpitxoblo`, region `sa-east-1`. Source: `docs/operations/PRODUCTION_OWNERSHIP_AND_COSTS.md` and `STAGING_HOST_OPERATOR_CHECKLIST.md`. Re-check the dashboard before relying on that ref. Do not reuse `Isalwa-Arquitect`.

## Staging hosts

| Service | Render service ID | URL |
|---------|-------------------|-----|
| os-web-staging | `srv-dajddb67bikc73bl42q0` | https://os-web-staging.onrender.com |
| os-api-staging | `srv-dajd64gae00c739gpk20` | https://os-api-staging.onrender.com |
| Postgres `isalwa-os-staging` | `dpg-dajd3kh5efls738falcg-a` | Not a public URL. Connection string is a secret. |

These IDs are the ones recorded in operations receipts in this repo. Confirm with `render services` before a deploy if the dashboard may have changed.

## Identify the deployed SHA

```bash
render deploys list srv-dajddb67bikc73bl42q0 -o json
render deploys list srv-dajd64gae00c739gpk20 -o json
```

The live deploy's commit id is the deployed SHA. Do not guess from the local branch.

## Deploy staging

From a clean commit that is already on the remote. Replace `<sha>` with that full commit.

Web:

```bash
render deploys create srv-dajddb67bikc73bl42q0 --commit <sha> --wait --confirm -o json
```

API (only when server or package code changed):

```bash
render deploys create srv-dajd64gae00c739gpk20 --commit <sha> --wait --confirm -o json
```

## Rollback

Rollback is **redeploy the last known-good SHA** with the same `render deploys create` command. Do not rewrite git history. Do not point staging at an unpushed commit.

## Migrations

Forward-fix only. Add a new migration. Do not delete rows from `_prisma_migrations`. Do not edit a migration that has already been applied on staging.

Apply with the existing database package command against the staging URL from the vault, never from a value pasted into git:

```bash
pnpm --filter @isalwa/os-database migrate:deploy
```

## Demo vs Real

Demo and Real are two companies for the same login, selected in the UI.

- Demo: `?datos=demo`. Banner reads `DEMO · DATOS FICTICIOS`.
- Real: `?datos=real`.

Do not treat a name that contains "demo" as proof of mode. The URL and the banner are the mode.

Disposable proof uses Demo only. Do not mutate Real customers to prove a fix.

## Protected Real seven

Do not mutate these Real customers:

- COMERCIAL ALVAREZ
- ASTRIX
- GARCIA
- MICRISTAL
- TORREZ
- VAINSA
- IMPORTAMEC

## Not live

These are not live product capabilities. Do not describe them as shipped:

- WhatsApp send
- Interactive live map / confirmed coordinates
- Inventory or stock truth
- Financial ledger or confirmed payment
- Manufacturing system
- Partial delivery
- A production environment

## Backup and restore

Procedure: `docs/operations/BACKUP_RESTORE_RUNBOOK.md`.

Provider recovery, retention, off-host dump, and the last restore drill must be read from the provider or the local drill log at the time of the question. Do not copy an old receipt forward as if it were still current. If a field was not re-read, say UNKNOWN.

## Known post-pilot gaps

- Backup frequency, retention, PITR window, off-host dump, and last restore drill stay UNKNOWN until re-read from the provider or a drill log.
- Production access, company billing, and a second operator are not evidenced.
- Lists that exceed a hard cap now say so. That is not full pagination.
- Retry protection stops a repeated submit of the same nota, salida, or entrega. It does not define partial delivery.
- Suspend blocks while actionable work is still assigned. It does not reassign that work.
