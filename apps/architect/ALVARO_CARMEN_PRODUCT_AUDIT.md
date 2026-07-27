# ISALWA Architect — Álvaro / Carmen Product Audit + Security Review

**Date:** 2026-07-27
**Scope:** Full client (Álvaro) and consultant (Carmen) pilot walkthrough, plus a dedicated
security review of auth, RLS, storage, and API surfaces. Document upload / OCR / embeddings are
**functionally deferred** per instructions — not deep-tested end-to-end — but their auth/RLS
posture *is* reviewed in the Security section, since "don't test uploads" and "uploads must not
be a hole" are different questions.

**Method:** Code-path audit with direct verification (source read line-by-line across
`middleware.ts`, `lib/auth/*`, `supabase/migrations/*`, `app/api/*`, `lib/repositories/*`,
`lib/documents/*`, plus the relevant workspace/discovery/report/preparation components) —
**not** a live browser click-through. The `cursor-ide-browser` MCP tool was attempted first
(`browser_navigate` / `browser_tabs`) and failed to produce a usable tab in this environment
("No browser tab available" on every attempt, including after explicit tab creation) after
four distinct attempts. Per the task's own fallback instruction, this became a code-path +
logic audit. Confidence is **high** for anything with a direct code citation below; anything
softer is explicitly marked "not directly verified."

**Deploy freshness:** `main` is at `21fff9c` (heal old fabricated seed rows) with `e0c0b66`
(empty seed / free stage nav / Spanish coverage labels) one commit behind it. `vercel ls` shows
the most recent Production deployment is **5 minutes old at the time of this audit** and the
project builds directly from `main` — live should match `21fff9c`. No lag detected.

---

## Executive answer

**Can Álvaro complete a meaningful pilot session today, without document upload and without AI
API keys?**

**Yes**, with one caveat. The guided discovery interview, dashboard, blueprint, recommendations,
report, and simulator all run on the deterministic local engine (`lib/reasoning`,
`lib/consulting`, `lib/blueprint`, etc.) — none of that path calls an LLM or requires
`ARCHITECT_LLM_API_KEY`/`OPENAI_API_KEY`. Document upload's *storage* works without an AI key
(files land in Supabase Storage), but OCR and embeddings honestly report
`available: false` and skip that step rather than erroring — which is exactly the contract
`REAL_DOCUMENT_UPLOADS.md` / `AI_DOCUMENT_PROCESSING_PIPELINE.md` describe. Since uploads are
out of scope for this pass, the one thing Álvaro needs today is **a live Supabase connection**
(already configured per `.env.local`) so his answers persist and Carmen can see them — the
alternative (`localStorage`-only pilot mode) would not share data between the two of them at all.

The workspace starts **honestly empty** (`21fff9c`/`e0c0b66` verified in code, see A2 below), the
interview supports answering topics in any order (verified in `GUIDED_ASSESSMENT.md` +
`lib/discovery/guided-actions.ts`), and every dashboard section is evidence-gated. This is a
real, currently-shippable pilot session, not a demo shell.

---

## Part A — Álvaro (Client) journey

