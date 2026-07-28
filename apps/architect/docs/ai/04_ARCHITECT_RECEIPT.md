# 04 — Architect Receipt

**This is the living state of the product.** Update this file after every mission — it is meant to
be edited far more often than 01–03. If this file and `git log` disagree, `git log` wins; fix this
file.

**ChatGPT / external paste:** use the full hand-off at
[`CHATGPT_AGENT_RECEIPT.md`](../../CHATGPT_AGENT_RECEIPT.md) (canonical paste-ready receipt; opens
with a ★ **Last ~4 hours / this session** section, then the full historical mission tables). This
file (04) stays the in-repo living summary agents update after every mission; the two must not
contradict.

**Last verified against:** `git log --oneline` on `main` tip `553b74a` (Mission 27 Living OS).
Ancestors: Mission 25 OS hub `2aa8853` · Teach `3a685f4` · Living Deliverables `fc0007c`.

## Current phase

**Pilot-ready + Living OS** — Álvaro/Carmen pilot on `ws_isalwa`. Mission 27 reframes the
eight living outputs as **Sistema Operativo de la Empresa** (capabilities → outputs; Build /
Export; Business Impact; pipeline to Business Results). Constitution rule 9: deliverables are
outputs; the OS is the product. Residual human/ops work unchanged (Vercel hash, passwords,
Álvaro E2E, PDF Learning Summary wow). Next coded missions when asked: 28 Executive Package,
29 Improve, 30 proactive versioning.

## Completed missions (verified via `git log --oneline`)

| Mission | Commit(s) | What shipped |
| --- | --- | --- |
| P0 | `92ed3ae` | Healed in-flight interviews carrying a fabricated ~71% score / frozen pre-Spanish-fix English turns. |
| A | `1e38b21` | Capability Digital Twin panel on the Dashboard (regroups Readiness Engine evidence, no 2nd scoring model). |
| G | `a9004c1` | Consulting Intelligence Agent — background re-read loop, private notebook (`workspace.consultingIntelligence`). |
| B | `8e3da67` | Knowledge memory links — 4 more relationship kinds + cross-turn/cross-document anchor resolution. |
| AI | `4a5f757` | Central AI provider abstraction (`lib/ai`) — `ai.chat()`/`ai.embed()`/`ai.summarize()`, config-driven. |
| C | `d73b142` | RetrievalPack — bounded, provenance-tagged context packing. |
| D | `6535a5c` | Adaptive one-question follow-ups citing the strongest evidence item. |
| E | `fdfe006` | Discovery Complete/Incomplete ceremony from the Readiness gate. |
| F | `976979b` | Anonymized industry playbooks — priority-only bias, 6 industries + generic fallback. |
| — | `20e359b` (+ later full refresh + session section) | [`CHATGPT_AGENT_RECEIPT.md`](../../CHATGPT_AGENT_RECEIPT.md) — **canonical ChatGPT paste-ready full receipt** (★ last-~4h session section + P0→F + 19–26 + governance + OS + Teach). This file (04) remains the living in-repo summary. |
| 19 | `35cd964` | Premium empty states, calm progress motion, spacing/hierarchy polish. |
| 19-P0 | `17c0b68` | Continuous-discovery UX made obvious (pilot P0 follow-up) — [`MISSION19-P0-DiscoveryContinuation.md`](../../MISSION19-P0-DiscoveryContinuation.md). |
| 20 (Part 1) | `7724f85` | Guided client journey — always-on next-step voice, triad briefing, ceremony click-through into guided interview. |
| 20 (Part 2) | `faba62d` | Executive Daily Brief — replaces generic dashboard hero with a senior-consultant-style brief. |
| 21 (Pass 1) | `9b2f92d` | Living document ingestion — batch "what changed" debrief after uploads. |
| 21 (Pass 2) | `2432c8b` | Company Brain — client-facing "what does Architect know about my company" surface. |
| 22 | `3d024c8` (transcript) · `3a685f4` (Teach) | Meeting transcription → evidence, then Teach Architect Living Knowledge (Learning Summary certainty/next-step, Teach labels, pre-upload expectations). |
| 23 | `2dcd102` | Real integrations — Google Drive **live** (OAuth + list + import); SharePoint/QuickBooks/HubSpot scaffolded honestly. |
| 25 | `c3923b4` | Product Constitution & Security Foundation — the six permanent governance docs under `docs/` (documentation only). |
| 25 (OS hub) | `2aa8853` | Company Operating System hub — client tab framing Conversation → Knowledge → Brain → OS; composes Mission 26 living deliverables (no second catalog); CTAs deep-link into Documentos. See [`MISSION25.md`](../../MISSION25.md). |
| 24 | `28d4d7b` | Autonomous Consulting Cycle — Vercel Cron re-runs `runConsultingIntelligenceCycle` overnight for due workspaces; honest Spanish "what changed overnight" digest via `OvernightDigestCard`; narrow, documented `SUPABASE_SERVICE_ROLE_KEY` exception for the cron route only. See [`MISSION24.md`](../../MISSION24.md). |
| 26 | `fc0007c` | Living Company Deliverables — Deliverables Center upgraded to generate + version 8 documents (Business Blueprint, Company Playbook, Employee Handbook, SOP Library, Job Description Library, Training Academy, AI Playbook, Improvement Roadmap) from existing engines only, with Update Available badges and real PDF/DOCX export (`pdf-lib` + `docx`, two new deps, Node-only, kept out of the client bundle). See [`MISSION26.md`](../../MISSION26.md). |
| 27 | `553b74a` | Living Company Operating System — reframes the eight outputs as Sistema Operativo (categories, Ready to Build / Build / Export, Business Impact, progress strip, pipeline → Business Results); constitution rule 9. See [`MISSION27.md`](../../MISSION27.md). |
| 28 | `36c1bb4` | Executive Deliverables Package — ZIP of already-built living OS outputs + honest README for gaps. See [`MISSION28.md`](../../MISSION28.md). |
| 29 | *(this commit)* | Improve This Document — Mejorar CTA → Teach scoped to missingInformation. See [`MISSION29.md`](../../MISSION29.md). |
| Pre-pilot UX | `e8b599d` | Orientation panel + stuck-prevention UX (5s orientation, Teach labels, hide scaffolded connectors, Spanish error pages). |
| Pilot checklist | `68a9bbe` | [`PILOT_READINESS_CHECKLIST.md`](../../PILOT_READINESS_CHECKLIST.md) — human/ops demo checklist. |
| AI context | `47cdcc9` | Permanent `docs/ai/01–05` agent on-ramp. |

