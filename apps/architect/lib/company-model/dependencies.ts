import type {
  CompanyDependency,
  CompanyDependencyCriticality,
  CompanyModelEvidenceRef,
  CompanyPerson,
  CompanySystem,
  CompanyWorkflowRef,
  CompanyWorkspace,
} from "@/types";
import { modelId } from "./ids";

const WORKFLOW_RELATIONSHIP_REASON_ES: Record<string, string> = {
  feeds: "Un flujo de trabajo alimenta al otro.",
  depends_on: "Un flujo de trabajo depende del otro.",
  shares_actor: "Ambos flujos de trabajo comparten el mismo responsable.",
  shares_system: "Ambos flujos de trabajo comparten el mismo sistema.",
};

function workflowRelationshipReason(relationship: string): string {
  return (
    WORKFLOW_RELATIONSHIP_REASON_ES[relationship] ??
    `Flujos de trabajo relacionados (${relationship.replace(/_/g, " ")}).`
  );
}

function criticalityFromRisk(
  risk: string | undefined,
): CompanyDependencyCriticality {
  if (risk === "critical") return "critical";
  if (risk === "high") return "high";
  if (risk === "moderate") return "moderate";
  return "low";
}

export function deriveDependencies(
  workspace: CompanyWorkspace,
  workflows: CompanyWorkflowRef[],
  systems: CompanySystem[],
  people: CompanyPerson[],
  evidence: CompanyModelEvidenceRef[],
): CompanyDependency[] {
  const deps: CompanyDependency[] = [];
  const processDeps = workspace.businessProcesses?.dependencies ?? [];
  const consultingRisks =
    workspace.conversationMemory?.consulting?.risks ?? [];

  for (const dep of processDeps) {
    const from = workflows.find((w) => w.processWorkflowId === dep.fromWorkflowId);
    const to = workflows.find((w) => w.processWorkflowId === dep.toWorkflowId);
    if (!from || !to) continue;

    const criticality: CompanyDependencyCriticality =
      dep.relationship === "feeds" || dep.relationship === "depends_on"
        ? "high"
        : "moderate";

    deps.push({
      id: modelId("cdep", dep.id),
      kind: "workflow",
      criticality,
      fromId: from.id,
      fromLabel: from.name,
      toId: to.id,
      toLabel: to.name,
      reason: workflowRelationshipReason(dep.relationship),
      processDependencyId: dep.id,
      consultingRiskId: null,
      confidence: dep.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  // Single-person / hero-operator style risks
  for (const risk of consultingRisks) {
    const severity = criticalityFromRisk(risk.severity);
    if (severity !== "critical" && severity !== "high") continue;

    const personHint = people.find((p) =>
      risk.title.toLowerCase().includes(p.name.toLowerCase()),
    );
    const systemHint = systems.find((s) =>
      risk.title.toLowerCase().includes(s.name.toLowerCase()),
    );

    deps.push({
      id: modelId("cdep", risk.id),
      kind: personHint ? "person" : systemHint ? "system" : "external",
      criticality: severity,
      fromId: workspace.id,
      fromLabel: workspace.companyName,
      toId: personHint?.id ?? systemHint?.id ?? risk.id,
      toLabel: personHint?.name ?? systemHint?.name ?? risk.title,
      reason: risk.businessImpact.slice(0, 160) || risk.title,
      processDependencyId: null,
      consultingRiskId: risk.id,
      confidence: 0.8,
      evidence: [
        {
          source: "consulting",
          id: risk.id,
          label: risk.title,
        },
      ],
    });
  }

  // Bottlenecks that imply missing ownership / excel / whatsapp deps
  for (const bottleneck of workspace.businessProcesses?.bottlenecks ?? []) {
    if (
      bottleneck.kind !== "excel_dependency" &&
      bottleneck.kind !== "whatsapp_dependency" &&
      bottleneck.kind !== "missing_ownership" &&
      bottleneck.kind !== "missing_systems"
    ) {
      continue;
    }
    const wf = workflows.find(
      (w) => w.processWorkflowId === bottleneck.workflowId,
    );
    deps.push({
      id: modelId("cdep", bottleneck.id),
      kind:
        bottleneck.kind === "missing_ownership"
          ? "person"
          : bottleneck.kind === "missing_systems"
            ? "system"
            : "information",
      criticality:
        bottleneck.severity === "critical"
          ? "critical"
          : bottleneck.severity === "high"
            ? "high"
            : "moderate",
      fromId: wf?.id ?? bottleneck.id,
      fromLabel: wf?.name ?? bottleneck.title,
      toId: bottleneck.id,
      toLabel: bottleneck.title,
      reason: bottleneck.businessImpact,
      processDependencyId: null,
      consultingRiskId: bottleneck.consultingRiskId,
      confidence: bottleneck.confidence,
      evidence: [
        {
          source: "process",
          id: bottleneck.id,
          label: bottleneck.title,
        },
      ],
    });
  }

  // Prefer critical/high; keep moderate if few critical
  const ranked = deps.sort((a, b) => {
    const order = { critical: 0, high: 1, moderate: 2, low: 3 };
    return order[a.criticality] - order[b.criticality];
  });

  const critical = ranked.filter(
    (d) => d.criticality === "critical" || d.criticality === "high",
  );
  return (critical.length >= 3 ? critical : ranked).slice(0, 24);
}
