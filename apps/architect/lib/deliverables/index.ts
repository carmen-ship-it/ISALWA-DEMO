import type { CompanyWorkspace, DeliverablesPackage } from "@/types";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { createId } from "@/lib/utils";
import { buildDeliverablesPackage } from "./generator";

export { buildDeliverablesPackage } from "./generator";
export { DELIVERABLE_EXPORT_CONTRACTS } from "./exports";
export { buildExecutiveSummary } from "./executive-summary";
export { buildBusinessAssessment } from "./business-assessment";
export { buildProposal } from "./proposal";
export { buildDevelopmentRoadmap } from "./roadmap";
export { buildPrd } from "./prd";
export { buildSow, buildImplementationPlan } from "./sow";
export { buildSprintBacklog } from "./backlog";
export { buildCursorContext } from "./cursor-context";
export { buildTechnicalArchitecture } from "./architecture";
export {
  buildBlueprintDeliverable,
  buildSolutionDeliverable,
  buildProcessBook,
} from "./requirements";

/**
 * Public API — generate the full consulting deliverables package for a workspace.
 * Persists onto CompanyWorkspace.deliverables and returns the package.
 */
export async function generateDeliverables(
  workspaceId: string,
): Promise<DeliverablesPackage | null> {
  const store = getClientCompanyMemoryStore();
  const workspace = await store.workspaces.get(workspaceId);
  if (!workspace) return null;

  const pack = buildDeliverablesPackage(workspace);
  const stamp = pack.generatedAt;

  const next: CompanyWorkspace = {
    ...workspace,
    deliverables: pack,
    updatedAt: stamp,
    lastActivityAt: stamp,
    lastActivityLabel: "Deliverables generated",
    timeline: [
      {
        id: createId("timeline"),
        workspaceId,
        date: stamp,
        title: `Deliverables · ${workspace.companyName}`,
        description: pack.summary,
        category: "deliverable",
      },
      ...workspace.timeline,
    ],
  };

  await store.workspaces.save(next);
  return pack;
}
