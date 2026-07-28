# P0 pilot fix — fake % and English response surface for Álvaro

Both bugs traced back to the **same** root cause: `aa34ea6` healed the
`ws_isalwa` **workspace row** on every read (`migrateBundle`) but never
healed the **active interview row** (`architect_active_interviews`) that
Álvaro's browser actually loads and renders while a session is in progress.
That row was written before two earlier hotfixes (the fabricated pilot seed
removal, and the resume-engine Spanish hotfix in `I18N_100.md`) and has sat
frozen ever since — the code was already fixed, but the **persisted data**
predates the fix and nothing ever re-healed it on load.

## 1. Fake percentages

**Root cause:** `createSupabaseInterviewPersistence.load()`
(`lib/persistence/index.ts`) returned the raw `Interview` row from
`architect_active_interviews` with no healing. The live ws_isalwa row still
carries `seed_fact_0` / `seed_fact_1` from the old fabricated seed (this was
already known and explicitly logged as a "known follow-up, not done" at the
bottom of `PERSISTENCE_ALVARO_FIX.md`). `interview.memory.score.overall` —
computed once, at answer-time, from those facts — is what `StageBrief`,
`DiscoveryScoreCard`, and `FinishPanel` render directly. Reloading the
workspace row healed *company memory*, but the running interview kept
showing the fabricated ~71%.

**Fix:**
- Extracted the fabricated-fact fingerprint (`lib/repositories/migrate.ts`'s
  private `isFabricatedSeedFact`) into a shared `lib/memory/heal.ts`:
  `isFabricatedSeedFact()` + `healConversationMemory()` (prune fabricated
  facts, recompute the score with the existing `applyDiscoveryScore` —
  never re-seed fake evidence, never touch a memory that's already clean).
- `lib/persistence/index.ts` now heals **every** interview handed back from
  `load()` — local storage, Supabase, and the one-time localStorage→Supabase
  bridge — before the caller ever sees it. This covers `guided-assessment.tsx`
  and `report-view.tsx`, and any future caller, automatically.
- `lib/repositories/migrate.ts` now imports the shared `isFabricatedSeedFact`
  instead of its own private copy (behavior unchanged, one source of truth).
- Verified no 0–1 vs 0–100 double-scale bug: `computeDiscoveryScore` returns
  `overall` on a 0–100 scale (`clamp(avg)` over dimension confidences that are
  already 0–100); every render site (`StageBrief`, `DiscoveryScoreCard`,
  `FinishPanel`, `executive-dashboard.tsx`, `workspace-view.tsx`) uses that
  value directly with a literal `%` suffix — no second multiply/divide
  anywhere in the chain.
- Honest empty state confirmed: `understandingLevel(0)` →
  `"En formación"` (default case in `lib/presentation/executive-language.ts`),
  not a fake score.

**Why no manual database reset was needed:** healing happens transparently
on load, so the next time Álvaro (or anyone) opens the guided assessment,
the stale row is read, healed in memory, rendered honestly, and then
autosaved back (the existing `useEffect` in `guided-assessment.tsx` that
persists on every `interview` state change) — the fabricated facts are
purged from the stored row itself the moment the page loads, with zero data
loss to his real answers. No destructive DB migration or manual row edit was
run against production.

## 2. English response surface

**Root cause:** identical shape to #1. `components/discovery/guided/*` were
already fully Spanish (confirmed again in this pass — see grep below) and
`I18N_100.md`'s HOTFIX had already fixed the *generators* (resume engine,
knowledge briefing) that produce the architect's opening/bridge message. But
`AnsweringPanel` renders the **last stored turn verbatim**
(`conversation.turns`, `role: "architect"`) — it's frozen text, written once
when that turn was created, not regenerated on render. Álvaro's active
session had already generated a turn ("Good. Let's continue with Sales.",
"Confidence: 71%", "Still need: Sales, Customers, Geography") *before* the
I18N hotfix landed, so no amount of fixing the generator changes what he
sees — the bad text is baked into the persisted row he keeps reloading.

**Fix:**
- `lib/persistence/index.ts` adds `healArchitectTurn()`: on load, if the
  **last** turn (the only one ever rendered above the answer box) matches a
  fingerprint of the pre-fix English templates (`Good.`, `Let's continue`,
  `Confidence:`, `Still need:`, `Knowledge reviewed`, `I reviewed N
  documents…`, `I still have questions about…`), it is replaced with a fresh
  message composed from the already-Spanish `formatThinkingPreamble()` +
  the current question's prompt — using the just-healed memory, so the score
  quoted inside that message is honest too. Full turn history is untouched;
  only the one turn the client can actually see is rewritten.
- Re-audited every file in `components/discovery/guided/**`,
  `living-whiteboard.tsx`, and `opportunity-list.tsx` for the exact leak
  patterns called out (`Your answer`, `Share`, `Type`, `Continue`, `Skip`,
  `Good.`, `Let's continue`, `Confidence`, `Still need`, raw
  `Sales|Customers|Operations|Finance|HR|Production|Systems|Team|Geography`
  identifiers): all client-visible copy in these components is Spanish.
  Nothing new to migrate — confirms `I18N_100.md`'s "Gap A" note that these
  files were already hardcoded-Spanish (a `t()`-routing/maintainability gap,
  not a client-visible defect).
- Question catalog (`lib/consulting/questions/question-library.ts`,
  `domain/interview-engine.ts`) confirmed Spanish — `prompt`, `placeholder`,
  `reason` all in Spanish; nothing to Spanishify there.

## Files changed

- `lib/memory/heal.ts` — new: shared `isFabricatedSeedFact()` +
  `healConversationMemory()`.
- `lib/memory/index.ts` — export the two new functions.
- `lib/repositories/migrate.ts` — use the shared `isFabricatedSeedFact`
  instead of a private copy (no behavior change).
- `lib/persistence/index.ts` — heal every loaded interview: prune fabricated
  facts + recompute score (`healInterview`), and rewrite a frozen
  pre-Spanish-fix architect turn (`healArchitectTurn`).
- `scripts/verify-interview-heal.ts` — new: proves both heals against a
  fixture shaped exactly like the live ws_isalwa active-interview row.

## How to verify

```bash
cd apps/architect
npx tsc -p tsconfig.json --noEmit        # typecheck — 0 errors
npx tsx scripts/verify-migrate-heal.ts    # workspace-row heal — 4x PASS
npx tsx scripts/verify-interview-heal.ts  # active-interview heal — 3x PASS
```

End-to-end as Álvaro: reopen the guided assessment. The score card should
read an honest number (0% / "En formación" if nothing real was answered yet,
or a low single/double-digit % reflecting only his real answers) and the
message above the answer box should be Spanish. No manual data reset is
required — reloading is what triggers the heal, and the write-back
(existing autosave) makes it durable.

## What was NOT changed

- No production database row was edited directly — the fix is code-only;
  healing happens on next read.
- No RLS, auth, or schema changes.
- No change to the question catalog content or discovery scoring formula —
  only removal of fabricated inputs feeding that formula.
