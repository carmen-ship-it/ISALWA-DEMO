# Wave 2 fixture tool pin (not the hosted app)

**HOSTED_APP_SHA** (live staging API+web): `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**FIXTURE_TOOL_SHA**: `2506f4f4731cfa333c7c61b8d59ca6599280711c`

These are different. Do not treat the fixture tool commit as a redeploy of the hosted app.

## Clean-room package manager

Governed path uses **Corepack** only (`packageManager: pnpm@9.15.4`).  
Do **not** install a global `pnpm` binary.

`fixture:wave2-roles:prepare` invokes **`corepack pnpm`** (not bare `pnpm`), so it respects `packageManager: pnpm@9.15.4` without a global pnpm install.

Note: a nested bare `pnpm` fails with `sh: pnpm: command not found` when only Corepack provides pnpm. Local `turbo run build` also fails in that environment because turbo still looks up the package-manager binary.

## Clean-room failure history

1. Missing gitignored `dist/` → need prepare/build  
2. Nested bare `pnpm` in prepare → `sh: pnpm: command not found` when only Corepack provides pnpm  

## Clean-room prerequisite

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run fixture:wave2-roles:prepare
```

Smoke without secrets (must print `STAGING_FIXTURE_CONFIRM_REQUIRED` and exit 1):

```bash
corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
```

`command -v pnpm` may be empty; that is OK.

## Guards (fail closed before writes)

1. `STAGING_FIXTURE_CONFIRM=1`  
2. Required env present  
3. `SUPABASE_URL` project ref = `qbpxuywtoycjpitxoblo`  
4. `OS_DATABASE_URL` host contains `dpg-dajd3kh5efls738falcg-a`  
5. Connect  
6. `current_database()` = `isalwa_os_staging`  
7. `_prisma_migrations` count = `29`  
8. Synthetic org ≠ real `ISALWA Staging` tenant ids  
9. Writes only then

## Run later (authorized staging pass only)

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm run fixture:wave2-roles:prepare
export OS_DATABASE_URL=…   # staging external URL only
export SUPABASE_URL=https://qbpxuywtoycjpitxoblo.supabase.co
export SUPABASE_ANON_KEY=…
export SUPABASE_SERVICE_ROLE_KEY=…
export STAGING_FIXTURE_CONFIRM=1
corepack pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
# or: corepack pnpm run fixture:wave2-roles
```

Identities: exactly nine `w2.*@isalwa.demo` emails (see guards).  
Capabilities: `V1_PLANNED_ASSIGNMENTS` only.
