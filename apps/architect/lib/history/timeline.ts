/**
 * Evolutionary timeline entries — complements workspace.timeline without replacing it.
 */

import { createId } from "@/lib/utils";
import type {
  EvolutionChangePolarity,
  EvolutionMilestone,
  EvolutionTimelineEntry,
  CompanySnapshot,
} from "@/types/history";

const KIND_POLARITY: Partial<
  Record<EvolutionMilestone["kind"], EvolutionChangePolarity>
> = {
  baseline: "neutral",
  maturity_up: "progress",
  maturity_down: "regression",
  module_added: "progress",
  module_removed: "regression",
  process_added: "progress",
  recommendation_added: "progress",
  roadmap_advanced: "progress",
  work_completed: "progress",
  risk_resolved: "progress",
  risk_emerged: "regression",
  stage_changed: "progress",
  understanding_up: "progress",
  understanding_down: "regression",
};

export function milestoneToTimelineEntry(
  milestone: EvolutionMilestone,
): EvolutionTimelineEntry {
  return {
    id: createId("etimeline"),
    at: milestone.at,
    kind: milestone.kind,
    title: milestone.title,
    description: milestone.description,
    snapshotId: milestone.snapshotId,
    polarity: KIND_POLARITY[milestone.kind] ?? "neutral",
  };
}

export function snapshotTimelineEntry(
  snapshot: CompanySnapshot,
  isBaseline: boolean,
): EvolutionTimelineEntry {
  return {
    id: createId("etimeline"),
    at: snapshot.capturedAt,
    kind: "snapshot",
    title: isBaseline ? "Captura inicial" : "Nueva captura del estado",
    description: isBaseline
      ? "Línea base de la relación de consultoría."
      : `Comprensión ${snapshot.businessUnderstanding}% · ${snapshot.modules.length} módulos · ${snapshot.risks.length} riesgos`,
    snapshotId: snapshot.id,
    polarity: "neutral",
  };
}

export function visitTimelineEntry(
  at: string,
  snapshotId: string | undefined,
): EvolutionTimelineEntry {
  return {
    id: createId("etimeline"),
    at,
    kind: "visit",
    title: "Visita registrada",
    description: "Se actualizó la memoria evolutiva de la empresa.",
    snapshotId,
    polarity: "neutral",
  };
}

export function sortEvolutionTimeline(
  entries: EvolutionTimelineEntry[],
): EvolutionTimelineEntry[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at));
}

export function buildTimelineFromMilestones(
  milestones: EvolutionMilestone[],
): EvolutionTimelineEntry[] {
  return milestones.map(milestoneToTimelineEntry);
}