Re-verify any time:

```bash
git log --oneline main | grep -E "92ed3ae|1e38b21|a9004c1|8e3da67|4a5f757|d73b142|6535a5c|fdfe006|976979b|35cd964|17c0b68|7724f85|faba62d|9b2f92d|2432c8b|3d024c8|3a685f4|2dcd102|c3923b4|28d4d7b|fc0007c|2aa8853|e8b599d"
```

Missions 0–18 shipped earlier (Foundation through Company Digital Twin / Auth pilot) — see
`apps/architect/ROADMAP.md` and the individual `MISSION0.md`–`MISSION18.md` files for that
history; not re-litigated here since nothing in this receipt depends on re-deriving them.

## Protected systems

See [`02_ARCHITECT_CONSTITUTION.md`](./02_ARCHITECT_CONSTITUTION.md) §"Protected systems" for the
full table. Nothing above added a second implementation of Discovery, Readiness, Capability Twin,
Consulting Intelligence, Retrieval, AI Provider, Knowledge, Industry Playbooks, or Company Brain —
every mission composed an existing one.

## Known WIP (uncommitted, on top of the commits above)

- *(none for Teach Architect)* — Mission 22 Teach Architect / Learning Summary
  extension shipped; the interrupted `wip teach-architect-interrupted` stash was
  finished carefully (not restore-blind) and dropped.

## Pilot / production facts

- **Pilot workspace:** `ws_isalwa`, shared by both pilot users.
  - **Álvaro** — `kind: 'owner'`, `role: 'client'`. Client Mode only.
  - **Carmen** — `kind: 'consultant'`, `role: 'consultant'`. Client Mode + `assessment` /
    `architecture` / `processes`.
- **Production URL:** https://isalwa-architect.vercel.app (Vercel, builds from `main`).
- **AI provider:** configured exclusively via `ARCHITECT_LLM_*` env vars
  (`ARCHITECT_LLM_PROVIDER`, `ARCHITECT_LLM_API_KEY` — falls back to `OPENAI_API_KEY` —
  `ARCHITECT_LLM_BASE_URL`, `ARCHITECT_LLM_MODEL`, `ARCHITECT_EMBEDDINGS_MODEL`). Never hardcode a
  model id at a new call site — go through `lib/ai` (`ai.chat()` / `ai.embed()` / `ai.summarize()`).
- **Deploy:** Vercel, from `main`. No hard refresh needed — HTML responses are already
  `no-store` (`next.config.ts`).
- **Auth:** Supabase Auth primary; pilot cookie session fallback when Supabase env vars are
  absent (documented risk — see `docs/SECURITY_POSTURE.md`).

## Known gaps / recommended next work

Carried forward from `CHATGPT_AGENT_RECEIPT.md` §5 and `ALVARO_CARMEN_PRODUCT_AUDIT.md`, re-checked
against what's shipped since:

- `lib/ai/retrieval/pack.ts`'s real-embeddings variant (`buildRetrievalPack`, async) is built but
  has no wired call site — both call sites still run the keyword-ranked `buildRetrievalPackSync`.
- `lib/documents/vectors.ts` only stores a vector for the first 64 chunks per workspace; the rest
  are `embeddingStatus: "skipped"`. Target: a dedicated pgvector table.
- Security P1s from the 2026-07-27 audit not yet closed: confirm/rotate the pilot dashboard
  passwords away from the shared documented default, consider HMAC-signing the pilot cookie, no
  brute-force protection on login. (The Supabase service role key item is resolved: Mission 24's
  cron route is now its one reviewed, documented use — see `docs/SECURITY_POSTURE.md` §5 — not an
  unused standing risk anymore, though periodic rotation is still recommended.)
- Industry Playbooks (Mission F) still have no UI surface beyond invisible priority re-ordering —
  deliberately deferred, not a regression.

## Roadmap (near-term)

1. **Close residual pilot ops** (password rotation, Vercel commit match, Álvaro E2E,
   PDF Learning Summary browser wow) — see `PILOT_READINESS_CHECKLIST.md`. No further
   product missions are queued unless Carmen starts a new one.
2. Close the retrieval/vectors gaps above if a mission's evidence-quality bar requires it.
3. After any future mission: update this file **and** refresh
   [`CHATGPT_AGENT_RECEIPT.md`](../../CHATGPT_AGENT_RECEIPT.md) if handing off to ChatGPT.

## How to update this file

After any mission ships:

1. Add a row to "Completed missions" with the real commit hash(es) — verify with
   `git log --oneline`, never guess.
2. Move anything it resolved out of "Known gaps" / "Known WIP".
3. Update "Current phase" if the mission changes it.
4. Keep this file's length manageable — if a mission needs paragraphs of explanation, put that in
   its own `MISSION*.md` and link it from the table row, per
   [`05_MISSION_TEMPLATE.md`](./05_MISSION_TEMPLATE.md).
