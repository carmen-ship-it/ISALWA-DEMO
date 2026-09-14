# Wave 2 fixture tool pin (not the hosted app)

**HOSTED_APP_SHA** (live staging API+web): `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**FIXTURE_TOOL_SHA**: `86c8264757f4e102828a7258cb5512ff95cbe196`

These are different. Do not treat the fixture tool commit as a redeploy of the hosted app.

## Clean-room failure root cause (fixed by prepare)

Workspace packages such as `@isalwa/ts-utils` declare `main`/`exports` → `./dist/index.js`.  
`dist/` is **gitignored**, so a fresh worktree after `pnpm install --frozen-lockfile` links the package but **has no build output**. Node then fails with:

`MODULE_NOT_FOUND` … `node_modules/@isalwa/ts-utils/dist/index.js`

This is **not** a Node 24 incompatibility (`engines.node: ">=22"`; CI uses 22).

## Clean-room prerequisite

```bash
pnpm install --frozen-lockfile
pnpm run fixture:wave2-roles:prepare   # builds @isalwa/os-database^... (incl. ts-utils)
```

Smoke without secrets (must print `STAGING_FIXTURE_CONFIRM_REQUIRED` and exit 1):

```bash
pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
```

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
pnpm install --frozen-lockfile
pnpm run fixture:wave2-roles:prepare
export OS_DATABASE_URL=…   # staging external URL only
export SUPABASE_URL=https://qbpxuywtoycjpitxoblo.supabase.co
export SUPABASE_ANON_KEY=…
export SUPABASE_SERVICE_ROLE_KEY=…
export STAGING_FIXTURE_CONFIRM=1
pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
# or: pnpm run fixture:wave2-roles
```

Identities: exactly nine `w2.*@isalwa.demo` emails (see guards).  
Capabilities: `V1_PLANNED_ASSIGNMENTS` only.
