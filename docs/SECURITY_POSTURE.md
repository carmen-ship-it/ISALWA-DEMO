# ISALWA Architect — Security Posture

**Status:** Permanent security governance for `apps/architect`. Documentation only — this file
records the *current, verified* posture; it does not change any auth, RLS, or middleware code.
**Primary sources (read first, re-verify against these before trusting a stale claim here):**
[`apps/architect/ALVARO_CARMEN_PRODUCT_AUDIT.md`](../apps/architect/ALVARO_CARMEN_PRODUCT_AUDIT.md)
(2026-07-27 full code-path audit), [`apps/architect/CHATGPT_AGENT_RECEIPT.md`](../apps/architect/CHATGPT_AGENT_RECEIPT.md),
`middleware.ts`, `lib/auth/*`, `supabase/migrations/*`, `apps/architect/DEPLOYMENT.md`, and the
`.env.example` files at repo root and `apps/architect/`.
**Related:** [`docs/PRODUCT_CONSTITUTION.md`](./PRODUCT_CONSTITUTION.md) ·
[`docs/ENGINEERING_GUIDELINES.md`](./ENGINEERING_GUIDELINES.md) ·
[`docs/OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) ·
[`docs/RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md)

This document never contains secret values — only variable **names**, policy names, and file
paths. If you find a real credential anywhere in this repo, treat it as a security incident, not
a documentation bug: rotate it, then fix the leak.

---

## 1. Approved production write paths

Production data for Architect (`ws_isalwa` and any future workspace) may only be written through:

- **Server Actions / route handlers that call `getServerSession()`** (`lib/auth/actions.ts`), which
  always re-derives role/email from Supabase's own `auth.getUser()` — never trusts a
  client-supplied role or email.
- **`SupabaseCompanyMemoryStore`** (browser client, `lib/repositories/supabase-store.ts` and
  related) writing to `architect_workspaces` / `architect_active_interviews`, gated by
  Supabase Row Level Security (RLS) via `architect_is_member()`.
- **Supabase Storage** for document uploads, via signed operations scoped to
  `storage.objects` policies keyed off the workspace-prefixed path, with filenames sanitized by
  `buildDocumentStoragePath` before becoming a storage key.
- **Supabase SQL migrations** under `apps/architect/supabase/migrations/*`, applied manually per
  [`supabase/OPERATOR_GUIDE.md`](../apps/architect/supabase/OPERATOR_GUIDE.md) — never applied by
  an agent without explicit human review and approval (see §11, Required approvals).
- **The deterministic engines** (`lib/reasoning`, `lib/consulting`, `lib/blueprint`,
  `lib/solution`, `lib/processes`, `lib/deliverables`, `lib/consulting-intelligence`, etc.) writing
  derived fields onto the in-memory/persisted `CompanyWorkspace` object as part of
  `applyInterviewToWorkspace()` / `migrateBundle()` — these never call an external service and
  never bypass the store layer above.

## 2. Forbidden write paths

- **No direct writes to Supabase from anywhere other than the browser/server Supabase clients in
  `lib/auth/supabase/*` and `lib/repositories/supabase-store.ts`.** Do not add a second Supabase
  client construction site.
- **No use of `SUPABASE_SERVICE_ROLE_KEY` in any browser-reachable code path.** As of Mission 24,
  it has exactly one reviewed, server-only reference (`lib/auth/supabase/admin.ts`, used only by
  the cron review route) — see §5 for the full exception. It must stay server-only (never
  `NEXT_PUBLIC_`-prefixed, never imported into a Client Component) and must not gain a second
  reference without the same review.
- **No client-supplied role or email ever trusted for an authorization decision.** Role always
  comes from `getServerSession()` re-deriving it from Supabase's verified JWT, never from a form
  field, query param, or cookie payload alone (see §13 threat model for the one narrow exception
  and its mitigation).
- **No bypassing `middleware.ts` route gating** by adding a new top-level route that isn't covered
  by `PUBLIC_PATHS` / `CONSULTANT_ONLY_PATHS` (`lib/auth/constants.ts`) without deliberately
  deciding which bucket it belongs to.
