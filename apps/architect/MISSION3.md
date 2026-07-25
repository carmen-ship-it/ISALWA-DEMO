# Mission 3 — Knowledge Ingestion Engine

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 2 Company Memory & Living Workspace

## Goal

Evolve the Architect from:

> “Tell me about your company.”

into

> “I've already analyzed your documents. Let's discuss what I found.”

Every company already has knowledge — Excel, PDF, PowerPoint, Word, CRM/ERP exports, transcripts, WhatsApp, images, org charts. The Architect treats these as **evidence**, not attachments.

## What shipped

### Knowledge Center (Workspace)

Replaces the Mission 2 Document Center placeholder with a **Knowledge** vault:

- Knowledge Summary (documents, last analysis, entities, unknown areas)
- Coverage derived from imported assets (Customers / Sales / Operations / Finance / HR)
- Category vault: Company Documents · Meeting Transcripts · Customer Lists · Sales Data · Invoices · Presentations · Images · Process Documents · Policies · Future Imports
- Knowledge graph entities + relationships (display)
- Processing pipeline (architecture only)
- Future connectors (architecture only)

**No uploads. No AI extraction.** Mock assets demonstrate the product feeling.

### Domain contracts (`types/knowledge.ts`)

- `KnowledgeAsset`
- `KnowledgeEntity` / `KnowledgeRelationship`
- `WorkspaceKnowledge`
- Pipeline stages, extraction providers, connectors
- `KnowledgeReasoningContext`

### Architecture folders

```text
lib/knowledge/
  coverage.ts      # derive coverage from assets (not hard-coded theater)
  pipeline.ts      # Upload → … → Reasoning Engine (designed)
  extraction.ts    # PDF/Excel/OCR/… provider contracts (throw)
  connectors.ts    # Drive/Dropbox/HubSpot/SAP/… hooks
  seed.ts          # mock vaults + knowledge events
  briefing.ts      # “I reviewed three documents…”
  bridge.ts        # merge knowledge into ConversationMemory
```

Company Memory is **extended**, not replaced. `lib/reasoning/` is **not rewritten**.

### Processing pipeline (design only)

```text
Upload → Parser → Knowledge Extraction → Memory → Recommendations → Reasoning Engine
```

### Knowledge → timeline

Processed assets become timeline events, e.g.:

- Customer Database Imported
- Sales History Imported
- Purchasing Policy Added
- Meeting Transcript Processed

### Architect behavior

When knowledge exists, resume/interview openings include:

- “I reviewed three documents before today's meeting.”
- “I found four recurring operational themes.”
- “I still have questions about purchasing.”

Knowledge themes and unknown areas are merged into `ConversationMemory` before the interview so the consultant brain plans from Conversation + Knowledge + Memory without rewriting `think.ts`.

### Search

Now includes Knowledge · Documents · Entities · Relationships.

### Explicitly not built

- File uploads
- Live AI / OCR / parsers
- Connector OAuth or sync
- Supabase knowledge tables

## Memory evolution

1. Assets land in Knowledge Center (future: upload/connectors)
2. Extraction fills entities, relationships, themes (future)
3. Coverage + unknown areas update
4. Timeline records ingestion
5. Resume Engine briefs from knowledge
6. Bridge merges evidence into ConversationMemory
7. Reasoning continues via existing `think()` on enriched memory

## Enables later work

| Next | Consumes |
| --- | --- |
| Process maps | Knowledge workflows + entities + coverage gaps |
| Proposals | Themes + entities + living report |
| Live ingestion | Pipeline + extraction providers + connectors |

## Success criteria

The Architect feels like a consultant who reads everything before entering the meeting. Nothing is uploaded yet. Nothing calls AI yet. The architecture is ready for future ingestion.
