/**
 * Mission 18 — Implementation Package public API.
 *
 * Architect becomes the starting point for custom software once discovery
 * clears the conclusion threshold. This layer gates + orchestrates; it does
 * not rewrite Blueprint / Solution / Processes / Deliverables / Consulting.
 */

import type { CompanyWorkspace, ImplementationPackage } from "@/types";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { createId } from "@/lib/utils";
import {
  assembleImplementationPackage,
  buildImplementationPackageResult,
} from "./assemble";

export {
  assembleImplementationPackage,
  buildImplementationPackageResult,
} from "./assemble";
export { buildImplementationSections } from "./sections";
export {
  evaluateImplementationGate,
  IMPLEMENTATION_PACKAGE_THRESHOLD,
  isImplementationThresholdMet,
} from "./threshold";

/**
 * Persist the implementation package when the threshold is met.
 * Clears the stored package when understanding falls below the gate.
 */
export async function generateImplementationPackage(
  workspaceId: string,
): Promise<ImplementationPackage | null> {
  const store = getClientCompanyMemoryStore();
  const workspace = await store.workspaces.get(workspaceId);
  if (!workspace) return null;

  const pack = assembleImplementationPackage(workspace);
  const stamp = pack?.generatedAt ?? new Date().toISOString();

  const next: CompanyWorkspace = {
    ...workspace,
    implementationPackage: pack,
    updatedAt: stamp,
    lastActivityAt: stamp,
    lastActivityLabel: pack
      ? pack.gate.ready
        ? "Implementation package ready"
        : "Implementation package assembled (incomplete engines)"
      : "Implementation package not ready",
    timeline: pack
      ? [
          {
            id: createId("timeline"),
            workspaceId,
            date: stamp,
            title: pack.gate.ready
              ? `Implementation Package · ${workspace.companyName}`
              : `Implementation Package (gated) · ${workspace.companyName}`,
            description: pack.summary,
            category: "implementation",
          },
          ...workspace.timeline,
        ]
      : workspace.timeline,
  };

  await store.workspaces.save(next);
  return pack;
}

/** Convenience for UI — gate always; pack only above threshold. */
export function readImplementationPackageState(workspace: CompanyWorkspace) {
  return buildImplementationPackageResult(workspace);
}
