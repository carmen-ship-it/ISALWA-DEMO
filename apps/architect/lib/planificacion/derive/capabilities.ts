import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  governanceFromConfidence,
  itemDerivationMeta,
  mapBlueprintEvidence,
  mapProcessEvidence,
  mapSolutionEvidence,
  planificacionItemId,
  stableKeyFor,
} from "./helpers";

/**
 * Proposed capabilities from solution modules and blueprint capabilities —
 * never from commercial demo feature lists.
 */
export function deriveProposedCapabilities(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];
  const seen = new Set<string>();

  const solution = workspace.solutionArchitecture;
  for (const mod of solution?.modules ?? []) {
    const stableKey = stableKeyFor("capability", `solution-mod-${mod.name}`);
    if (seen.has(stableKey)) continue;
    seen.add(stableKey);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "capability",
      title: mod.name,
      body: mod.purpose,
      recommendation: mod.purpose,
      rationale:
        mod.dependencies.length > 0
          ? `Depende de: ${mod.dependencies.join(", ")}`
          : undefined,
      evidenceRefs: mapSolutionEvidence(mod.evidence),
      governanceStatus: governanceFromConfidence(mod.confidence, "capability"),
      sourceEngines: ["solution"],
      osModuleHint: mod.name,
      dependencies: mod.dependencies,
      ...meta,
    });
  }

  const blueprint =
    workspace.blueprints.find((b) => b.id === workspace.currentBlueprintId) ??
    workspace.blueprints[0] ??
    null;

  for (const cap of blueprint?.capabilities ?? []) {
    const stableKey = stableKeyFor("capability", `blueprint-cap-${cap.name}`);
    if (seen.has(stableKey)) continue;
    seen.add(stableKey);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "capability",
      title: cap.name,
      body: cap.purpose,
      recommendation: cap.purpose,
      rationale: cap.owner ? `Responsable: ${cap.owner}` : undefined,
      evidenceRefs: mapBlueprintEvidence(cap.evidence),
      governanceStatus: governanceFromConfidence(
        cap.evidence.length > 0 ? 72 : 48,
        "capability",
      ),
      sourceEngines: ["blueprint"],
      osModuleHint: cap.name,
      dependencies: cap.dependencies,
      ...meta,
    });
  }

  for (const wf of workspace.businessProcesses?.workflows?.slice(0, 8) ?? []) {
    const stableKey = stableKeyFor("capability", `process-wf-${wf.id}`);
    if (seen.has(stableKey)) continue;
    seen.add(stableKey);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "capability",
      title: wf.name,
      body: wf.purpose,
      recommendation: wf.purpose,
      evidenceRefs: mapProcessEvidence(wf.evidence),
      governanceStatus: governanceFromConfidence(wf.confidence, "capability"),
      sourceEngines: ["processes"],
      ...meta,
    });
  }

  return items;
}