| # | Step | Verdict | Notes |
|---|------|---------|-------|
| A1 | Login as client | **Pass** | `signInAction` → Supabase `signInWithPassword` → `buildSessionFromEmail` → `postLoginPath` → `/workspace/ws_isalwa`. `middleware.ts` redirects `/` and `/companies` for `role === "client"`. Matches spec exactly. |
| A2 | Honest zero state | **Pass** | `lib/workspace/seed.ts#createSeedWorkspaces()` now returns `createEmptyWorkspace("ISALWA", "unknown", "ws_isalwa")` — zero meetings, zero pain points, `businessUnderstanding: 0`, `blueprints: []`, all engine-derived fields `null`. This is the `e0c0b66`/`21fff9c` fix, verified directly in `lib/workspace/seed.ts` (not just changelog text). `21fff9c`'s heal step in `lib/repositories/migrate.ts` also resets **already-persisted** Supabase rows still carrying the old fabricated seed marker (`"Sesión de descubrimiento anterior"`) — so existing pilot data heals automatically on next load, no manual DB reset needed. |
| A3 | Client Mode tabs only | **Pass** | `CLIENT_VISIBLE_TAB_IDS` (`components/workspace/workspace-tabs.tsx`) excludes `assessment`, `architecture`, `processes` — the three consultant-only tabs (Diagnóstico / Sistema recomendado / Cómo opera). `WorkspaceTabs` filters `tabs` **before** rendering, so hidden tab panels are not mounted into the DOM for a client session (`tabs.map(...)` only iterates the filtered list). |
| A4 | Guided assessment, Spanish, free navigation | **Pass** | `GUIDED_ASSESSMENT.md`'s "HOTFIX — free stage navigation" is real, not aspirational: `planNextQuestion(memory, dimensionFilter?)`, `pickHighestValueQuestion`, `prioritizeQuestions` all take an optional `dimensionFilter`; `switchToStage()` (`lib/discovery/guided-actions.ts`) wires stage-tab clicks to it. Verified the underlying Spanish-coverage-label hotfix too (`e0c0b66`): `coverageAreaLabel()` (`lib/presentation/executive-language.ts`) maps all 5 `KnowledgeCoverageArea` values *and* the `"Follow-up interview topics"` sentinel to Spanish, and every consumer (`briefing.ts`, `bridge.ts`, `resume/engine.ts`, `blueprint/derive.ts`) routes through it — the specific "Bien. Continuemos con Sales." leak described in `I18N_100.md` is closed at the source, not patched at one call site. |
| A5 | Dashboard adapts to evidence | **Pass** | `ExecutiveDashboard` receives `readiness`, `missingInformation`, `explainableConfidence` — all three are evidence-gated engines (`lib/readiness/*`) computed fresh per workspace load. `NO_FABRICATED_CONTENT.md`'s risk/opportunity engines are gated by construction (`test()` only matches real discovered text). |
| A6 | Recommendations / storytelling, Spanish, evidence-based | **Pass** (Partial nuance below) | `explainWorkspaceRecommendations` / `explainSolutionModules` (`lib/explanations`) only produce cards from real workspace data; `Recommendations` tab shows an explicit `EmptyHint` with a CTA when there's nothing yet, never a fake card. **Nuance, documented as a known non-blocking gap** in `NO_FABRICATED_CONTENT.md`: the *moment* a workspace clears the zero-evidence bar (any 1 meeting or pain point), the full blueprint→solution→processes→deliverables cascade renders at full detail regardless of how thin that first answer was — real, traceable output, but can visually read as "more finished" than one answer supports. Not fabrication, but worth a follow-up threshold gate (already flagged by the prior mission, not re-litigated here). |
| A7 | Report — adaptive, no empty shells, Spanish | **Pass** | `ADAPTIVE_EVIDENCE_REPORTS.md` + `REPORT_BUSINESS_STORY.md` describe an evidence-adaptive report; `report-view.tsx` is in the migrated-to-i18n list (`I18N_100.md`), including its empty state. Not independently re-derived line-by-line in this pass (time-boxed), but the report pulls from the same `workspace` object already audited as honest in A2/A5. |
| A8 | Simulator / Perspectivas / Conocimiento without upload | **Pass** | `simulator` is in `CLIENT_VISIBLE_TAB_IDS` by design — code comment in `workspace-tabs.tsx` explicitly states it's "client-safe by construction... read-only, Spanish-only, no raw engine ids." Knowledge Center (`knowledge` tab) renders its empty coverage state (`emptyWorkspaceKnowledge()`) without needing any upload to succeed — coverage areas show 0% with an honest "Aún no hay evidencia importada" note (`lib/knowledge/coverage.ts`), not blocked/broken UI. |
| A9 | Context bar / scores understandable | **Pass** | `ContextBar` renders `{pct}% · {understandingLevel(pct)}` (e.g. "34% · Emergente"), never a bare percentage. `understandingLevel()` lives in `lib/presentation` (the same "translate the model into words" layer used everywhere per `UNDERSTANDABLE_SCORES.md`). |
| A10 | Primary CTAs always clear | **Pass** | Every tab panel in `workspace-view.tsx` ends in a `NextStepCta` with one deterministic `primaryHref`/`primaryLabel` sourced from a single `todayRecommendation` variable shared by the welcome banner, context bar, and dashboard headline — there's one answer to "what do I click next," not three competing ones. |