- **No writing fabricated/seeded evidence into a real workspace.** Per
  [`apps/architect/NO_FABRICATED_CONTENT.md`](../apps/architect/NO_FABRICATED_CONTENT.md), seed
  data for `ws_isalwa` must stay honestly empty (`createEmptyWorkspace`); no code path may inject
  synthetic `knownFacts`, meetings, or scores that a human didn't actually provide.
- **No committing `.env`, `.env.local`, or any file containing a real secret.** Only
  `.env.example` (root and `apps/architect/`) may be committed, and only with empty/placeholder
  values.

## 3. Credential policy

- All secrets are environment variables, injected via Vercel Project Settings (Production /
  Preview / Development) or a local `.env.local` — never hardcoded, never committed.
- `.gitignore` excludes all `.env*` files except `.env.example`. This has been independently
  verified against full git history (`git log --all -p -- "apps/architect/.env*"`) — no real key
  value has ever been committed.
- Pilot account passwords: the **documented default** (`Architect2026!` in
  `lib/auth/constants.ts`) is a **dev/pilot-cookie fallback only** — it is dead code once Supabase
  Auth is configured (which it is, for the shared pilot). The real, live passwords for Carmen and
  Álvaro live exclusively in the Supabase Auth dashboard and must be confirmed/rotated there,
  independent of any code change.
- Anyone who has pasted a real key into an agent chat, transcript, or issue must treat that key as
  compromised and rotate it — agent transcripts are plain local files, not a secrets vault.

## 4. Environment variable rules

