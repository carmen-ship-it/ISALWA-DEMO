## ★ Last session addendum — Missions 27–30 (Living OS arc)

| Mission | Commit | Ship |
| --- | --- | --- |
| 27 | `553b74a` | Living Company OS — Build/Export, Business Impact, constitution rule 9 |
| 28 | `36c1bb4` | Executive Package ZIP |
| 29 | `6364bd7` | Mejorar este documento → scoped Teach |
| 30 | `2fd139d` | Proactive Update Available notices |

---

# ChatGPT Agent Receipt — ISALWA Architect (full)

**Paste this entire file into ChatGPT (or any agent) as session context.**  
It is the canonical, paste-ready hand-off for Architect after Mission 25 OS hub and Mission 22 Teach Architect.

| Field | Value |
| --- | --- |
| **Date** | 2026-07-28 (~18:30 EDT) |
| **Repo** | `/Users/carmen/projects/isalwa` (monorepo) — app: `apps/architect` |
| **Branch** | `main` |
| **Current HEAD** | tip of `main` as of this receipt (verify: `git log -1 --oneline`) |
| **Must-include ancestors** | Mission 25 OS hub `2aa8853` · Teach Architect `3a685f4` · Living Deliverables `fc0007c` |
| **Production URL** | https://isalwa-architect.vercel.app (Vercel, builds from `main`, root `apps/architect`) |

After pulling, confirm tip with `git rev-parse --short HEAD` and that key SHAs are ancestors:

```bash
git merge-base --is-ancestor 2aa8853 HEAD && git merge-base --is-ancestor 3a685f4 HEAD && git merge-base --is-ancestor fc0007c HEAD && echo OK
```

---

## ★ Last ~4 hours / this session (2026-07-28 ~14:50–18:30 EDT)

Verified with `git log --since="4 hours ago"` on `main` ending ~18:32 EDT. **This is what JUST shipped** relative to the older baseline (Discovery P0→F earlier today, Missions 0–18 before that). Full historical tables remain below — do not treat this section as the only truth.

### Queue status — COMPLETE

Carmen’s agreed coded-mission queue is **done**. No further product missions are pending from that list:

Discovery **P0 → F** · polish **19–26** · governance docs · **OS hub** · **Teach Architect** · pre-pilot UX · pilot checklist · AI context system · this receipt.

Residual work is **human / ops only** (checklist at end of this section). Do **not** start a new coded mission unless Carmen explicitly asks.

### Ordered ships in the last ~4 hours

Chronological (oldest → newest). Docs-only commits that only record SHAs are folded into the feat they document.

| When (EDT) | Commit | Mission / ship | Why it matters |
| --- | --- | --- | --- |
| 14:50 | `2dcd102` | **23 — Google Drive live** | Real OAuth + list + import into the same document intake path; other connectors stay scaffolded honestly. |
| 15:30 | `17c0b68` | **19-P0 — continuous discovery obvious** | Pilot stuck-prevention: make “keep discovering” the obvious next action. |
| 15:51 | `faba62d` | **20 Part 2 — Executive Daily Brief** | Senior-consultant dashboard hero: where we are / what changed / what next. |
| 16:08 | `2432c8b` | **21 Pass 2 — Company Brain** | Client surface: “what does Architect know about my company.” |
| 16:32 | `47cdcc9` | **AI context system** | Permanent `docs/ai/01–05` on-ramp so future agents read context → constitution → receipt first. |
| 17:17 | `28d4d7b` | **24 — Autonomous Consulting Cycle** | Vercel Cron overnight re-run of consulting intelligence + honest Spanish overnight digest card. |
| 17:20 | `68a9bbe` | **Pilot readiness checklist** | Human/ops demo checklist (`PILOT_READINESS_CHECKLIST.md`). |
| 17:34 | `e8b599d` | **Pre-pilot stuck-prevention UX** | Orientation panel (5s), Teach labels, hide scaffolded connectors, Spanish error pages. |
| 18:10 | `fc0007c` | **26 — Living Company Deliverables** | Eight company docs generate / version / Update Available / PDF·DOCX from existing engines only. |
| 18:18 | `2aa8853` | **25 — Company OS hub** | Conversation → Knowledge → Brain → **Operating System**; composes Mission 26 (no second catalog). |
| 18:26 | `3a685f4` | **22 Teach — Learning Summary** | Certainty + next-step after teach/upload; Teach framing + pre-upload expectations. |
| 18:29 | `5d09c2c` (+ this commit) | **Full ChatGPT receipt** | Canonical paste hand-off; this session section sharpens “what JUST shipped.” |

