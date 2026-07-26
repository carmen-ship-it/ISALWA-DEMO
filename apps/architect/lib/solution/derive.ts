import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  CompanyWorkspace,
  SolutionArchitecture,
  SolutionEvidenceRef,
} from "@/types";
import { detectApis } from "./api";
import { detectConfiguration } from "./configuration";
import { detectDatabase } from "./database";
import { detectRelationships } from "./dependencies";
import { detectEntities } from "./entities";
import { detectAiAgents, detectIntegrations } from "./integrations";
import { detectModules } from "./modules";
import { detectNavigation } from "./navigation";
import { detectRoadmap } from "./roadmap";
import { detectRoles } from "./roles";
import { detectWorkflows } from "./workflows";

/**
 * Derive Solution Architecture from Business Blueprint + workspace evidence.
 * Deterministic. Never invents without evidence. No LLM.
 */
export function deriveSolutionArchitecture(input: {
  workspace: CompanyWorkspace;
  blueprint: BusinessBlueprint;
}): SolutionArchitecture {
  const { workspace, blueprint } = input;
  const stamp = new Date().toISOString();

  const evidence: SolutionEvidenceRef[] = [
    {
      source: "blueprint",
      id: blueprint.id,
      label: `Blueprint v${blueprint.version}`,
    },
    ...workspace.meetings.slice(0, 3).map((m) => ({
      source: "meeting" as const,
      id: m.id,
      label: m.title,
    })),
    ...(workspace.knowledge?.assets.slice(0, 3).map((a) => ({
      source: "knowledge" as const,
      id: a.id,
      label: a.title,
    })) ?? []),
    ...(workspace.conversationMemory?.consulting
      ? [
          {
            source: "consulting" as const,
            id: "consulting",
            label: "Consulting intelligence",
          },
        ]
      : []),
    {
      source: "memory",
      id: workspace.id,
      label: `${workspace.companyName} company memory`,
    },
  ];

  // Business rules + approvals from blueprint operating rules
  const businessRules = blueprint.operatingRules.map((rule) => ({
    id: createId("sbrule"),
    statement: rule.statement,
    domain: rule.domain,
    confidence: 0.8,
    evidence: evidence.slice(0, 2),
  }));

  const approvalRules = blueprint.operatingRules
    .filter((r) => /approv|quotation|threshold|credit/i.test(r.statement))
    .map((rule) => ({
      id: createId("sarule"),
      statement: rule.statement,
      thresholdHint: /10,?000|threshold|over/i.test(rule.statement)
        ? "Materiality threshold referenced in discovery"
        : null,
      roles: ["Manager" as const, "Owner" as const],
      confidence: 0.78,
      evidence: evidence.slice(0, 2),
    }));

  const modules = detectModules(blueprint, workspace, evidence);
  const entities = detectEntities(blueprint, workspace, modules, evidence);
  const relationships = detectRelationships(entities, evidence);
  const { roles, permissions } = detectRoles(blueprint, modules, evidence);
  const navigation = detectNavigation(modules, permissions, evidence);
  const workflows = detectWorkflows(blueprint, modules, evidence);
  const integrations = detectIntegrations(blueprint, workspace, evidence);
  const aiAgents = detectAiAgents(modules, evidence);
  const database = detectDatabase(entities, evidence);
  const apis = detectApis(entities, evidence);
  const roadmap = detectRoadmap(modules);
  const configuration = detectConfiguration(blueprint, modules);

  const overallConfidence =
    modules.length === 0
      ? 0
      : Math.round(
          (modules.reduce((sum, m) => sum + m.confidence, 0) / modules.length) *
            100,
        ) / 100;

  return {
    id: createId("solution"),
    workspaceId: workspace.id,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    generatedAt: stamp,
    summary: `Arquitectura de solución para ${workspace.companyName}, derivada del Blueprint operativo de negocio v${blueprint.version} — ${modules.length} capacidades, ${entities.length} entidades, ${roles.length} roles.`,
    modules,
    entities,
    relationships,
    roles,
    permissions,
    navigation,
    departments: blueprint.departments.map((d) => d.name),
    businessRules,
    approvalRules,
    integrations,
    aiAgents,
    workflows,
    database,
    apis,
    roadmap,
    configuration,
    evidence,
    overallConfidence,
  };
}
