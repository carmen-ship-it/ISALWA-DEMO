import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  CompanyModel,
  CompanyWorkspace,
} from "@/types";
import { derivePeople, deriveRoles } from "./actors";
import {
  deriveOwnership,
  derivePartiesAndProducts,
  deriveRelationships,
  deriveWorkflowRefs,
} from "./relationships";
import { deriveApprovals, deriveDecisionFlows } from "./decision-flow";
import { deriveDependencies } from "./dependencies";
import { deriveDepartments } from "./departments";
import { collectCompanyModelEvidence } from "./evidence";
import { deriveCompanyModelHealth } from "./health";
import {
  deriveInformationFlows,
  deriveInformationNodes,
} from "./information-flow";
import { deriveOrganization } from "./organization";
import { attachWorkflowSystems, deriveSystems } from "./systems";

/**
 * Derive Company Digital Twin from Blueprint + workspace evidence.
 * Deterministic. ID references only. No LLM. No diagrams.
 */
export function deriveCompanyModel(input: {
  workspace: CompanyWorkspace;
  blueprint: BusinessBlueprint;
}): CompanyModel {
  const { workspace, blueprint } = input;
  const stamp = new Date().toISOString();
  const evidence = collectCompanyModelEvidence(workspace, blueprint);

  const organization = deriveOrganization(workspace, blueprint, evidence);
  const departments = deriveDepartments(workspace, blueprint, evidence);
  const roles = deriveRoles(workspace, blueprint, departments, evidence);
  const people = derivePeople(workspace, departments, roles, evidence);
  const workflows = deriveWorkflowRefs(
    workspace,
    blueprint,
    departments,
    people,
    evidence,
  );
  const systems = deriveSystems(workspace, blueprint, departments, evidence);
  attachWorkflowSystems(workflows, systems);

  const { customers, suppliers, products } = derivePartiesAndProducts(
    workspace,
    evidence,
  );

  // Link parties to related workflows by name heuristics (IDs only)
  for (const party of [...customers, ...suppliers]) {
    const key = party.kind;
    party.relatedWorkflowIds = workflows
      .filter((wf) =>
        key === "customer"
          ? /sales|quote|order|customer|crm/i.test(wf.name)
          : /purchas|procure|supplier|vendor/i.test(wf.name),
      )
      .map((wf) => wf.id);
  }

  const information = deriveInformationNodes(
    workspace,
    departments,
    workflows,
    evidence,
  );
  const approvals = deriveApprovals(workspace, blueprint, workflows, evidence);
  const ownership = deriveOwnership(
    blueprint,
    departments,
    people,
    systems,
    workflows,
    evidence,
  );
  const relationships = deriveRelationships(
    workspace,
    departments,
    people,
    systems,
    workflows,
    evidence,
  );
  const informationFlows = deriveInformationFlows(
    workspace,
    departments,
    people,
    workflows,
    information,
    evidence,
  );
  const decisionFlows = deriveDecisionFlows(
    approvals,
    departments,
    workflows,
    evidence,
  );
  const dependencies = deriveDependencies(
    workspace,
    workflows,
    systems,
    people,
    evidence,
  );
  const health = deriveCompanyModelHealth(
    workspace,
    ownership,
    dependencies,
    informationFlows,
    evidence,
  );

  const confidenceSamples = [
    organization.confidence,
    ...departments.map((d) => d.confidence),
    ...systems.map((s) => s.confidence),
    health.confidence,
  ].filter((c) => c > 0);

  const overallConfidence =
    confidenceSamples.length === 0
      ? 0
      : Math.round(
          (confidenceSamples.reduce((a, b) => a + b, 0) /
            confidenceSamples.length) *
            100,
        ) / 100;

  const reasoning = [
    `Company model derived from Blueprint v${blueprint.version} with ${evidence.length} evidence refs.`,
    `${departments.length} departments · ${people.length} people · ${systems.length} systems · ${workflows.length} workflows.`,
    `${relationships.length} relationships · ${ownership.length} ownership links · ${informationFlows.length} information flows.`,
    `${dependencies.filter((d) => d.criticality === "critical" || d.criticality === "high").length} critical/high dependencies surfaced.`,
    overallConfidence < 0.45
      ? "Overall confidence is low — deepen discovery and knowledge coverage to strengthen the twin."
      : "Model is evidence-backed and ready for executive review; diagrams deferred to a future visualization mission.",
  ];

  const summary = `Company digital twin for ${workspace.companyName} — Blueprint v${blueprint.version}. ${departments.length} departments, ${people.length} people, ${systems.length} systems, ${dependencies.length} dependencies · ${Math.round(overallConfidence * 100)}% confidence.`;

  return {
    id: createId("cmodel"),
    workspaceId: workspace.id,
    blueprintId: blueprint.id,
    blueprintVersion: blueprint.version,
    generatedAt: stamp,
    summary,
    organization,
    departments,
    people,
    roles,
    systems,
    customers,
    suppliers,
    products,
    workflows,
    information,
    approvals,
    ownership,
    relationships,
    informationFlows,
    decisionFlows,
    dependencies,
    health,
    evidence,
    overallConfidence,
    reasoning,
  };
}

export function companyModelTimelineEvent(model: CompanyModel): {
  id: string;
  workspaceId: string;
  date: string;
  title: string;
  description: string;
  category: "company_model";
} {
  return {
    id: createId("timeline"),
    workspaceId: model.workspaceId,
    date: model.generatedAt,
    title: `Company Model · Blueprint v${model.blueprintVersion}`,
    description: model.summary,
    category: "company_model",
  };
}
