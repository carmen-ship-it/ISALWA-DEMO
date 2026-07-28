# Capability Digital Twin

**Status:** Complete (Mission A — Discovery Agent roadmap)
**App:** `apps/architect`
**Module:** `lib/discovery-agent/capabilities.ts` (thin — no parallel scoring
engine)
**Extends:** the Consultant Readiness Engine's Evidence Snapshot
(`lib/readiness/snapshot.ts`), the Discovery Score's evidence-key math
(`computeDiscoveryScore`, `DIMENSION_EVIDENCE_KEYS`), and the Missing
Information Engine (`lib/readiness/missing-information.ts`)

## What it is

A client-visible, per-capability intelligence panel that answers, for ten
business capabilities a client actually recognizes:

- **Known Evidence** — what we already know, in real evidence statements.
- **Unknown Evidence** — what is still missing, in consultant language.
- **Confidence 0–100** — honest, evidence-only, never a fake percentage.
- **Why confidence is low** — one plain-Spanish sentence.
- **How to raise it** — a concrete next step, reusing the Missing
  Information Engine's ranked opportunity when one exists.

The ten capabilities: **Ventas, Operaciones, Finanzas, Recursos Humanos,
Marketing, Atención al Cliente, Compras, Legal, Cumplimiento, Tecnología.**

## No second scoring formula

The eight discovery dimensions the platform already reasons about (`sales`,
`customers`, `geography`, `team`, `operations`, `finance`, `production`,
`systems`) do not line up 1:1 with the ten capabilities a client uses day to
day — "Marketing" and "Atención al Cliente" both live inside `customers`;
"Compras" spans `finance` (approvals) and `operations` (inventory flow);
"Legal" and "Cumplimiento" have no dimension at all today.

Rather than inventing a new scoring model for the finer grouping, this
module only **regroups and re-labels evidence the engines already
produced**:

| What the twin shows | Where it comes from | New computation? |
| --- | --- | --- |
| Confidence 0–100 | `DimensionStatus.confidence` (`computeDiscoveryScore`), averaged across the capability's mapped dimensions when it spans more than one | No — trivial aggregation of existing numbers, never a re-weighting |
| Known Evidence | `EvidenceSnapshot.signals` (real fact/document statements) already collected at the Readiness Engine's evidence boundary | No |
| Unknown Evidence | `EvidenceSnapshot.missingEvidenceKeys` + `missingInformationLabel()` — the exact catalog `evaluate.ts` and the Missing Information Engine already use | No |
| How to raise it | `MissingInformationOpportunity.headline` when one exists for a mapped dimension, else `missingInformationUploadHint()` — same upload vocabulary, never invented | No |
| Legal / Cumplimiento | No dimension exists yet → confidence `0`, `measured: false`, an honest sentence instead of a guess | No — explicit "not measured" |

```
CompanyWorkspace ──▶ snapshotFromWorkspace ──▶ EvidenceSnapshot ──┐
                                                                    ├──▶ buildCapabilityDigitalTwin(snapshot, missing)
                              evaluateReadiness ──▶ ReadinessAssessment ──┐
                                                                          ├──▶ buildMissingInformationReport
                                                                          ┘
```

`assessCapabilityDigitalTwin(workspace)` composes the three existing engine
calls internally — the same pattern `assessReadiness`,
`assessMissingInformation` and `assessExplainableConfidence` already use — so
every screen gets one consistent picture from one entry point.

## Capability → evidence mapping

Every key below is already counted by `computeDiscoveryScore`
(`DIMENSION_EVIDENCE_KEYS` in `lib/reasoning/confidence/score.ts`); this
module only re-groups them by capability. Keys with no dimension are shown
honestly as "not measured", never guessed.

| Capability | Dimension(s) | Evidence keys |
| --- | --- | --- |
| Ventas | `sales` | `sales_motion`, `order_intake` |
| Operaciones | `operations` | `bottlenecks`, `fulfillment` |
| Finanzas | `finance` | `finance_process`, `collections`, `revenue_stage` |
| Recursos Humanos | `team` | `team_structure`, `departments` |
| Marketing | `customers`, `geography` | `customer_contact`, `geography` |
| Atención al Cliente | `customers` | `customer_count` |
| Compras | `finance`, `operations` | `approvals`, `inventory_flow` |
| Legal | — | none — no engine tracks this yet |
| Cumplimiento | — | none — no engine tracks this yet |
| Tecnología | `systems` | `current_software`, `information_storage`, `excel_depth`, `whatsapp_depth`, `paper_depth` |

## Empty company

A workspace with no facts, documents or meetings produces, for every
measured capability: `known: []`, `confidence: 0`, `hasEvidence: false`, and
a `whyLow` of "Todavía no hay evidencia registrada sobre…" — never a fake
percentage. The UI shows **"Sin suficiente información"** instead of "0/100"
whenever `hasEvidence` is `false`, and **"Aún no medida"** for Legal /
Cumplimiento.

## API

```ts
import {
  assessCapabilityDigitalTwin,  // (workspace) → CapabilityDigitalTwinReport — entry point
  buildCapabilityDigitalTwin,   // (snapshot, missingReport) → report — composition
  type CapabilityTwin,
  type CapabilityDigitalTwinReport,
  type CapabilityId,
} from "@/lib/discovery-agent/capabilities";
```

`CapabilityTwin`: `id`, `label` (Spanish, engine-owned), `known` (✓
statements), `unknown` (✗ gap phrases), `confidence` (0–100), `hasEvidence`,
`whyLow` (`null` once every tracked gap is closed), `howToRaise`, `measured`
(`false` for Legal / Cumplimiento).

## UX surface

**Dashboard → Business Understanding**, under the existing Explainable
Confidence breakdown: `CapabilityDigitalTwinPanel`
(`components/workspace/executive/capability-digital-twin-panel.tsx`) renders
one card per capability with a ✓/✗ list, the confidence badge and the
"Cómo saber más" line. Client-visible (Álvaro) — no chatbot, no consultant
gating; the same `executive` tab clients already see.

## Language rules

Same convention as the rest of `lib/readiness`: the engine's own generated
Spanish (labels, gap phrases, `whyLow`, `howToRaise`) is produced inside
`lib/discovery-agent/capabilities.ts` and never routed through i18n — it is
always Spanish regardless of locale, and reuses `lib/readiness/topics.ts`'s
existing label catalog so it can never drift from the words shown elsewhere.
Only the **UI chrome** (section kicker, "Lo que ya sabemos" / "Lo que falta
por saber" labels, empty-state copy) goes through `useTranslations()` /
`capabilityTwin.*` in `lib/i18n/messages/{es,en}.ts`.

## Deliberately out of scope (this mission)

- No new scoring model, no new evidence collector — pure regrouping of
  `lib/readiness` output.
- No chatbot, no interview changes.
- No discovery-sidebar surface — Dashboard only, per the mission's "Dashboard
  + optionally discovery sidebar" scope.

## Verification

- `npx tsc --noEmit -p .` — clean.
- `npx eslint` on every changed/new file — clean.

## Files changed

- `lib/discovery-agent/capabilities.ts` — new; the module
- `components/workspace/executive/capability-digital-twin-panel.tsx` — new;
  client surface
- `components/workspace/executive/executive-dashboard.tsx` — renders the
  panel in the Business Understanding section
- `components/workspace/workspace-view.tsx` — computes
  `assessCapabilityDigitalTwin(workspace)`, wires it into `ExecutiveDashboard`
- `lib/i18n/messages/es.ts`, `lib/i18n/messages/en.ts` — added
  `capabilityTwin.*` UI chrome strings
