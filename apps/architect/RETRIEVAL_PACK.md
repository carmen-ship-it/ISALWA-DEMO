# RetrievalPack — Cursor-style context packing (Mission C)

**Status:** Shipped. Extends the Consulting Intelligence Agent (`CONSULTING_INTELLIGENCE_AGENT.md`, Mission G) and the AI Provider abstraction (`AI_PROVIDER_ABSTRACTION.md`). No new store, no new database — `RetrievalPack` reads the same records every other engine already reads (`ConversationMemory`, `WorkspaceKnowledge`, the Readiness Engine's own gap ranking) and returns a bounded, provenance-tagged slice of them.

## Product idea

Every planning cycle — the Consulting Intelligence Agent waking on new evidence, the guided interview picking its next question — needs a *bounded* amount of context, not the whole workspace. Cursor's own context packing is the model: recent conversation for continuity, retrieved chunks for relevance, and the open structure (here, readiness gaps) that is always worth carrying regardless of the query. `RetrievalPack` is that same shape for Architect:

1. **Recent answers** — the newest `ConversationMemory.knownFacts`, unconditional on the query (short-term memory, not a search result).
2. **Document chunks** — `WorkspaceKnowledge.chunks`, ranked against the query.
3. **Related knowledge entities** — `WorkspaceKnowledge.entities`, ranked against the query.
4. **Open readiness gaps** — the Readiness Engine's own `stillLearning` ranking, never re-ranked here.

Every item carries `provenance`: `documentId` for a chunk or entity's source asset, `meetingId` for an answer captured in a specific session, `factKey` for the interview fact it came from, `entityId` for a knowledge-graph node. Nothing in a pack is a paraphrase with no record behind it.

## Where it lives

```
lib/ai/retrieval/
  chunks.ts   retrieveRelevantChunks() — embed a query through the central AI
              provider (lib/ai), rank WorkspaceKnowledge.chunks against it.
              Pre-existing (AI Provider Abstraction mission); moved out of
              index.ts only so pack.ts could import it without a circular
              dependency on the barrel that re-exports both.
  types.ts    RetrievalItem, RetrievalPack, RetrievalProvenance,
              RetrievalItemKind.
  pack.ts     buildRetrievalPackSync() / buildRetrievalPack() — the four
              collectors above, capped and merged.
  index.ts    the only import path other modules should use.
```

## Two variants, one shape

`buildRetrievalPack` (async) and `buildRetrievalPackSync` (sync) return the identical `RetrievalPack` shape. They differ only in how the **document-chunk tier** is produced:

| | `buildRetrievalPackSync` | `buildRetrievalPack` |
| --- | --- | --- |
| Chunk ranking | keyword overlap against the query (`tokenize` + Jaccard-style hit ratio, 0–100) | `retrieveRelevantChunks` — real embeddings via `ai.embed()` (`lib/ai`), falls back to the keyword ranker on any error or missing provider |
| Network calls | none | one, to whichever provider `AI_CONFIG` resolves to |
| Safe to call from | anywhere — both current call sites | a server context only (API route, server action) |
| Used today by | the Consulting Intelligence cycle, the guided-discovery UI | not yet wired to a call site (see **Upgrade path**) |

This mirrors the exact honesty rule `lib/documents/vectors.ts` already applies to chunk storage — a `pending`-embedding chunk is never presented as searchable. Here, a pack is never allowed to throw or silently degrade to nothing just because no embeddings key is configured; it falls back to a keyword ranker that always works.

### Why the sync variant is what actually runs

Both current call sites are structurally unable to call `ai.embed()` directly today:

- **The Consulting Intelligence cycle** (`runConsultingIntelligenceCycle`) is synchronous and pure by its own documented contract (`cycle.ts`), and its two callers (`lib/memory/apply-interview.ts`, `lib/intake/pipeline.ts`) are themselves invoked directly from client components (`guided-assessment.tsx`, `business-knowledge.tsx`) — there is no server hop in between.
- **The guided-discovery UI** (`guided-assessment.tsx`) is a client component. `AI_CONFIG`'s API key (`lib/ai/config.ts`) is read from `process.env.ARCHITECT_LLM_API_KEY`, a server-only variable never bundled into client JavaScript — calling `ai.embed()` from the browser would either throw or silently resolve to no provider.

Forcing either path async and through a new network hop to make real embeddings reachable is a larger, riskier change than this mission's scope — it is called out here as the documented upgrade, not built speculatively.

## Wiring

### Mission G cycle — `collectRelatedEvidence`

`lib/consulting-intelligence/working-memory.ts#collectRelatedEvidence` previously just copied the evidence snapshot's strongest signals (interview facts + document summaries + imported records + business rules, undifferentiated). It now calls `buildRetrievalPackSync` with the workspace's memory and knowledge, the Readiness Engine's `stillLearning` gaps, and a query built from the cycle's own highest-value unknown (`buildRetrievalQuery(highestValueUnknown.gap, highestValueUnknown.topicLabel, evidenceEvent.text)`). `cycle.ts` reorders step 8 (`pickHighestValueUnknown`) ahead of step 7 (`collectRelatedEvidence`) so the query can use it, and threads a new optional `EvidenceEvent.meetingId` through so an "answer" item can point at the meeting it was captured in. `RelatedEvidenceItem` gained `kind` and `provenance` fields (additive); it stays internal-only — `visibility.ts` still gates the whole notebook behind `role === "consultant"`.

### Guided discovery — "Basado en…" chips

`guided-assessment.tsx` builds its own pack (`buildRetrievalPackSync`, query = current question's prompt + topic + the client's latest answer) and passes it to `AnsweringPanel`, which renders `<EvidenceChips>` above the "Por qué preguntamos esto" box. `EvidenceChips` is deliberately small: up to four short Spanish labels (`su respuesta`, `documento: …`, `cliente: …`, `brecha: …`) as static, non-interactive chips — the same visual pattern `preparation-brief-panel.tsx`'s `ChipRow` already uses (`--isalwa-mist` / `--isalwa-slate` tokens), not a dump of the pack and not the internal consulting vocabulary (hypotheses/contradictions never reach this surface).

### Planner (`lib/reasoning/planner/next-question.ts`)

`ConversationMemory` — the only input `planNextQuestion` and `selectNextConsultantQuestion` receive — never carried `WorkspaceKnowledge` (chunks, entities), so the ranked-selection function itself is unchanged this mission; the ranking algorithm continues to be the sole authority documented in `GUIDED_ASSESSMENT.md`. Instead, the pack reaches the same surface the planner's own question reaches: `guided-assessment.tsx` already holds both `interview.memory` (planner's input) and `workspace.knowledge` (chunks/entities) together, so the evidence chips are built from whichever question the planner just chose, in the same render pass. Extending `planNextQuestion`'s signature to thread retrieval through the ranking function itself is left to a future mission if the ranking algorithm ever needs to read chunk-level evidence directly.

