# ChatGPT Agent Receipt — Discovery Agent Roadmap (Missions P0 → F)

**Date:** 2026-07-28
**Repo:** `/Users/carmen/projects/isalwa` (monorepo) — app: `apps/architect`
**Branch:** `main`, verified clean and pushed at the time of this receipt.
**Purpose:** hand-off note so another agent (ChatGPT or otherwise) can pick up work on ISALWA Architect without re-deriving context. No new product work was done to produce this receipt — verification + documentation only.

---

## 1. Product context

- **Product:** ISALWA Architect — a consulting-intelligence platform, not a codegen/software-first tool. It builds one evolving, evidence-derived "Business Blueprint" per client company.
- **Production URL:** https://isalwa-architect.vercel.app (Vercel, builds from `main`).
- **Two pilot roles, one shared workspace (`ws_isalwa`):**
  - **Álvaro** — `kind: 'owner'`, `role: 'client'`. Sees Client Mode only: guided discovery, dashboard, blueprint, recommendations, report, simulator, knowledge center, deliverables. Never sees internal consultant reasoning.
  - **Carmen** — `kind: 'consultant'`, `role: 'consultant'`. Sees everything Álvaro sees plus `assessment` (Diagnóstico), `architecture` (Sistema recomendado), `processes` (Cómo opera) tabs.
- Both roles log in via Supabase Auth (`signInAction` → `getServerSession()`), land on `/workspace/ws_isalwa`. `middleware.ts` enforces auth on every non-public route and re-derives role server-side — never trusts a client-supplied role.
- Realtime sync between the two roles via Supabase Postgres changes (`architect-company-memory` channel on `architect_workspaces`).

## 2. Sequence shipped, in order (P0 → A → G → B → AI → C → D → E → F)

All nine commits below are on `main`, verified via `git log --oneline`:

| Order | Commit | One-liner |
| --- | --- | --- |
| P0 | `92ed3ae` | Healed in-flight interviews still carrying a fabricated ~71% score and frozen pre-Spanish-fix English turns (`architect_active_interviews` row, not just the workspace row `aa34ea6` already healed) — fires automatically on next load, no manual DB reset. |
| A | `1e38b21` | **Capability Digital Twin** — added a client-visible per-capability panel (10 business capabilities) to the Dashboard; pure regrouping of existing Readiness Engine evidence, no new scoring model. |
| G | `a9004c1` | **Consulting Intelligence Agent** — a background, non-conversational loop that re-reads what the engines already say after every new piece of evidence and writes a private notebook (`workspace.consultingIntelligence`), never exposed to Client Mode. |
| B | `8e3da67` | **Knowledge memory links** — widened relationship detection to 4 more kinds (`Uses`, `DependsOn`, `Owns`, `Purchases`) with cross-turn/cross-document "anchor" resolution, plus cadence tagging (`Diario`/`Semanal`/…) on process entities. |
| AI | `4a5f757` | **Central AI provider abstraction** (`lib/ai`) — every LLM/embedding call now routes through `ai.chat()` / `ai.embed()` / `ai.summarize()`, config-driven (Gemini/OpenAI/Anthropic/local), no more hardcoded model ids at call sites. |
| C | `d73b142` | **RetrievalPack** — Cursor-style bounded, provenance-tagged context packing (recent answers, document chunks, knowledge entities, readiness gaps) for the Consulting Intelligence cycle and the guided-discovery "Basado en…" evidence chips. |
| D | `6535a5c` | **Adaptive follow-ups** — one grounded Spanish sentence citing the strongest evidence item (answer > readiness gap > knowledge entity > document chunk) shown above each adaptively-chosen interview question. |
| E | `fdfe006` | **Discovery Complete/Incomplete ceremony** — a clear client-facing verdict (never a bare %) composed from the Readiness gate AND every measured capability's auto-stop flag; rendered on the Dashboard and at the end of a discovery session. |
| F | `976979b` | **Anonymized industry playbooks** (final mission) — 6 curated industry playbooks + 1 generic fallback re-weight question/gap *priority* only (±1–4), never invent a client fact or touch the honest lift number. |

