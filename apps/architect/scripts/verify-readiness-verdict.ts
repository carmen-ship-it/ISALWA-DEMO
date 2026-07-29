/**
 * Proves the canonical Readiness Verdict (`lib/readiness/verdict.ts`)
 * resolves the exact contradiction cases that motivated this mission — the
 * competing "are we ready" answers scattered across the Blueprint gate, the
 * Implementation Package's 78% bar, the Operating System's 35% bar, the
 * Dashboard/Journey's 40% bar, and the Discovery Complete ceremony.
 *
 * C1 — fresh workspace: nothing unlocked, phase "exploring".
 * C2 — evidence past the dashboard bar, below the conclusion bar: advising,
 *      recommendations show, but nothing "firm" yet.
 * C3 — the contradiction the audit flagged: businessUnderstanding clears
 *      CONCLUSION_THRESHOLD (78) but the canonical artifacts (blueprint,
 *      solution, processes, deliverables) do not exist yet. The verdict must
 *      NOT claim decision_ready/firm just because the number cleared —
 *      exactly the "78 vs 72" contradiction the mission calls out.
 * C4 — same 78%+ evidence, this time with every prerequisite artifact
 *      present and the four critical topics ready: decision_ready, firm
 *      outputs unlocked.
 * C5 — the Discovery Complete ceremony reports "complete": phase reaches
 *      "operating", the one phase this module cannot reach without a caller
 *      supplying the ceremony (see the module's circular-import note).
 *
 * Run: npx tsx scripts/verify-readiness-verdict.ts
 */
import { createEmptyWorkspace } from "@/lib/workspace/seed";
import { createEmptyMemory } from "@/lib/reasoning";
import { deriveReadinessVerdict } from "@/lib/readiness/verdict";
import type {
  CompanyWorkspace,
  ConversationMemory,
  DimensionStatus,
  DiscoveryDimension,
} from "@/types";
import type { DiscoveryCompletionStatus } from "@/lib/consulting-intelligence/discovery-status";

const DIMENSION_LABELS: Record<DiscoveryDimension, string> = {
  sales: "Ventas",
  customers: "Clientes",
  geography: "Geografía",
  team: "Equipo",
  operations: "Operaciones",
  finance: "Finanzas",
  production: "Producción",
  systems: "Sistemas",
};

const ALL_DIMENSIONS: DiscoveryDimension[] = [
  "sales",
  "customers",
  "geography",
  "team",
  "operations",
  "finance",
  "production",
  "systems",
];

/** Every dimension at a chosen confidence/covered state — full control over `blueprintReadinessGate`'s critical topics without fabricating realistic evidence. */
function dimensions(confidence: number, covered: boolean): DimensionStatus[] {
  return ALL_DIMENSIONS.map((id) => ({
    id,
    label: DIMENSION_LABELS[id],
    applicable: true,
    covered,
    confidence,
  }));
}

function memoryWithDimensions(
  confidence: number,
  covered: boolean,
): ConversationMemory {
  return {
    ...createEmptyMemory(),
    score: {
      overall: confidence,
      dimensions: dimensions(confidence, covered),
      readyToConclude: false,
      stillNeed: [],
    },
  };
}

interface FixtureOptions {
  businessUnderstanding: number;
  dimensionConfidence: number;
  dimensionsCovered: boolean;
  withPrerequisites: boolean;
}

/**
 * Prerequisite artifacts only need to be truthy — `evaluateImplementationGate`
 * checks presence, not shape — so a cast fixture is honest here, not a
 * shortcut around real logic.
 */
function fixtureWorkspace(options: FixtureOptions): CompanyWorkspace {
  const base = createEmptyWorkspace("Fixture Co", "services", "ws_fixture");
  const workspace: CompanyWorkspace = {
    ...base,
    businessUnderstanding: options.businessUnderstanding,
    conversationMemory: memoryWithDimensions(
      options.dimensionConfidence,
      options.dimensionsCovered,
    ),
  };

  if (options.withPrerequisites) {
    workspace.currentBlueprintId = "bp_fixture";
    workspace.solutionArchitecture = {} as unknown as CompanyWorkspace["solutionArchitecture"];
    workspace.businessProcesses = {} as unknown as CompanyWorkspace["businessProcesses"];
    workspace.deliverables = {} as unknown as CompanyWorkspace["deliverables"];
  }

  return workspace;
}

function completeCeremony(): DiscoveryCompletionStatus {
  return {
    generatedAt: new Date().toISOString(),
    state: "complete",
    stateLabel: "Descubrimiento listo",
    title: "Ya conocemos lo suficiente del negocio para avanzar con seguridad",
    message: "Fixture ceremony — complete.",
    continuityNote: "",
    checklist: [],
    missingCapabilities: [],
    notTrackedCapabilities: [],
    estimatedMinutesRemaining: null,
    completedCount: 3,
    measuredCount: 3,
    totalCount: 3,
  };
}

// C1 — fresh workspace, no evidence at all.
const c1 = fixtureWorkspace({
  businessUnderstanding: 0,
  dimensionConfidence: 0,
  dimensionsCovered: false,
  withPrerequisites: false,
});
const c1Verdict = deriveReadinessVerdict(c1);

// C2 — past the 40% dashboard bar, below the 78% conclusion bar, critical
// topics not yet firm.
const c2 = fixtureWorkspace({
  businessUnderstanding: 55,
  dimensionConfidence: 60,
  dimensionsCovered: true,
  withPrerequisites: false,
});
const c2Verdict = deriveReadinessVerdict(c2);

