# Executive Simulator — UI Layer (Mission 17 exposure)

**Status:** UI complete, read-only, presentation-only, wired into the workspace for
**both** Consultant Mode and Client Mode (Mission 6).
**App:** `apps/architect`
**Engine:** `lib/simulation/` (Mission 17, already complete — **not modified**)

## Goal

Give executives (Álvaro in Client Mode, and Carmen) a polished, honest way to
ask **"¿Qué pasa si…?"** using the existing deterministic rules engine —
without adding new simulation intelligence, without mutating company data,
and without inventing numbers the engine doesn't return.

This mission is a **UI/wiring mission only**. All "intelligence" already
existed in `lib/simulation/` from Mission 17.

## What was built

### 1. `components/workspace/executive-simulator-panel.tsx` (new)

A self-contained panel that:

- Lists the engine's **built-in scenario registry** (`listScenarios()`) as
  cards — no free-form inputs, no custom scenario authoring.
- Lets executives filter scenarios by the engine's own `SimulationDomain`
  taxonomy (`capacity`, `staffing`, `sales`, `operations`, `inventory`,
  `automation`, `financial`), translated into plain executive Spanish
  (e.g. "Contratación y equipo", "Ventas e ingresos", "Procesos y
  aprobaciones"). This is how the user-requested dimensions — Hiring,
  Departments, Revenue, Processes, Automation, Approvals, Modules — are
  exposed: as labels over the engine's real `domains` field on each
  `Scenario`, not as new business logic.
- On scenario selection, calls `simulate(scenarioId, workspace)` and
  `extractSimulationSignals(workspace)` from `@/lib/simulation` — the
  **only** two engine entry points this UI touches — and renders four
  sections per the mission spec:
  1. **Punto de partida (Current / baseline)** — built from
     `SimulationSignals` (`extractSimulationSignals`), scoped to the
     general company facts (name, industry, size, departments, software)
     plus whichever specific signals this scenario's result says it used.
  2. **Escenario (Scenario / what-if)** — the scenario's own Spanish
     `name` + `description` from the registry, verbatim.
  3. **Impacto esperado (Expected Business Impact)** — `likelyImpact`,
     `investment` (band + summary + 1–5 scale bar), `timeline`
     (band + summary), plus `risks` and `dependencies`, all read directly
     from `SimulationResult` with no transformation of the values.
  4. **Por qué (Why)** — `confidence.band/score/rationale`,
     `domainsApplied`, and a human translation of every `signalsUsed` key
     the engine can emit (enumerated from all `lib/simulation/*.ts` rule
     files). If `signalsUsed` is empty, the UI says so honestly instead of
     fabricating a reason.
- Every empty case (`likelyImpact`, `risks`, `dependencies`, `signalsUsed`,
  baseline facts) has an explicit "not available yet" message in Spanish —
  never a fabricated placeholder.
- A standing disclaimer above the picker states plainly that scenarios do
  not change real company data and are not forecasts or financial
  promises.

### 2. Tab wiring (thin, additive only)

- `components/workspace/workspace-tabs.tsx`: added one entry,
  `{ id: "simulator", label: "¿Qué pasa si…?" }`, to `WorkspaceTabId` and
  `WORKSPACE_TABS`. No other tab behavior touched.
- `components/workspace/workspace-view.tsx`: added one `simulator` entry to
  the existing `panels` record (same pattern as every other tab — a
  `SectionShell` wrapping the panel + a `NextStepCta`), and one import.
  No existing panel's JSX was rewritten.

No new pages, no new routes, no changes to `lib/simulation/` itself.

## Public API surface used (unchanged, Mission 17)

```ts
import {
  listScenarios,
  simulate,
  extractSimulationSignals,
} from "@/lib/simulation";
```

- `listScenarios()` → the 7 built-in scenarios (`hire_salespeople`,
  `automate_approvals`, `open_warehouse`, `add_crm`,
  `increase_production`, `reduce_staff`, `new_region`).
- `simulate(scenarioId, workspace)` → `SimulationResult` (pure function,
  no writes).
- `extractSimulationSignals(workspace)` → `SimulationSignals` (pure
  function, no writes) — used to render the "current" baseline.

## Confirmation: no mutation, no new logic

- The panel never calls any workspace write API (`store.workspaces.save`,
  etc.). It only reads the `workspace` prop already loaded by
  `WorkspaceView` and passes it straight into the two read-only engine
  functions above.
- No file under `lib/simulation/` was created, edited, or reordered.
- No scenario, rule, band, or signal was added — only Spanish label
  dictionaries for *displaying* existing enum values
  (`SimulationDomain`, `InvestmentBand`, `TimelineBand`, `ConfidenceBand`,
  and the fixed set of `signalsUsed` string keys already emitted by the
  engine) live in the panel file. These are presentation strings, not
  decision logic — they do not affect what `simulate()` returns.
- No consulting / reasoning / blueprint / process engine file was touched.

## Client Mode / access (Mission 6 — done)

The Executive Client Experience mission (Mission 1) added a Client Mode
tab-hiding allowlist (`CLIENT_VISIBLE_TAB_IDS` in `workspace-tabs.tsx`) but
deliberately left `simulator` out of it as a follow-up ("client-facing
simulator entry point is a follow-up, not removed here"). **This mission
(Mission 6) closes that follow-up**: `simulator` is now included in
`CLIENT_VISIBLE_TAB_IDS`, so Álvaro (Client Mode) and Carmen (Consultant
Mode) see the exact same panel — one implementation, no parallel
client/consultant variants, per the constitution's "extend before
replace" / "reuse before create" principles.

The tab was already built to be **client-safe by construction**:

- Spanish-only, non-technical labels throughout (no scenario ids, domain
  codes, or signal keys are ever shown raw to the user — everything is
  translated).
- No diagnostic/internal data exposed (no raw workspace JSON, no engine
  internals).

**One presentation bug fixed this mission:** `SimulationConfidence.rationale`
(an engine string, e.g. `Resultado basado en reglas del escenario
«hire_salespeople» sin señales de workspace; confianza acotada.`) quotes the
raw `scenarioId` — an English snake_case identifier, not fit for an
executive screen. The panel now swaps that literal substring for the
scenario's own Spanish `name` (already present on the same
`SimulationResult`, e.g. «Contratar vendedores») before rendering
(`humanizeRationale` in `executive-simulator-panel.tsx`). This is a display
fix only — it does not touch `lib/simulation/`, does not change what the
engine computed, and invents no new wording; it reuses a field the engine
already returns.

## Gaps / honestly documented limitations

- ~~**`understanding` signal may saturate.**~~ **Fixed (Mission 10).**
  `extractSimulationSignals` now divides `workspace.businessUnderstanding`
  (0–100 elsewhere in the app, e.g. `ConfidenceMeter`) by 100 before the
  `clamp01` helper, so understanding renders as its real value instead of
  always saturating to `1.0` (100%) for any real workspace. Same class of
  bug also existed in `lib/deliverables/executive-summary.ts` and
  `lib/explanations/confidence.ts` (consulting `maturity.overall` /
  `health.overall` / `confidence.overall` are already 0–100, so multiplying
  by 100 a second time inflated displayed percentages) — both corrected in
  the same pass.
- **"Modules" and "Approvals" are not first-class engine domains.** The
  engine's `SimulationDomain` union has 7 values (`capacity`, `staffing`,
  `sales`, `operations`, `inventory`, `automation`, `financial`) that
  don't map 1:1 onto the mission brief's Hiring/Departments/Revenue/
  Processes/Automation/Approvals/Modules framing. Rather than invent a
  forced mapping, the UI filters by the engine's real domains (in plain
  Spanish) and lets each scenario's own name/description speak to
  "approvals" (`automate_approvals`) or "modules" (`add_crm`) directly.
