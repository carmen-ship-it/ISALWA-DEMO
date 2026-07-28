/**
 * Mission 26 — Business Blueprint as a living deliverable.
 *
 * Deliberately thin: reuses `latestBlueprint` (Blueprint versioning,
 * `lib/blueprint/derive.ts`) and `buildBlueprintDeliverable` (Mission 9,
 * `lib/deliverables/requirements.ts`) verbatim. This module only upgrades
 * presentation — version history, readiness, evidence, missing information —
 * it never re-derives blueprint content.
 */

import { latestBlueprint } from "@/lib/blueprint";
import { buildBlueprintDeliverable } from "@/lib/deliverables/requirements";
import type {
  BusinessBlueprintLivingContent,
  CompanyWorkspace,
  DeliverableEvidenceRef,
  LivingDeliverableEvidenceRef,
} from "@/types";
import { fromDeliverableEvidence } from "./evidence";

export interface BusinessBlueprintGenerationResult {
  title: string;
  content: BusinessBlueprintLivingContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateBusinessBlueprintLiving(
  workspace: CompanyWorkspace,
): BusinessBlueprintGenerationResult | null {
  const blueprint = latestBlueprint(workspace.blueprints);
  if (!blueprint) return null;

  const baseEvidence: DeliverableEvidenceRef[] = [
    { source: "blueprint", id: blueprint.id, label: `Blueprint v${blueprint.version}` },
    { source: "memory", id: workspace.id, label: `${workspace.companyName} company memory` },
  ];

  const deliverable = buildBlueprintDeliverable(workspace, baseEvidence);
  if (!deliverable) return null;

  const contentSignalCount =
    deliverable.capabilities.length +
    deliverable.departments.length +
    deliverable.workflows.length +
    deliverable.systems.length;

  return {
    title: deliverable.title,
    content: { blueprint: deliverable },
    evidence: fromDeliverableEvidence(deliverable.evidence),
    missingInformation: blueprint.openQuestions,
    contentSignalCount,
  };
}