Receipt-record commits in the same window (not separate product work): `0e544f4`, `e2c9533`, `985b3b5`.

**Tight end of session (last ~1h, ~17:34–18:30):** stuck-prevention UX → Living Deliverables → OS hub → Teach Architect → full receipt. That cluster is the freshest product surface for demo talk-track.

**Just outside the 4h window (~6h ago, still same day):** Mission 19 polish `35cd964`, guided journey `7724f85`, living ingestion debrief `9b2f92d`, meeting transcripts `3d024c8`, governance docs `c3923b4` — already in the full table below; treat as same-day baseline, not “just now.”

### Architecture notes (these ships only)

- **Compose, don’t fork.** OS hub (`company-operating-system.ts` / panel) **reframes** Mission 26 living deliverables — never a second document catalog or scoring model.
- **Company Brain** and **Daily Brief** re-read Company Model + Knowledge + Readiness; they do not invent evidence.
- **Living Deliverables** generate/version/export from existing Blueprint / processes / solution engines (`lib/deliverables/`); PDF/DOCX stay Node-only, out of the client bundle.
- **Drive / meetings / teach uploads** all feed the **same** intake → Knowledge → Consulting Intelligence cycle path.
- **Teach / Learning Summary** is pipeline framing (certainty + next-step headlines), not a new engine.
- **Overnight cron** re-runs the existing `runConsultingIntelligenceCycle`; empty digest without `CRON_SECRET` / service role is honest, not broken.
- **Pre-pilot UX** is orientation + labeling + honesty about scaffolded connectors — no fake “connected” states.

### Honest human leftover checklist (not agent invent-work)

1. **Vercel deploy hash** — confirm Production deployment commit matches latest `main`.  
2. **Password rotation** — Carmen & Álvaro away from documented shared default (`Architect2026!`).  
3. **Álvaro E2E walkthrough** — login → orientation → discovery → teach one PDF → Brain → recommendations → blueprint → logout/login.  
4. **PDF Learning Summary wow** — code is on `main` (`3a685f4`); confirm real browser upload shows certainty/next-step.  
5. **Optional overnight cron env** — `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` on Vercel Production only if you want a live overnight digest.  
6. **Technical backlog (not demo blockers)** — async `buildRetrievalPack` unwired; first-64-chunk vector cap; Industry Playbooks no UI (by design); audit P1s — see §6 below / `PILOT_READINESS_CHECKLIST.md`.

---

## How to use this receipt (reading order)

**In-repo agents** (Cursor, etc.): read the permanent AI context system first —

1. [`docs/ai/01_ARCHITECT_CONTEXT.md`](./docs/ai/01_ARCHITECT_CONTEXT.md) — what Architect is / is not  
2. [`docs/ai/02_ARCHITECT_CONSTITUTION.md`](./docs/ai/02_ARCHITECT_CONSTITUTION.md) — engineering law  
3. [`docs/ai/04_ARCHITECT_RECEIPT.md`](./docs/ai/04_ARCHITECT_RECEIPT.md) — living shipped state (update after every mission)  

Optional deeper: `docs/ai/03_ARCHITECT_ARCHITECTURE.md`, `docs/ai/05_MISSION_TEMPLATE.md`, index at [`docs/ai/README.md`](./docs/ai/README.md).

