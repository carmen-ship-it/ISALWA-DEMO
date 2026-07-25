import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  ProposalDeliverable,
} from "@/types";

export function buildProposal(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
  executiveRecommendation: string,
  roadmapPhases: string[],
): ProposalDeliverable {
  const solution = workspace.solutionArchitecture;
  const company = workspace.companyName;

  return {
    kind: "proposal",
    title: `Operating System Proposal · ${company}`,
    engagementSummary: `ISALWA Architect completed discovery for ${company}. This proposal packages the Business Blueprint, Solution Architecture, and Process Engine into an executable engagement.`,
    recommendedApproach: executiveRecommendation,
    scope: [
      ...(solution?.modules.slice(0, 8).map((m) => `Implement ${m.name}`) ?? []),
      "Establish approval and audit trails",
      "Replace fragile spreadsheet / chat workflows where evidenced",
    ],
    timelineOutline: roadmapPhases.slice(0, 5),
    investmentNarrative:
      solution?.roadmap
        .map((p) => `${p.name} (${p.estimatedComplexity}): ${p.businessValue}`)
        .join(" ") ??
      "Investment prioritizes foundation, core revenue workflows, then automation.",
    nextSteps: [
      "Review deliverables package with leadership",
      "Confirm Phase 1 scope and success metrics",
      "Authorize implementation kickoff",
    ],
    evidence: evidence.slice(0, 5),
  };
}