- Every environment variable Architect reads is documented by name (never by value) in
  `apps/architect/.env.example` and in [`apps/architect/DEPLOYMENT.md`](../apps/architect/DEPLOYMENT.md#required-environment-variables).
- Naming convention: server-only secrets never carry a `NEXT_PUBLIC_` prefix (e.g.
  `SUPABASE_SERVICE_ROLE_KEY`, `ARCHITECT_LLM_API_KEY`); browser-safe values always do (e.g.
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- AI provider selection is env-driven only (`ARCHITECT_LLM_PROVIDER` / `_API_KEY` / `_BASE_URL` /
  `_MODEL`, with `ARCHITECT_OCR_*` / `ARCHITECT_EMBEDDINGS_*` per-route overrides) — no model id or
  vendor is ever hardcoded at a call site; every call routes through `lib/ai` (`ai.chat()` /
  `ai.embed()` / `ai.summarize()`).
- Missing AI keys are a supported, intentional state: Architect falls back to a deterministic
  `LocalHeuristicProvider` — no network call, no fabricated answer, no error. Missing Supabase
  keys are also supported: Architect falls back to pilot-cookie auth + `localStorage` persistence
  (solo/dev only; see §13 for why this must never be the production default for the shared pilot).
- New environment variables must be added to **both** `.env.example` files (root and
  `apps/architect/`) with a comment explaining purpose and default/fallback behavior — never added
  silently.

## 5. Service role handling

- `SUPABASE_SERVICE_ROLE_KEY` is provisioned in env. As of Mission 24 (Autonomous Consulting
  Cycle), it has exactly **one** reviewed, server-only use case — see the exception below. Outside
  that one path it must remain unused (or removed from env entirely on any deployment that doesn't
  run the cron).
- **Mission 24 exception (the cron review route):** `GET /api/cron/consulting-review`
  (`app/api/cron/consulting-review/route.ts`) is the first, and only, code path that constructs a
  service-role client, via `lib/auth/supabase/admin.ts`'s `createAdminSupabaseClient()`. This
  exists because a Vercel Cron invocation has **no signed-in user and no session cookie at all**
  — the normal RLS-backed write path (§1, `architect_is_member()`) has no user identity to check
  membership against, so it structurally cannot apply here the way it does for every
  browser-driven write.
  - `createAdminSupabaseClient()` lives in exactly one file, is never imported by a Client
    Component, and is never exported from any client-safe barrel (`lib/consulting-intelligence`'s
    barrel does not re-export it) — grep the repo for `lib/auth/supabase/admin` if that ever needs
    to change.
  - The route only constructs this client after the request already passed the `CRON_SECRET`
    Bearer check (`Authorization: Bearer <CRON_SECRET>`, constant-string comparison against
    `process.env.CRON_SECRET`); a request with a missing/wrong header gets `401` before the admin
    client is ever built.
  - The service-role key is never sent to the browser in any response — the route returns only
    workspace ids, booleans, and the same client-safe digest sentence `OvernightDigestCard` shows.
  - When `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are absent, the route responds
    with an honest `200` no-op (`ran: false`, explanatory `reason`) — never an error, never a
    silent fallback to some other write path.
  - Ops setup (setting the two env vars on Vercel, verifying 401 vs success): see
    [`docs/OPERATIONS_RUNBOOK.md`](./OPERATIONS_RUNBOOK.md) §3a.
- No other code path in `apps/architect` constructs a service-role client. Any future use case
  beyond the cron route requires the same review and the same documentation update here, per §11.
- Recommended standing precaution: rotate this key in the Supabase dashboard periodically, and
  treat any redeploy that removes the cron route as a signal to also remove the env var if it's no
  longer needed elsewhere.

## 6. Supabase policies (RLS)

- Every table Architect writes to (`architect_workspaces`, `architect_active_interviews`, and
  Storage's `storage.objects`) has Row Level Security enabled, scoped through
  `architect_is_member(workspace_id)` — verified end-to-end by reading the policies, not just
  confirming "RLS enabled."
- Storage policies key off the first path segment of the object key matching a workspace the
  requesting user belongs to. Downloads use signed, time-limited URLs (`createSignedUrl`, 10-minute
  expiry) — never a public bucket URL.
- **Known gap (tracked, not urgent for the 2-user pilot):** RLS is **workspace-membership-aware**
  (`architect_is_member`) but **not `kind`-aware** (`consultant` vs `owner`) for writes. Concretely,
  a `kind: 'owner'` member (Álvaro) can write to fields a `kind: 'consultant'`-gated UI panel
  (e.g. `BrandSettingsPanel`) exposes only to Carmen, because the underlying RLS policy allows any
  workspace member to write, and the gating today lives only in React. This is a real gap between
  "looks consultant-only" and "is enforced consultant-only." It must be fixed (a `kind`-aware
  policy variant or a `SECURITY DEFINER` capability function parallel to `architect_is_member`)
  **before** a second consultant or second client company is added to any workspace. See §13.
- Migrations live in `apps/architect/supabase/migrations/*`, applied in order per
  [`supabase/OPERATOR_GUIDE.md`](../apps/architect/supabase/OPERATOR_GUIDE.md). Any new migration
  that touches RLS must be reviewed for this same membership-vs-kind distinction.

## 7. LLM API policies

- All LLM/embedding calls route through the central provider abstraction (`lib/ai`) — never a
  hardcoded vendor SDK call at a feature call site. Supported providers: Gemini (default),
  OpenAI, Anthropic (chat only, no embeddings), and a deterministic local heuristic fallback.
- LLM calls are **server-side only** by design intent — the API key must never be exposed to the
  browser. `/api/documents/ocr` and `/api/documents/embeddings` are the current LLM-touching
  routes.
- **Known gap:** those routes (and `/api/interview`) currently check only "is this an
  authenticated pilot user," not workspace/role, and have **no per-user or per-workspace rate
  limit**. Any authenticated user can consume the shared LLM API key's quota with arbitrary
  payloads. Low risk at 2 known pilot users; must be rate-limited before opening access beyond the
  closed pilot (see §7 fix order in the audit, and §9 recommended hardening below).
- Consulting, process, blueprint, and deliverable engines are deterministic by design and must stay
  that way unless a mission explicitly, narrowly opts a specific narrative surface into
  LLM-assisted generation — the reasoning/scoring core itself must never depend on a live LLM call
  to produce a number or a gate decision.

## 8. Deployment rules

- Architect deploys as its **own, independent Vercel project**, root directory `apps/architect` —
  never folded into the ISALWA OS (`apps/web`) Vercel project. See
  [`DEPLOYMENT.md`](../apps/architect/DEPLOYMENT.md).
- `vercel.json` in `apps/architect` scopes install/build to this app so the ISALWA web app's
  pipeline is never affected by an Architect deploy, and vice versa.
- Promote a deployment to Production only after a green Preview build.
- Environment variables are set per-environment (Production / Preview / Development) in Vercel
  Project Settings. **Redeploy after changing any Supabase or LLM key** — a running instance does
  not pick up new env values without a redeploy.
- HTML/app documents are served `private, no-store` (middleware + `next.config.ts` headers); static
  assets under `/_next/static/*` are long-cache immutable (content-hashed filenames). **Do not
  advise a hard refresh to see fresh data or a fresh deploy** — if something looks stale after a
  normal reload, the bug is in data/logic, not caching; start troubleshooting there instead.

## 9. Rollback process

1. In Vercel, open the Architect project → Deployments.
2. Identify the last known-good Production deployment (matches a `main` commit that passed the
   [Release Checklist](./RELEASE_CHECKLIST.md)).
3. Use Vercel's "Promote to Production" / "Instant Rollback" on that prior deployment. This does
   not require a new build — it re-points the production alias.
4. If the regression involves a Supabase schema change (a new migration), do **not** roll back the
   migration automatically — schema rollbacks are manual and must be reviewed (see §11); prefer
   rolling back the app deployment first and leaving the schema forward-compatible.
5. Confirm both pilot accounts (Carmen, Álvaro) can log in and land on `/workspace/ws_isalwa` after
   rollback.
6. Record what broke and why in a follow-up note (e.g. a dated entry under `apps/architect/`
   mission docs) so the same regression isn't reintroduced.

## 10. Emergency procedures

- **Suspected credential leak** (a real key pasted into a transcript, PR, issue, or committed by
  mistake): rotate the credential immediately in Supabase/the LLM provider dashboard, then confirm
  via `git log --all -p -- "apps/architect/.env*"` (or a full-repo secret scan) that it isn't also
  sitting in git history; if it is, treat it as a full incident (rotate + purge history + notify).
- **Suspected unauthorized access:** check Supabase Auth logs for the two pilot accounts; rotate
  both pilot passwords in the Supabase dashboard; if the pilot cookie fallback path is suspected
  (see §13), confirm Supabase env vars are set on every live deployment (Production **and**
  Preview) so the unauthenticated fallback path can never be reached.
- **Suspected data corruption in `ws_isalwa`:** do not manually edit Supabase rows by hand as a
  first response. Check whether `lib/repositories/migrate.ts`'s heal step already has (or should
  have) a detector for the specific fabricated/corrupted marker, following the precedent in
  `NO_FABRICATED_CONTENT.md`'s heal-on-load pattern — this fixes both the live row and any future
  regression of the same shape.
- **Suspected LLM quota abuse:** rotate `ARCHITECT_LLM_API_KEY`/`OPENAI_API_KEY` and, if urgent,
  temporarily unset it in Vercel — Architect degrades gracefully to `LocalHeuristicProvider`, it
  does not go down.
- Any emergency action taken must be recorded (what, when, why, who approved) — see §11.

## 11. Required approvals

- **Schema changes (new Supabase migrations, RLS policy changes):** require explicit human review
  before being applied to the shared production database — never auto-applied by an agent.
- **New environment variables or changed default values** (e.g. changing a fallback password,
  widening a public path): require explicit human approval, documented in this file and
  `DEPLOYMENT.md` at the same time.
- **Any change to `middleware.ts`, `lib/auth/*`, or `supabase/migrations/*`:** treated as a
  security-relevant change regardless of how small — requires the same review rigor as a schema
  change, even for a one-line diff.
- **Rotating or removing `SUPABASE_SERVICE_ROLE_KEY` or any production credential:** requires
  human approval and, per §10, is otherwise recommended as routine precaution.
- **Promoting a Preview deployment to Production:** requires a green build and a completed
  [Release Checklist](./RELEASE_CHECKLIST.md) pass.

## 12. Production access principles

- **Least privilege.** The two pilot roles (`consultant`, `client`) each get exactly the
  capabilities in `ROLE_CAPABILITIES` (`lib/auth/constants.ts`) — no implicit escalation.
- **Server-verified sessions everywhere.** No route or component trusts a client-supplied role;
  `getServerSession()` always re-derives it from Supabase's own `auth.getUser()`.
- **One shared workspace today, isolation-ready tomorrow.** The pilot intentionally shares one
  workspace (`ws_isalwa`) between Carmen and Álvaro; the underlying membership model
  (`architect_is_member`, `CompanyMembershipKind`) is already shaped for multi-tenant isolation —
  extending to a second company must reuse that model, never bolt on a parallel one.
- **Consultant-only tabs are a genuine UI boundary today, not yet a genuine data boundary** for
  every field (see §6's RLS gap). Treat "the UI hides it" and "the server enforces it" as two
  different claims, and know which one you're making before describing something as secure.
- **No production access without an authenticated, Supabase-verified session** — this is true
  today (no P0 findings in the last full audit) and must remain true as the user base grows.

## 13. Threat model

**In scope:** the shared 2-user pilot (Carmen, Álvaro) on `ws_isalwa`, running on Vercel with
Supabase Auth + Postgres + Storage.

| # | Threat | Current mitigation | Residual risk |
| --- | --- | --- | --- |
| T1 | Outside party reads/writes pilot data without a valid session | `middleware.ts` enforces auth on every non-public path; RLS on every table/bucket | None found at P0 in last audit |
| T2 | Pilot-cookie session forgery if Supabase env vars are absent on a deployment | Cookie is `httpOnly`; realistic path needs cookie-jar access or a misconfigured preview lacking Supabase env vars | **Open (P1).** Recommend HMAC-signing the pilot cookie or failing closed in `NODE_ENV === "production"` when Supabase isn't configured |
| T3 | Brute-force / credential stuffing against pilot login | Supabase Auth's own upstream rate limiting only; no app-level throttle | **Open (P1).** Recommend a lightweight IP/email throttle before sharing beyond the two named pilot users |
| T4 | A client-role account (Álvaro) writes data a consultant-only UI panel implies only Carmen can write | RLS checks membership, not membership `kind` | **Open (P2).** See §6. Low real-world risk today (single company, owner editing own data); must be fixed before a second tenant exists |
| T5 | High-privilege secret (`SUPABASE_SERVICE_ROLE_KEY`) becomes a leak vector | Narrowed to one reviewed reference (`lib/auth/supabase/admin.ts`, cron route only, §5); gated by `CRON_SECRET` before construction; never committed | **Open (P2)** — periodic rotation recommended; verify no second reference is added without review |
| T6 | LLM proxy routes consumed for quota abuse by an authenticated-but-unintended user | Auth required; no rate limit | **Open (P2)** — acceptable at 2 users, not beyond |
| T7 | XSS via user-authored content (interview answers, uploaded document text) | React's default escaping; no `dangerouslySetInnerHTML`/`innerHTML`/markdown-to-HTML pipeline anywhere in `apps/architect`, verified by repo-wide grep | Low — re-verify on every PR that adds HTML rendering |
| T8 | Clickjacking / missing security headers | Caching headers exist; no explicit `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | **Open (P2)** — Vercel provides baseline protection; explicit headers recommended before wider exposure |
| T9 | Fabricated/seeded evidence misleading a client about real progress | `createEmptyWorkspace` + heal-on-load steps in `lib/repositories/migrate.ts` actively detect and reset known fabricated markers | Mitigated; re-check this class of bug whenever seed data changes |

**Out of scope for this document:** ISALWA OS (`apps/web`/`apps/api`) has its own security review
process — see that product's own `SECURITY.md` at the repo root.

## 14. Fix-order reference (as of the last full audit)

1. ~~Public login page admin-email disclosure~~ — fixed.
2. Confirm/rotate Supabase dashboard passwords for Carmen/Álvaro away from the shared documented
   default (no code change, 5 minutes).
3. Add a basic login rate limit (T3) before the pilot is shared with anyone beyond the two named
   users.
4. Decide the pilot-cookie fail-closed behavior (T2).
5. Service role key now has one reviewed use (Mission 24 cron route, T5) — rotate periodically;
   confirm no second reference is added without the same review.
6. Track the RLS `kind`-awareness gap (T4) as a real backlog item before adding a second
   consultant or client company.
7. Normal hardening backlog: security headers (T8), LLM route rate limits (T6), removing the two
   dead capability-check exports (`canDeleteData`, `canAccessSystemSettings` in
   `lib/auth/permissions.ts`) or wiring them up so they aren't silently unguarded.

This fix-order list reflects the state at the time of the referenced audit
(`apps/architect/ALVARO_CARMEN_PRODUCT_AUDIT.md`, 2026-07-27). Re-verify against that file (or a
fresh audit) before treating any item above as still open — this document is a governance
summary, not a live dashboard.
