import type {
  BrandEvidenceRef,
  BrandEvidenceSource,
  BusinessBlueprint,
  CompanyWorkspace,
} from "@/types";

export function collectBrandEvidence(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
): BrandEvidenceRef[] {
  const refs: BrandEvidenceRef[] = [
    {
      source: "blueprint",
      id: blueprint.id,
      label: `Blueprint v${blueprint.version}`,
    },
    {
      source: "industry",
      id: workspace.industry,
      label: `Industry: ${workspace.industry}`,
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

  return refs;
}

export function evidenceSubset(
  refs: BrandEvidenceRef[],
  sources: BrandEvidenceSource[],
  limit = 4,
): BrandEvidenceRef[] {
  return refs.filter((r) => sources.includes(r.source)).slice(0, limit);
}

export function collectFactBlob(workspace: CompanyWorkspace): string {
  const parts: string[] = [];
  for (const fact of workspace.conversationMemory?.knownFacts ?? []) {
    parts.push(fact.statement);
  }
  for (const meeting of workspace.meetings) {
    parts.push(...meeting.discoveries);
  }
  if (workspace.knowledge?.summary) parts.push(workspace.knowledge.summary);
  return parts.join(" ").toLowerCase();
}

export function knowledgeThemes(workspace: CompanyWorkspace): string[] {
  const themes = workspace.knowledge?.coverage.map((c) => c.area) ?? [];
  const unknowns = workspace.knowledge?.unknownAreas ?? [];
  return [...themes, ...unknowns];
}