**Overall Álvaro verdict: Pass**, with one documented non-blocking nuance (A6) and one process
caveat (A7 not independently line-audited due to time-boxing, but resting on already-verified
honest data).

---

## Part B — Carmen (Consultant/Admin) journey

| # | Step | Verdict | Notes |
|---|------|---------|-------|
| B1 | Login as consultant | **Pass** | Same `signInAction` path; `postLoginPath` sends her to `/workspace/ws_isalwa` too (pilot has no company picker — `primaryWorkspaceIdForRole` for `consultant` returns the first membership, `ws_isalwa`). |
| B2 | Full workspace tabs Álvaro doesn't see | **Pass** | `isConsultant` (from server-verified session, see Security §S3) leaves `visibleTabIds` as `undefined` → `WorkspaceTabs` shows all 12 tabs including `assessment` (Diagnóstico), `architecture` (Sistema recomendado), `processes` (Cómo opera). |
| B3 | `/preparation` works on empty/thin workspace | **Pass** | `PREPARATION_BRIEF.md` documents a real bug found and fixed in this exact area: `dimensionPercent()` was reading confidence as 0–1 instead of 0–100, rendering "Cobertura de información: 2429%" — fixed, and explicitly re-verified against **both** the seeded `ws_isalwa` and a brand-new `createEmptyWorkspace()` with no crash and honest 0%. Route is `Suspense`-wrapped (`app/preparation/page.tsx`) so it has a loading state, not a blank screen, while `CompanyWorkspace` loads. |
| B4 | Same company data shared with Álvaro via Supabase | **Pass** | Both `SupabaseCompanyMemoryStore` (browser) and RLS (`architect_is_member`) key off `workspace_id = 'ws_isalwa'` with **both** Carmen (`kind: 'consultant'`) and Álvaro (`kind: 'owner'`) as members (`001_pilot_persistence.sql` / `002_link_pilot_users.sql`). Realtime channel (`architect-company-memory`, Postgres changes on `architect_workspaces`) pushes updates live to whichever of them isn't the one editing. |
| B5 | Brand settings / consultant-only tools gated correctly | **Partial** | UI gating is correct and consistent (`{session?.role === "consultant" ? <BrandSettingsPanel/> : null}` in `workspace-view.tsx`) — Álvaro never sees the panel. **But the underlying authorization boundary is UI-only, not role-aware server-side**: see Security finding **S5**. In the current 2-user pilot this is low real-world risk (Álvaro is the actual company owner, and it's his own company's data), but it is a genuine gap between "looks consultant-only" and "is enforced consultant-only," worth fixing before this pattern is copied to a multi-consultant/multi-client future. |
| B6 | Continue interview / review deliverables | **Pass** | `preparationHref`/`interviewHref` wiring is identical for both roles (`/discovery?workspaceId=...`); `DeliverablesPanel` (`deliverables` tab) is visible to both roles by design (client needs to see her own deliverables) and consultant additionally sees `assessment`/`architecture`/`processes`. No broken link found in the tab map. |

**Overall Carmen verdict: Pass**, with one architectural gap (B5/S5) that should be tracked, not
firefought — it doesn't leak cross-tenant data, it only means "consultant-only" is a UI
convention, not a hard boundary, within a single shared workspace.

---

## Part C — Security review ("we should not get hacked")

Ranked **P0 (fix now) / P1 (fix soon) / P2 (harden)**. Every item below is grounded in a specific
file; nothing here is speculative.

### P0 — none found

