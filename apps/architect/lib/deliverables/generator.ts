import { phaseLabel } from "@/lib/presentation";
import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  DeliverablesPackage,
} from "@/types";
import { buildTechnicalArchitecture } from "./architecture";
import { buildSprintBacklog } from "./backlog";
import { buildBusinessAssessment } from "./business-assessment";
import { buildCursorContext } from "./cursor-context";
import { buildExecutiveSummary } from "./executive-summary";
import { buildImplementationPlan } from "./implementation-plan";
import { buildPrd } from "./prd";
import { buildProposal } from "./proposal";
import {
  buildBlueprintDeliverable,
  buildProcessBook,
  buildSolutionDeliverable,
} from "./requirements";
import { buildDevelopmentRoadmap } from "./roadmap";

/**
 * Pure builder — derives the full consulting package from workspace models.
 * Never duplicates Process / Solution / Consulting engines.
 */
export function buildDeliverablesPackage(
  workspace: CompanyWorkspace,
): DeliverablesPackage {
  const stamp = nowIso();
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const solution = workspace.solutionArchitecture;
  const processes = workspace.businessProcesses;
  const consulting = workspace.conversationMemory?.consulting;

  const evidence: DeliverableEvidenceRef[] = [
    ...(blueprint
      ? [
          {
            source: "blueprint" as const,
            id: blueprint.id,
            label: `Blueprint v${blueprint.version}`,
          },
        ]
      : []),
    ...(solution
      ? [
          {
            source: "solution" as const,
            id: solution.id,
            label: "Solution Architecture",
          },
        ]
      : []),
    ...(processes
      ? [
          {
            source: "process" as const,
            id: processes.id,
            label: "Business Processes",
          },
        ]
      : []),
    ...(consulting
      ? [
          {
            source: "consulting" as const,
            id: "consulting",
            label: "Consulting Intelligence",
          },
        ]
      : []),
    ...(workspace.knowledge?.assets.slice(0, 2).map((a) => ({
      source: "knowledge" as const,
      id: a.id,
      label: a.title,
    })) ?? []),
    ...(workspace.meetings.slice(0, 2).map((m) => ({
      source: "meeting" as const,
      id: m.id,
      label: m.title,
    })) ?? []),
    ...(workspace.currentReport
      ? [
          {
            source: "report" as const,
            id: workspace.currentReport.id,
            label: "Living Report",
          },
        ]
      : []),
    {
      source: "memory",
      id: workspace.id,
      label: `${workspace.companyName} company memory`,
    },
  ];

  const executiveSummary = buildExecutiveSummary(workspace, evidence);
  const businessAssessment = buildBusinessAssessment(workspace, evidence);
  const businessBlueprint = buildBlueprintDeliverable(workspace, evidence);
  const solutionArchitecture = buildSolutionDeliverable(workspace, evidence);
  const processBook = buildProcessBook(workspace, evidence);
  const prd = buildPrd(workspace, evidence);
  const technicalArchitecture = buildTechnicalArchitecture(workspace, evidence);
  const cursorContext = buildCursorContext(workspace, evidence);
  const developmentRoadmap = buildDevelopmentRoadmap(workspace, evidence);
  const implementationPlan = buildImplementationPlan(
    workspace,
    developmentRoadmap.phases,
    evidence,
  );
  const sprintBacklog = buildSprintBacklog(
    workspace,
    developmentRoadmap.phases,
    evidence,
  );
  const proposal = buildProposal(
    workspace,
    evidence,
    executiveSummary.executiveRecommendation,
    developmentRoadmap.phases.map((p) => `Fase ${p.phase}: ${phaseLabel(p.name)}`),
  );

  const confidenceParts = [
    solution?.overallConfidence,
    processes?.overallConfidence,
    consulting?.confidence.overall,
    blueprint ? 0.8 : 0.4,
  ].filter((n): n is number => typeof n === "number");

  const overallConfidence =
    confidenceParts.length === 0
      ? 0.4
      : Math.round(
          (confidenceParts.reduce((a, b) => a + b, 0) / confidenceParts.length) *
            100,
        ) / 100;

  return {
    id: createId("deliverables"),
    workspaceId: workspace.id,
    companyName: workspace.companyName,
    generatedAt: stamp,
    blueprintId: blueprint?.id ?? null,
    blueprintVersion: blueprint?.version ?? null,
    solutionId: solution?.id ?? null,
    processModelId: processes?.id ?? null,
    summary: `Paquete de consultoría para ${workspace.companyName} — resumen ejecutivo, diagnóstico, blueprint, sistema recomendado, procesos, requisitos, plan de implementación, backlog y resumen de construcción.`,
    executiveSummary,
    businessAssessment,
    businessBlueprint,
    solutionArchitecture,
    processBook,
    prd,
    technicalArchitecture,
    cursorContext,
    developmentRoadmap,
    implementationPlan,
    sprintBacklog,
    proposal,
    evidence,
    overallConfidence,
  };
}
