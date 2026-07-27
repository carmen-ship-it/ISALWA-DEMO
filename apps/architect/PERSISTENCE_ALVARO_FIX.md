# Persistence fix — Álvaro's interview answers were not sticking

Pilot blocker. Álvaro (`alvaro@isalwa.demo`, role `client`, workspace
`ws_isalwa`) answered guided-assessment questions and the answers did not
survive — and Carmen never saw them.

## What was NOT the problem

RLS is correct. Álvaro is a member of `ws_isalwa` with `kind = 'owner'`, and
`architect_is_member(ws_id)` checks membership only, never `kind`, so the
`architect_workspaces` UPDATE/INSERT policies in `001_pilot_persistence.sql`
already allow him to write. Verified live against production Supabase:

```
signIn: OK
members: ws_isalwa:owner
workspaces.update(ws_isalwa): OK
workspaces.upsert(ws_isalwa): OK
active_interviews.upsert:      OK
```

He was also not falling back to localStorage — `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` are set, so `isSupabaseConfigured()` is true
and the Supabase store is the one in use. Auth cookies flow correctly through
middleware, so the browser client authenticates as him for RLS.

## Root causes

### 1. The migrate "heal" deleted real answers (primary)

`migrateBundle` ran on **every** read of the Supabase rows
(`applyRemoteRows` → `migrateBundle`), and the healed result was written back
on the next save. Its pilot heal was:

```ts
const legacyFactKeys = knownFacts.some((f) => f.key.startsWith("seed_fact_"));
if (isPilot && (legacyFactKeys || desynced || looksLikeOldPilotSeed)) {
  next = { ...next, conversationMemory: null, businessUnderstanding: 0,
           meetings: [], modules: [], blueprints: emptyBlueprints(), ... };
}
```

A **single** leftover `seed_fact_*` key nuked the entire `conversationMemory`
— every genuine answer with it — plus meetings, modules and blueprints. The
live `ws_isalwa` active interview still carried `seed_fact_0` and
`seed_fact_1` from the old fabricated seed, so this fired every time. That is
why the workspace row read `businessUnderstanding: 0` with
`conversationMemory: null` while an interview with real progress existed.

**Fix:** prune fabricated facts individually and recompute the score from what
survives. The full reset now only fires when nothing real is left (no real
facts, no meetings, no documents, no processed knowledge). Fabricated evidence
is still never re-seeded — see `NO_FABRICATED_CONTENT.md`.

### 2. A failed read started a fresh interview over the saved one

`createSupabaseInterviewPersistence.load()` treated a Supabase **error** the
same as "no row": it fell through and returned `null`. `boot()` then built a
brand-new interview and upserted it over the existing row. One transient
network/RLS blip erased the session.

`boot()` also discarded a saved interview whenever
`existing.workspaceId !== workspaceId` — including when the field was simply
absent on an older payload — and immediately overwrote it.

**Fix:** `load()` throws on a read error; the caller keeps the session and
shows a retry screen. A loaded interview is always adopted, since the row was
keyed by this workspace to begin with.

### 3. The debounced autosave lost the last answer

Autosave debounced 400 ms with no flush on unmount, `pagehide`, or
`visibilitychange`, and cleared its buffer *before* the write resolved. So
answering and then clicking "Volver al espacio de trabajo" (or closing the
tab, or switching apps on mobile) dropped the buffered answer, and a failed
write dropped it too.

**Fix:** the buffer is only cleared once Supabase accepts the row; `flush()`
is exposed and called on unmount, `pagehide` and `visibilitychange`.

### 4. Everything failed silently

`flush()` only did `console.error`. `void boot()` and `void persistCompletion()`
were unhandled rejections. And if `architectAgent.handleTurn` threw, `respond()`
left `thinking = true` forever — which hides the answer form entirely — after
having already cleared the typed draft.

**Fix:** persistence exposes `onStatusChange`; the guided assessment renders a
red alert banner with a "Reintentar guardado" action, a boot-failure screen
that states the saved answers are intact, and `respond()` restores the typed
draft and clears `thinking` on error.

### 5. One unwritable row aborted the whole save

`persistBundle()` threw on the first failing upsert, skipping every workspace
after it. Confirmed live: upserting a workspace the user is not a member of
returns `42501 new row violates row-level security policy`. With more than one
workspace in the bundle, `ws_isalwa` could be silently skipped.

**Fix:** attempt every row, collect failures, throw once at the end.

### 6. Answers only reached Carmen at the very end

In-progress answers lived only in `architect_active_interviews`. The workspace
row — what Carmen's UI reads — was updated solely by
`applyInterviewToWorkspace` when the interview hit `phase: "complete"`. Álvaro
could answer twenty questions and Carmen would still see Business
Understanding 0.

**Fix:** the guided assessment now mirrors the live interview memory
(`conversationMemory`, `businessUnderstanding`) into the shared workspace row
on a 1.5 s debounce via the existing workspace repository. The full
meeting/blueprint/report pass still happens only at completion — unchanged.

## Files changed

- `lib/repositories/migrate.ts` — targeted prune of fabricated facts instead of wiping memory
- `lib/persistence/index.ts` — `flush()`, retained buffer on failure, error channel, loud read failures, leave-page flush
- `lib/repositories/supabase-store.ts` — `persistBundle` writes all rows and aggregates failures
- `components/discovery/guided/guided-assessment.tsx` — error banner, boot-failure screen, draft recovery, flush on unmount, live progress sharing
- `scripts/` — verification tooling (below)

## How to verify

**1. Álvaro can read and write everything he needs (live, non-destructive):**

```bash
node --env-file=.env.local scripts/verify-pilot-access.mjs
```

Expect `OK` for `workspaces.update`, `workspaces.upsert` and
`active_interviews.upsert`. The non-member upsert is *expected* to fail with
`42501` — that is RLS doing its job.

**2. The heal no longer eats real answers:**

```bash
npx tsx scripts/verify-migrate-heal.ts
```

Expect four `PASS` lines.

**3. Inspect what is actually stored (service role, read-only):**

```bash
node --env-file=.env.local scripts/inspect-pilot-state.mjs
```

**4. End-to-end as Álvaro:**

1. Log in as `alvaro@isalwa.demo` and open the guided assessment.
2. Answer one question, then immediately click "Volver al espacio de trabajo".
3. Re-run `inspect-pilot-state.mjs` — `active_interview` `updated_at` must be
   current and `knownFacts` must include the new answer.
4. Reopen the assessment: the answer is still there and no fresh interview was
   started.
5. Within ~2 s, the `ws_isalwa` workspace row shows a non-zero
   `businessUnderstanding` — Carmen sees the same progress on refresh.
6. To confirm errors surface: block `*.supabase.co` in devtools, answer a
   question, and check the red "Sus respuestas no se han guardado" banner
   appears instead of a silent loss.

## Known follow-up (not in this fix)

The live `architect_active_interviews` row for `ws_isalwa` still carries
`seed_fact_0` / `seed_fact_1` from the old fabricated seed, which inflates the
score shown *inside* the running interview to 71. Company memory is now healed
on write, so the workspace ends up honest, but that in-flight session still
displays fabricated evidence. Clearing it means discarding Álvaro's current
in-progress session, so it is left as a deliberate decision for Carmen rather
than done silently.