Confirm locally any time with:

```bash
git log --oneline main | grep -E "92ed3ae|1e38b21|a9004c1|8e3da67|4a5f757|d73b142|6535a5c|fdfe006|976979b"
```

Adjacent commits worth knowing about (not part of this roadmap but immediately before/around it): `aa34ea6` (stopped discarding client answers), `f90753a` (Álvaro/Carmen product audit + security review + login hotfix — see §5), `21fff9c`/`e0c0b66` (healed the fabricated pilot seed, freed stage navigation, closed a Knowledge-Center English leak).

## 3. Architecture map

```
apps/architect/
  lib/
    discovery-agent/
      capabilities.ts             Mission A — Capability Digital Twin (10 capabilities,
                                   regroups Readiness Engine evidence, no 2nd scoring model)
    consulting-intelligence/
      cycle.ts                    Mission G — runConsultingIntelligenceCycle, the 9-step loop
      capability-state.ts         Mission A twin + remaining-time estimate + discovery-complete flag
      working-memory.ts           Private notebook, each note traced to its source engine
      self-check.ts               believe/why/evidence/contradicts — guards "never ask unnecessary questions"
      visibility.ts               Client Mode gate — consultant-only; client always gets null
      discovery-status.ts         Mission E — Discovery Complete/Incomplete ceremony
      types.ts / index.ts
    ai/
      config.ts                  AI_CONFIG — provider/model/embeddingModel/baseUrl/apiKey from env
      provider.ts                Routes to the right adapter; back-compat shim for lib/llm
      gemini.ts / openai.ts / anthropic.ts   Adapters
      index.ts                   Public surface: ai.chat / ai.embed / ai.summarize
      retrieval/
        pack.ts                  Mission C — buildRetrievalPack() / buildRetrievalPackSync()
        chunks.ts                retrieveRelevantChunks() — embeds via ai.embed(), keyword fallback
        types.ts / index.ts
    industry-intelligence/
      playbooks.ts                Mission F — curated playbook data (6 industries + generic)
      bias.ts                     applyIndustryPlaybookBias() — the scoreQuestion bias step
      index.ts
    intake/detectors.ts            Mission B — Uses/DependsOn/Owns/Purchases + anchor resolution
    company-model/relationships.ts Mission B — Spanish relationship-kind labels for the graph
  components/
    discovery/guided/
      guided-assessment.tsx        Builds the RetrievalPack per question; the guided-interview shell
      answering-panel.tsx          Renders <AdaptiveFollowUpNote> above <EvidenceChips>
      evidence-chips.tsx           Mission C — "Basado en…" chips
      adaptive-followup-note.tsx   Mission D — the one-sentence grounded citation
      finish-panel.tsx             Renders <DiscoveryCompletionCard> at session end (Mission E)
      stage-brief.tsx / stage-stepper.tsx / review-panel.tsx
    workspace/executive/
      capability-digital-twin-panel.tsx   Mission A client surface (Dashboard → Business Understanding)
      discovery-completion-card.tsx       Mission E client surface (Dashboard + FinishPanel)
```

Entry points to call from a fresh session:

```ts
import { assessCapabilityDigitalTwin } from "@/lib/discovery-agent/capabilities";      // Mission A
import { runConsultingIntelligenceCycle } from "@/lib/consulting-intelligence";        // Mission G
import { assessDiscoveryCompletion } from "@/lib/consulting-intelligence";             // Mission E
import { buildRetrievalPackSync, buildRetrievalPack } from "@/lib/ai/retrieval";       // Mission C
import { buildAdaptiveFollowUp } from "@/lib/discovery/adaptive-followup";             // Mission D
import { getIndustryPlaybook, applyIndustryPlaybookBias } from "@/lib/industry-intelligence"; // Mission F
import { ai } from "@/lib/ai";                                                        // AI provider
```