No blocker was found that lets an outside party read or write pilot data without a valid,
Supabase-verified session. Middleware (`middleware.ts`) enforces auth on every non-public path,
`getServerSession()` (`lib/auth/actions.ts`) always re-verifies the JWT server-side via
`supabase.auth.getUser()` (never trusts a client-supplied role/email), and every DB table +
the Storage bucket has RLS scoped to `architect_is_member()`. This is a genuinely solid
foundation for a 2-user pilot.

### P1 — fix soon

1. **[FIXED IN THIS PASS] Public login page disclosed the admin/consultant email and
   pre-filled it as the default form value.** `components/auth/login-form.tsx` had
   `defaultValue={PILOT_USERS.carmen.email}` on the email `<input>` and a footer note
   (`loginForm.pilotNote`) that rendered *both* pilot emails in plain text to any visitor —
   `"Piloto: carmen@isalwa.demo (Consultora) · alvaro@isalwa.demo (Cliente)"`. Combined with a
   shared, documented default password (`Architect2026!`, `lib/auth/constants.ts`), this handed
   an anonymous visitor the exact admin username pre-filled in the form, which meaningfully
   lowers the cost of a credential-guessing attempt against the highest-privilege account.
   **Fix applied:** removed the `defaultValue`, removed the footer disclosure, removed the now-
   unused `pilotNote` key from both `es.ts`/`en.ts` dictionaries and the now-unused `PILOT_USERS`
   import. Typecheck (`tsc --noEmit`) verified clean after the change. This is presentation-only
   — no auth logic, session shape, or password verification changed.

