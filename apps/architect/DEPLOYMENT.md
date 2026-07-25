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

---

## Required environment variables

**None are required** for a working pilot deploy. Without Supabase keys, Architect uses **pilot cookie auth** (Carmen / Álvaro).

| Variable | Required | Purpose |
| --- | --- | --- |
| `ARCHITECT_LLM_API_KEY` | No | OpenAI-compatible API key |
| `OPENAI_API_KEY` | No | Alias for the same key |
| `ARCHITECT_LLM_BASE_URL` | No | Default `https://api.openai.com/v1` |
| `ARCHITECT_LLM_MODEL` | No | Default `gpt-4o-mini` |
| `NEXT_PUBLIC_SUPABASE_URL` | No* | Enables real Supabase Auth when set with anon key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No* | Enables real Supabase Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Server-side admin (future seed / persistence) |
| `ARCHITECT_PILOT_CARMEN_PASSWORD` | No | Override pilot password (default `Architect2026!`) |
| `ARCHITECT_PILOT_ALVARO_PASSWORD` | No | Override pilot password |
| `NEXT_PUBLIC_ARCHITECT_URL` | No | Future absolute site URL |

\* For production customer pilots, configure Supabase Auth and create matching users for Carmen / Álvaro emails. See [MISSION10.md](./MISSION10.md).

See `.env.example` for the full list.

Set variables in Vercel → Project → Settings → Environment Variables for Production / Preview / Development as needed.

### Pilot login (no Supabase)

| User | Email | Role | Default password |
| --- | --- | --- | --- |
| Carmen | `carmen@isalwa.demo` | Consultant | `Architect2026!` |
| Álvaro | `alvaro@abc.demo` | Client | `Architect2026!` |

---

## Production deployment checklist

1. Create a dedicated Vercel project for Architect (not the ISALWA web project).
2. Set **Root Directory** to `apps/architect`.
3. Confirm Install / Build commands match `vercel.json`.
4. Add optional LLM keys only if you want live model completions.
5. Deploy a Preview → open `/` and `/discovery` → confirm workspace loads.
6. Promote to Production.
7. Keep ISALWA web / API projects pointed at their own roots (`apps/web`, etc.).

---

## Future Supabase setup

**Auth (Mission 10):** Set `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then create email/password users for the seeded pilot emails. App roles still resolve from the access directory (Carmen = consultant, Álvaro = client).

**Company memory:** Still interfaces + local/browser store today.

When wiring persistence:

1. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only (never `NEXT_PUBLIC_`).
2. Implement the existing repository interfaces — do not invent a parallel memory model.
3. Migrate local workspaces carefully; never silently drop company memory.

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
