# Mission 24 — Autonomous Consulting Cycle

**Status:** Complete
**App:** `apps/architect`
**Scope:** Add a scheduled (cron) trigger for the Consulting Intelligence Agent so a workspace with
no new evidence this week still gets re-read, and surface an honest Spanish "what changed
overnight" digest to the client when something real moved. Does **not** add a new agent, a new
scoring model, or any new business logic — it composes the same
`runConsultingIntelligenceCycle` every interview answer/document upload already triggers, on a
schedule instead of only on demand.
**Plan:** Near-term roadmap item 1 in
[`docs/ai/04_ARCHITECT_RECEIPT.md`](./docs/ai/04_ARCHITECT_RECEIPT.md).
**Gate honored:** `docs/PRODUCT_CONSTITUTION.md`, `docs/ENGINEERING_GUIDELINES.md`,
`docs/RELEASE_CHECKLIST.md`, `docs/architecture/AI_CONSTITUTION.md`,
[`docs/ai/02_ARCHITECT_CONSTITUTION.md`](./docs/ai/02_ARCHITECT_CONSTITUTION.md).
**Follows:** Mission 20 Part 2 (`faba62d`, Executive Daily Brief), Mission 21 Pass 2 (`2432c8b`,
Company Brain) — both establish the "honest, evidence-sourced consulting sentence, never a toast"
pattern this mission reuses for the overnight case.
**Extends (unchanged):** `runConsultingIntelligenceCycle` (`lib/consulting-intelligence/cycle.ts`),
`ConsultingWorkingMemory` / `EvidenceEvent` (`lib/consulting-intelligence/types.ts`),
`evolveCompanyHistory` (`lib/history`), `migrateBundle` (`lib/repositories/migrate.ts`) — all read
and composed, none rewritten. See `01_ARCHITECT_CONTEXT.md` / `02_ARCHITECT_CONSTITUTION.md` for
why these are protected systems.

## Mission Objective

Architect's tagline is "Architect becomes more intelligent every time your company shares
knowledge" — but until this mission, the Consulting Intelligence Agent only ever re-read evidence
in direct response to something a human did (answer, upload, meeting note). A workspace that goes
quiet for a week never gets re-examined, even though the Missing Information Engine, Readiness
Engine, and Company Model may have accumulated enough small signals to justify a fresh honest
read. This mission adds the third trigger the roadmap calls for — a schedule — so the client
question **"What changed since I last looked?"** stays answerable even overnight, without
inventing a second source of truth or a fake insight when nothing actually changed.

## Protected Systems

- **Consulting Intelligence** (`lib/consulting-intelligence/`) — extended, not replaced.
  `runConsultingIntelligenceCycle` is called with a new `EvidenceEventKind` (`scheduled_review`);
  the cycle itself needed zero logic changes to accept it.
- **Capability Digital Twin** (`lib/discovery-agent/capabilities.ts`) — read only, via the cycle's
  own `memory.capabilities`; no new twin, no second scorer.
- **Auth / Client-Consultant boundary** (`lib/auth/`, `middleware.ts`) — the new cron route is
  outside this boundary by design (no session at all) and is gated by its own `CRON_SECRET`
  mechanism instead; see `docs/SECURITY_POSTURE.md` §5.

## Existing Engines To Use

- `runConsultingIntelligenceCycle` (`lib/consulting-intelligence/cycle.ts`) — the only cycle
  entry point; the scheduled path calls it exactly like `lib/intake/pipeline.ts` and
  `lib/memory/apply-interview.ts` already do.
- `evolveCompanyHistory` (`lib/history`) — the same append-only history step every other save
  path already runs.
- `migrateBundle` (`lib/repositories/migrate.ts`) — the same heal/normalize step every other load
  path already runs; the cron route never invents a second migration path for rows it reads
  directly from Supabase.

No new engine was added. `newlyCompletedCapabilityIds` on `ConsultingIntelligenceCycleResult` is a
small composition helper inside `cycle.ts` (diffing the cycle's own before/after capability list
once, in one place) — not a second scoring model.

## Implementation Strategy

1. `lib/auth/supabase/admin.ts` (new) — a narrow, server-only Supabase client constructed with
   `SUPABASE_SERVICE_ROLE_KEY`, used by nothing except the cron route. This is the first code path
   in the app that legitimately has no signed-in user (a scheduler invocation, not a browser
   session), so it cannot use the normal RLS-backed write path.
