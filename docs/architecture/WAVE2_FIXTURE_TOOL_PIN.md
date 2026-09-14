# Wave 2 fixture tool pin (not the hosted app)

**HOSTED_APP_SHA** (live staging API+web): `ef7eeabdea5f8f4449ba706caa1a323435d96fcc`  
**FIXTURE_TOOL_SHA**: `972ef7765b34a31daf970f4f81858de2ee3a7a97`

These are different. Do not treat the fixture tool commit as a redeploy of the hosted app.

## Guards (fail closed before writes)

1. Required env present  
2. `STAGING_FIXTURE_CONFIRM=1`  
3. `SUPABASE_URL` project ref = `qbpxuywtoycjpitxoblo`  
4. `OS_DATABASE_URL` host contains `dpg-dajd3kh5efls738falcg-a`  
5. Connect  
6. `current_database()` = `isalwa_os_staging`  
7. `_prisma_migrations` count = `29`  
8. Synthetic org ≠ real `ISALWA Staging` tenant ids  
9. Writes only then

## Run later (not this commit pass)

```bash
export OS_DATABASE_URL=…   # staging external URL only
export SUPABASE_URL=https://qbpxuywtoycjpitxoblo.supabase.co
export SUPABASE_ANON_KEY=…
export SUPABASE_SERVICE_ROLE_KEY=…
export STAGING_FIXTURE_CONFIRM=1
pnpm --filter @isalwa/os-database exec node --import tsx src/staging-wave2-role-fixtures.ts
```

Identities: exactly nine `w2.*@isalwa.demo` emails (see guards).  
Capabilities: `V1_PLANNED_ASSIGNMENTS` only.
