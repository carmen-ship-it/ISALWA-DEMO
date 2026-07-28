# 04 — Architect Receipt

**This is the living state of the product.** Update this file after every mission — it is meant to
be edited far more often than 01–03. If this file and `git log` disagree, `git log` wins; fix this
file.

**Last verified against:** `git log --oneline` on `main`, 2026-07-28.

## Current phase

**Product Polish** (post Mission 25 governance/constitution). The Discovery Agent roadmap
(P0 → F) and Missions 19–23 have shipped; Mission 25 codified permanent governance docs on top of
that work. Mission 24 (autonomous overnight consulting cycle) is **in progress, uncommitted** —
see "Known WIP" below.

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
| — | `20e359b` | [`CHATGPT_AGENT_RECEIPT.md`](../../CHATGPT_AGENT_RECEIPT.md) — hand-off receipt for the P0→F roadmap (superseded as the *primary* entrypoint by this file, kept as historical detail). |
| 19 | `35cd964` | Premium empty states, calm progress motion, spacing/hierarchy polish. |
| 19-P0 | `17c0b68` | Continuous-discovery UX made obvious (pilot P0 follow-up) — [`MISSION19-P0-DiscoveryContinuation.md`](../../MISSION19-P0-DiscoveryContinuation.md). |
| 20 (Part 1) | `7724f85` | Guided client journey — always-on next-step voice, triad briefing, ceremony click-through into guided interview. |
| 20 (Part 2) | `faba62d` | Executive Daily Brief — replaces generic dashboard hero with a senior-consultant-style brief. |
| 21 (Pass 1) | `9b2f92d` | Living document ingestion — batch "what changed" debrief after uploads. |
| 21 (Pass 2) | `2432c8b` | Company Brain — client-facing "what does Architect know about my company" surface. |
| 22 | `3d024c8` | Meeting transcription → evidence — transcripts are first-class evidence via the same intake path as documents. |
| 23 | `2dcd102` | Real integrations — Google Drive **live** (OAuth + list + import); SharePoint/QuickBooks/HubSpot scaffolded honestly. |
| 25 | `c3923b4` | Product Constitution & Security Foundation — the six permanent governance docs under `docs/` (documentation only). |

Re-verify any time:

```bash
git log --oneline main | grep -E "92ed3ae|1e38b21|a9004c1|8e3da67|4a5f757|d73b142|6535a5c|fdfe006|976979b|35cd964|17c0b68|7724f85|faba62d|9b2f92d|2432c8b|3d024c8|2dcd102|c3923b4"
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

- **Mission 24 — Autonomous Consulting Cycle (uncommitted).** A scheduled overnight review: Vercel
  Cron (`vercel.json` → `crons`) would call `GET /api/cron/consulting-review` nightly, re-running
  the **same** `runConsultingIntelligenceCycle` every answer/upload already triggers (no new agent,
  no fake insight) for every workspace that's due, writing an honest Spanish "what changed
  overnight" digest via a new `OvernightDigestCard`. Touches (per the stashed diff): `.env.example`
  (new `CRON_SECRET` var + doc comment), `components/workspace/workspace-view.tsx` (wires
  `OvernightDigestCard`), `lib/consulting-intelligence/{cycle,index,types}.ts`,
  `lib/i18n/messages/{en,es}.ts`, `types/workspace.ts`, `vercel.json`. No `MISSION24.md` has been
  written yet. **Not committed as of this receipt** — stashed during the AI context system mission
  (see the commit that added this file) rather than lost; pop the relevant stash to resume.
- **"Teach Architect" is not a separate WIP feature.** It is a shipped CTA label
  (`teachCta: "Teach Architect"`, `lib/i18n/messages/en.ts`) from Mission 21 — verified not to be
  mid-edit; no action needed.

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
- Security P1s from the 2026-07-27 audit not yet closed: rotate/remove the unused Supabase service
  role key (Mission 24's cron route is the first code path planning to actually use it — verify
  scope when it lands), confirm/rotate the pilot dashboard passwords away from the shared
  documented default, consider HMAC-signing the pilot cookie, no brute-force protection on login.
- Industry Playbooks (Mission F) still have no UI surface beyond invisible priority re-ordering —
  deliberately deferred, not a regression.

## Roadmap (near-term)

1. **Resume/ship Mission 24** — autonomous overnight consulting cycle (see Known WIP above). Write
   `MISSION24.md` when it ships, following [`05_MISSION_TEMPLATE.md`](./05_MISSION_TEMPLATE.md).
2. **Teach Architect**, if a dedicated mission for it is not already shipped beyond the CTA label —
   confirm current scope before starting new work (nothing in the codebase today suggests it's a
   distinct, larger unshipped feature; re-verify via `git log` and `MISSION21.md` before assuming
   otherwise).
3. Close the retrieval/vectors gaps above if a mission's evidence-quality bar requires it.

## How to update this file

After any mission ships:

1. Add a row to "Completed missions" with the real commit hash(es) — verify with
   `git log --oneline`, never guess.
2. Move anything it resolved out of "Known gaps" / "Known WIP".
3. Update "Current phase" if the mission changes it.
4. Keep this file's length manageable — if a mission needs paragraphs of explanation, put that in
   its own `MISSION*.md` and link it from the table row, per
   [`05_MISSION_TEMPLATE.md`](./05_MISSION_TEMPLATE.md).