2. `lib/consulting-intelligence/overnight-review.ts` (new) — `isOvernightReviewDue` (20h interval,
   headroom for cron drift) and `runOvernightReview`, which calls
   `runConsultingIntelligenceCycle` with `kind: "scheduled_review"` and folds the result onto the
   workspace, exactly like the two existing call sites.
3. `lib/consulting-intelligence/overnight-digest.ts` (new) — `buildOvernightDigest` turns one
   cycle result into a single honest Spanish sentence, reading only the client-safe subset of
   `ConsultingWorkingMemory` (understanding delta, newly completed capability labels, top missing
   evidence gap) — never contradictions/hypotheses. Honest no-change sentence when nothing moved.
4. `app/api/cron/consulting-review/route.ts` (new) — `GET`, gated by `Authorization: Bearer
   <CRON_SECRET>`, honest no-op (200, not an error) when Supabase admin env is absent, otherwise
   loops every `architect_workspaces` row, runs the review when due, and upserts.
5. `components/workspace/overnight-digest-card.tsx` (new) — renders `workspace.lastOvernightReview`
   under the Executive Daily Brief, only while fresh (36h); reuses existing tone/tokens, no new
   visual language.
6. Small composing edits: `lib/consulting-intelligence/{cycle,types,index}.ts` (add
   `newlyCompletedCapabilityIds` to the cycle result and the `scheduled_review` evidence kind),
   `types/workspace.ts` (add `lastOvernightReview` + `overnight_review` timeline category),
   `vercel.json` (nightly cron entry), `.env.example` (`CRON_SECRET` doc block),
   `lib/i18n/messages/{en,es}.ts` (chrome kicker only — the digest sentence itself is generated in
   Spanish inside `overnight-digest.ts`, never routed through i18n).

No new client-visible copy went through i18n except the card's kicker label
(`overnightDigestCard.kicker`); the digest sentence itself is generated in-engine per Constitution
rule 6.

## Definition of Done

- [x] Every claim shown to a client traces to evidence — the digest is copied verbatim off the
      same cycle result the Dashboard/Capability Twin already show; no new number is computed.
- [x] No new scoring model / parallel engine — `newlyCompletedCapabilityIds` is a diff of the
      cycle's own before/after state, computed once inside `cycle.ts`.
- [x] Client Mode / Consultant Mode boundary respected — `OvernightDigestCard` only ever reads the
      already-client-safe `lastOvernightReview` field; the cron route is unreachable without
      `CRON_SECRET` and touches no session/role logic.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm build` pass (see Verification below).
- [x] Mobile + accessibility preserved — `OvernightDigestCard` reuses `SECTION_TONE_*` tokens and
      the same card shell as `DocumentChangeSummaryCard`.
- [x] No duplicated components — one digest card, one cron route, one admin client constructor.
- [x] Honest no-op when Supabase admin env is absent, and honest no-change sentence when a review
      ran but nothing moved — verified by reading `route.ts` / `overnight-digest.ts` directly.

## Verification

```bash
git diff --stat main   # confirms the touched-file list matches this doc
pnpm --filter @isalwa/architect typecheck   # passes, 0 errors
pnpm --filter @isalwa/architect lint        # passes, 0 errors (6 pre-existing warnings, unrelated files)
pnpm --filter @isalwa/architect build       # passes; /api/cron/consulting-review present in route list
```

## Deliberately out of scope

- No UI to manually trigger a review, view review history beyond the timeline entry, or configure
  the interval — the schedule is fixed (nightly, 20h due-threshold) per the roadmap ask; a
  configurable schedule is a distinct, not-yet-requested mission.
- No new evidence sources — the scheduled trigger re-reads what's already there; it does not pull
  from any connector or external system itself.
- No change to Discovery, Readiness scoring, Blueprint, Solution Architecture, Process Model, or
  Company Brain beyond the `OvernightDigestCard` mount in `workspace-view.tsx`.
- Live cron execution against the pilot workspace is **optional for tomorrow's demo** — the route
  degrades to an honest no-op without `CRON_SECRET` / `SUPABASE_SERVICE_ROLE_KEY` configured on
  Vercel; see `apps/architect/PILOT_READINESS_CHECKLIST.md`.

## Receipt Update

See [`docs/ai/04_ARCHITECT_RECEIPT.md`](./docs/ai/04_ARCHITECT_RECEIPT.md) — Mission 24 moved from
"Known WIP" to "Completed missions" with the shipping commit hash.
