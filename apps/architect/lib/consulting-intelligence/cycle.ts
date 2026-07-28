/**
 * Consulting Intelligence Agent — the cycle.
 *
 * This is the whole agent: one function that runs every time new evidence
 * lands, and which owns **no intelligence of its own**. Each of the nine
 * steps below delegates to an engine that already existed before this file
 * did:
 *
 *   1. did understanding change      workspace / `computeDiscoveryScore`
 *   2. update the Company Model      `deriveCompanyModel`
 *   3. update the Knowledge Graph    `lib/intake` / `lib/knowledge` (already
 *                                    merged upstream — observed, not re-run)
 *   4. recalculate capabilities      `deriveCapabilityIntelligence` (Mission A)
 *   5. detect contradictions         `evaluateContradictions` + vault + readiness
 *   6. detect missing evidence       Missing Information Engine
 *   7. retrieve related evidence     evidence snapshot boundary
 *   8. single highest-value unknown  Missing Information Engine's own ranking
 *   9. decide whether to ask again   Readiness advice, vetoed by the self-check
 *
 * Step 3 is deliberately a read. The intake and knowledge pipelines already
 * merged the graph before the agent was called; re-running them here would
 * be a parallel implementation of the exact thing that just ran.
 *
 * The cycle is synchronous and pure apart from `Date.now()` — it takes a
 * workspace and returns a new one. It never writes to a store, so the two
 * call sites keep owning persistence exactly as they did before.
 *
 * Full write-up: `CONSULTING_INTELLIGENCE_AGENT.md`.
 */

import { nowIso } from "@/lib/utils";
import { deriveCompanyModel } from "@/lib/company-model";
import {
  buildExplainableConfidenceReport,
  buildMissingInformationReport,
  evaluateReadiness,
  snapshotFromWorkspace,
} from "@/lib/readiness";
import type { BusinessBlueprint, CompanyWorkspace } from "@/types";
import { deriveCapabilityIntelligence } from "./capability-state";
import { decideNextQuestion, runSelfCheck } from "./self-check";
import type {
  ConsultingIntelligenceCycleResult,
  ConsultingWorkingMemory,
  EvidenceEvent,
  UnderstandingDelta,
} from "./types";
import {
  collectAssumptions,
  collectAutomations,
  collectConfidenceNotes,
  collectContradictions,
  collectFollowUpAreas,
  collectHypotheses,
  collectImplementationRisks,
  collectMissingEvidence,
  collectRelatedEvidence,
  pickHighestValueUnknown,
} from "./working-memory";

/**
 * Run one consulting intelligence cycle.
 *
 * Returns the workspace with refreshed derived models and the agent's updated
 * private working memory attached. Safe to call on any workspace, including
 * an empty one — every engine it calls already handles thin evidence.
 */
