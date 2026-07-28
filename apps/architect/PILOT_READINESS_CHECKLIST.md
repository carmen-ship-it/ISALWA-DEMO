# Pilot Readiness Checklist — Álvaro/Carmen, `ws_isalwa`

**For:** tomorrow's ISALWA pilot demo, workspace `ws_isalwa`, production URL
https://isalwa-architect.vercel.app.
**As of:** 2026-07-28, after Mission 24 (`28d4d7b`) shipped and pushed to `main`. Vercel auto-deploys
from `main` — no separate deploy step.
**Read alongside:** [`docs/ai/04_ARCHITECT_RECEIPT.md`](./docs/ai/04_ARCHITECT_RECEIPT.md) (living
state), [`docs/SECURITY_POSTURE.md`](../../docs/SECURITY_POSTURE.md),
[`docs/OPERATIONS_RUNBOOK.md`](../../docs/OPERATIONS_RUNBOOK.md).

This is a demo-blocker checklist, not a full audit — see `ALVARO_CARMEN_PRODUCT_AUDIT.md` and
`docs/SECURITY_POSTURE.md` §13 for the full threat model. Items below are ordered by how much they
could actually confuse or block Álvaro/Carmen mid-demo tomorrow.

## 1. Env vars — what's required vs optional for tomorrow

| Var | Needed for tomorrow? | Why |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Shared pilot persistence + Auth. Without these, Carmen and Álvaro don't see the same workspace. |
| `ARCHITECT_LLM_*` / `OPENAI_API_KEY` | Recommended, not strictly required | Missing key degrades to `LocalHeuristicProvider` (deterministic, no network) — the app still works, but answers/recommendations read more mechanically. Confirm intentionally either way before the demo, don't discover it live. |
| `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` (Mission 24) | **Optional for tomorrow** | Only needed for the *scheduled* overnight cycle re-run to actually execute on Vercel. Every other cycle re-run (interview answer, document upload) already fires with zero dependency on these. Without them, `OvernightDigestCard` simply never has anything fresh to show — it renders nothing, not an error. Set them only if you want tonight's cron (`0 6 * * *` UTC) to actually populate a digest before the demo; see `docs/OPERATIONS_RUNBOOK.md` §3a for the exact steps and the curl-based 401-vs-success check. |
| `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET` | Only if demoing the Google Drive connector | Live connector (Mission 23); confirm configured on Production if that's part of the plan, otherwise skip that surface. |

**Action before the demo:** confirm `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` are set on the Vercel
**Production** environment specifically (not just Preview) and that the deployment has been
redeployed since they were last changed (env changes need a redeploy — see
`docs/OPERATIONS_RUNBOOK.md` §3).

## 2. Auth / password rotation status

- Both pilot accounts (Carmen — `consultant`, Álvaro — `client`) authenticate via **Supabase Auth**
  when Supabase env vars are configured (they should be, per §1) — the pilot-cookie fallback with
  the documented default password (`Architect2026!`, `lib/auth/constants.ts`) is dead code in that
  case.
- **Not verified in this pass:** whether Carmen/Álvaro's real Supabase Auth passwords have been
  rotated away from the shared documented default. This is a Supabase-dashboard action, not a code
  change — confirm/rotate there directly (`docs/SECURITY_POSTURE.md` §3, §14 item 2) before the
  demo if it hasn't happened yet. **Do this now if unsure** — it takes under 5 minutes and is the
  single highest-leverage security action available before tomorrow.
- Test login for both roles once, end to end, before the demo (see smoke test §5).

## 3. Feature surfaces — verify deployed

All of the following are committed on `main` and included in this push; confirm they render
correctly against the live `ws_isalwa` data once, before the demo starts:

- **Continuous discovery UX** (`17c0b68`) — the "Continue discovery" always-on next-step voice and
  ceremony click-through. Check: from the workspace dashboard, is there always an obvious next
  action, never a dead end?
- **Executive Daily Brief** (`faba62d`, Mission 20 Part 2) — the senior-consultant-style hero
  replacing a generic dashboard. Check: does it show "since your last visit," a recommendation, and
  milestones with real (not placeholder) data for `ws_isalwa`?
- **Company Brain** (`2432c8b`, Mission 21 Pass 2) — "what does Architect know about my company."
  Check: does it read as institutional memory, not a diagnostic, for Álvaro's client view?
- **Mission 24 overnight digest** — `OvernightDigestCard` under the Daily Brief. Expected to render
  **nothing** tomorrow unless the cron ran with real data overnight (see §1) — confirm this is
  understood as "not yet triggered," not "broken," if asked.

## 4. Known gaps that could confuse Álvaro mid-demo

- **Scaffolded connectors read as real-looking cards.** In the Conectores panel (Mission 23),
  SharePoint/Microsoft 365, QuickBooks, and HubSpot show as "En diseño — todavía no es posible
  conectar una cuenta" (`readiness: "scaffolded"`, `lib/connectors/catalog.ts`) — only **Google
  Drive** is `readiness: "live"`. If Álvaro clicks one of the three scaffolded cards expecting it to
  connect, that's expected behavior (an honest "not yet"), not a bug — know this going in so it
  doesn't read as broken on the fly.
- **`OvernightDigestCard` renders nothing by default.** Expected per §3 above unless the cron was
  deliberately run with real env vars beforehand — don't promise Álvaro a "look what happened
  overnight" moment unless you've confirmed a fresh digest exists first (`workspace.lastOvernightReview`
  set within the last 36h).
