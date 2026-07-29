import type {
  CompanyDepartment,
  CompanyInformationFlow,
  CompanyInformationNode,
  CompanyModelEvidenceRef,
  CompanyPerson,
  CompanyWorkflowRef,
  CompanyWorkspace,
} from "@/types";
import { departmentLabel } from "@/lib/presentation";
import { departmentByName } from "./departments";
import { modelId } from "./ids";

export function deriveInformationNodes(
  workspace: CompanyWorkspace,
  departments: CompanyDepartment[],
  workflows: CompanyWorkflowRef[],
  evidence: CompanyModelEvidenceRef[],
): CompanyInformationNode[] {
  const nodes: CompanyInformationNode[] = [];
  const docs = workspace.businessProcesses?.documents ?? [];

  for (const doc of docs) {
    const wf = workflows.find((w) => w.processWorkflowId === doc.workflowId);
    nodes.push({
      id: modelId("cinfo", doc.id),
      name: doc.name,
      role: doc.role,
      processDocumentId: doc.id,
      workflowIds: wf ? [wf.id] : [],
      producerDepartmentId: wf?.departmentId ?? null,
      consumerDepartmentIds: wf?.departmentId ? [wf.departmentId] : [],
      confidence: doc.confidence,
      evidence: evidence.slice(0, 2),
    });
  }

  // Handoff required information as nodes
  for (const handoff of workspace.businessProcesses?.handoffs ?? []) {
    for (const info of handoff.requiredInformation) {
      const key = `${handoff.id}_${info}`;
      const wf = workflows.find((w) => w.processWorkflowId === handoff.workflowId);
      nodes.push({
        id: modelId("cinfo", key),
        name: info,
        role: "handoff",
        processDocumentId: null,
        workflowIds: wf ? [wf.id] : [],
        producerDepartmentId:
          departmentByName(departments, handoff.from)?.id ??
          wf?.departmentId ??
          null,
        consumerDepartmentIds: [
          departmentByName(departments, handoff.to)?.id,
        ].filter((id): id is string => Boolean(id)),
        confidence: handoff.confidence,
        evidence: [
          {
            source: "process",
            id: handoff.id,
            label: info,
          },
        ],
      });
    }
  }

  // Deduplicate by lowercase name + role within same workflow
  const seen = new Set<string>();
  return nodes.filter((n) => {
    const key = `${n.name.toLowerCase()}:${n.role}:${n.workflowIds[0] ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function deriveInformationFlows(
  workspace: CompanyWorkspace,
  departments: CompanyDepartment[],
  people: CompanyPerson[],
  workflows: CompanyWorkflowRef[],
  information: CompanyInformationNode[],
  evidence: CompanyModelEvidenceRef[],
): CompanyInformationFlow[] {
  const flows: CompanyInformationFlow[] = [];

  for (const handoff of workspace.businessProcesses?.handoffs ?? []) {
    const wf = workflows.find((w) => w.processWorkflowId === handoff.workflowId);
    const fromPerson = people.find(
      (p) => p.name.toLowerCase() === handoff.from.toLowerCase(),
    );
    const toPerson = people.find(
      (p) => p.name.toLowerCase() === handoff.to.toLowerCase(),
    );
    const fromDept = departmentByName(departments, handoff.from);
    const toDept = departmentByName(departments, handoff.to);

    const fromId = fromPerson?.id ?? fromDept?.id ?? modelId("actor", handoff.from);
    const toId = toPerson?.id ?? toDept?.id ?? modelId("actor", handoff.to);
    const fromLabel =
      fromPerson?.name ?? (fromDept ? departmentLabel(fromDept.name) : null) ?? handoff.from;
    const toLabel =
      toPerson?.name ?? (toDept ? departmentLabel(toDept.name) : null) ?? handoff.to;

    const informationIds = information
      .filter(
        (n) =>
          n.role === "handoff" &&
          handoff.requiredInformation.some(
            (r) => r.toLowerCase() === n.name.toLowerCase(),
          ),
      )
      .map((n) => n.id);

    flows.push({
      id: modelId("ciflow", handoff.id),
      name: `${fromLabel} → ${toLabel}`,
      fromId,
      fromLabel,
      toId,
      toLabel,
      informationIds,
      workflowId: wf?.id ?? null,
      processHandoffId: handoff.id,
      missingInformation: [...handoff.missingInformation],
      risk: handoff.risk,
      confidence: handoff.confidence,
      evidence: [
        {
          source: "process",
          id: handoff.id,
          label: `${handoff.from} → ${handoff.to}`,
        },
        ...evidence.slice(0, 1),
      ],
    });
  }

  return flows;
}