**ChatGPT / external paste:** this file is self-contained. Prefer it over re-deriving from dozens of `MISSION*.md` files. When in doubt, `git log` wins over any doc.

---

## 1. Product / pilot context

- **Product:** ISALWA Architect — a **consulting-intelligence** platform (not codegen, not a chatbot, not a CRM). It builds **one evolving, evidence-derived Business Blueprint** per client company, then derives solution, processes, recommendations, and deliverables from that single source of truth.
- **Pilot workspace:** `ws_isalwa` (one shared company workspace).
- **Carmen** — consultant (`kind: 'consultant'`, `role: 'consultant'`). Sees everything the client sees **plus** `assessment` (Diagnóstico), `architecture` (Sistema recomendado), `processes` (Cómo opera).
- **Álvaro** — client / owner (`kind: 'owner'`, `role: 'client'`). **Client Mode only.** Never sees internal consultant reasoning, raw engine ids, or those three diagnostic tabs.
- Both authenticate via **Supabase Auth** (`signInAction` → `getServerSession()`), land on `/workspace/ws_isalwa`. `middleware.ts` enforces auth and **re-derives role server-side** — never trusts a client-supplied role.
- Realtime sync: Supabase Postgres changes channel `architect-company-memory` on `architect_workspaces`.

---

## 2. Constitution summary (non-negotiable)

**Tagline (every feature must pass this test):**

> **"Architect becomes more intelligent every time your company shares knowledge."**

**Three permanent client questions (Know / Still learning / Why it matters):**

1. **What do we know?** — evidence gathered so far.  
2. **What are we trying to learn?** — open questions, gaps, next-highest-value inquiry.  
3. **Why does it matter?** — business consequence: risk, opportunity, cost of not knowing.  

A screen that shows data without answering one of these three is decoration, not consulting.

**Permanent rules (from `docs/ai/02` + monorepo AI Constitution):**

1. Never rebuild an engine — compose existing ones.  
2. Always compose, never fork — no second scoring model, second catalog, or parallel knowledge graph.  
3. Never invent evidence — every claim traces to interview, document, transcript, or deterministic derivation.  
4. Never fake readiness or confidence — unmeasured = “not measured,” never a guessed %.  
5. Spanish client copy generated **in-engine** (not via i18n drift); only UI chrome goes through i18n.  
6. Executive, premium design — porcelain / kiln / glaze / Newsreader italic titles / uppercase kickers / 8px rhythm — **no new visual language**. Architect uses local `components/ui` (deployment independence from `@isalwa/ui`) but the same reuse rules apply.  
7. One evolving Business Blueprint — sole source of truth.  
8. Client/Consultant Mode is a hard boundary of **intent**, enforced server-side.  
9. Prefer smaller PRs; preserve behavior when unsure; extend before replacing; reuse before creating.

Canonical pointers: `docs/PRODUCT_CONSTITUTION.md`, `apps/architect/PRODUCT_PRINCIPLES.md`, `docs/architecture/AI_CONSTITUTION.md`, `docs/ai/02_ARCHITECT_CONSTITUTION.md`.

---

## 3. Full mission table (verified on `main`)

All hashes below were verified with `git rev-parse` / `git log --oneline` on 2026-07-28. **Do not invent SHAs.**

### Discovery Agent roadmap — P0 → F

| Order | Commit | What shipped |
| --- | --- | --- |
| P0 | `92ed3ae` | Healed in-flight interviews carrying fabricated ~71% score / frozen pre-Spanish English turns. |
| A | `1e38b21` | Capability Digital Twin panel (10 capabilities; regroups Readiness evidence — no 2nd scoring model). |
| G | `a9004c1` | Consulting Intelligence Agent — background re-read loop; private notebook `workspace.consultingIntelligence`. |
| B | `8e3da67` | Knowledge memory links — Uses/DependsOn/Owns/Purchases + cross-turn/document anchors. |
| AI | `4a5f757` | Central AI provider abstraction (`lib/ai`) — `ai.chat()` / `ai.embed()` / `ai.summarize()`. |
| C | `d73b142` | RetrievalPack — bounded, provenance-tagged context packing. |
| D | `6535a5c` | Adaptive one-question follow-ups citing strongest evidence. |
| E | `fdfe006` | Discovery Complete/Incomplete ceremony from the Readiness gate. |
| F | `976979b` | Anonymized industry playbooks — priority-only bias; never invent facts or touch lift. |