- **Missing/weak documents get an honest note, not a silent skip.** If a demo document is scanned
  poorly or unsupported, the pipeline says so explicitly (`honestNote`, weak-extraction UI) rather
  than pretending it was read — expected, but worth knowing before it happens live.
- **One shared workspace, no company picker.** Both Carmen and Álvaro land on the same
  `/workspace/ws_isalwa` — there's no "switch company" affordance because the pilot intentionally
  doesn't need one yet. Don't demo a company-switch flow; it doesn't exist.
- **Retrieval uses keyword-ranked packing, not the real-embeddings path.** `buildRetrievalPackSync`
  is what's actually wired up; the async real-embeddings variant (`buildRetrievalPack`) has no call
  site yet. Answers are grounded in real evidence either way — just don't claim semantic-embedding
  retrieval specifically if asked how it works under the hood.

## 5. Smoke-test script (Carmen + Álvaro, run once before the demo)

Run through both roles once, in order, ideally the morning of:

1. **Login** — Carmen logs in (consultant), lands on `/workspace/ws_isalwa` with `assessment` /
   `architecture` / `processes` tabs visible in addition to the client-visible set. Log out. Álvaro
   logs in (client), lands on the same workspace **without** those three tabs.
2. **Continue discovery** — as either role, confirm the guided-discovery next-step CTA is visible
   and clicking it opens the guided interview at a sensible next question (not a restart, not a
   dead end).
3. **Upload / teach** — go to Business Knowledge, upload one real (or clearly-marked test) document
   or paste a short meeting transcript / manual note. Confirm it appears in the document list with
   a real status transition (queued → analyzing → completed) and that a "what changed" summary
   appears afterward (not silence).
4. **Company Brain** — open the Company Brain panel as Álvaro (client). Confirm it reads as "what
   Architect knows about your company" in plain Spanish business language, with no visible engine
   ids, internal reasoning, or English leaking through.
5. **Daily Brief** — return to the dashboard. Confirm the Executive Daily Brief reflects the
   document/interview activity from step 3 (i.e. "since your last visit" picked up the new
   evidence), and that recommendations/milestones look grounded, not placeholder.

If any step fails, treat it as a stop-ship item for the demo path in question, not a "note for
later."

## 6. What NOT to demo

- **Scaffolded connectors as if they work** — SharePoint/Microsoft 365, QuickBooks, HubSpot (see
  §4). Only Google Drive is live; only demo Drive if that's the one confirmed configured.
- **The interrupted "Teach Architect" learning-summary extension.** Uncommitted, incomplete work
  (a fuller `certaintyNote`/`nextStepNote` extension to the document change-summary, plus matching
  copy) is intentionally **not** part of this push — it's stashed (`wip
  teach-architect-interrupted`) rather than shipped half-finished. The shipped `teachCta: "Teach
  Architect"` button label (Mission 21) is fine to show; do not attempt to demo a "certainty" or
  "next step" note on the upload summary card — that copy does not exist on `main` yet.
- **The Mission 24 overnight cron as a live, in-demo moment** unless you've deliberately configured
  `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` beforehand and confirmed a fresh digest exists (§1,
  §3). Framing it as "watch it happen right now" without that setup will produce nothing to show.
- **Any claim that retrieval uses live semantic embeddings** — it's keyword-ranked today (§4).
- **A company-switcher or multi-tenant flow** — not built; one shared workspace only.

## 7. Deploy / push status

- Mission 24 pushed to `main` at commit `28d4d7b` (feature) — see git log for the exact hash chain;
  this checklist and the receipt update follow in a `docs(architect)` commit on the same push wave.
- Vercel is configured to auto-deploy from `main` (root directory `apps/architect`) — no manual
  deploy step. Confirm the live deployment's commit hash matches `main` in the Vercel dashboard
  (Deployments tab) once pushed; this agent's environment had no `gh`/`vercel` CLI available to
  confirm deployment status programmatically, so this final check should be done manually (or via
  the Vercel dashboard/API) before the demo.

## Residual blockers (as of this pass)

1. Pilot dashboard password rotation status unverified (§2) — verify/rotate in the Supabase
   dashboard before the demo if not already done.
2. Cannot programmatically confirm the live Vercel deployment matches `main`'s latest commit from
   this environment (no `gh`/`vercel` CLI available) — confirm manually via the Vercel dashboard.
3. `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` Vercel configuration status for Production is
   unknown from this environment — decide per §1 whether tonight's cron needs to actually run, and
   configure only if so.

---

## Pre-pilot stuck-prevention pass (2026-07-28 evening)

Shipped on `main` (this commit wave): 5-second Orientation Panel; evaluación/diagnóstico CTA
renames on the primary next-step voice; client-facing “Enseñar a Architect” upload labels;
scaffolded connectors hidden; Spanish `app/error.tsx` / `app/not-found.tsx`; conversational
“Qué tanto entiende Architect tu empresa” labels.

**Still required before tomorrow (human / browser):**
1. Confirm Vercel Production commit hash matches latest `main` after this push.
2. Full Álvaro click-through (login → orientation → continue discovery → teach with one PDF →
   Company Brain → recommendations → blueprint → logout/login).
3. Confirm Learning Summary wow on a real PDF upload.
4. Password rotation away from the documented default remains recommended (both accounts
   currently authenticate successfully with that default — verified via Supabase Auth API).
