# Executive Client Experience — UX Audit & Implementation Notes

Mission scope: presentation-only. No consulting engine rewrites. Reuses `@isalwa/ui` + tokens
and the existing ISALWA design language (porcelain, kiln sidebar, glaze accents, Newsreader
italic titles, uppercase kickers).

## A. Executive Welcome / Brief

`components/workspace/welcome-banner.tsx` is the first thing either role sees after opening a
workspace (`workspace-view.tsx` renders it at the top of the "executive" tab).

It now answers the four guidance questions directly:

- **Where am I?** — kicker "Bienvenida" + greeting with the person's name.
- **What is happening?** — an understanding narrative (`understandingSentence`) plus a visual
  progress bar (0–100%) instead of a bare percentage.
- **Why does this matter?** — "Recomendación de hoy" surfaces the single most useful next
  insight (from `deriveExecutiveExperience`'s dashboard, real data — no invented copy).
- **What next?** — one primary CTA ("Continuar evaluación") and one secondary CTA
  ("Ver resumen ejecutivo") that smooth-scrolls to the Executive Dashboard section further
  down the same tab, so the "summary" promise is fulfilled without an extra navigation.

A consultant-configured `brandMessage` (White Label mission) can still override the
auto-composed description; unaffected by this mission.

## B. Client Mode vs Consultant Mode

Reuses the existing `session.role` (`consultant` | `client`) — no new auth surface.

- **`workspace-tabs.tsx`** — `CLIENT_VISIBLE_TAB_IDS` restricts the main workspace tabs a
  client sees to: Ejecutivo, Cómo funciona su empresa (Blueprint), Empresa, Conocimiento del
  negocio, Perspectivas ejecutivas, Recomendaciones, ¿Qué pasa si…? (Simulator, added by the
  Executive Simulator mission — client-safe by construction), Hoja de ruta, Entregables.
  Everything else (Discovery internals, Architecture, Processes) is only rendered for
  consultants via `visibleTabIds`. `CLIENT_TAB_LABELS` renames a subset of tabs to
  plain-language labels for clients only.
- **`workspace-view.tsx`** — computes `isConsultant`, `visibleTabIds`, and
  `tabLabelOverrides` once from the session and threads them through `WorkspaceTabs`. CTAs
  that used to hard-link to a consultant-only tab (e.g. the Blueprint panel's "next step" card)
  are now role-aware so a client is never routed to a tab that doesn't exist for them.
- **`deliverables-panel.tsx`** — sub-tabs inside Deliverables are filtered the same way
  (`CLIENT_VISIBLE_DELIVERABLE_TABS`): clients see Executive Summary, Assessment, Blueprint,
  Roadmap, Proposal; consultant-only artifacts stay hidden.
- **`architect-nav.tsx`** / **`lib/auth/constants.ts`** — the Preparation Brief link and route
  are consultant-only (`CONSULTANT_ONLY_PATHS`), continuing the same pattern.

Net effect: Álvaro (client) sees only polished outputs; Carmen (consultant) sees the full
workspace, unchanged.

## C. Spanish deep panels (this mission's touched surfaces)

Translated to natural, non-literal CEO Spanish:

- `components/workspace/business-blueprint-panel.tsx` — kicker renamed
  "Cómo funciona su empresa"; all labels/descriptions localized.
- `components/workspace/company-model-panel.tsx` + `lib/company-model/relationships.ts` —
  the Company (gemelo digital) tab is client-visible and was leaking raw English enum values
  (`"High"`, `"critical"`, `"Belongs to"`, `"Handoff in …"`, `"Unknown"`, `... headcount`).
  Added small Spanish label maps (`ownershipKindLabel`, `dependencyKindLabel`,
  `criticalityLabel`, `strengthBandLabelEs` in `lib/presentation/executive-language.ts`) and
  fixed the relationship/ownership label derivation to emit Spanish instead of English
  fallbacks. No scoring or derivation *logic* changed — only display strings.
- `components/report/report-view.tsx` + `app/report/page.tsx` — full executive report view
  localized (loading state, section intros, empty states).
- `components/workspace/executive/module-insight-cards.tsx`,
  `explained-recommendation-card.tsx` — "discovery" → "descubrimiento" corrections.
- `app/layout.tsx` — page metadata description localized.

Not touched (outside this mission's client-visible surface — left for the missions that own
them): Knowledge Center, Solution Architecture, Business Processes, Brand/White Label settings —
these remain consultant-only or belong to other queued missions. (Simulator was later made
client-visible by the Executive Simulator mission — see `EXECUTIVE_SIMULATOR.md`.)

## D. Guidance basics

Applied the "where am I / what's happening / why it matters / what next" pattern to:

- The Welcome Brief (see A).
- A new **Context Bar** (`components/workspace/executive/context-bar.tsx`), sticky under the
  tab bar, giving a persistent one-line "you are here" + confidence anchor while scrolling.
- A new **Guided Journey** strip (`components/workspace/executive/guided-journey.tsx`) on the
  executive tab, built from `deriveExecutiveExperience`'s real journey stages — a lightweight
  progress/journey indicator that does not require the separate Guided Assessment rewrite.
- `DiscoveryCelebration` surfaces a "why this matters" moment when a milestone is reached.

Each workspace tab already carried a kicker + description (SectionShell pattern); the Blueprint
tab's terminal CTA is now role-aware so "what next" always points somewhere that exists for the
current role.

## Supporting items

- **Human labels**: Blueprint → "Cómo funciona su empresa" (tab label + panel kicker).
- **Empty states**: Company Model empty state already points at real, non-invented content and
  keeps the "Continuar evaluación" CTA pattern used elsewhere in the workspace.
- **Confidence with context**: replaced bare `%`/raw band tokens with sentence-level context —
  `recommendationStrength`, `strengthBandLabelEs`, `riskLevelLabel`, `criticalityLabel`,
  `dependencyKindLabel`, `ownershipKindLabel` (all in `lib/presentation/executive-language.ts`,
  pure display-mapping, zero engine impact).
- **Context bar**: shipped (see D).
- **Journey/progress**: shipped without touching the Guided Assessment engine (see D).

## WIP left in the tree for other queued missions (not started/finished by this mission)

The working tree had uncommitted swarm WIP for several other missions when this mission began.
Per instructions, it was **not deleted** and, where it already typechecked/built cleanly
alongside this mission's changes, it was left in place for the owning mission to pick up:

- **Preparation Brief** (`PREPARATION_BRIEF.md`, `app/preparation/`, `components/preparation/`,
  `components/workspace/preparation-brief-panel.tsx`) — consultant-only route already gated;
  content/flow not reviewed or finished here.
- **Guided Assessment** (`lib/discovery/`, `components/discovery/guided/`,
  `app/discovery/page.tsx` switched to `GuidedAssessment`) — only touched
  `lib/reasoning/index.ts` / `lib/reasoning/planner/next-question.ts` minimally, to export
  `markQuestionAsked` / `catalogByKey` and unblock typecheck. No feature work done.
- **Knowledge** (`lib/knowledge/*`, `components/workspace/knowledge-center.tsx`,
  `components/workspace/knowledge-upload.tsx`) — untouched.
- **White Label / Brand** (`lib/brand/*`, `types/brand.ts`,
  `components/workspace/brand-settings-panel.tsx`, `brand-experience-panel.tsx`) — untouched
  aside from one pre-existing lint fix (`lib/brand/overrides.ts` empty-interface → type alias).
- **Simulator** (`EXECUTIVE_SIMULATOR.md`, `executive-simulator-panel.tsx`) — untouched,
  intentionally out of scope for this mission per the brief.
- **Storytelling** (`EXECUTIVE_STORYTELLING.md`) — untouched.
- Misc smaller WIP (`business-processes-panel.tsx`, `solution-architecture-panel.tsx`,
  `process-visualization/*`, `landing-hero.tsx`, `opportunity-list.tsx`, `observation-card.tsx`,
  `executive-detail.tsx`) — consultant-only or unrelated surfaces, left as found.

## Verification

- `pnpm --filter @isalwa/architect typecheck` — pass.
- `pnpm --filter @isalwa/architect lint` — pass (only pre-existing warnings, unrelated to this
  mission).
- `pnpm --filter @isalwa/architect build` — pass (production build succeeds).
