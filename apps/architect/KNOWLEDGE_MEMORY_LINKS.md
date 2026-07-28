# Knowledge Memory Links — the living graph

**Status:** Deterministic heuristics shipped. No new store, no graph DB, no model calls. Extends the Unified Business Knowledge Intake (`UNIFIED_BUSINESS_KNOWLEDGE_INTAKE.md`) and the Company Model (Mission A/G) — nothing here replaces either.

## Product idea

> "We use QuickBooks." + "We export invoices every Friday." should not sit in the vault as two orphan chat lines. They describe one operating reality — Finance uses QuickBooks to run a weekly invoice-export process — and the graph should say so, even when the two statements arrive in different sentences, different interview turns, or different uploaded documents.

Before this mission, `lib/intake/detectors.ts` only ever linked two entities that shared **one sentence**, and only for two relationship shapes (`Approves`, `CommunicatesWith`). A department named in one paragraph and a system named three sentences later never connected — every relationship needed both endpoints spelled out together, in order, around the same verb. This mission widens relationship detection to four more shapes (`Uses`, `DependsOn`, `Owns`, `Purchases`) and gives all six a memory: a running **anchor** — the most recently named department/person/system/process/vendor — that a sentence can resolve an implicit subject or object against. Anchors are seeded from the workspace's own already-merged Knowledge Engine entities, so the same resolution works within one document *and* across separate uploads, weeks apart.

## What shipped

### `lib/intake/detectors.ts` — four new relationship shapes + cross-turn anchors

| Relationship | Verb pattern (ES/EN) | Subject kinds | Object kinds |
| --- | --- | --- | --- |
| `Uses` | usa(mos) / utiliza(mos) / trabaja con / use(s) / using | Department, Person, Workflow | System |
| `DependsOn` | depende de / requiere / necesita / depends on / requires | Workflow, System | System, Supplier |
| `Owns` | es responsable de / a cargo de / dueño de / owns / in charge of | Person | Workflow, System, Department |
| `Purchases` | compra(mos) a / le compramos a / purchases from / buys from | Department, Person | Supplier |

These join the existing `Approves` and `CommunicatesWith` detectors — same deterministic-keyword contract, same `Evidence` trail, no model call.

**Anchor resolution (`directedPairWithAnchor`)** runs in three steps, most-explicit-first:

1. **Exact, same-sentence pair** — unchanged `directedPair` logic (an entity before the verb, one after). Full confidence.
2. **Both sides named, wrong shape** — e.g. "We use QuickBooks for accounting" has the department *after* the object, not around the verb. If exactly one subject-kind and one object-kind entity are in the sentence, they're paired directly. Still full confidence — nothing was inferred, just positioned differently.
3. **One side missing — resolve from context** — "We use QuickBooks." has no explicit subject at all. If exactly one entity of the expected object (or subject) kind is in the sentence, the missing side comes from the **anchor**: the most recently mentioned entity of an allowed kind, tracked sentence by sentence and seeded at scan start from every entity the workspace already has on record (`seedAnchors`, fed by `lib/intake/pipeline.ts` via `IntakeExtractorContext.priorEntities`). This is the seam that makes linking survive across turns and across separate document uploads, not just within one paragraph. Anchor-resolved edges are never invented from nothing — a real relationship verb must be present in the sentence — and they carry a **25% lower confidence** than an explicit pair, so the graph is honest about how the edge was formed.

Ambiguous sentences (two candidates for the same role, or neither role represented) resolve to nothing rather than guessing — same "honest gap over invented structure" rule the file already followed for approvals/handoffs.

### Cadence — an operating rhythm, not a new relationship kind

`cadenceLabel()` recognizes daily/weekly/biweekly/monthly/annual phrasing (`diario`, `cada viernes`, `semanal`, `weekly`, `every Friday`, …) and canonicalizes it to one Spanish label (`Diario` / `Semanal` / `Quincenal` / `Mensual` / `Anual`). Every hit is captured as an auditable `IntakeFact` (`key: "cadence"`), and when a process/workflow is named in the same sentence, the cadence is tagged directly onto that `KnowledgeEntity`'s existing free-form `metadata` map — no schema change, no parallel store. "Facturación" gains `metadata.cadence = "Semanal"` the moment a client says invoices go out every Friday.

### `lib/intake/entities.ts` — additive metadata merge

Entity reinforcement (a repeat mention of an already-known entity) previously only bumped confidence and `sourceAssetIds`. It now also merges in any metadata keys the entity didn't have yet (e.g. cadence learned in a later document) — additive only, never overwrites a value already on record. This is what lets a process named in one upload pick up its cadence from a completely different, later upload.