## 4. Design constraints (non-negotiable, per the ISALWA AI Constitution and mission docs)

- **Extend, never replace.** Every mission above composes existing engines (Readiness Engine, Discovery Score, Missing Information Engine, Knowledge Engine) — none of them introduced a second scoring formula. Search before creating: `MetricCard`, `Panel`, `Card`, `Chip`, etc. already exist in `@isalwa/ui` / local `components/ui`.
- **`@isalwa/ui` + design tokens only.** Porcelain backgrounds, kiln sidebar, glaze accents, Newsreader italic titles, uppercase kickers, 8px rhythm, soft elevation, calm motion. No new visual language — every new surface reused an existing `Card`/tint-token pattern (`isalwa-tint-green`, `isalwa-tint-amber`, `isalwa-tint-teal`, etc.).
- **Spanish client copy, always.** Any string a client (Álvaro) can see is generated in Spanish inside the engine itself and is never routed through i18n (so it can't drift by locale). Only UI chrome (labels, kickers, empty-state copy) goes through `useTranslations()` / `lib/i18n/messages/{es,en}.ts`.
- **Honest readiness — no fake percentages, ever.** This is the load-bearing rule of the whole roadmap (P0 exists solely to fix a violation of it). Confidence is always evidence-derived; an unmeasured capability (Legal, Cumplimiento) reports "not measured," never a guessed number. A playbook (Mission F) may re-order priority; it may never invent a fact or touch a lift number.
- **No parallel implementations.** Consulting Intelligence (Mission G) explicitly re-reads, never re-scores; RetrievalPack (Mission C) reads existing stores, no new vector DB; Knowledge links (Mission B) reuse the 8 existing `KnowledgeRelationKind` values, no new taxonomy.
- **Business logic over aesthetics; architecture stability over visual novelty.** Every mission doc has an explicit "Deliberately out of scope" section — read it before extending that module.

## 5. Known gaps / recommended next work

From the mission docs' own "out of scope" sections and `ALVARO_CARMEN_PRODUCT_AUDIT.md` (2026-07-27, commit `f90753a`):

**Product / UX**
- **No click-through from the Discovery Completion ceremony card to continue discovery.** `DiscoveryCompletionCard` (`components/workspace/executive/discovery-completion-card.tsx`) lists missing capabilities and their ETA but has no CTA/link back into the guided interview filtered to those capabilities — verified: the component renders read-only rows only, no `NextStepCta` wiring.
- **Optional `CONSEQUENCE_LIBRARY` quote embedding not done.** The three consequence-trigger prompts (`excel_why_exists`, `whatsapp_why_channel`, …) still open with a static trigger-category clause rather than quoting the literal client sentence that triggered them (`ADAPTIVE_FOLLOWUPS.md`, "what did not change"). Deliberately deferred — smaller win than Mission D's general-purpose note, touches tested Mission 10 copy.
- **Industry playbooks (Mission F) have no UI at all.** The bias is invisible to Álvaro beyond question-order changes that already existed pre-mission; no card, tab, or copy surface was built, by design (`INDUSTRY_PLAYBOOKS.md`, "deliberately out of scope").
- **A6 (product audit):** the blueprint→solution→processes→deliverables cascade renders at full detail the moment a workspace clears the zero-evidence bar (even one thin answer) — not fabrication, but can visually read as "more finished" than the evidence supports. Flagged as a follow-up threshold gate, not urgent.
- **RetrievalPack's real-embeddings variant (`buildRetrievalPack`, async) is built but not wired to any call site** — both current call sites (Consulting Intelligence cycle, guided-discovery UI) are structurally synchronous/client-side, so only the keyword-ranked `buildRetrievalPackSync` runs today. Documented upgrade path: either an `/api/retrieval/pack` route or moving the cycle server-side (`RETRIEVAL_PACK.md`, "Upgrade path").
- **`lib/documents/vectors.ts` chunk cap** — only the first 64 chunks per workspace get a stored vector; the rest are `embeddingStatus: "skipped"`. Documented target: move to a dedicated pgvector table.

**Security P1s (from `ALVARO_CARMEN_PRODUCT_AUDIT.md`, ranked, none are P0):**
1. ~~Public login page disclosed the admin/consultant email~~ — **fixed** in the audit's own pass (`f90753a`).
2. **Rotate the Supabase service role key** out of caution — it's unused anywhere in code today (verified by full-repo grep) but should be rotated/removed or wired to a real server-only use case.
3. **Confirm/rotate the actual Supabase dashboard passwords for Carmen/Álvaro away from the shared documented default (`Architect2026!`)** — the env-var overrides (`ARCHITECT_PILOT_CARMEN_PASSWORD` / `ARCHITECT_PILOT_ALVARO_PASSWORD`) are dead code once Supabase Auth is configured; the real password lives in the Supabase dashboard only. Do this independently of any code change.
4. **Pilot-cookie session forgery** is possible only if Supabase env vars are ever absent on a deployment (e.g. a misconfigured preview) — recommend HMAC-signing the pilot cookie or failing closed in production when Supabase isn't configured.
5. **No brute-force protection on login** — no rate limit/lockout/CAPTCHA in `signInAction` itself.
6. P2 hardening backlog (not urgent for the 2-user pilot): RLS is workspace-membership-aware but not `kind`-aware (consultant vs owner) for writes like brand settings; no CSP/security headers; LLM proxy routes and `/api/interview` have no per-user rate limit; two dead capability-check exports (`canDeleteData`, `canAccessSystemSettings`).

## 6. Explicit operating instructions for the next agent

- **Do not advise a hard refresh to see fresh data.** The HTML response already sets `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` (plus matching `CDN-Cache-Control` / `Vercel-CDN-Cache-Control: private, no-store`) in `next.config.ts` — every load is already uncached. If something looks stale, the bug is in data/logic, not caching, and troubleshooting should start there instead.
- **Never commit `.env.local`.** It holds real secrets and is git-ignored; `.env.example` is the documented, empty template. This was independently reverified: no real key value has ever been committed (checked via `git log --all -p -- "apps/architect/.env*"`).
- **Gemini (and any other provider) is configured exclusively via `ARCHITECT_LLM_*` env vars** — `ARCHITECT_LLM_PROVIDER`, `ARCHITECT_LLM_API_KEY` (falls back to `OPENAI_API_KEY`), `ARCHITECT_LLM_BASE_URL`, `ARCHITECT_LLM_MODEL`, `ARCHITECT_EMBEDDINGS_MODEL`. Per-route overrides exist for OCR (`ARCHITECT_OCR_*`) and embeddings (`ARCHITECT_EMBEDDINGS_*`) routes only. Never hardcode a model id at a new call site — go through `ai.chat()` / `ai.embed()` / `ai.summarize()` (`lib/ai`).
- **Follow the ISALWA AI Constitution:** never rewrite working systems, never create parallel implementations, extend before replacing, reuse before creating, every UI element belongs to `@isalwa/ui` + tokens, business logic wins over aesthetics, prefer smaller PRs, preserve existing behavior when unsure.
- **This roadmap (Discovery Agent, Missions P0→F) is complete** — Mission F's own doc states "no Mission G2." Any new work is a fresh mission, not a continuation of this sequence, and should start by reading the relevant mission doc(s) above plus `PRODUCT_PRINCIPLES.md`.

---

*Generated by an agent verifying `git log`, the mission docs listed in §2–5, and `ALVARO_CARMEN_PRODUCT_AUDIT.md`. No product code was changed to produce this receipt.*
