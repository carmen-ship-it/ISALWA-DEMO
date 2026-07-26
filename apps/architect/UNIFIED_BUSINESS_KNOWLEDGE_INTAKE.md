# Unified Business Knowledge Intake

**Status:** Architecture + deterministic heuristics shipped. No OpenAI, no OCR, no live connectors. Interview experience, existing engines, and Client Mode / Spanish / Welcome work (Mission 1) are unchanged.

## Product idea

> Architect learns from interviews today; tomorrow from everything. Every source is another form of evidence. The more information a client gives us, the fewer questions we need to ask.

Today the product only ever learned from the guided interview and from ad-hoc file uploads (filename/extension only). This mission adds one **unified intake layer** — `lib/intake/` — that treats every source (a PDF, a pasted meeting transcript, a CRM export, a client's own typed notes) the same way: normalize → extract → dedupe/merge → feed the *existing* engines. It does not add a new vault, a new scoring model, or a new UI system.

## What shipped

### `lib/intake/` — the unified pipeline

| File | Responsibility |
| --- | --- |
| `contracts.ts` | `Evidence`, `IntakeSourceType` (16 sources), `IntakeSlots` (facts/entities/relationships/unknowns/contradictions/businessRules/painSignals/opportunities), extractor + connector contracts. |
| `sources.ts` | `INTAKE_SOURCES` catalog (status `designed` vs `planned`, bilingual copy) + `INTAKE_CONNECTORS` (Google Drive, SharePoint, QuickBooks, HubSpot, Salesforce, SAP, Outlook/Gmail, Zoom/Teams — contracts only, no OAuth/sync). |
| `extractors.ts` | One extractor per source. Designed sources run a real, deterministic heuristic (filename/extension classification reused from `lib/knowledge/intake.ts`, or a keyword scan for pasted text). Planned sources return an honest "not implemented" queued result. |
| `normalizer.ts` | Cleans/dedupes a single extraction batch before merge. |
| `deduplication.ts` | Cross-source merge into `KnowledgeBusinessRule[]`, `KnowledgeContradictionFlag[]`, `PainPoint[]`, `Opportunity[]`, `openQuestions` — reinforce on match, append on new, never overwrite. |
| `confidence.ts` | `reinforceConfidence` (diminishing returns, capped at 0.97) + `detectNumericContradiction` (deterministic: high word overlap + materially different numbers ⇒ flagged, soft, never accusatory). |
| `entities.ts` / `relationships.ts` | Merge into the **existing** `KnowledgeEntity[]` / `KnowledgeRelationship[]` — Departments, Systems, Roles (Person + role), Documents, Processes (Workflow) are just `KnowledgeEntityKind` values. No parallel entity taxonomy. |
| `evidence.ts` | Append-only evidence ledger (`WorkspaceKnowledge.evidenceLog`, bounded to 500 entries). |
| `gaps.ts` | Reuses `deriveKnowledgeCoverage` (no second scoring system) to compute weak areas → "aún necesitamos…". |
| `summary.ts` | Builds the bilingual "✓ Aprendimos… / — Aún necesitamos…" client copy. |
| `pipeline.ts` | `ingestSource()` — the single orchestration entry point; `ingestFileThroughIntake()` — adapter so the existing `KnowledgeUpload` widget can route through the new pipeline without a UI rewrite. |

**Source catalog (16):** Interview, PDF, Word, Excel, PowerPoint, CSV, Image, Meeting Transcript, Audio Transcript, CRM Export, ERP Export, Accounting Export, Email Archive, Folder, API Connector, Manual Notes.

**Designed today** (real, deterministic, metadata/keyword-only): PDF, Word, Excel, PowerPoint, CSV, Meeting Transcript, Manual Notes, Interview (pass-through — interview evidence already lives in `ConversationMemory`).

**Planned, honestly stubbed** (received, filed, content not read): Image (needs OCR), Audio Transcript (needs speech-to-text), CRM/ERP/Accounting Export, Email Archive, Folder, API Connector.

### How merging works (never duplicate; accumulate evidence)

1. **Entities/relationships** — matched by `kind + normalized name` (entities) or `from + to + kind` (relationships) against what's already in `workspace.knowledge`. A match appends a new `sourceAssetIds` reference and reinforces confidence; a miss appends a new record.
2. **Business rules / contradictions** — matched by normalized statement text against `WorkspaceKnowledge.businessRules` / `.contradictions` (new, additive fields — see below).
3. **Pain signals / opportunities** — matched by normalized title against the **existing** `CompanyWorkspace.painPoints` / `.opportunities` arrays. Intake feeds those engines directly; there is no separate pain/opportunity store.
4. **Unknowns/gaps** — merged into the **existing** `CompanyWorkspace.openQuestions`.
5. **Contradictions** are also *detected* at merge time: every new fact is checked against prior known statements (workspace themes, pain point descriptions, `ConversationMemory.knownFacts`) for high word-overlap + materially different numbers. This is a narrow, transparent heuristic — anything else stays an "unknown" rather than a guess.

### Minimal, additive schema extensions

- `types/knowledge.ts`: `WorkspaceKnowledge` gained `businessRules`, `contradictions`, `evidenceLog` (all default to `[]` via `ensureWorkspaceKnowledge`/`emptyWorkspaceKnowledge`/`buildWorkspaceKnowledge` in `lib/knowledge/coverage.ts` — old persisted workspaces read back safely with no migration). `KnowledgeAssetType`/`KnowledgeCategory` gained `manual_notes` / `"Manual Notes"`.
- `lib/knowledge/intake.ts` (the earlier "Executive Knowledge Intake" swarm output): one 3-line fix so the legacy single-file upload path preserves `businessRules`/`contradictions`/`evidenceLog` instead of dropping them — required so the two intake paths (legacy + unified) can coexist safely on the same vault.
- `lib/reasoning/confidence/score.ts`: added one `evidence_<dimension>` and one `evidence_<dimension>_strong` key per Discovery dimension to the existing fact-key lists `computeDiscoveryScore` already checks. This does **not** add a second scoring system — it just lets evidence-backed facts count toward the score exactly like an interview answer would.

### Readiness — `lib/readiness/`

No Readiness Engine existed. Per the mission's fallback instruction, this is intentionally thin:

- `assessReadiness(workspace)` reads the Knowledge Engine's **existing** `coverage` (per `KnowledgeCoverageArea`) — no independent scoring model — and maps it onto Discovery dimensions (`Customers→customers`, `Sales→sales`, `Operations→operations`, `Finance→finance`, `HR→team`).
- `applyReadinessToMemory(memory, workspace)` contributes `KnownFact`s using the new `evidence_<dimension>` / `evidence_<dimension>_strong` keys — idempotent, never overwrites, never invents facts beyond "evidence exists for this area."
- Wired into `lib/resume/engine.ts` right next to the existing `mergeKnowledgeIntoMemory` call (one line): `applyDiscoveryScore(applyReadinessToMemory(mergeKnowledgeIntoMemory(...), workspace))`. The existing planner (`lib/consulting/questions/question-priority.ts`) already deprioritizes `covered`/high-confidence dimensions — this just gives it real evidence to work with. **The interview UX itself is untouched.**

Practical effect: upload an HR handbook → `HR` coverage rises → `evidence_team` fact contributes to the `team` dimension's confidence → if strong enough (combined with anything else known), the team/HR topic is marked `covered` and stops generating high-priority questions — the questions aren't hidden, they're just no longer "starved" evidence.

### Client-facing UX — Business Knowledge workspace section

New tab **"Conocimiento del negocio"** (`components/workspace/business-knowledge.tsx`), visible in both Consultant and Client Mode (`workspace-tabs.tsx`):

- Header: *"Ayúdenos a entender su negocio más rápido."* / *"Cuanta más información nos dé, menos preguntas necesitamos hacerle."*
- Supported examples list (handbook, SOPs, spreadsheets, contracts, meeting transcripts, …) sourced live from `INTAKE_SOURCES`.
- Reuses the **existing** `<KnowledgeUpload>` drag/drop widget verbatim — no parallel upload UI — via a new optional `ingest` prop (defaults to the original `ingestKnowledgeUpload`, so the consultant-only Knowledge Center's behavior is byte-for-byte unchanged) pointed at `ingestFileThroughIntake`.
- A manual-notes textarea (`ingestSource({ sourceType: "manual_notes", textContent })`) for clients without a file handy.
- After every ingest: **✓ "Aprendimos de …"** / **— "Aún necesitamos …"** lines built by `summary.ts`.
- Coverage bars (reusing `coverageBand`/`coverageBandLabelEs`) and a collapsible "próximas fuentes de datos" list of the planned connectors.

The old consultant-only Knowledge Center (`assessment` tab) is untouched and keeps using the original `ingestKnowledgeUpload` path — both write to the same `workspace.knowledge`, so they reinforce each other rather than compete.

## What's explicitly NOT done (by design)

- No OpenAI/LLM calls anywhere in `lib/intake`.
- No OCR — `image` stays `planned`.
- No live connector sync — Google Drive/SharePoint/QuickBooks/HubSpot/etc. are contracts only (`INTAKE_CONNECTORS`), zero network calls.
- No changes to the Memory, Knowledge (core), Readiness-adjacent Reasoning, Blueprint, Process, Consulting, or Solution engines beyond the additive, backward-compatible extensions listed above.
- No changes to the interview UI/flow — only to what evidence the planner sees *before* the interview starts.
- No AI chat.

## Verification

- `npx tsc -p tsconfig.json --noEmit` — clean.
- `npx eslint .` — clean (only pre-existing, unrelated warnings).
- `npx next build` — succeeds.
- `lib/intake/confidence.ts` unit-smoke-tested standalone (`reinforceConfidence`, `detectNumericContradiction`).

## Known follow-ups (future missions, not this one)

- Extractors don't yet emit `relationships` (contract + merge path exist and are exercised by tests of the type system; no extractor produces one yet — real relationship inference needs actual content parsing, which is explicitly out of scope here).
- OCR, speech-to-text, and the 8 connector integrations remain `planned` — the contracts (`IntakeConnectorContract`, extractor stubs) are the seam to implement against.
- Contradiction detection is a narrow numeric heuristic; broader (non-numeric) contradiction detection is future work.
