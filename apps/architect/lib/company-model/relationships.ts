import type {
  BusinessBlueprint,
  CompanyDepartment,
  CompanyModelEvidenceRef,
  CompanyOwnership,
  CompanyParty,
  CompanyPerson,
  CompanyProduct,
  CompanyRelationship,
  CompanyRelationshipKind,
  CompanySystem,
  CompanyWorkflowRef,
  CompanyWorkspace,
  KnowledgeRelationKind,
} from "@/types";
import { departmentByName } from "./departments";
import { modelId } from "./ids";

const KNOWLEDGE_KIND_MAP: Record<KnowledgeRelationKind, CompanyRelationshipKind> =
  {
    Uses: "uses",
    DependsOn: "depends_on",
    ReportsTo: "reports_to",
    Owns: "owns",
    Approves: "approves",
    Produces: "produces",
    Purchases: "purchases",
    CommunicatesWith: "communicates_with",
  };

export function derivePartiesAndProducts(
  workspace: CompanyWorkspace,
  evidence: CompanyModelEvidenceRef[],
): {
  customers: CompanyParty[];
  suppliers: CompanyParty[];
  products: CompanyProduct[];
} {
  const entities = workspace.knowledge?.entities ?? [];
  const solutionEntities = workspace.solutionArchitecture?.entities ?? [];

  const customers: CompanyParty[] = entities
    .filter((e) => e.kind === "Customer")
    .map((e) => ({
      id: modelId("ccust", e.id),
      kind: "customer" as const,
      name: e.name,
      knowledgeEntityId: e.id,
      solutionEntityId:
        solutionEntities.find((s) => s.name === "Customer")?.id ?? null,
      relatedWorkflowIds: [],
      confidence: e.confidence,
      evidence: [
        { source: "knowledge" as const, id: e.id, label: e.name },
        ...evidence.slice(0, 1),
      ],
    }));

  const suppliers: CompanyParty[] = entities
    .filter((e) => e.kind === "Supplier")
    .map((e) => ({
      id: modelId("csup", e.id),
      kind: "supplier" as const,
      name: e.name,
      knowledgeEntityId: e.id,
      solutionEntityId:
        solutionEntities.find((s) => s.name === "Supplier")?.id ?? null,
      relatedWorkflowIds: [],
      confidence: e.confidence,
      evidence: [
        { source: "knowledge" as const, id: e.id, label: e.name },
        ...evidence.slice(0, 1),
      ],
    }));

  // Ensure conceptual Customer/Supplier appear when solution names them but knowledge is empty
  if (
    customers.length === 0 &&
    solutionEntities.some((s) => s.name === "Customer")
  ) {
    const se = solutionEntities.find((s) => s.name === "Customer")!;
    customers.push({
      id: modelId("ccust", se.id),
      kind: "customer",
      name: "Customer",
      knowledgeEntityId: null,
      solutionEntityId: se.id,
      relatedWorkflowIds: [],
      confidence: se.confidence * 0.7,
      evidence: evidence.slice(0, 2),
    });
  }

  if (
    suppliers.length === 0 &&
    solutionEntities.some((s) => s.name === "Supplier")
  ) {
    const se = solutionEntities.find((s) => s.name === "Supplier")!;
    suppliers.push({
      id: modelId("csup", se.id),
      kind: "supplier",
      name: "Supplier",
      knowledgeEntityId: null,
      solutionEntityId: se.id,
      relatedWorkflowIds: [],
      confidence: se.confidence * 0.7,
      evidence: evidence.slice(0, 2),
    });
  }

  const products: CompanyProduct[] = entities
    .filter((e) => e.kind === "Product")
    .map((e) => ({
      id: modelId("cprod", e.id),
      name: e.name,
      knowledgeEntityId: e.id,
      entityId: e.id,
      confidence: e.confidence,
      evidence: [
        { source: "knowledge" as const, id: e.id, label: e.name },
      ],
    }));

  return { customers, suppliers, products };
}

export function deriveWorkflowRefs(
  workspace: CompanyWorkspace,
  blueprint: BusinessBlueprint,
  departments: CompanyDepartment[],
  people: CompanyPerson[],
  evidence: CompanyModelEvidenceRef[],
): CompanyWorkflowRef[] {
  const processWorkflows = workspace.businessProcesses?.workflows ?? [];
  if (processWorkflows.length > 0) {
    return processWorkflows.map((wf) => {
      const department = departmentByName(departments, wf.department);
      const ownerPerson =
        people.find(
          (p) =>
            wf.owner &&
            p.name.toLowerCase() === wf.owner.toLowerCase(),
        ) ?? null;
      const actorPersonIds = people
        .filter(
          (p) =>
            p.processActorId &&
            wf.actorIds.includes(p.processActorId),
        )
        .map((p) => p.id);

      return {
        id: modelId("cwf", wf.id),
        name: wf.name,
        processWorkflowId: wf.id,
        blueprintWorkflowId: wf.blueprintWorkflowId,
        departmentId: department?.id ?? null,
        ownerPersonId: ownerPerson?.id ?? null,
        systemIds: [],
        actorPersonIds,
        confidence: wf.confidence,
        evidence: evidence.slice(0, 2),
      };
    });
  }

  return blueprint.workflows.map((wf) => ({
    id: modelId("cwf", wf.id),
    name: wf.name,
    processWorkflowId: null,
    blueprintWorkflowId: wf.id,
    departmentId: null,
    ownerPersonId:
      people.find(
        (p) => wf.owner && p.name.toLowerCase() === wf.owner.toLowerCase(),
      )?.id ?? null,
    systemIds: [],
    actorPersonIds: [],
    confidence: 0.7,
    evidence: [
      {
        source: "blueprint",
        id: wf.id,
        label: wf.name,
      },
    ],
  }));
}

