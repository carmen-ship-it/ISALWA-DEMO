# Mission 0 — ISALWA Architect Foundation

## Intent

Create the first experience every future client uses before software is built.

Not support.
Not a demo chatbot.
An architect across the table.

## What was built

### Application

- `apps/architect` — independent Next.js 15 app
- Port `3100` to stay clear of ISALWA web (`3000`)
- Package name `@isalwa/architect`
- No dependency on `@isalwa/ui` or the OS product shell

### Experience

- Landing page with premium typography and Begin Discovery
- Guided welcome (not instant chat dump)
- Identity sequence: role → name → company → business
- Adaptive interview with industry-aware questioning
- Living observations panel
- Progress ring + estimated time remaining
- Local autosave
- McKinsey-style discovery report

### Architecture

- Strict TypeScript domain contracts
- Prompt library under `prompts/`
- Architect Agent implemented
- Six future agents as interfaces/stubs only
- OpenAI-compatible LLM abstraction
- Persistence interfaces (memory, local, supabase placeholder)
- Deterministic interview + signal + report engines

### Docs

- `README.md`
- `ARCHITECTURE.md`
- `ROADMAP.md`
- `MISSION0.md` (this file)

## What remains

- Wire LLM provider into live phrasing (optional enhancement)
- Supabase persistence implementation
- Multi-agent runtime
- Evidence intake capabilities (voice, docs, imports, diagrams)
- Direct handoff from `DiscoveryReport` into ISALWA OS projects
- Auth / multi-user org sessions
- Production observability and evaluation harness for interview quality

## Adaptive consultant brain (post Mission 0)

- Working memory after every answer
- Discovery Score (Business Understanding %)
- Living Whiteboard
- Dig-deeper follow-ups for Excel / WhatsApp / paper
- Evidence-backed observations + opportunity engine
- Interview ends on confidence, not fixed script length
- Reasoning isolated under `lib/reasoning/`


## How to run

```bash
pnpm --filter @isalwa/architect dev
```

## Why Mission 0 looks “complete” without full AI

Because the product promise is consulting-quality discovery, not model demos.

A durable interview arc, typed blueprint, and clean seams matter more on day one than clever completions. AI can deepen the Architect later without forcing a rewrite.