### Product polish & Living Company Intelligence — 19 → 26 + Teach + OS

| Mission | Commit(s) | What shipped |
| --- | --- | --- |
| 19 | `35cd964` | Premium empty states, calm progress motion, spacing/hierarchy polish. |
| 19-P0 | `17c0b68` | Continuous-discovery UX made obvious (pilot stuck-prevention). |
| 20 Part 1 | `7724f85` | Guided client journey — next-step voice, triad briefing, ceremony click-through. |
| 20 Part 2 | `faba62d` | Executive Daily Brief — senior-consultant dashboard hero. |
| 21 Pass 1 | `9b2f92d` | Living document ingestion — batch “what changed” debrief after uploads. |
| 21 Pass 2 | `2432c8b` | Company Brain — “what does Architect know about my company.” |
| 22 Transcript | `3d024c8` | Meeting transcription → same intake/evidence path as documents. |
| 22 **Teach** | `3a685f4` | Teach Architect — Learning Summary (certainty / next-step), Teach labels, pre-upload expectations. |
| 23 | `2dcd102` | Real integrations — **Google Drive live**; SharePoint/QuickBooks/HubSpot scaffolded honestly. |
| 25 Governance | `c3923b4` | Product Constitution & Security Foundation — six permanent `docs/` governance files. |
| 24 | `28d4d7b` | Autonomous Consulting Cycle — Vercel Cron overnight re-run + `OvernightDigestCard`. |
| 26 | `fc0007c` | Living Company Deliverables — 8 company docs generate/version/export (PDF/DOCX) from existing engines. |
| 25 **OS hub** | `2aa8853` | Company Operating System hub — Conversation → Knowledge → Brain → OS; composes Mission 26 (no second catalog). |
| Pre-pilot UX | `e8b599d` | Orientation panel + stuck-prevention UX (5s orientation, Teach labels, hide scaffolded connectors, Spanish error pages). |
| Pilot checklist | `68a9bbe` | `PILOT_READINESS_CHECKLIST.md`. |
| AI context system | `47cdcc9` | Permanent `docs/ai/01–05` agent on-ramp. |

### Governance / receipt meta (docs only)

| Commit | Note |
| --- | --- |
| `20e359b` | Original P0→F ChatGPT receipt (historical detail; this file is now the full paste target). |
| `0e544f4` / `e2c9533` / `985b3b5` / `5d09c2c` | Receipt / verify-grep updates for M25 OS and Teach; full paste receipt. |
| *(this commit)* | Session receipt — ★ “Last ~4 hours / this session” section on top of the full historical receipt. |

Re-verify any time:

```bash
git log --oneline main | grep -E "92ed3ae|1e38b21|a9004c1|8e3da67|4a5f757|d73b142|6535a5c|fdfe006|976979b|35cd964|17c0b68|7724f85|faba62d|9b2f92d|2432c8b|3d024c8|3a685f4|2dcd102|c3923b4|28d4d7b|fc0007c|2aa8853|e8b599d"
```

Missions 0–18 (Foundation → Company Digital Twin / Auth pilot) shipped earlier — see `ROADMAP.md` and `MISSION0.md`–`MISSION18.md`; not re-litigated here.

**List status for Carmen’s agent queue:** Discovery P0→F · Product polish 19–26 · governance · OS hub · Teach Architect · pre-pilot UX — **complete.** See ★ session section at top for what JUST shipped in the last ~4 hours. No more coded missions pending from the agreed queue.

---

## 4. Architecture — engines vs compose surfaces

