# Adaptive Follow-Ups — one question, grounded in what we already know (Mission D)

**Status:** Shipped. Extends the guided interview's Mission C evidence surface
(`RETRIEVAL_PACK.md`) and the Mission 10 adaptive question engine
(`lib/reasoning/planner`, `lib/consulting/questions`). No new ranking model, no
new persisted state, no new chat surface.

## Product idea

The adaptive engine (Mission 10) already picks the single highest-value next
question every turn — that ranking is untouched by this mission. What it did
not do is *say* why this question, right now, follows from what the client
already told the consultant. A catalog prompt like "¿Qué software usan hoy
para operar el negocio?" reads the same whether it is question 1 or question
12, even when question 12 only exists because the client just mentioned
Excel. This mission adds the one sentence a senior consultant would say out
loud before asking: a grounded citation of the evidence that makes this
question worth asking next — a prior answer, an open capability gap, a
knowledge-graph entity, or a matching line from an uploaded document —
sitting directly above the question the engine already chose.

## Where it lives

```
lib/discovery/adaptive-followup.ts
  buildAdaptiveFollowUp(pack, question) — picks the single strongest citable
  item out of an already-built RetrievalPack and phrases it as one Spanish
  sentence. Returns null when the pack has nothing to cite — same "honest
  empty state" rule every other evidence surface in this app follows.

components/discovery/guided/adaptive-followup-note.tsx
  <AdaptiveFollowUpNote> — renders that sentence in the same visual language
  as the "Por qué preguntamos esto" callout and the "Basado en…" chips it
  sits next to (isalwa-tint-teal, the same tint-box pattern used throughout
  the guided interview — no new visual language introduced).
```

## Why this reuses Mission C's `RetrievalPack` instead of the engine

`RETRIEVAL_PACK.md` already documents why the adaptive planner
(`planNextQuestion` / `selectNextConsultantQuestion`) never carries
`WorkspaceKnowledge`: it is a pure, workspace-agnostic function over
`ConversationMemory` only, called from `domain/interview-engine.ts`'s
synchronous `submitAnswer` path. Threading retrieval into that contract would
be the second-largest change this mission could make for the smallest actual
gain — the ranking itself does not need to change, only what is *said* about
the question it already picked.

Mission C's own answer to this was to build the pack **once, in the client
component**, from data it already holds (`interview.memory` +
`workspace.knowledge` + the Readiness Engine's gaps), and hand it to a
presentation-only component (`EvidenceChips`) next to whatever question the
engine chose. This mission follows the exact same seam:
`guided-assessment.tsx` already computes `retrievalPack` with a query built
from the current question (`buildRetrievalQuery(question.prompt,
question.topic, latestAnswer)`); `buildAdaptiveFollowUp` reads that same pack
a second way, and `AnsweringPanel` renders both side by side — the chips as
a quick tag row, the follow-up note as the one sentence that ties them to a
consultant's reasoning.

## Citation priority

`RetrievalPack` carries four item kinds (`RETRIEVAL_PACK.md`). This mission
picks the first non-empty one, in this order:

1. **`answer`** — the client's own most recent statement. Mission C
   documents this tier as "unconditional on the query — short-term memory,
   not a search result," which is exactly the adaptive-follow-up shape: "building
   on what you just told us" is the single most natural thing a consultant
   says next, and it is why this tier outranks the other three even though
   they are query-filtered and it is not.
2. **`readiness_gap`** — a capability gap the Readiness Engine already ranked
   (Mission A/G's "still learning" list) — the plan's "capability gaps"
   evidence source.
3. **`knowledge_entity`** — a graph entity the query actually matched; this is
   where Mission B's memory links surface, since an entity's summary and
   metadata are the product of intake's relationship/anchor detectors
   (`KNOWLEDGE_MEMORY_LINKS.md`), not a fresh read of the raw graph edges.
4. **`document_chunk`** — a matching line from something the client uploaded.
   Weakest signal of the four (least conversational), so it is the fallback.

Each sentence quotes or paraphrases only what the source item actually says
(`RetrievalItem.statement`, truncated at 140 characters with an ellipsis) —
nothing here is a model guess dressed up as a citation.

## UI placement

`AnsweringPanel` renders `<AdaptiveFollowUpNote>` directly above the existing
`<EvidenceChips>` row, both inside the same question card the engine's chosen
question already occupies — no new panel, no new route, no parallel chat
surface. When `buildAdaptiveFollowUp` returns `null` (a fresh interview with
no known facts yet, or a workspace with no readiness gaps computed), the note
renders nothing and the layout is byte-for-byte what Mission C already
shipped.

## What did not change / was deliberately not built

- **No new persisted field.** Like `RetrievalPack` itself, an
  `AdaptiveFollowUp` is computed on demand from `useMemo` in
  `guided-assessment.tsx` and never written to `Interview` or
  `CompanyWorkspace`. There is nothing to overwrite because nothing is
  stored — the same reasoning `RETRIEVAL_PACK.md` gives for why a pack is
  never persisted applies here.
- **`lib/reasoning/*` and `lib/consulting/questions/*` are untouched.** The
  ranking that decides *which* question comes next (Mission 10) is exactly
  what it was before this mission; this mission only adds a sentence next to
  whatever it picks.
- **`selectNextConsultantQuestion` / `planNextQuestion` signatures are
  unchanged** — same guarantee `RETRIEVAL_PACK.md` already gives, extended to
  this mission.
- **The existing `CONSEQUENCE_LIBRARY` prompts** (`excel_why_exists`,
  `whatsapp_why_channel`, …) already open with a trigger-category clause
  ("Mencionaron Excel — …"). Rewriting those specific static strings to quote
  the literal sentence that triggered them is a smaller, separate follow-up
  left for later — it touches tested Mission 10 copy for a narrower win than
  the general-purpose note this mission ships, which already covers every
  question the engine can choose, not only the three consequence triggers.
- **No new chat surface.** The note lives inside the same guided-interview
  question card every other evidence surface in this app already uses.
