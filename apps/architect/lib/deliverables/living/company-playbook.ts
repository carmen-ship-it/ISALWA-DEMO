/**
 * Mission 26 — Company Playbook.
 *
 * Composes Company Model (`lib/company-model`) organization/departments/
 * decision-flows/information-flows plus the current Blueprint's operating
 * rules. Mission, vision and values have no dedicated engine — vision reuses
 * the Executive Summary's already-computed vision sentence
 * (`lib/deliverables/executive-summary.ts`); "values" has no source anywhere
 * in the product yet, so it is reported honestly as Needs More Knowledge
 * rather than invented.
 */

import { latestBlueprint } from "@/lib/blueprint";
import { buildExecutiveSummary } from "@/lib/deliverables/executive-summary";
import { departmentLabel } from "@/lib/presentation";
import type {
  CompanyPlaybookContent,
  CompanyWorkspace,
  DeliverableEvidenceRef,
  LivingDeliverableEvidenceRef,
} from "@/types";
import { fromCompanyModelEvidence } from "./evidence";

export interface CompanyPlaybookGenerationResult {
  title: string;
  content: CompanyPlaybookContent;
  evidence: LivingDeliverableEvidenceRef[];
  missingInformation: string[];
  contentSignalCount: number;
}

export function generateCompanyPlaybook(
  workspace: CompanyWorkspace,
): CompanyPlaybookGenerationResult {
  const model = workspace.companyModel;
  const blueprint = latestBlueprint(workspace.blueprints);

  const baseEvidence: DeliverableEvidenceRef[] = [
    { source: "memory", id: workspace.id, label: `${workspace.companyName} company memory` },
  ];
  const vision = buildExecutiveSummary(workspace, baseEvidence).vision;

  const orgSummary =
    model?.organization.summary ??
    blueprint?.summary ??
    `Architect todavía está construyendo el modelo operativo de ${workspace.companyName}.`;

  const departments = (model?.departments.map((d) => departmentLabel(d.name)) ?? []).filter(
    (v, i, a) => a.indexOf(v) === i,
  );

  const decisionPrinciples = (model?.decisionFlows ?? []).map(
    (d) => `${d.name}: activado por "${d.trigger}", autoridad de ${d.authority}.`,
  );
  const operatingRulePrinciples = (blueprint?.operatingRules ?? [])
    .filter((r) => r.enforcement !== "unknown")
    .map((r) => r.statement);

  const communicationNorms = (model?.informationFlows ?? [])
    .filter((f) => f.risk && f.risk.length > 0)
    .map((f) => `${f.fromLabel} → ${f.toLabel}: ${f.risk}`);

  const needsMoreKnowledge: string[] = ["Valores declarados de la empresa"];
  if (decisionPrinciples.length === 0 && operatingRulePrinciples.length === 0) {
    needsMoreKnowledge.push("Principios formales de toma de decisiones");
  }
  if (communicationNorms.length === 0) {
    needsMoreKnowledge.push("Normas de comunicación entre áreas");
  }
  if (!model) {
    needsMoreKnowledge.push("Modelo organizacional completo (aún sin generar)");
  }

  const evidence: LivingDeliverableEvidenceRef[] = model
    ? fromCompanyModelEvidence(model.evidence)
    : blueprint
      ? [{ source: "blueprint", id: blueprint.id, label: `Blueprint v${blueprint.version}` }]
      : [];

  const contentSignalCount =
    departments.length + decisionPrinciples.length + operatingRulePrinciples.length + communicationNorms.length;

  return {
    title: `Playbook de ${workspace.companyName}`,
    content: {
      vision,
      orgSummary,
      decisionPrinciples: [...decisionPrinciples, ...operatingRulePrinciples],
      communicationNorms,
      departments,
      values: [],
      needsMoreKnowledge,
    },
    evidence,
    missingInformation: needsMoreKnowledge,
    contentSignalCount,
  };
}
