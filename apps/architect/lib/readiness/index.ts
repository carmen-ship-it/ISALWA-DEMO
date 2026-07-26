/**
 * Readiness — thin evidence-coverage layer.
 *
 * No Readiness Engine exists yet in this codebase, so this module is
 * intentionally small: it does not duplicate the Discovery Score's scoring
 * logic (`lib/reasoning/confidence/score.ts`) — it *derives from evidence
 * presence* (the Knowledge Engine's already-computed coverage) and
 * contributes that as ordinary known facts. The existing planner
 * (`lib/consulting/questions`) already treats covered/confident dimensions
 * as low priority — this module simply gives it evidence-backed facts to
 * work with, exactly the same seam `lib/knowledge/bridge.ts` already uses
 * for themes/unknowns. The interview UX itself is untouched.
 */

import { createId, nowIso } from "@/lib/utils";
import { ensureWorkspaceKnowledge } from "@/lib/knowledge/coverage";
import type {
  CompanyWorkspace,
  ConversationMemory,
  DiscoveryDimension,
  KnowledgeCoverageArea,
  KnowledgeCoverageSlice,
} from "@/types";

const AREA_TO_DIMENSIONS: Record<KnowledgeCoverageArea, DiscoveryDimension[]> = {
  Customers: ["customers"],
  Sales: ["sales"],
  Operations: ["operations"],
  Finance: ["finance"],
  HR: ["team"],
};

const AREA_LABELS_ES: Record<KnowledgeCoverageArea, string> = {
  Customers: "Clientes",
  Sales: "Ventas",
  Operations: "Operaciones",
  Finance: "Finanzas",
  HR: "Equipo y RR. HH.",
};

/** Coverage below this never contributes — avoid noise from a single weak signal. */
const MIN_SIGNAL_PERCENT = 45;
/** Coverage at/above this is strong enough to recommend skipping the topic outright. */
const STRONG_SIGNAL_PERCENT = 75;

export interface ReadinessSignal {
  dimension: DiscoveryDimension;
  area: KnowledgeCoverageArea;
  coveragePercent: number;
  skipRecommended: boolean;
  reason: string;
  evidenceAssetIds: string[];
}

export interface ReadinessAssessment {
  workspaceId: string;
  generatedAt: string;
  signals: ReadinessSignal[];
  skippableDimensions: DiscoveryDimension[];
}

/**
 * Derive readiness purely from the Knowledge Engine's existing coverage
 * slices — the same numbers the Business Knowledge workspace section shows
 * the client. No independent scoring model.
 */
export function assessReadiness(workspace: CompanyWorkspace): ReadinessAssessment {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const signals: ReadinessSignal[] = [];

  for (const slice of knowledge.coverage as KnowledgeCoverageSlice[]) {
    if (slice.percent < MIN_SIGNAL_PERCENT) continue;
    const dimensions = AREA_TO_DIMENSIONS[slice.area] ?? [];
    for (const dimension of dimensions) {
      signals.push({
        dimension,
        area: slice.area,
        coveragePercent: slice.percent,
        skipRecommended: slice.percent >= STRONG_SIGNAL_PERCENT,
        reason:
          slice.percent >= STRONG_SIGNAL_PERCENT
            ? `Evidencia cargada cubre bien "${AREA_LABELS_ES[slice.area]}" (${slice.percent}%) — podemos aligerar preguntas aquí.`
            : `Evidencia cargada aporta a "${AREA_LABELS_ES[slice.area]}" (${slice.percent}%), aún conviene confirmar en la entrevista.`,
        evidenceAssetIds: slice.evidenceAssetIds,
      });
    }
  }

  return {
    workspaceId: workspace.id,
    generatedAt: nowIso(),
    signals,
    skippableDimensions: signals
      .filter((s) => s.skipRecommended)
      .map((s) => s.dimension),
  };
}

/**
 * Contribute evidence-backed known facts using the `evidence_<dimension>`
 * (and `_strong` variant) keys already recognized by
 * `computeDiscoveryScore` — never invents a new scoring path, just gives the
 * existing one real evidence to count. Idempotent: skips dimensions that
 * already have an evidence fact.
 */
export function applyReadinessToMemory(
  memory: ConversationMemory,
  workspace: CompanyWorkspace,
): ConversationMemory {
  const assessment = assessReadiness(workspace);
  if (assessment.signals.length === 0) return memory;

  const existingKeys = new Set(memory.knownFacts.map((f) => f.key));
  const newFacts = assessment.signals.flatMap((signal) => {
    const facts = [];
    const baseKey = `evidence_${signal.dimension}`;
    if (!existingKeys.has(baseKey)) {
      facts.push({
        id: createId("fact"),
        key: baseKey,
        statement: signal.reason,
        evidence: ["Conocimiento del negocio"],
        confidence: signal.coveragePercent / 100,
        dimension: signal.dimension,
        createdAt: nowIso(),
      });
    }
    const strongKey = `${baseKey}_strong`;
    if (signal.skipRecommended && !existingKeys.has(strongKey)) {
      facts.push({
        id: createId("fact"),
        key: strongKey,
        statement: signal.reason,
        evidence: ["Conocimiento del negocio"],
        confidence: signal.coveragePercent / 100,
        dimension: signal.dimension,
        createdAt: nowIso(),
      });
    }
    return facts;
  });

  if (newFacts.length === 0) return memory;

  return {
    ...memory,
    knownFacts: [...memory.knownFacts, ...newFacts],
  };
}
