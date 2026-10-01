# Secret Rotation Runbook — ISALWA OS

Documents **categories** of secrets only — never values.

---

## Secret inventory

| Secret | Owner | Used by | Rotation impact | Restart required? |
|--------|-------|---------|-----------------|-------------------|
| `OS_DATABASE_URL` (password embedded) | ISALWA infra | os-api, Prisma, migration CI | DB connection drop until updated | **Yes** — os-api + migration jobs |
| `SUPABASE_URL` | Supabase project | os-api session, admin port | Auth verify fails if wrong project | **Yes** — os-api |
| `SUPABASE_ANON_KEY` | Supabase project | os-api JWT verify, os-web browser | Login fails if mismatched with URL | **Yes** — os-api; **Redeploy** — os-web |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project | Workforce invite/revoke/email admin | Admin auth ops fail; session unaffected | **Yes** — os-api |
| `NEXT_PUBLIC_SUPABASE_*` | Supabase project | os-web client | Browser auth breaks | **Redeploy** os-web |
| `NEXT_PUBLIC_OS_API_URL` | ISALWA infra | os-web | UI calls wrong host | **Redeploy** os-web |
| Legacy `DATABASE_URL` | ISALWA infra | legacy api/web only | Legacy demo only | Legacy services |
| LLM / third-party keys | ISALWA | Architect, legacy mocks | Feature-specific | Service-specific |

---

## OS_DATABASE_URL

**Used by:** `packages/os-database` Prisma client, all os-api stores.

**Rotation steps:**

1. Create new DB role password in PostgreSQL (or rotate managed-DB credential).
2. Update secret in deployment env (not git).
3. Verify connection: `psql "$OS_DATABASE_URL" -c 'SELECT 1'`.
4. Restart os-api.
5. Run read-only smoke: `./scripts/os-health-check.sh`.

**Recovery if broken:** Roll back to previous password if still valid; otherwise restore DB access via provider console.

---

## Supabase — session keys (anon + URL)

**Used by:** `apps/os-api/src/os-session.ts` (`sessionFromSupabaseJwt`).

**Rotation steps:**

1. Rotate anon key in Supabase dashboard (or create new project — migration of users required).
2. Update `SUPABASE_URL`, `SUPABASE_ANON_KEY` on os-api.
3. Update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` on os-web.
4. Restart os-api; redeploy os-web.
5. Test login end-to-end.

**Impact:** Active JWTs may invalidate depending on Supabase rotation policy — users re-login.

**Password ownership:** End-user passwords are **only** in Supabase Auth — OS never stores password hashes.

---

## Supabase — service role

**Used by:** `packages/os-workforce/src/supabase-auth-provider.ts` (invite, revoke, email change).

**Rotation steps:**

1. Rotate service role key in Supabase dashboard.
2. Update `SUPABASE_SERVICE_ROLE_KEY` on os-api **only** (never browser).
3. Restart os-api.
4. Test one admin command (e.g. invite flow in staging).

**Recovery if leaked:** Rotate immediately; audit Supabase auth logs; assume breach until confirmed.

---

## Dev mode secrets

Dev auth uses **no shared secret** — session headers validated against DB. Protect dev endpoints:

- Do not expose `OS_AUTH_MODE=dev` to public internet.
- Restrict `/v1/dev/bootstrap` at network edge in any shared environment.

---

## Rotation checklist (any secret)

1. [ ] Identify all services reading the secret (table above).
2. [ ] Update production/staging env store.
3. [ ] Restart or redeploy each consumer.
4. [ ] Run health + one authenticated smoke test.
5. [ ] Document rotation date in ISALWA ops log (external to repo).
6. [ ] Revoke old credential at provider when supported.

---

## What NOT to do

- Do not commit rotated values to `.env.example`.
- Do not paste secrets into agent chats or issues.
- Do not use `SUPABASE_SERVICE_ROLE_KEY` in os-web or any `NEXT_PUBLIC_*` variable.