**Rule:** engines own truth and scoring; compose surfaces **re-read / reframe / route** — they never invent a second catalog or scoring formula.

### Engines (protected — extend, do not rewrite)

| Engine | Where |
| --- | --- |
| Discovery / guided interview | `lib/discovery/`, `lib/discovery-agent/`, `lib/reasoning/` |
| Readiness | `lib/readiness/` |
| Capability Digital Twin | `lib/discovery-agent/capabilities.ts` |
| Consulting Intelligence cycle | `lib/consulting-intelligence/cycle.ts` |
| Retrieval / AI provider | `lib/ai/retrieval/`, `lib/ai/` |
| Knowledge + intake | `lib/knowledge/`, `lib/intake/` |
| Documents pipeline | `lib/documents/` |
| Company Model | `lib/company-model/` |
| Business Blueprint | `lib/blueprint/` |
| Solution / Processes | `lib/solution/`, `lib/processes/` |
| Deliverables (incl. living) | `lib/deliverables/` |
| Industry playbooks | `lib/industry-intelligence/` |
| Connectors | `lib/connectors/` (Drive live) |
| Auth / boundary | `lib/auth/`, `middleware.ts` |

### Compose surfaces (client-visible product)

| Surface | What it is | Composes |
| --- | --- | --- |
| **Company Brain** | “What does Architect know about my company?” | Company Model + Knowledge via `lib/consulting-intelligence/company-brain.ts` → `company-brain-panel.tsx` |
| **OS hub** (Mission 25) | Conversation → Knowledge → Brain → **Operating System** framing | Living deliverables overview + fingerprint; CTAs deep-link into Documentos — **no second catalog** (`company-operating-system.ts` / `company-operating-system-panel.tsx`) |
| **Living Deliverables** (Mission 26) | Generate / version / Update Available / PDF·DOCX for 8 company docs | Existing engines only (`living-deliverables-center.tsx`) |
| **Discovery** | Guided adaptive interview + evidence chips + ceremony | Readiness + RetrievalPack + Discovery status |
| **Overnight** (Mission 24) | Cron re-runs consulting cycle; honest Spanish overnight digest | Same `runConsultingIntelligenceCycle`; `OvernightDigestCard` |
| **Drive** (Mission 23) | Google Drive OAuth + list + import (**live**) | Feeds `lib/documents/`; other connectors scaffolded honestly |
| **Meetings** (Mission 22) | Transcript paste/upload as first-class evidence | Same `lib/intake` path as documents → Consulting cycle → “what changed” debrief |
| **Teach / Learning Summary** (Mission 22 Teach) | Certainty + next-step framing after teach/upload | Pipeline + Missing Information headlines — not a new engine |
| **Executive Daily Brief** | Dashboard hero: where we are / what changed / what next | Readiness + Missing Info + gate + discovery status |

Evidence flow (one line): **Interview / Docs / Meetings / Drive → intake → Knowledge + Readiness → Consulting Intelligence re-read → Blueprint → Solution / Processes / Deliverables / client briefs.**

---

## 5. AI context system (pointer)

Permanent on-ramp under `apps/architect/docs/ai/`:

| # | Doc | Answers |
| --- | --- | --- |
| 01 | Context | What Architect is / is not; how systems connect |
| 02 | Constitution | Permanent engineering rules; protected systems |
| 03 | Architecture | Real folders, engines, lifecycles |
| 04 | Receipt | What’s shipped; phase; gaps (living — update every mission) |
| 05 | Mission template | How to structure the next mission |

**Rule for every future mission:** Read **01 → 02 → 04** before writing code. Implement. Update **04** (and this paste receipt when handing off to ChatGPT).

---

## 6. Honest gaps / still human

These are **not** agent invent-work — they need a human / browser / dashboard:

