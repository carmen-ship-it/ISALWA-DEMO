import type { BusinessBlueprint, CompanyWorkspace } from "@/types";
import {
  appendBlueprintVersion,
  deriveBusinessBlueprint,
  latestBlueprint,
} from "./derive";

export function emptyBlueprints(): BusinessBlueprint[] {
  return [];
}

export function ensureBlueprints(
  blueprints: BusinessBlueprint[] | undefined | null,
): BusinessBlueprint[] {
  return Array.isArray(blueprints) ? blueprints : [];
}

export function ensureCurrentBlueprintId(
  workspace: Pick<CompanyWorkspace, "blueprints" | "currentBlueprintId">,
): string | null {
  if (workspace.currentBlueprintId) {
    const exists = workspace.blueprints?.some(
      (b) => b.id === workspace.currentBlueprintId,
    );
    if (exists) return workspace.currentBlueprintId;
  }
  return latestBlueprint(workspace.blueprints)?.id ?? null;
}

/** Seed an initial blueprint when workspace already has discovery memory. */
export function createSeedBlueprints(
  workspace: CompanyWorkspace,
): BusinessBlueprint[] {
  if (workspace.meetings.length === 0 && workspace.painPoints.length === 0) {
    return [];
  }

  const first = deriveBusinessBlueprint({
    workspace,
    interview: null,
    meetingId: workspace.lastMeetingId,
    priorVersions: [],
  });

  // Slightly older timestamp so interview updates become v2 naturally in demos
  const stamped: BusinessBlueprint = {
    ...first,
    generatedAt: workspace.meetings[0]?.date ?? first.generatedAt,
    version: 1,
    title: `${workspace.companyName} Business OS Blueprint v1`,
  };

  return appendBlueprintVersion([], stamped);
}
