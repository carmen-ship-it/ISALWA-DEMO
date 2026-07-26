# Mission 10 — Brand & Experience Studio

> **Scope:** Domain architecture and contracts only.  
> **Not in scope:** UI redesign, Spanish i18n pass, uploads, AI chat, code/PDF/diagram generation.

## Goal

Architect learns **client identity** — who the company is, how it wants to look and feel, and how employees should experience software — as a **first-class domain** beside Blueprint, Solution, Processes, Knowledge, and Deliverables.

## What was built

### Types (`types/brand.ts`)

- `BrandExperienceModel` — canonical stored model on `CompanyWorkspace.brandExperience`
- `BrandProfile` — voice, tagline, positioning, logo placeholders
- `ExperienceProfile` — employee UX vision, density, regional formats, notifications
- `DesignTokens` — colors, typography, spacing (evidence-backed, low confidence when inferred)
- `ThemeRecommendation` — light/dark mode, aesthetic direction
- `TerminologyProfile` — preferred labels from blueprint entities/departments
- `NavigationPreference` — patterns derived from solution modules/roles
- `AccessibilityProfile` — contrast, motion, font scale, keyboard-first
- `FutureWhiteLabelConfig` — multi-tenant readiness (tenant ID, domain, token overrides)
- `BrandRecommendation<T>` — value + confidence + reasoning + evidence on every field
- Future intake: `BrandAssetUploadProvider` (logo, photos, guidelines, fonts — interfaces only)
- Future outputs: design system export, Figma tokens, CSS variables, tenant theme pack

### Engine (`lib/brand/`)

Deterministic derivation — **no LLM**, never invents without evidence:

| Module | Derives |
| --- | --- |
| `derive.ts` | Orchestrates `BrandExperienceModel` |
| `brand-profile.ts` | Voice, tagline, positioning from industry + discovery |
| `experience-profile.ts` | Employee UX, notifications, regional formats |
| `design-tokens.ts` | Industry palette hints (explicit low confidence) |
| `theme.ts` | Theme name, mode, aesthetic |
| `terminology.ts` | Blueprint departments/entities → preferred labels |
| `navigation.ts` | Solution modules/roles → nav patterns |
| `accessibility.ts` | WCAG targets from industry + discovery language |
| `white-label.ts` | Tenant readiness contracts |
| `future-intake.ts` | Upload provider + export contracts |

**Inference sources:** industry, blueprint, knowledge, meetings, consulting, solution architecture, memory.

**Never asks** “what primary color?” — infers from industry when weak evidence exists; leaves `null` + low confidence otherwise.

### Workspace wiring

- `CompanyWorkspace.brandExperience: BrandExperienceModel | null`
- Regenerated when blueprint advances:
  - `applyInterviewToWorkspace()` (after processes, before deliverables)
  - `createSeedWorkspaces()` / seed bundle
  - `migrateBundle()` in `lib/repositories/index.ts`
- Timeline category: `brand`

### UI

- Read-only **`BrandExperiencePanel`** in workspace (matches existing panel tone)
- Sections: Executive summary, Brand, Experience, Theme, Tokens, Terminology, Navigation, Accessibility, Confidence, Evidence, Future intake/outputs, White label

## What was intentionally NOT built

- Logo/photo/guideline **upload implementation**
- LLM brand analysis or “brand chatbot”
- CSS/code generation, PDF style guides, Figma plugin
- Changes to blueprint / process / solution / deliverables engines (brand track)
- Full-app visual redesign, sticky nav, Spanish i18n (removed mistaken polish artifacts)
- Note: the **Senior Consultant Thinking** track below extends `lib/consulting/questions` and the planner only

## Auth pilot (parallel track)

Mission 10 **auth** (login, middleware, Carmen/Álvaro roles) remains intact and unchanged by this mission. See existing `lib/auth/` and `middleware.ts`.

## Future consumption

1. **Mission 12 (Knowledge intake)** — brand guidelines PDF → high-confidence tokens
2. **Mission 13 (ISALWA OS genesis)** — `DesignTokens` + `TerminologyProfile` → `@isalwa/ui` theme pack
3. **White-label tenants** — `FutureWhiteLabelConfig.tokenOverrides` per workspace
4. **Deliverables** — optional “Brand & Experience” section in consulting package (future mission)

## Public API

```typescript
import { deriveBrandExperience } from "@/lib/brand";

const brandExperience = deriveBrandExperience({ workspace, blueprint });
```

