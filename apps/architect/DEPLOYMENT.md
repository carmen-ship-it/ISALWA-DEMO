# Deployment — ISALWA Architect

Architect is a **standalone Next.js 15 app** at `apps/architect`.  
It does **not** depend on `@isalwa/web`, `@isalwa/ui`, or the ISALWA OS product shell.

Deploy it as its **own Vercel project**. Do not point the main ISALWA web project at this folder.

---

## Local development

From the monorepo root:

```bash
pnpm install
pnpm --filter @isalwa/architect dev
```

Or from this package:

```bash
cd apps/architect
pnpm install   # prefer root install in the monorepo
pnpm dev
```

Next.js prints the local URL (default port **3100** so it stays clear of ISALWA web on 3000).

Copy environment defaults:

```bash
cp .env.example .env.local
```

No secrets are required for local discovery — the heuristic LLM and local company memory work without keys.

---

## Scripts

| Command | Where | Purpose |
| --- | --- | --- |
| `pnpm build` / `npm run build` | `apps/architect` | Production Next.js build |
| `pnpm lint` / `npm run lint` | `apps/architect` | ESLint |
| `pnpm typecheck` / `npm run typecheck` | `apps/architect` | TypeScript |
| `pnpm --filter @isalwa/architect build` | monorepo root | Build Architect only |
| `pnpm build` | monorepo root | Turbo build of all packages |

---

## Deploy to Vercel

### Recommended settings

Create a **new** Vercel project linked to this monorepo:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/architect` |
| Framework Preset | Next.js |
| Install Command | from `vercel.json` (pnpm filter from monorepo root) |
| Build Command | `pnpm run build` |
| Output | Next.js default (`.next`) |

`vercel.json` in this folder scopes install/build to Architect so the ISALWA web app is unaffected.

### CLI (optional)

```bash
cd apps/architect
vercel
```

Promote to production only after a green preview build.

### Caching (no hard-refresh required)

Architect is configured so **normal reload / next visit** picks up a new deploy:

| Asset | Cache |
| --- | --- |
| HTML / app documents | `private, no-store` (middleware + `next.config` + `force-dynamic` layout) |
| `/_next/static/*` (JS/CSS) | Long-lived **immutable** (content-hashed filenames) |

After a production deploy finishes, clients fetch fresh HTML, which points at the new hashed bundles. They should **not** need a hard refresh. A brief cutover window can still exist while Vercel aliases the new deployment; a normal refresh a few seconds later is enough.

---

## Required environment variables

**None are required** for a solo/dev deploy. Without Supabase keys, Architect uses **pilot cookie auth** + **localStorage** (Carmen / Álvaro).

For the **shared ISALWA pilot** (Carmen + Álvaro on the same data), set Supabase URL + anon key and follow [supabase/OPERATOR_GUIDE.md](./supabase/OPERATOR_GUIDE.md).

| Variable | Required | Purpose |
| --- | --- | --- |
| `ARCHITECT_LLM_API_KEY` | No | OpenAI-compatible API key |
| `OPENAI_API_KEY` | No | Alias for the same key |
| `ARCHITECT_LLM_BASE_URL` | No | Default `https://api.openai.com/v1` |
| `ARCHITECT_LLM_MODEL` | No | Default `gpt-4o-mini` |
| `NEXT_PUBLIC_SUPABASE_URL` | For shared pilot | Enables Supabase Auth + shared persistence |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For shared pilot | Browser-safe anon key (RLS enforced) |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-only admin — never `NEXT_PUBLIC_` |
| `ARCHITECT_PILOT_CARMEN_PASSWORD` | No | Override pilot cookie password (default `Architect2026!`) |
| `ARCHITECT_PILOT_ALVARO_PASSWORD` | No | Override pilot cookie password |
| `NEXT_PUBLIC_ARCHITECT_URL` | No | Absolute site URL when needed |

See `.env.example` for the full list.

Set variables in Vercel → Project → Settings → Environment Variables for Production / Preview / Development as needed. **Redeploy after changing Supabase keys.**

### Pilot login

| User | Email | Role | Password source |
| --- | --- | --- | --- |
| Carmen | `carmen@isalwa.demo` | Consultant | Supabase dashboard (or cookie default `Architect2026!` when Supabase unset) |
| Álvaro | `alvaro@isalwa.demo` | Client | Same |

After login both open **ISALWA** (`/workspace/ws_isalwa`) directly — no company picker.

---

## Production deployment checklist

1. Create a dedicated Vercel project for Architect (not the ISALWA web project).
2. Set **Root Directory** to `apps/architect`.
3. Confirm Install / Build commands match `vercel.json`.
4. Configure Supabase (SQL + users) per [supabase/OPERATOR_GUIDE.md](./supabase/OPERATOR_GUIDE.md).
5. Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel.
6. Add optional LLM keys only if you want live model completions.
7. Deploy a Preview → Carmen and Álvaro log in → confirm same ISALWA workspace.
8. Promote to Production.
9. Keep ISALWA web / API projects pointed at their own roots (`apps/web`, etc.).

---

## Supabase persistence (ISALWA pilot)

- SQL migrations: `supabase/migrations/001_pilot_persistence.sql` then create users then `002_link_pilot_users.sql`
- Full operator steps: [supabase/OPERATOR_GUIDE.md](./supabase/OPERATOR_GUIDE.md)
- App uses the same `CompanyMemoryStore` interfaces; `SupabaseCompanyMemoryStore` when env is set
- Shared updates: refresh/focus at minimum; Realtime when enabled on workspace tables
- `SUPABASE_SERVICE_ROLE_KEY` stays server-only

---

## Future OpenAI setup

Today, missing keys → `LocalHeuristicProvider` (deterministic).

When enabling live LLM:

1. Set `ARCHITECT_LLM_API_KEY` or `OPENAI_API_KEY` on Vercel.
2. Optionally set `ARCHITECT_LLM_BASE_URL` / `ARCHITECT_LLM_MODEL` for Azure, Groq, Together, Ollama, etc.
3. Prefer server-side usage only — never expose the API key to the browser.
4. Keep consulting / process / deliverable engines deterministic unless a mission explicitly opts into LLM-assisted narrative.

---

## Independence from ISALWA OS

- Package: `@isalwa/architect`
- No `@isalwa/ui` / `@isalwa/web` imports
- Separate port locally (3100)
- Separate Vercel project in production

Changing Architect deployment must never alter the ISALWA web production pipeline.
