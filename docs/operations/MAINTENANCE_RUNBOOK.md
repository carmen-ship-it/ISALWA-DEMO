# Maintenance Runbook — ISALWA OS

Safe dependency and runtime maintenance. **No automatic major-version upgrades.**

---

## Before any maintenance window

1. [ ] Backup database ([BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md))
2. [ ] Note current git tag / deploy version for rollback
3. [ ] Run verification suite on current main:

```bash
export OS_DATABASE_URL=postgresql://isalwa:isalwa@localhost:5432/isalwa
./scripts/verify-step-14-2.sh
./scripts/verify-step-15-1.sh
```

---

## Package updates (pnpm)

```bash
pnpm install
pnpm typecheck
pnpm --filter @isalwa/os-database test
pnpm --filter @isalwa/os-api test
pnpm --filter @isalwa/os-api build
```

**Policy:**

| Change type | Approach |
|-------------|----------|
| Patch / minor (same major) | Update lockfile; run tests; deploy |
| Major version | Manual review; read migration guide; dedicated PR |
| NestJS / Next.js / Prisma major | Full regression + migration review |

**Do not** run `pnpm update -r` blindly on production release day.

---

## Prisma updates

```bash
pnpm --filter @isalwa/os-database prisma:generate
pnpm --filter @isalwa/os-database typecheck
pnpm --filter @isalwa/os-database test
```

If Prisma upgrade changes migration format:

1. Test `migrate:deploy` on throwaway DB.
2. Review generated client diff in `packages/os-database/src/generated/`.
3. Never edit applied migration SQL retroactively.

Current version: Prisma ^6.5.0 (`packages/os-database/package.json`).

---

## Node.js runtime updates

Root engines: `"node": ">=22"`.

1. Update local + CI Node to target LTS.
2. Rebuild all packages.
3. Run full test suite.
4. Update production host Node before deploy.

---

## Supabase SDK updates

Package: `@supabase/supabase-js` in os-api and os-web.

1. Update in both apps together.
2. Test JWT session path (`OS_AUTH_MODE=supabase`) in staging.
3. Test admin port if service role used.

---

## Security patches

1. Run `pnpm audit` (review; do not auto-fix breaking changes).
2. Prioritize os-api, os-database, os-web, auth-related deps.
3. Patch deploy can skip feature work but **not** skip backup + health smoke.

---

## Post-update smoke (runtime)

```bash
export OS_DATABASE_URL=...
pnpm --filter @isalwa/os-api start &
sleep 3
./scripts/os-health-check.sh
kill %1
```

With UI (Agent 4):

```bash
pnpm --filter @isalwa/os-web build
```

---

## Rollback awareness

| Layer | Rollback |
|-------|----------|
| Application | Redeploy previous artifact |
| Dependencies | Revert lockfile commit |
| Database migration | Forward-fix preferred; else restore backup |
| Node version | Reinstall previous Node on host |

---

## Migration review checklist (schema changes)

1. [ ] ADR or evidence doc updated if architectural
2. [ ] Migration SQL reviewed for destructive ops
3. [ ] Backup taken before production apply
4. [ ] `migrate:deploy` tested on copy of production schema
5. [ ] Roll-forward plan documented if deploy fails

---

## Scheduled maintenance cadence (recommended)

| Task | Frequency |
|------|-----------|
| Dependency patch review | Monthly |
| Backup restore drill | Quarterly (use `verify-step-17-backup-restore.sh`) |
| Secret rotation review | Quarterly or on personnel change |
| Node LTS evaluation | On Node LTS release schedule |

---

## Out of scope (requires separate decision)

- Automated dependency bots merging to main without review
- Blue/green or canary deploy tooling (not in repo)
- Managed Postgres version upgrades (provider console)