1. **Vercel deploy hash verify** — confirm Production deployment commit matches latest `main` (Vercel dashboard). Agents often cannot confirm programmatically.  
2. **Password rotation** — confirm/rotate Carmen & Álvaro Supabase Auth passwords away from the documented shared default (`Architect2026!`). Dashboard action, not a code change.  
3. **Álvaro E2E walkthrough** — login → orientation → continue discovery → teach with one PDF → Company Brain → recommendations → blueprint → logout/login.  
4. **PDF Teach / Learning Summary browser wow** — code shipped (`3a685f4`); confirm a real PDF upload produces the Learning Summary certainty/next-step moment in a real browser before demo.  
5. **Optional cron for overnight digest** — `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY` on Vercel Production only if you want a live overnight digest; without them the card stays empty (honest, not broken).  
6. **Technical backlog (not demo blockers):** `buildRetrievalPack` (async embeddings) unwired — only `buildRetrievalPackSync` runs; first-64-chunk vector cap in `lib/documents/vectors.ts`; Industry Playbooks have no UI (by design); audit P1s (pilot-cookie HMAC if Supabase absent, login rate limit) — see `ALVARO_CARMEN_PRODUCT_AUDIT.md` / `docs/SECURITY_POSTURE.md`.

Full demo checklist: [`PILOT_READINESS_CHECKLIST.md`](./PILOT_READINESS_CHECKLIST.md).

---

## 7. What future agents must NOT do

- **Rewrite engines** (Readiness, Blueprint, Consulting Intelligence, Company Model, Deliverables, Retrieval, AI provider, Knowledge, Discovery).  
- **Create a second living-deliverables catalog** or parallel OS document list (Mission 25 composes Mission 26).  
- **Fake percentages / invent confidence** for unmeasured capabilities.  
- **Introduce a parallel UI / design system** or new visual language.  
- **Hardcode model ids** — always `ai.chat()` / `ai.embed()` / `ai.summarize()` via `ARCHITECT_LLM_*`.  
- **Expose consultant-only reasoning to Client Mode.**  
- **Commit `.env.local` or secrets.**  
- **Advise hard refresh for “stale” data** — HTML is already `no-store` in `next.config.ts`; if something looks stale, debug data/logic.  
- **Start a new product mission** unless the human explicitly asks — Discovery P0→F and polish 19–26 + Teach + OS are **done**.  
- **Restore interrupted stashes blindly** — Teach stash was finished carefully and dropped; don’t resurrect parallel WIP.

---

## 8. Operating instructions (quick)

- Work **one task at a time** unless asked otherwise.  
- Search before creating components (`Card`, `Panel`, empty states, executive cards, etc.).  
- Spanish for every Álvaro-visible string produced by engines.  
- After any mission: update `docs/ai/04_ARCHITECT_RECEIPT.md` with real SHAs from `git log`.  
- For ChatGPT hand-off: refresh **this file** so the paste target stays current.

---

## 9. Key entry points (code)

```ts
import { assessCapabilityDigitalTwin } from "@/lib/discovery-agent/capabilities";
import { runConsultingIntelligenceCycle } from "@/lib/consulting-intelligence";
import { assessDiscoveryCompletion } from "@/lib/consulting-intelligence";
import { buildRetrievalPackSync, buildRetrievalPack } from "@/lib/ai/retrieval";
import { buildAdaptiveFollowUp } from "@/lib/discovery/adaptive-followup";
import { getIndustryPlaybook, applyIndustryPlaybookBias } from "@/lib/industry-intelligence";
import { ai } from "@/lib/ai";
// Compose surfaces (examples):
// lib/consulting-intelligence/company-brain.ts
// lib/consulting-intelligence/company-operating-system.ts
// lib/consulting-intelligence/daily-brief.ts
```

---

*Receipt authored / refreshed 2026-07-28 ~18:30 EDT from `git log --since="4 hours ago"` on `main`, `docs/ai/01–04`, mission docs (esp. M22 Teach, M24, M25 OS, M26), and `PILOT_READINESS_CHECKLIST.md`. Session section added so ChatGPT can separate JUST-shipped work from the older baseline. No product code changed to produce this receipt.*