export function deriveOwnership(
  blueprint: BusinessBlueprint,
  departments: CompanyDepartment[],
  people: CompanyPerson[],
  systems: CompanySystem[],
  workflows: CompanyWorkflowRef[],
  evidence: CompanyModelEvidenceRef[],
): CompanyOwnership[] {
  const ownership: CompanyOwnership[] = [];

  for (const capability of blueprint.capabilities) {
    if (!capability.owner && !capability.department) continue;
    const department = departmentByName(departments, capability.department);
    const ownerPerson = people.find(
      (p) =>
        capability.owner &&
        p.name.toLowerCase() === capability.owner.toLowerCase(),
    );
    ownership.push({
      id: modelId("cown", capability.id),
      kind: "department_capability",
      ownerLabel: capability.owner ?? capability.department ?? "Unknown",
      ownerPersonId: ownerPerson?.id ?? null,
      ownerDepartmentId: department?.id ?? null,
      ownerRoleId: null,
      targetId: capability.id,
      targetLabel: capability.name,
      confidence: 0.8,
      evidence: evidence.slice(0, 2),
    });
  }

  for (const wf of workflows) {
    if (!wf.ownerPersonId && !wf.departmentId) continue;
    const person = people.find((p) => p.id === wf.ownerPersonId);
    const dept = departments.find((d) => d.id === wf.departmentId);
    ownership.push({
      id: modelId("cown", wf.id),
      kind: "workflow",
      ownerLabel: person?.name ?? dept?.name ?? "Unknown",
      ownerPersonId: wf.ownerPersonId,
      ownerDepartmentId: wf.departmentId,
      ownerRoleId: null,
      targetId: wf.id,
      targetLabel: wf.name,
      confidence: 0.75,
      evidence: evidence.slice(0, 1),
    });
  }

  for (const system of systems) {
    if (system.departmentIds.length === 0) continue;
    const dept = departments.find((d) => d.id === system.departmentIds[0]);
    ownership.push({
      id: modelId("cown", system.id),
      kind: "system",
      ownerLabel: dept?.name ?? "Operations",
      ownerPersonId: null,
      ownerDepartmentId: dept?.id ?? null,
      ownerRoleId: null,
      targetId: system.id,
      targetLabel: system.name,
      confidence: 0.6,
      evidence: evidence.slice(0, 1),
    });
  }

  return ownership;
}

export function deriveRelationships(
  workspace: CompanyWorkspace,
  departments: CompanyDepartment[],
  people: CompanyPerson[],
  systems: CompanySystem[],
  workflows: CompanyWorkflowRef[],
  evidence: CompanyModelEvidenceRef[],
): CompanyRelationship[] {
  const relationships: CompanyRelationship[] = [];
  const knowledgeRels = workspace.knowledge?.relationships ?? [];
  const entityById = new Map(
    (workspace.knowledge?.entities ?? []).map((e) => [e.id, e]),
  );

  for (const rel of knowledgeRels) {
    const from = entityById.get(rel.fromEntityId);
    const to = entityById.get(rel.toEntityId);
    if (!from || !to) continue;
    relationships.push({
      id: modelId("crel", rel.id),
      kind: KNOWLEDGE_KIND_MAP[rel.kind],
      fromId: rel.fromEntityId,
      fromLabel: from.name,
      toId: rel.toEntityId,
      toLabel: to.name,
      knowledgeRelationshipId: rel.id,
      processHandoffId: null,
      label: rel.label || rel.kind,
      confidence: rel.confidence,
      evidence: [
        {
          source: "knowledge",
          id: rel.id,
          label: rel.label || `${from.name} → ${to.name}`,
        },
      ],
    });
  }

  // Person belongs_to department
  for (const person of people) {
    if (!person.departmentId) continue;
    const dept = departments.find((d) => d.id === person.departmentId);
    if (!dept) continue;
    relationships.push({
      id: modelId("crel", `${person.id}_dept`),
      kind: "belongs_to",
      fromId: person.id,
      fromLabel: person.name,
      toId: dept.id,
      toLabel: dept.name,
      knowledgeRelationshipId: null,
      processHandoffId: null,
      label: "Belongs to",
      confidence: 0.85,
      evidence: evidence.slice(0, 1),
    });
  }

  // Department uses systems
  for (const system of systems) {
    for (const deptId of system.departmentIds) {
      const dept = departments.find((d) => d.id === deptId);
      if (!dept) continue;
      relationships.push({
        id: modelId("crel", `${dept.id}_${system.id}`),
        kind: "uses",
        fromId: dept.id,
        fromLabel: dept.name,
        toId: system.id,
        toLabel: system.name,
        knowledgeRelationshipId: null,
        processHandoffId: null,
        label: "Uses",
        confidence: 0.7,
        evidence: evidence.slice(0, 1),
      });
    }
  }

  // Handoffs → hands_off_to
  for (const handoff of workspace.businessProcesses?.handoffs ?? []) {
    const wf = workflows.find((w) => w.processWorkflowId === handoff.workflowId);
    relationships.push({
      id: modelId("crel", handoff.id),
      kind: "hands_off_to",
      fromId: modelId("actor", handoff.from),
      fromLabel: handoff.from,
      toId: modelId("actor", handoff.to),
      toLabel: handoff.to,
      knowledgeRelationshipId: null,
      processHandoffId: handoff.id,
      label: wf ? `Handoff in ${wf.name}` : "Process handoff",
      confidence: handoff.confidence,
      evidence: [
        {
          source: "process",
          id: handoff.id,
          label: `${handoff.from} → ${handoff.to}`,
        },
      ],
    });
  }

  return relationships;
}