### `lib/intake/contracts.ts` + `extractors.ts` + `pipeline.ts` — the cross-turn seam

- `IntakeExtractor.extract()` gained an optional second parameter, `IntakeExtractorContext { priorEntities? }`. Every designed extractor (file, text, image) threads it straight into `detectBusinessSignals`; omitting it (existing callers, tests) is fully backward compatible — the scan just falls back to same-sentence pairing only, exactly as before this mission.
- `pipeline.ts#ingestSource` now reads `workspace.knowledge` **before** calling the extractor (a 3-line reorder, no behavior change to anything else) and passes `knowledge.entities` as `priorEntities`. `KnowledgeEntity[]` is already append-only, so array order is chronological — the last entity of a given kind is genuinely the most recently discussed one, whether that was three sentences ago or in last week's upload.
- Interview evidence is unaffected: `INTERVIEW_EXTRACTOR` still returns empty slots (interview facts already live in `ConversationMemory` — see `UNIFIED_BUSINESS_KNOWLEDGE_INTAKE.md`); this mission does not rewire the live interview UI.

### `lib/company-model/relationships.ts` — Spanish labels for the client-visible graph

`deriveRelationships()` previously showed the literal source sentence (whatever language the client wrote it in) as the small "kind" chip next to every relationship in the Capability Digital Twin / Company Model panel — e.g. a whole English sentence in an uppercase-tracked badge. The badge now always shows the short Spanish kind label (`Utiliza`, `Depende de`, `Es propietario de`, `Compra a`, …) from the existing `RELATIONSHIP_KIND_LABEL_ES` map; the literal quoted sentence stays exactly where it already lived — the evidence entry underneath — so nothing about the audit trail changes, only what the badge itself says. `lib/knowledge/relationships[]` (the raw Knowledge vault view in `knowledge-center.tsx`) is untouched — that view is intentionally the literal evidence quote, in whichever language it was written.

### QuickBooks / connectors — unchanged

`lib/knowledge/connectors.ts` (the `IntakeConnectorContract` catalog) is untouched — QuickBooks, HubSpot, Salesforce, SAP, etc. stay contract-only, no OAuth, no sync. Every `Uses`/`DependsOn` edge involving "QuickBooks" in this mission comes exclusively from interview/document text naming it, exactly as `Uses`/`Approves` edges already did before this mission.

### Consulting Intelligence cycle (Mission G) — benefits automatically

`runConsultingIntelligenceCycle` → `deriveCompanyModel` → `deriveRelationships` already reads `workspace.knowledge.relationships`/`.entities` on every cycle (see `CONSULTING_INTELLIGENCE_AGENT.md`). No wiring change was needed here: the next cycle after any intake run simply sees the richer relationship set (four new kinds, cross-turn anchors, cadence-tagged processes) and reflects it in the Company Model and capability confidence, the same way it already reflected `Approves`/`CommunicatesWith` edges.

## What did not change

- No new persisted field, no new relationship kind beyond the four added, no new taxonomy — every new edge is one of the eight `KnowledgeRelationKind` values that already existed (`Uses`, `DependsOn`, `Owns`, `Purchases`), and cadence rides on the existing `KnowledgeEntity.metadata` string map.
- No graph database, no vector store for the graph itself — everything still lives on `WorkspaceKnowledge.entities` / `.relationships`, persisted exactly as before.
- Contradictions still surface as soft clarification items (`lib/intake/confidence.ts` / `deduplication.ts`) — this mission does not touch contradiction handling.
- Cross-turn anchoring is scoped to the Knowledge Engine's own entity list (`priorEntities`), not a new "conversation context" object — reuse before creation.

## Example — the mission's own scenario, verified end to end

Given (as two separate, later-arriving intake calls, exactly the "different turns" case):

1. *"In the finance department, we handle all accounting. We use QuickBooks. We export invoices every Friday."*
2. *(a second, unrelated document, uploaded afterward)* *"We use QuickBooks for our books."*

Result:

- `Finanzas` --Uses (0.38, anchored)--> `QuickBooks` — from document 1, where "we use QuickBooks" has no explicit subject and resolves against the `Finanzas` department named two sentences earlier in the same scan.
- `Facturación` entity carries `metadata.cadence = "Semanal"` — from "we export invoices every Friday" naming the process and the cadence in the same sentence.
- The **second, independent document** — with no department mentioned anywhere in it — still produces `Finanzas` --Uses (0.38, anchored)--> `QuickBooks`, because the anchor seeded from the first document's already-merged `Finanzas` entity carries forward. This is the cross-turn linking this mission set out to build.