- **No numeric revenue/cost forecasts.** By design (Mission 17 is a rules
  engine, "no forecasting / no ML"), `SimulationResult` never returns a
  dollar figure — only investment *bands* and qualitative impact text.
  The UI never invents a number to fill this gap; it shows the band and
  its Spanish summary as-is.
- **No persistence of simulation runs.** Selecting a scenario is pure
  client-side state (`useState`); leaving the tab or reloading clears the
  selection. This matches the mission's "ephemeral" requirement and
  Mission 17's own deferred scope ("Persisting simulation runs" was
  explicitly out of scope).

## Verification (Mission 1, original UI build)

- `npm run typecheck` — no errors in `executive-simulator-panel.tsx`,
  `workspace-view.tsx`, or `workspace-tabs.tsx` (the only pre-existing
  errors in the tree at time of this mission belong to unrelated,
  concurrently in-progress work on a white-label branding feature,
  discovery guided-actions, and knowledge intake — not touched by this
  mission).
- `npm run lint` — no errors or warnings in any file this mission added or
  edited.

## Mission 6 changelog (Client Mode follow-up)

Files touched, all presentation/wiring only:

- `components/workspace/workspace-tabs.tsx` — added `"simulator"` to
  `CLIENT_VISIBLE_TAB_IDS`; updated the surrounding comments (the
  consultant-only note was now stale).
- `components/workspace/executive-simulator-panel.tsx` — added
  `humanizeRationale()` so `confidence.rationale` never shows a raw
  `scenarioId` to either Álvaro or Carmen.
- `EXECUTIVE_CLIENT_EXPERIENCE.md` — updated the Client Mode tab list and
  "not touched" note, which had gone stale after this mission and Missions
  2–5 (Knowledge, Insights) expanded `CLIENT_VISIBLE_TAB_IDS`.
- `EXECUTIVE_SIMULATOR.md` — this changelog.
- No file under `lib/simulation/` touched. No new scenario, rule, band, or
  signal. No workspace write path touched.

Verification: `npm run typecheck` (workspace) — pass. Committed and pushed
per Mission 6 DoD.

## Note on concurrent work in this repo

While implementing this mission, other agents were concurrently editing
`apps/architect` (a white-label branding feature touching `workspace-view.tsx`,
a Spanish-translation pass on `deliverables-panel.tsx` /
`report-view.tsx` / `welcome-banner.tsx`, and unrelated `guided-journey.tsx` /
`preparation` work). A `git stash` used mid-session to snapshot the tree for
a clean lint baseline briefly reverted everyone's uncommitted work; the stash
(`stash@{0}` at the time of writing) was mostly reapplied automatically, but
four files with newer concurrent edits (`report-view.tsx`,
`deliverables-panel.tsx`, `welcome-banner.tsx`, `workspace-view.tsx`) were
left as their current live versions to avoid clobbering that work. This
mission's own two edits to `workspace-view.tsx` / `workspace-tabs.tsx` were
manually reapplied on top of the current live files. **The stash still
contains a Spanish-label version of `deliverables-panel.tsx` (and smaller
diffs to `report-view.tsx` / `welcome-banner.tsx`) that is not currently on
disk** — whoever owns that Spanish-translation work should check
`git stash list` / `git stash show -p stash@{0}` before it is dropped.
