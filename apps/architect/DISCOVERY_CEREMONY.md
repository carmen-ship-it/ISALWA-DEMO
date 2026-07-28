# Discovery Complete / Incomplete Ceremony

**Status:** Complete (Mission E — Discovery Agent roadmap)
**App:** `apps/architect`
**Module:** `lib/consulting-intelligence/discovery-status.ts` (thin — no new
scoring engine)
**Extends:** the Consultant Readiness Engine's overall gate
(`assessReadiness` → `ReadinessAssessment.overallState`, the same bar
`blueprintReadinessGate` uses) and the Consulting Intelligence Agent's
per-capability auto-stop flag (`deriveCapabilityIntelligence` → Mission A/G,
`CapabilityDiscoveryState.discoveryComplete`)

## What it is

A clear, client-facing verdict on whether discovery has actually covered the
business: **Diagnóstico completo** or **Diagnóstico en curso** — never a bare
percentage, always tied to which capabilities have real evidence behind
them, which are still open, and how long the open ones would take.

It is a ceremony, not a badge: it names what earned the "complete" state and
never lets it read as "we are finished asking questions forever" — the
continuity note is present on every render, complete or not.

## No second scoring formula

Everything the ceremony shows was already computed by an existing engine:

| What the ceremony shows | Where it comes from | New computation? |
| --- | --- | --- |
| Overall `complete` / `incomplete` | `ReadinessAssessment.overallState === "ready"` **and** every *measured* capability's `discoveryComplete` | No — an AND of two bars that already exist |
| Checklist (evidence-supported items) | `CapabilityDiscoveryState` entries with `discoveryComplete: true` — the Mission A twin's own known/confidence, unchanged | No |
| Missing capabilities + why | `CapabilityDiscoveryState` entries with `measured: true, discoveryComplete: false` — same `risks` (why-low sentence) Mission A already produces | No |
| ETA to close the gap | `estimatedRemainingMinutes` per capability (`MINUTES_PER_CLARIFICATION` × open gaps), summed — Mission G's own estimate | No |
| Not-tracked capabilities (Legal, Cumplimiento) | `measured: false` — shown honestly, never counted against completion | No |

```
CompanyWorkspace ──▶ assessReadiness ──▶ ReadinessAssessment ──┐
                                                                 ├──▶ buildDiscoveryCompletionStatus
      deriveCapabilityIntelligence ──▶ CapabilityDiscoveryState[] ──┘
```

`assessDiscoveryCompletion(workspace, readiness)` is the entry point most
screens use; `buildDiscoveryCompletionStatus(readiness, capabilities)` is the
pure composition for call sites that already hold both (e.g. `WorkspaceView`,
which already computes `readiness` once and shares it across every readiness
surface on the Dashboard).

## Why AND, not just the Blueprint gate

`blueprintReadinessGate` already answers *"can we present the plan?"* — it
only requires the four **critical** dimensions (`sales`, `customers`,
`systems`, `operations`) to be ready, because that is the minimum bar for a
firm recommendation. This ceremony answers a stricter, whole-business
question — *"is discovery actually done?"* — so it requires **every
capability an engine measures** to be complete, not just the critical ones.
A workspace can be Blueprint-ready (critical topics covered) while Discovery
is still marked incomplete because, say, Recursos Humanos still has an open
gap. That is intentional: the two ceremonies answer different questions and
neither invents a number the other does not already publish.

## Empty / partial workspace

- No measured capability has evidence yet → `state: "incomplete"`,
  `completedCount: 0`, honest copy: *"Todavía no hay evidencia suficiente
  para dar el diagnóstico por completo."*
- Some capabilities complete, others open → incomplete, with the exact count
  validated vs. still open and a real ETA in minutes.
- Every measured capability complete **and** readiness overall `ready` →
  `state: "complete"`, checklist lists every validated capability with its
  confidence figure, `estimatedMinutesRemaining: null`.
- Legal / Cumplimiento (no evidence engine yet) never block completion and
  never silently disappear — they render under "Sin motor de evidencia
  dedicado todavía".

## API

```ts
import {
  assessDiscoveryCompletion,      // (workspace, readiness) → DiscoveryCompletionStatus — entry point
  buildDiscoveryCompletionStatus, // (readiness, capabilities) → status — composition
  type DiscoveryCompletionStatus,
  type DiscoveryCompletionState,  // "complete" | "incomplete"
} from "@/lib/consulting-intelligence";
```

`DiscoveryCompletionStatus`: `state`, `stateLabel`, `title`, `message`,
`continuityNote` (always present), `checklist` / `missingCapabilities` /
`notTrackedCapabilities` (each `CapabilityDiscoveryState[]` — no parallel
type), `estimatedMinutesRemaining` (`null` once complete), `completedCount`,
`measuredCount`, `totalCount`.

## UX surface

Client-visible (Álvaro) in both places the mission asked for, one component
(`DiscoveryCompletionCard`,
`components/workspace/executive/discovery-completion-card.tsx`) reused
verbatim in each:

- **Dashboard** (`WorkspaceView`, `executive` tab) — right after "Today's
  Focus" (`WelcomeBanner`) and before the Business Understanding briefing
  body, since it is the one status a returning client reads before anything
  else.
- **End of a discovery session** (`FinishPanel`,
  `components/discovery/guided/finish-panel.tsx`) — the natural ceremony
  moment, right after "Sesión guardada". Reads the just-persisted
  `workspace` prop, so it reflects the merged evidence automatically once
  `persistCompletion` lands.

Neither surface is a new tab, a new route, or a new pattern — same `Card`,
same porcelain/kiln/glaze tokens, same green/amber tint pairing
`ReadinessGateCard` already uses for ready vs. almost-ready.

## Language rules

Same convention as `lib/readiness/gate.ts`: the engine's own generated
Spanish (`title`, `message`, `continuityNote`) is produced inside
`discovery-status.ts` and never routed through i18n — always Spanish
regardless of locale, since this is exactly the ceremony Álvaro sees. Only
the **UI chrome** (section labels, ETA phrasing, confidence badge suffix)
goes through `useTranslations()` / `discoveryCompletion.*` in
`lib/i18n/messages/{es,en}.ts`.

## Deliberately out of scope (this mission)

- No new scoring model, no new evidence collector — pure composition of
  `lib/readiness` + `lib/consulting-intelligence` output.
- No change to the Blueprint gate, the interview flow, or auto-stop
  behavior — this is a read-only presentation layer on top of both.
- No industry playbooks (Mission F) — not started.

## Verification

- `npx tsc --noEmit -p tsconfig.json` — clean.
- `npx eslint` on every changed/new file — clean.
- `npm run build` — clean production build (Next.js 15, all routes compile).

## Files changed

- `lib/consulting-intelligence/discovery-status.ts` — new; the ceremony
  module
- `lib/consulting-intelligence/index.ts` — exports
  `assessDiscoveryCompletion`, `buildDiscoveryCompletionStatus`, types
- `components/workspace/executive/discovery-completion-card.tsx` — new;
  shared client surface
- `components/workspace/workspace-view.tsx` — computes
  `assessDiscoveryCompletion(workspace, readiness)`, renders the card on the
  Dashboard
- `components/discovery/guided/finish-panel.tsx` — renders the same card at
  the end of a discovery session
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — added
  `discoveryCompletion.*` UI chrome strings