2. **Rotate the Supabase service role key out of caution, and confirm it's unused.**
   `SUPABASE_SERVICE_ROLE_KEY` exists in `.env.example`/`.env.local` but a full-repo grep
   (`grep -rn "SERVICE_ROLE"`) found **zero code references** — it is not currently used
   anywhere in the app. Git history was checked (`git log --all -p -- "apps/architect/.env*"`)
   and confirms no real key value was ever committed — only blank placeholders in
   `.env.example`. That rules out a *code-history* leak. It does **not** rule out the key having
   been pasted into a chat/agent transcript at some point (per the task's own note) — agent
   transcripts are plain local files, not a secrets vault. Recommend rotating the key in the
   Supabase dashboard as a zero-cost precaution, and either wiring it into a real server-only use
   case (e.g., an admin cleanup script) or removing it from the env files entirely if it stays
   unused — an unused, high-privilege secret sitting in configuration is itself a standing risk.

3. **Pilot-cookie session forgery is possible *if* Supabase env vars are ever absent** — not
   exploitable against the live pilot today (Supabase **is** configured, confirmed via
   `.env.local` and `isSupabaseConfigured()`), but worth fixing before it's a footgun. When
   Supabase is unconfigured, `lib/auth/session.ts#readPilotSessionCookie` parses the
   `isalwa.architect.pilot_session` cookie as plain unsigned JSON (`{"email": "..."}`) and
   rebuilds a full session from it — `buildSessionFromEmail` trusts the email at face value, no
   signature/HMAC check. Since the cookie is `httpOnly` (can't be read/written by page JS), the
   realistic attack path is narrow (needs cookie-jar access or a misconfigured preview
   deployment lacking `NEXT_PUBLIC_SUPABASE_URL`), but a preview/staging Vercel deployment that
   forgets to set the Supabase env vars would silently fall back to this **completely
   unauthenticated** path — anyone could set
   `isalwa.architect.pilot_session={"email":"carmen@isalwa.demo"}` and become the consultant with
   zero password check. Recommend signing the pilot cookie (HMAC with a server-only secret) or,
   simpler, making pilot-cookie auth fail closed (reject, don't silently accept) on any
   deployment where `NODE_ENV === "production"` and Supabase isn't configured.

4. **No brute-force protection on login.** `signInAction` (`lib/auth/actions.ts`) has no rate
   limiting, lockout, or CAPTCHA of its own — a scripted client can submit unlimited password
   guesses against the Next.js server action. Supabase Auth applies some default rate limiting
   upstream, but that's Supabase's safety net, not this app's. For a 2-account pilot with a
   documented default password, recommend a lightweight IP/email-based throttle (e.g. Upstash
   Ratelimit, or Supabase Auth's dashboard-configurable rate limits/CAPTCHA) before this goes
   past a closed pilot.

### P2 — harden

5. **Client-side role gating isn't backed by a matching server-side capability check for
   in-workspace actions.** This is the item behind B5. RLS (`architect_workspaces_update`,
   `003_document_storage.sql`'s policies, etc.) checks **workspace membership**
   (`architect_is_member(id)`) but not **membership kind** (`consultant` vs `owner`). Concretely:
   `BrandSettingsPanel` (`components/workspace/brand-settings-panel.tsx`) is only *rendered* for
   `session.role === "consultant"`, but its `save()` calls
   `getClientCompanyMemoryStore().workspaces.save(...)`, which goes straight to the Supabase
   browser client with the *current user's own* JWT — and the RLS policy backing that write
   allows **any** member of `ws_isalwa`, including Álvaro (`kind: 'owner'`), to write to
   `architect_workspaces`. A client who opened devtools and called the same Supabase client
   method directly could edit brand settings (or any other workspace field) despite the UI never
   showing them that option. Impact today is low (Álvaro editing his own company's brand
   settings isn't really an attack, and there's no second client to leak *to*), but this pattern
   — "role gating lives only in React, not in RLS or a server action" — will become a real
   tenant-isolation bug the moment a second consultant or a second client company exists.
   Recommend adding a `kind`-aware policy variant (or a `SECURITY DEFINER` capability function
   parallel to `architect_is_member`) before scaling past the 2-user pilot.
6. **No security headers configured.** `next.config.ts` sets caching headers but no
   `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, or
   `Permissions-Policy`. Vercel adds some baseline protections, but an explicit CSP would harden
   against any future XSS surface (none found in this pass — no `dangerouslySetInnerHTML`,
   `innerHTML`, or HTML-rendering markdown lib exists anywhere in `apps/architect`, confirmed by
   repo-wide grep) and clickjacking.
7. **LLM proxy routes (`/api/documents/ocr`, `/api/documents/embeddings`) check "is logged in"
   but not workspace/role.** Any authenticated pilot user (Carmen or Álvaro) can call these with
   arbitrary payloads, consuming the shared `ARCHITECT_LLM_API_KEY`/`OPENAI_API_KEY` quota with no
   per-user or per-workspace rate limit. Low risk with 2 known users; becomes a cost/abuse vector
   with more users. `/api/interview` has the same "any authenticated user, no rate limit"
   shape. Recommend a basic per-session rate limit if these routes are exposed beyond the pilot.
8. **Pilot passwords are a shared, documented default** (`Architect2026!`,
   `lib/auth/constants.ts`'s `defaultPassword` fields), overridable via
   `ARCHITECT_PILOT_CARMEN_PASSWORD`/`ARCHITECT_PILOT_ALVARO_PASSWORD` — but since Supabase Auth
   is configured for this pilot, those env-var overrides are **dead** (`verifyPilotPassword` is
   only reached when Supabase is unconfigured) and the actual live password is whatever was set
   for each user in the Supabase dashboard. Recommend confirming the Supabase dashboard passwords
   are *not* still `Architect2026!` verbatim, independent of anything in this repo, since that
   string is now also written into this very audit file and the task prompt that produced it.
9. **`canDeleteData` / `canAccessSystemSettings`** (`lib/auth/permissions.ts`) are exported and
   referenced from `lib/auth/index.ts` but never called anywhere in the app — dead capability
   checks. Not a vulnerability, but worth removing or wiring up so "delete" and "system settings"
   features don't get built later without realizing no gate was ever attached to them.

### What's already good (security)

- **Server-verified sessions everywhere.** No route or component trusts a client-supplied role.
  `getServerSession()` always re-derives role/email from Supabase's own `auth.getUser()`.
- **RLS is real and workspace-scoped**, including on Storage (`storage.objects` policies keyed
  off the first path segment matching a workspace the user belongs to) — not just "RLS enabled,"
  the policies were read end-to-end and correctly reference `architect_is_member()`.
- **Signed, time-limited download URLs** for documents (`getDownloadUrl` → `createSignedUrl`,
  10-minute expiry) — never a public bucket URL.
- **No secrets ever committed.** `.gitignore` excludes all `.env*` except `.env.example`; verified
  against full git history, not just current tree.
- **No XSS-prone rendering found** — no `dangerouslySetInnerHTML`, no raw HTML injection, no
  markdown-to-HTML pipeline. React's default escaping covers free-text interview answers.
- **CSRF is a non-issue for the one server action that exists** (`signInAction`) — Next.js
  15's built-in Origin-header check on Server Actions covers this without extra code.
- **Filenames are sanitized before becoming storage paths**
  (`buildDocumentStoragePath`'s `.replace(/[^a-zA-Z0-9._-]+/g, "_")`), closing an obvious path-
  traversal/object-overwrite angle in the (currently out-of-scope) upload pipeline.

---

## Recommended fix order

1. ~~Login page admin-email disclosure~~ — **done in this pass.**
2. Confirm/rotate Supabase dashboard passwords for Carmen/Álvaro away from the shared default
   (5 minutes, no code change).
3. Add a basic login rate limit (P1-4) — before this pilot is shared with anyone beyond the two
   named users.
4. Decide the pilot-cookie fail-closed behavior (P1-3) — cheap insurance against a future
   misconfigured preview deployment.
5. Rotate/remove the unused service role key (P1-2) — cheap insurance, zero functional risk.
6. Track the RLS `kind`-awareness gap (P2-5) as a real backlog item before adding a second
   consultant or client company — not urgent for the 2-user pilot, but it's the one item that
   stops being "fine for now" the moment the tenant model grows.
7. Everything else in P2 (headers, LLM route rate limits, dead capability functions) — normal
   hardening backlog, no pilot urgency.

---

## What's good, overall

- The three most recent commits (`5971cfd`, `47e504d`, `21fff9c`/`e0c0b66`) are not cosmetic —
  each one fixes a real, specific, previously-shipped honesty bug (fabricated seed evidence,
  English leaking through an untranslated enum, a unit-scale bug that showed 2429% coverage) and
  each fix was verified in this audit by reading the actual diff-equivalent code, not just trusting
  the commit message.
- The "no fabrication" discipline is unusually thorough for a pilot-stage product: empty states
  are evidence-gated by construction in the risk/opportunity engines (rules only fire on matched
  text), not bolted on as a UI-layer `if (empty) show placeholder`.
- Auth is server-verified end-to-end; the security posture is meaningfully better than a typical
  early pilot (real RLS, real signed URLs, real membership model) — the gaps found are about
  *role* nuance within a trusted workspace, not tenant-boundary leaks.
- i18n discipline (`I18N_100.md`) traced actual English leaks to their root cause (an
  untranslated enum flowing through four different consumers) instead of patching each visible
  symptom separately — the kind of fix that doesn't regress next time a fifth consumer is added.

## What needs attention

- The RLS `kind`-blind write policy (S5/B5) is the one finding that will matter more as this
  scales past 2 users — flag it now, fix it before the next tenant is added.
- No rate limiting anywhere (login, LLM proxy routes, interview endpoint) — fine for a closed
  2-person pilot, not fine for anything wider.
- A6's "cascade renders at full detail the moment evidence clears a low bar" is a UX-honesty
  nuance, not a bug — worth a follow-up threshold gate, not an emergency.
- This audit's browser-based verification could not run (tool unavailable in this environment) —
  recommend a follow-up pass that actually clicks through both accounts on
  `https://isalwa-architect.vercel.app` once browser MCP access is available, to catch anything
  a code read can't (visual regressions, animation glitches, real click-path dead ends).
