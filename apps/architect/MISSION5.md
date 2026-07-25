# Mission 5 — Consulting Intelligence

**Status:** Complete  
**App:** `apps/architect`  
**Depends on:** Mission 0–4 foundation (reasoning, memory, knowledge, blueprint)

## Goal

The interview should no longer simply collect facts.

It continuously evaluates business maturity, operational risk, process quality, organizational maturity, software maturity, data maturity, and AI readiness.

Every answer updates these models.

## Hard constraints honored

- **No AI / no OpenAI / no chat features**
- Deterministic engines only
- Interview UX unchanged — consulting brain deepened underneath
- Company Memory, Knowledge Center, Blueprint, and `lib/reasoning/` extended, not replaced

## What shipped

### `lib/consulting/`

| Module | Role |
| --- | --- |
| `maturity.ts` | Sales · Operations · Finance · Technology · Leadership · Documentation · Automation · Data · Customer · People |
| `risk.ts` | Excel/WhatsApp/paper/approvals/tribal knowledge/… pattern detection |
| `contradictions.ts` | Soft “This may require clarification…” pairs |
| `opportunities.ts` | Quick Wins → 30-day → 90-day → 6-month → 1-year → strategic |
| `patterns.ts` | Recurring consulting patterns |
| `recommendations.ts` | Mitigations + opportunity moves |
| `health.ts` | Commercial · Operations · Technology · People · Processes · Data · AI Readiness · Execution |
| `confidence.ts` | Meta-confidence across models |
| `whiteboard.ts` | Sync consulting layers into Living Whiteboard |
| `evaluate.ts` | Orchestrator called after every absorb in `think()` |

### Memory + whiteboard

`ConversationMemory.consulting` holds the full evaluation.

Living Whiteboard now includes:

Facts · Hypotheses · Risks · Unknowns · Assumptions · Contradictions · Ideas · Opportunities

(in addition to existing business-model fields)

### Report

Discovery report synthesis now reads like senior consulting output:

- Maturity + business health lines
- Risk patterns with mitigations
- Soft clarifications (never accusations)
- Opportunity horizons
- AI readiness framed as data/process readiness — not tooling fashion

## Integration

```text
answer
  → absorbAnswerIntoMemory()
  → evaluateConsultingIntelligence()   ← Mission 5
  → insights / opportunities / next question
```

No LLM in this path.

## Success criteria

At the end of discovery, the report should feel closer to McKinsey / BCG / Bain than to ChatGPT — because it is structured evaluation over evidence, not generative prose theater.