export function runConsultingIntelligenceCycle(
  workspace: CompanyWorkspace,
  evidenceEvent: EvidenceEvent,
): ConsultingIntelligenceCycleResult {
  const stamp = evidenceEvent.at ?? nowIso();
  const previous = workspace.consultingIntelligence ?? null;
  const enginesRun: string[] = [];

  // Step 2 — refresh the Company Model, but only when it is actually stale
  // against the current blueprint. `deriveCompanyModel` mints fresh entity
  // ids on every call, so re-deriving an up-to-date model would churn the
  // graph for no gain.
  const withModel = refreshCompanyModel(workspace, enginesRun);

  // Steps 1, 5, 6, 7 all read the same evidence boundary. Compute it once and
  // share it, so the cycle never scores the same evidence twice.
  const snapshot = snapshotFromWorkspace(withModel);
  const assessment = evaluateReadiness(snapshot);
  const missing = buildMissingInformationReport(snapshot, assessment);
  const confidence = buildExplainableConfidenceReport(
    snapshot,
    assessment,
    missing,
    withModel.conversationMemory?.consulting ?? null,
    withModel.knowledge?.coverage ?? null,
  );
  enginesRun.push(
    "readiness:snapshot",
    "readiness:evaluate",
    "readiness:missing-information",
    "readiness:explainable-confidence",
  );

  // Step 1 — did understanding actually move?
  const understanding = measureUnderstanding(previous, snapshot.overallUnderstanding);

  // Step 4 — per-capability confidence, straight from Mission A.
  const capabilities = deriveCapabilityIntelligence(withModel);
  enginesRun.push("discovery-agent:capability-twin");

  // Steps 5–8.
  const contradictions = collectContradictions(
    withModel,
    assessment,
    evidenceEvent.text,
  );
  const missingEvidence = collectMissingEvidence(missing);
  const relatedEvidence = collectRelatedEvidence(snapshot);
  const highestValueUnknown = pickHighestValueUnknown(missing);
  if (contradictions.length > 0) enginesRun.push("consulting:contradictions");

  // Step 9 — the self-check runs *before* any decision to ask.
  const selfCheck = runSelfCheck({
    workspace: withModel,
    assessment,
    capabilities,
    contradictions,
    relatedEvidence,
    highestValueUnknown,
  });
  const questionDecision = decideNextQuestion({
    assessment,
    capabilities,
    selfCheck,
    highestValueUnknown,
  });

  const memory: ConsultingWorkingMemory = {
    internal: true,
    version: 1,
    updatedAt: stamp,
    cycles: (previous?.cycles ?? 0) + 1,
    lastEvent: {
      kind: evidenceEvent.kind,
      label: evidenceEvent.label,
      at: stamp,
    },
    understanding,
    capabilities,
    hypotheses: collectHypotheses(withModel),
    assumptions: collectAssumptions(withModel),
    confidenceNotes: collectConfidenceNotes(confidence),
    contradictions,
    missingEvidence,
    automations: collectAutomations(withModel),
    implementationRisks: collectImplementationRisks(withModel),
    followUpAreas: collectFollowUpAreas(assessment),
    relatedEvidence,
    highestValueUnknown,
    selfCheck,
    questionDecision,
    enginesRun,
  };

  const next: CompanyWorkspace = {
    ...withModel,
    consultingIntelligence: memory,
  };

  return {
    workspace: next,
    memory,
    understandingChanged:
      understanding.changed ||
      newContradictionAppeared(previous, memory) ||
      capabilityJustCompleted(previous, memory),
  };
}

/** Current blueprint, when the workspace has one. */
function currentBlueprint(workspace: CompanyWorkspace): BusinessBlueprint | null {
  if (!workspace.currentBlueprintId) return null;
  return (
    workspace.blueprints.find(
      (blueprint) => blueprint.id === workspace.currentBlueprintId,
    ) ?? null
  );
}

/**
 * Re-derive the Company Model when it is missing or points at an older
 * blueprint. This is what lets a *document* upload update the twin: the
 * intake path never had a company-model step before, so a processed contract
 * used to enrich the knowledge graph without ever reaching the model.
 */
function refreshCompanyModel(
  workspace: CompanyWorkspace,
  enginesRun: string[],
): CompanyWorkspace {
  const blueprint = currentBlueprint(workspace);
  if (!blueprint) return workspace;

  const existing = workspace.companyModel;
  const isStale = !existing || existing.blueprintId !== blueprint.id;
  if (!isStale) return workspace;

  const companyModel = deriveCompanyModel({ workspace, blueprint });
  enginesRun.push("company-model:derive");
  return { ...workspace, companyModel };
}

function measureUnderstanding(
  previous: ConsultingWorkingMemory | null,
  current: number,
): UnderstandingDelta {
  // First ever cycle: there is no prior reading to compare against, so the
  // honest answer is "we learned everything we know", not "nothing changed".
  const prior = previous?.understanding.current ?? 0;
  const delta = current - prior;
  return {
    previous: prior,
    current,
    delta,
    changed: previous === null ? current > 0 : delta !== 0,
  };
}

function newContradictionAppeared(
  previous: ConsultingWorkingMemory | null,
  next: ConsultingWorkingMemory,
): boolean {
  if (!previous) return next.contradictions.length > 0;
  const seen = new Set(previous.contradictions.map((item) => item.statement));
  return next.contradictions.some((item) => !seen.has(item.statement));
}

function capabilityJustCompleted(
  previous: ConsultingWorkingMemory | null,
  next: ConsultingWorkingMemory,
): boolean {
  const completedNow = next.capabilities
    .filter((capability) => capability.discoveryComplete)
    .map((capability) => capability.id);
  if (completedNow.length === 0) return false;
  if (!previous) return true;
  const before = new Set(
    previous.capabilities
      .filter((capability) => capability.discoveryComplete)
      .map((capability) => capability.id),
  );
  return completedNow.some((id) => !before.has(id));
}
