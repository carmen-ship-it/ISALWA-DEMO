import type {
  BusinessBlueprint,
  CompanyModelEvidenceRef,
  CompanyWorkspace,
} from "@/types";

export function collectCompanyModelEvidence(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
): CompanyModelEvidenceRef[] {
  const refs: CompanyModelEvidenceRef[] = [
    {
      source: "blueprint",
      id: blueprint.id,
      label: `Blueprint v${blueprint.version}`,
    },
    {
      source: "memory",
      id: workspace.id,
      label: `${workspace.companyName} company memory`,
    },
  ];

  for (const meeting of workspace.meetings.slice(0, 3)) {
    refs.push({
      source: "meeting",
      id: meeting.id,
      label: meeting.title,
    });
  }

  for (const asset of workspace.knowledge?.assets.slice(0, 3) ?? []) {
    refs.push({
      source: "knowledge",
      id: asset.id,
      label: asset.title,
    });
  }

  if (workspace.conversationMemory?.consulting) {
    refs.push({
      source: "consulting",
      id: "consulting",
      label: "Consulting intelligence",
    });
  }

  if (workspace.solutionArchitecture) {
    refs.push({
      source: "solution",
      id: workspace.solutionArchitecture.id,
      label: `Solution Architecture v${workspace.solutionArchitecture.blueprintVersion}`,
    });
  }

  if (workspace.businessProcesses) {
    refs.push({
      source: "process",
      id: workspace.businessProcesses.id,
      label: `Business Processes v${workspace.businessProcesses.blueprintVersion}`,
    });
  }

  if (workspace.people.length > 0) {
    refs.push({
      source: "people",
      id: workspace.id,
      label: `${workspace.people.length} people in workspace`,
    });
  }

  return refs;
}
