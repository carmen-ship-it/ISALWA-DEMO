# ISALWA OS Web (`apps/os-web`)

Production employee/admin shell for ISALWA OS. Spanish-first, role-aware navigation, centralized OS API client.

This is **not** the legacy demo (`apps/web`). It talks only to `apps/os-api` — never to legacy Account/ActivityEvent APIs.

## Prerequisites

- Node.js ≥ 22
- pnpm 9 (monorepo root)
- Running `os-api` (default `http://localhost:4001/v1`)

## Environment variables

Create `apps/os-web/.env.local`:

### Development (no Supabase)

```env
NEXT_PUBLIC_OS_AUTH_MODE=dev
NEXT_PUBLIC_OS_API_URL=http://localhost:4001/v1
```

Login uses **Entrar (desarrollo)** → `POST /v1/dev/bootstrap` and stores a signed dev session cookie. `os-api` must run with `OS_AUTH_MODE=dev` (default).

### Production (Supabase IdP)

```env
NEXT_PUBLIC_OS_AUTH_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_OS_API_URL=https://your-os-api.example/v1
```

`os-api` must run with `OS_AUTH_MODE=supabase`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. The user's Supabase subject must map to an active `AuthIdentity` + `OrganizationMember` in the OS workforce store.

## Commands

From repo root:

```bash
pnpm install
pnpm dev:os-api          # terminal 1 — OS API on :4001
pnpm dev:os-web          # terminal 2 — UI on :3200
```

Within the app:

```bash
pnpm --filter @isalwa/os-web build
pnpm --filter @isalwa/os-web test
pnpm --filter @isalwa/os-web typecheck
```

## Auth flow

1. **Middleware** (`middleware.ts`) — unauthenticated users → `/login`.
2. **Supabase** — email/password via `@supabase/ssr`; JWT sent as `Authorization: Bearer` to os-api.
3. **Dev** — bootstrap creates httpOnly cookie with validated dev headers (`x-os-*`).
4. **Authority** — os-api `resolveSession` is the only access gate. Browser nav visibility is UX only.

## Routes

| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/inicio` | Attention / work / approvals (real reads, honest empty) |
| `/trabajo` | Open work list (`GET /v1/work-items?status=open`) |
| `/trabajo/[id]` | Work detail read-only (`GET /v1/work-items/:id`) |
| `/aprobaciones` | Pending approvals read-only (`GET /v1/approvals`) |
| `/aprobaciones/[id]` | Approval detail read-only (`GET /v1/approvals/:id`) |
| `/clientes` | Party search list (`GET /v1/parties`) |
| `/clientes/[partyId]` | Canonical party detail read-only |
| `/administracion` | Admin placeholder; server 403 if not `people.admin` |
| `/finanzas`, `/mensajes` | Locked capability states |

## Work / approval read surfaces (UI-3)

| Surface | API | Notes |
|---------|-----|-------|
| Inicio attention | `GET /v1/attention` | Derived items — UI explains `reasonCode`, links to trabajo/aprobaciones |
| Trabajo list | `GET /v1/work-items?status=open` | Shows title, owner, due, priority, approval state |
| Aprobaciones list | `GET /v1/approvals` | Read-only — no approve/reject buttons |
| Member names | `GET /v1/members/:id` | Resolved server-side; falls back to "Miembro del equipo" |
| Stale banner | `freshness.isStale` on list responses | Shown when projection may lag |

Attention items are **derived**, not authoritative tasks. Copy in `AttentionList` makes this explicit.

## Clientes / Party read surfaces (UI-2)

| Surface | API | Notes |
|---------|-----|-------|
| Clientes list | `GET /v1/parties` | Search `q`, filter `roleKey`, `status`, cursor pagination |
| Cliente detail | `GET /v1/parties/:id` | party + roles + contacts + commercialAccount |
| Multi-role | `activeRoleKeys` / `roles[]` | One company, many badges — not duplicate records |
| Related work | `GET /v1/work-items?subjectType=party&subjectId=` | One call on detail page |
| Fiscal data | — | **Not on HTTP** — honest deferral in UI |
| Commercial 360 | — | Locked placeholders until read projections verified |

Party semantics: **one canonical entity** with multiple business relationships (Cliente + Proveedor on same row).

## API client

Use `createOsApiClient(auth)` from `lib/api/os-api-client.ts`. Do not scatter `fetch()` in components.

## Adding a new authorized screen

1. Add route under `app/(app)/your-route/page.tsx`.
2. Add nav item in `lib/navigation/nav-config.ts` if needed.
3. Fetch data via `getServerOsAuthContext()` + `createOsApiClient()` in Server Components, or a dedicated hook wrapping the client for Client Components.
4. Handle `OsApiError` with Spanish states from `lib/api/os-api-errors.ts`.
5. Add tests if behavior is non-trivial.

## Capability / locked states

Static manifest: `lib/capabilities/manifest.ts` until `GetCapabilityState` HTTP exists. Nav badges: **PRÓXIMAMENTE** / **NO CONFIGURADO**.

## Design system

Import from `@isalwa/ui` and `@isalwa/ui/tokens.css`. Do not duplicate primitives.

## Deployment

Standard Next.js 15 build. Set env vars in the host (Vercel, etc.). Ensure `NEXT_PUBLIC_OS_API_URL` points to production os-api with CORS allowing the web origin.

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Login loops | Cookie domain, Supabase redirect URLs, middleware matcher |
| "No vinculada a la empresa" | Supabase user lacks `AuthIdentity` link in workforce store |
| API 401 | Token expired — sign out/in; verify `OS_AUTH_MODE` matches |
| API connection refused | `os-api` running; `NEXT_PUBLIC_OS_API_URL` correct |
| Admin nav hidden | Expected unless `GET /v1/operations/outbox` returns 200 for your member |

## Accessibility (UI-0 baseline)

Keyboard focus on nav and forms; semantic landmarks (`main`, `nav`); `aria-current` on active nav; Spanish `role="alert"` on errors. Full WCAG audit deferred.