// C3 — the flagged contradiction: 78%+ businessUnderstanding, critical
// topics firmly ready, but the canonical artifacts do not exist yet.
const c3 = fixtureWorkspace({
  businessUnderstanding: 82,
  dimensionConfidence: 90,
  dimensionsCovered: true,
  withPrerequisites: false,
});
const c3Verdict = deriveReadinessVerdict(c3);

// C4 — same 78%+ evidence, every prerequisite artifact present.
const c4 = fixtureWorkspace({
  businessUnderstanding: 82,
  dimensionConfidence: 90,
  dimensionsCovered: true,
  withPrerequisites: true,
});
const c4Verdict = deriveReadinessVerdict(c4);

// C5 — the Discovery Complete ceremony reports complete.
const c5 = fixtureWorkspace({
  businessUnderstanding: 82,
  dimensionConfidence: 90,
  dimensionsCovered: true,
  withPrerequisites: true,
});
const c5Verdict = deriveReadinessVerdict(c5, {
  discoveryCompletion: completeCeremony(),
});

const expectations: Array<[string, boolean]> = [
  // C1 — exploring, everything locked.
  ["C1: phase is exploring", c1Verdict.phase === "exploring"],
  [
    "C1: no output unlocked",
    !c1Verdict.allowedOutputs.showRecommendations &&
      !c1Verdict.allowedOutputs.previewBlueprint &&
      !c1Verdict.allowedOutputs.implementationPackage,
  ],

  // C2 — advising, recommendations show, nothing firm.
  ["C2: phase is advising", c2Verdict.phase === "advising"],
  [
    "C2: showRecommendations unlocked",
    c2Verdict.allowedOutputs.showRecommendations,
  ],
  [
    "C2: implementationPackage still locked (below CONCLUSION_THRESHOLD)",
    !c2Verdict.allowedOutputs.implementationPackage,
  ],
  ["C2: not decision_ready or operating", c2Verdict.phase !== "decision_ready" && c2Verdict.phase !== "operating"],

  // C3 — the audit's contradiction: numeric threshold cleared, artifacts
  // missing. Must not read as decision_ready or firm.
  [
    "C3: businessUnderstanding cleared 78 but phase is NOT decision_ready (missing prerequisites)",
    c3Verdict.overallConfidence >= 78 && c3Verdict.phase !== "decision_ready",
  ],
  [
    "C3: implementationPackage stays locked",
    !c3Verdict.allowedOutputs.implementationPackage,
  ],
  [
    "C3: firmBlueprint may legitimately unlock on critical topics alone (the Blueprint gate's own bar) even while implementationPackage stays locked — the two gates measure different things and must be able to diverge",
    c3Verdict.allowedOutputs.firmBlueprint &&
      !c3Verdict.allowedOutputs.implementationPackage,
  ],
  [
    "C3: buildOsFirm stays locked (mirrors implementationPackage's prerequisite check, not just the OS draft bar)",
    !c3Verdict.allowedOutputs.buildOsFirm,
  ],

  // C4 — same evidence, prerequisites present: fully decision_ready.
  ["C4: phase is decision_ready", c4Verdict.phase === "decision_ready"],
  [
    "C4: implementationPackage unlocked",
    c4Verdict.allowedOutputs.implementationPackage,
  ],
  ["C4: firmBlueprint unlocked", c4Verdict.allowedOutputs.firmBlueprint],
  ["C4: buildOsFirm unlocked", c4Verdict.allowedOutputs.buildOsFirm],

  // C5 — ceremony complete reaches the top phase.
  ["C5: phase is operating", c5Verdict.phase === "operating"],
  [
    "C5: every C4 output stays unlocked at operating",
    c5Verdict.allowedOutputs.implementationPackage &&
      c5Verdict.allowedOutputs.firmBlueprint,
  ],

  // Cross-case monotonicity — no allowedOutput should be MORE open in an
  // earlier phase than in a later one for the same evidence trajectory.
  [
    "monotonic: C1 <= C2 <= C4 <= C5 on showRecommendations",
    !c1Verdict.allowedOutputs.showRecommendations &&
      c2Verdict.allowedOutputs.showRecommendations &&
      c4Verdict.allowedOutputs.showRecommendations &&
      c5Verdict.allowedOutputs.showRecommendations,
  ],
  [
    "no contradiction: implementationPackage true implies showRecommendations true (C4)",
    !c4Verdict.allowedOutputs.implementationPackage ||
      c4Verdict.allowedOutputs.showRecommendations,
  ],
  [
    "no contradiction: firmBlueprint true implies previewBlueprint true (C4)",
    !c4Verdict.allowedOutputs.firmBlueprint ||
      c4Verdict.allowedOutputs.previewBlueprint,
  ],
  [
    "clientHeadline is always a non-empty sentence",
    [c1Verdict, c2Verdict, c3Verdict, c4Verdict, c5Verdict].every(
      (v) => v.clientHeadline.trim().length > 0,
    ),
  ],
];

let failed = false;
for (const [label, ok] of expectations) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}`);
  if (!ok) failed = true;
}

console.log("\nPhases: ", {
  c1: c1Verdict.phase,
  c2: c2Verdict.phase,
  c3: c3Verdict.phase,
  c4: c4Verdict.phase,
  c5: c5Verdict.phase,
});

process.exit(failed ? 1 : 0);