## Cap size

`MAX_RETRIEVAL_ITEMS = 8` total; per-tier caps before that limit (`answer: 3, document_chunk: 4, knowledge_entity: 3, readiness_gap: 2`) keep any one tier from crowding out the others. `RetrievalPack.truncated` is `true` whenever more candidates existed than the cap allowed through — visible to any caller that wants to say "more evidence exists" without listing it.

## Upgrade path — pgvector

`lib/documents/vectors.ts` already documents its own ceiling: only the first `MAX_PERSISTED_VECTOR_CHUNKS` (64) chunks per workspace keep a stored vector; the rest are `embeddingStatus: "skipped"` with an explanatory note. `RetrievalPack`'s document-chunk tier inherits that ceiling directly — the keyword ranker sees every chunk (text is never dropped), but `buildRetrievalPack`'s semantic tier can only ever rank chunks that fit inside that budget. Moving `WorkspaceKnowledge.chunks`' vectors to a dedicated pgvector table (already the documented target in `vectors.ts`) removes both the 64-chunk vector cap and the 0.8 MB-per-workspace JSON cost, and `searchChunks` / `retrieveRelevantChunks` are already the exact interface that would sit in front of it — nothing in `pack.ts` would need to change, only what backs `retrieveRelevantChunks`.

The second half of the upgrade — making `buildRetrievalPack`'s semantic tier reachable from the two real call sites — needs one new seam: either an API route (`/api/retrieval/pack`) that the client components call over `fetch` (the same pattern `lib/documents/embeddings.ts` already uses for chunk embedding), or moving `runConsultingIntelligenceCycle`'s invocation server-side. Both are additive; neither changes `RetrievalPack`'s shape.

## What did not change

- No new persisted field — a pack is computed on demand, never stored on the workspace.
- No new vector store, no new taxonomy — `RetrievalItemKind` is exactly the four sources listed above.
- `selectNextConsultantQuestion` / `planNextQuestion`'s ranking logic is untouched.
- `ConsultingWorkingMemory` stays consultant-only (`visibility.ts` unchanged); the client-facing "Basado en…" chips are a separate, deliberately thin read of the same evidence sources, not a leak of the internal notebook.