## Definition of done

- Types exported from `@/types`
- Derivation is deterministic and evidence-only
- Workspace stores and migrates `brandExperience`
- Panel renders derived model read-only
- `npm run typecheck` and `npm run lint` pass

---

# Mission 10 — Senior Consultant Thinking

> **Track:** Question reasoning (parallel to Brand & Auth above).  
> **Scope:** Deterministic next-question selection that thinks like a senior McKinsey consultant.  
> **Not in scope:** UI redesign, Guided Assessment UI, chat, LLM, API, rewriting absorb/blueprint/solution/process/deliverables engines.

## Goal

Stop interviewing like a questionnaire. Ask the **highest-value unknown** based on evidence — not the next catalog slot.

Example shift:

| Questionnaire | Senior consultant |
| --- | --- |
| “¿Qué software usan?” after they said Excel | “Mencionaron Excel — ¿por qué sigue siendo indispensable?” |

Every question maximizes business understanding: consequence, ownership, risk, contradiction, hypothesis — before inventory.

## Hard constraints honored

- Current `think()` / absorb / discovery-score path **intact**
- Blueprint, solution, process, deliverables, core absorb algorithms **not rewritten**
- Only **extended** consulting + planner selection
- No LLM · no chat · no API · no UI redesign

## Architecture

```text
answer
  → absorbAnswerIntoMemory()          (unchanged)
  → evaluateConsultingIntelligence()  (Mission 5, unchanged)
  → planNextQuestion(memory)
       → selectNextConsultantQuestion(memory, catalog)   ← Mission 10
            ├── consequence-engine   (Excel/WhatsApp/Paper → WHY first)
            ├── contradiction clarifications
            ├── hypothesis validation
            ├── topic-selection      (department balance + exec/ops mode)
            ├── confidence-engine    (expected confidence gain)
            └── question-priority    (composite “highest value unknown”)
  → Question shown to user (Spanish prompts)
```

### Module: `lib/consulting/questions/`

| File | Role |
| --- | --- |
| `question-library.ts` | Spanish library + metadata (reason, expectedLearning, businessValue, confidenceGain, estimatedImpact) |
| `consequence-engine.ts` | Detect informal tools; prioritize WHY / ownership / risk; demote software inventory |
| `confidence-engine.ts` | Estimate discovery-confidence lift per candidate |
| `topic-selection.ts` | Evidence gaps, department balancing, executive vs operational lens |
| `question-priority.ts` | Score pool; `pickHighestValueQuestion` |
| `index.ts` | Public API (`selectNextConsultantQuestion`) |

### Question metadata (every candidate)

- `reason` — why ask now
- `expectedLearning` — what answering reveals
- `businessValue` — commercial / operational stake
- `confidenceGain` — expected 0–100 understanding lift
- `estimatedImpact` — `critical` \| `high` \| `medium` \| `low`

### How priority works

Composite score (deterministic):

```text
score =
  basePriority
  + confidenceGain × 1.4
  + impactWeight          (critical…low)
  + intentWeight          (consequence > contradiction > hypothesis > …)
  + departmentBoost       (starved dimensions)
  + thinkingModeBoost     (executive vs operational match)
  + evidenceGapBoost      (uncovered / low-confidence dimensions)
```

**Consequence bias:** if Excel / WhatsApp / Paper is already in memory, consequence questions outrank inventory follow-ups (`excel_how_many`, `current_software`, …).

### Integration point

- `lib/reasoning/planner/next-question.ts` → `planNextQuestion` delegates to `selectNextConsultantQuestion`
- `think()` and `domain/interview-engine.ts` keep calling `planNextQuestion` unchanged
- Reuses `ConversationMemory`, discovery score, whiteboard, consulting intelligence, follow-up queue, existing catalog

### Engines intentionally NOT modified

- `lib/reasoning/memory/absorb.ts` (follow-up enqueue remains; consequence layer re-ranks)
- `lib/consulting/evaluate.ts` and Mission 5 sub-engines
- Blueprint / solution / process / deliverables engines

## Public API

```typescript
import { selectNextConsultantQuestion } from "@/lib/consulting/questions";

const next = selectNextConsultantQuestion(memory, catalogCandidates);
```

## Definition of done (this track)

- `lib/consulting/questions/*` implemented and exported
- Planner wired with minimal touch
- `npm run typecheck` passes
- This document updated
