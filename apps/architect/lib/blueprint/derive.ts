import { createId, nowIso } from "@/lib/utils";
import { moduleLabel } from "@/lib/presentation";
import type {
  BlueprintCapability,
  BlueprintCapabilityName,
  BlueprintDepartment,
  BlueprintDepartmentName,
  BlueprintEntity,
  BlueprintEvidenceRef,
  BlueprintModule,
  BlueprintWorkflow,
  BlueprintWorkflowStep,
  BusinessBlueprint,
  CompanyWorkspace,
  FutureArchitecture,
  Interview,
  OperatingRule,
  OpportunityMatrixItem,
  PainPointMatrixItem,
  SystemInventoryItem,
  TimelineEvent,
} from "@/types";

function evidence(
  source: BlueprintEvidenceRef["source"],
  id: string,
  label: string,
): BlueprintEvidenceRef {
  return { source, id, label };
}

/**
 * Derive a new Business Blueprint version from workspace memory + knowledge + interview.
 * Never mutates prior versions — caller appends.
 */
export function deriveBusinessBlueprint(input: {
  workspace: CompanyWorkspace;
  interview?: Interview | null;
  meetingId?: string | null;
  priorVersions: BusinessBlueprint[];
}): BusinessBlueprint {
  const { workspace, interview, meetingId = null } = input;
  const version = nextBlueprintVersion(input.priorVersions);
  const stamp = nowIso();
  const company = workspace.companyName;

  const refs: BlueprintEvidenceRef[] = [
    evidence("memory", workspace.id, `${company} company memory`),
    ...workspace.meetings.slice(0, 3).map((m) =>
      evidence("meeting", m.id, m.title),
    ),
    ...workspace.recommendations.slice(0, 3).map((r) =>
      evidence("recommendation", r.id, r.title),
    ),
    ...workspace.timeline.slice(0, 3).map((t) =>
      evidence("timeline", t.id, t.title),
    ),
    ...(workspace.knowledge?.assets.slice(0, 4).map((a) =>
      evidence("knowledge", a.id, a.title),
    ) ?? []),
  ];

  if (interview) {
    refs.push(
      evidence("reasoning", interview.id, "Discovery interview reasoning"),
    );
  }

  const capabilities = buildCapabilities(workspace, refs);
  const departments = buildDepartments(capabilities, refs);
  const systems = buildSystems(workspace, refs);
  const workflows = buildWorkflows(workspace, systems, refs);
  const entities = buildEntities(workspace, refs);
  const operatingRules = buildRules(workspace, refs);
  const painPoints = buildPainMatrix(workspace, refs);
  const opportunities = buildOpportunities(workspace, capabilities, refs);
  const modules = buildModules(workspace, capabilities);
  const integrations = systems
    .filter((s) => /zoho|sap|crm|erp/i.test(s.name))
    .map((s) => ({
      id: createId("integ"),
      name: s.name,
      purpose: s.purpose,
      status: "current" as const,
      systems: [s.name],
    }));

  const openQuestions = Array.from(
    new Set([
      ...workspace.openQuestions,
      ...(workspace.knowledge?.unknownAreas ?? []),
      ...(interview?.memory.score.stillNeed ?? []),
    ]),
  );

  const currentState = summarizeCurrent(workspace, systems);
  const futureState = summarizeFuture(workspace, modules);

  return {
    id: createId("blueprint"),
    workspaceId: workspace.id,
    version,
    generatedAt: stamp,
    title: `${company} — Blueprint operativo de negocio v${version}`,
    summary: `Blueprint operativo estructurado para ${company} — cómo opera hoy la empresa y cómo debería operar mañana.`,
    currentState,
    futureState,
    capabilities,
    departments,
    roles: deriveRoles(workspace),
    systems,
    workflows,
    entities,
    operatingRules,
    painPoints,
    recommendations: workspace.recommendations.map((r) => r.title),
    opportunities,
    modules,
    integrations,
    risks: interview?.report?.risks ?? workspace.painPoints.map((p) => p.title),
    assumptions: [
      "El blueprint evoluciona con cada sesión de descubrimiento.",
      "La evidencia de Conocimiento y Memoria tiene más peso que la especulación.",
    ],
    openQuestions,
    futureArchitecture: buildFutureArchitecture(workspace, systems, modules),
    evidence: refs,
    meetingId,
    interviewId: interview?.id ?? null,
    superseded: false,
  };
}

export function nextBlueprintVersion(prior: BusinessBlueprint[]): number {
  if (prior.length === 0) return 1;
  return Math.max(...prior.map((b) => b.version)) + 1;
}

export function latestBlueprint(
  blueprints: BusinessBlueprint[] | undefined | null,
): BusinessBlueprint | null {
  if (!blueprints || blueprints.length === 0) return null;
  return [...blueprints]
    .filter((b) => !b.superseded)
    .sort((a, b) => b.version - a.version)[0] ?? null;
}

export function appendBlueprintVersion(
  prior: BusinessBlueprint[],
  next: BusinessBlueprint,
): BusinessBlueprint[] {
  const archived = prior.map((b) =>
    b.version < next.version ? { ...b, superseded: true } : b,
  );
  return [...archived, next].sort((a, b) => b.version - a.version);
}

export function blueprintTimelineEvent(
  blueprint: BusinessBlueprint,
): TimelineEvent {
  return {
    id: createId("timeline"),
    workspaceId: blueprint.workspaceId,
    date: blueprint.generatedAt,
    title: `Blueprint de negocio v${blueprint.version}`,
    description: blueprint.summary,
    category: "blueprint",
    meetingId: blueprint.meetingId ?? undefined,
  };
}

function deriveRoles(workspace: CompanyWorkspace): string[] {
  const roles = workspace.people
    .map((p) => p.role)
    .filter((r): r is string => Boolean(r));
  return Array.from(new Set(roles.length ? roles : ["founder", "operations"]));
}

function buildCapabilities(
  workspace: CompanyWorkspace,
  refs: BlueprintEvidenceRef[],
): BlueprintCapability[] {
  const moduleNames = workspace.modules.map((m) => m.name);
  const whiteboard = workspace.conversationMemory?.whiteboard.potentialModules ?? [];
  const names = Array.from(
    new Set([...moduleNames, ...whiteboard, "Sales", "Customer Management"]),
  );

  const catalog: Partial<
    Record<string, { capability: BlueprintCapabilityName; department: BlueprintDepartmentName }>
  > = {
    Sales: { capability: "Sales", department: "Sales" },
    CRM: { capability: "Customer Management", department: "Sales" },
    Purchasing: { capability: "Purchasing", department: "Purchasing" },
    Production: { capability: "Production", department: "Production" },
    Collections: { capability: "Collections", department: "Finance" },
    Inventory: { capability: "Inventory", department: "Warehouse" },
    Orders: { capability: "Orders", department: "Operations" },
    Logistics: { capability: "Scheduling", department: "Operations" },
    Quality: { capability: "Quality", department: "Production" },
    Projects: { capability: "Reporting", department: "Management" },
    Knowledge: { capability: "Reporting", department: "Management" },
  };

  return names.slice(0, 10).map((name) => {
    const mapped = catalog[name] ?? {
      capability: "Reporting" as BlueprintCapabilityName,
      department: "Operations" as BlueprintDepartmentName,
    };
    const capabilityName = CAPABILITY_SET.has(name as BlueprintCapabilityName)
      ? (name as BlueprintCapabilityName)
      : mapped.capability;

    const pains = workspace.painPoints
      .map((p) => p.title)
      .filter((title) =>
        title.toLowerCase().includes(name.toLowerCase().slice(0, 4)),
      );

    return {
      id: createId("cap"),
      name: capabilityName,
      purpose: `Enable ${capabilityName.toLowerCase()} as a durable operating capability.`,
      owner: workspace.people[0]?.name ?? null,
      department: mapped.department,
      inputs: ["Requests", "Records", "Approvals"],
      outputs: ["Decisions", "Transactions", "Visibility"],
      dependencies: ["Customer Management", "Reporting"].filter(
        (d) => d !== capabilityName,
      ),
      painPoints:
        pains.length > 0
          ? pains
          : workspace.painPoints.slice(0, 2).map((p) => p.title),
      futureOpportunities: [
        `Digitize ${capabilityName.toLowerCase()} workflows`,
        "Reduce manual handoffs",
      ],
      evidence: refs.slice(0, 3),
    };
  });
}

const CAPABILITY_SET = new Set<BlueprintCapabilityName>([
  "Lead Management",
  "Customer Management",
  "Sales",
  "Quoting",
  "Orders",
  "Inventory",
  "Purchasing",
  "Production",
  "Maintenance",
  "Collections",
  "Accounting",
  "Reporting",
  "Approvals",
  "Field Visits",
  "Scheduling",
  "Quality",
  "Support",
  "HR",
  "Security",
  "Notifications",
  "AI Assistant",
]);

function buildDepartments(
  capabilities: BlueprintCapability[],
  refs: BlueprintEvidenceRef[],
): BlueprintDepartment[] {
  const byDept = new Map<BlueprintDepartmentName, string[]>();
  for (const cap of capabilities) {
    if (!cap.department) continue;
    const list = byDept.get(cap.department) ?? [];
    list.push(cap.id);
    byDept.set(cap.department, list);
  }

  return [...byDept.entries()].map(([name, capabilityIds]) => ({
    id: createId("dept"),
    name,
    purpose: `${name} owns related operating capabilities.`,
    capabilityIds,
    headcountHint: null,
    evidence: refs.slice(0, 2),
  }));
}

function buildSystems(
  workspace: CompanyWorkspace,
  refs: BlueprintEvidenceRef[],
): SystemInventoryItem[] {
  const tools = Array.from(
    new Set([
      ...(workspace.conversationMemory?.summary.currentSoftware ?? []),
      ...(workspace.conversationMemory?.whiteboard.currentSystems ?? []),
      ...workspace.knowledge.entities
        .filter((e) => e.kind === "System")
        .map((e) => e.name),
      "Excel",
      "WhatsApp",
    ]),
  );

  return tools.map((name) => ({
    id: createId("sys"),
    name,
    purpose: `Currently supports day-to-day work via ${name}.`,
    strengths: name === "Excel" ? ["Flexible", "Familiar"] : ["Fast communication"],
    weaknesses:
      name === "Excel"
        ? ["No single source of truth", "Version drift"]
        : name === "WhatsApp"
          ? ["History is personal", "Not searchable as a system of record"]
          : ["Limited process control"],
    replacementStrategy:
      name === "Excel" || name === "WhatsApp"
        ? "Absorb into ISALWA modules while retaining familiar habits during transition."
        : "Integrate or phase out based on capability coverage.",
    evidence: refs.slice(0, 2),
  }));
}

function buildWorkflows(
  workspace: CompanyWorkspace,
  systems: SystemInventoryItem[],
  refs: BlueprintEvidenceRef[],
): BlueprintWorkflow[] {
  const systemNames = systems.map((s) => s.name);
  const pains = workspace.painPoints.map((p) => p.title);

  const purchasingSteps: BlueprintWorkflowStep[] = [
    step("Request raised", "Requester", "Need", "Purchase request", true, "medium"),
    step("Quotes collected", "Purchasing", "Request", "Quotations", true, "high"),
    step("Approval", "Manager", "Quotations", "Approved PO intent", true, "high"),
    step("Order placed", "Purchasing", "Approval", "Purchase order", true, "medium"),
  ];

  const salesSteps: BlueprintWorkflowStep[] = [
    step("Lead / inquiry", "Advisor", "Customer message", "Opportunity", true, "medium"),
    step("Quote", "Advisor", "Opportunity", "Quote", true, "high"),
    step("Close", "Advisor", "Quote", "Order", true, "medium"),
  ];

  return [
    {
      id: createId("wf"),
      name: "Sales to Order",
      owner: "Sales",
      trigger: "Customer inquiry",
      steps: salesSteps,
      participants: ["Sales advisor", "Customer"],
      systems: systemNames.filter((n) => /whatsapp|excel|crm/i.test(n)),
      painPoints: pains.filter((p) => /sales|whatsapp|excel|customer/i.test(p)),
      exceptions: ["Verbal commitments without written quote"],
      outputs: ["Quote", "Order"],
      metrics: ["Time to quote", "Win rate"],
      evidence: refs.slice(0, 3),
    },
    {
      id: createId("wf"),
      name: "Purchasing Approvals",
      owner: "Purchasing",
      trigger: "Material or service need",
      steps: purchasingSteps,
      participants: ["Requester", "Purchasing", "Approver"],
      systems: systemNames.filter((n) => /excel|email|paper/i.test(n)),
      painPoints: pains.filter((p) => /purchas|approv|manual/i.test(p)),
      exceptions: ["Urgent buys bypass quotations"],
      outputs: ["Purchase order", "Approval trail"],
      metrics: ["Approval cycle time", "Policy compliance"],
      evidence: refs.slice(0, 3),
    },
  ];
}

function step(
  name: string,
  actor: string,
  input: string,
  output: string,
  manual: boolean,
  automationPotential: BlueprintWorkflowStep["automationPotential"],
): BlueprintWorkflowStep {
  return {
    id: createId("step"),
    name,
    actor,
    input,
    output,
    decision: null,
    systemUsed: manual ? "Manual / chat / spreadsheet" : null,
    manual,
    estimatedTime: null,
    painPoints: manual ? ["Manual handoff"] : [],
    automationPotential,
  };
}

function buildEntities(
  workspace: CompanyWorkspace,
  refs: BlueprintEvidenceRef[],
): BlueprintEntity[] {
  const fromKnowledge = workspace.knowledge.entities
    .filter((e) =>
      ["Customer", "Supplier", "Product", "Person", "Document"].includes(e.kind),
    )
    .map((e) => ({
      id: createId("bent"),
      name: e.name,
      purpose: e.summary ?? `${e.kind} in the operating model.`,
      relationships: [],
      lifecycle: ["Created", "Active", "Closed"],
      owner: null,
      evidence: [evidence("knowledge", e.id, e.name), ...refs.slice(0, 1)],
    }));

  const defaults: BlueprintEntity[] = [
    entity("Customer", "Who the company sells to and serves.", refs),
    entity("Quote", "Commercial offer before order confirmation.", refs),
    entity("Invoice", "Request for payment against delivered work.", refs),
    entity("Purchase Order", "Commitment to buy from a supplier.", refs),
    entity("Product", "What the company makes or sells.", refs),
  ];

  return [...fromKnowledge, ...defaults].slice(0, 8);
}

function entity(
  name: string,
  purpose: string,
  refs: BlueprintEvidenceRef[],
): BlueprintEntity {
  return {
    id: createId("bent"),
    name,
    purpose,
    relationships: [],
    lifecycle: ["Created", "Active", "Archived"],
    owner: null,
    evidence: refs.slice(0, 2),
  };
}

function buildRules(
  workspace: CompanyWorkspace,
  refs: BlueprintEvidenceRef[],
): OperatingRule[] {
  const rules: OperatingRule[] = [];
  if (workspace.painPoints.some((p) => /purchas|approv/i.test(p.title))) {
    rules.push({
      id: createId("rule"),
      statement:
        "Purchases above a materiality threshold require multiple quotations and managerial approval.",
      domain: "Purchasing",
      enforcement: "policy",
      evidence: refs.slice(0, 2),
    });
  }
  if (workspace.painPoints.some((p) => /collection|credit|invoice/i.test(p.title))) {
    rules.push({
      id: createId("rule"),
      statement: "Collections follow-up begins after invoice aging thresholds.",
      domain: "Finance",
      enforcement: "informal",
      evidence: refs.slice(0, 2),
    });
  }
  if (rules.length === 0) {
    rules.push({
      id: createId("rule"),
      statement:
        "Operating rules will be captured as discovery and knowledge deepen.",
      domain: "General",
      enforcement: "unknown",
      evidence: refs.slice(0, 1),
    });
  }
  return rules;
}

function buildPainMatrix(
  workspace: CompanyWorkspace,
  refs: BlueprintEvidenceRef[],
): PainPointMatrixItem[] {
  return workspace.painPoints.map((pain) => ({
    id: createId("bpm"),
    category: categorizePain(pain.title),
    title: pain.title,
    description: pain.description,
    severity: pain.severity,
    evidence: [
      evidence("memory", pain.id, pain.title),
      ...refs.slice(0, 1),
    ],
  }));
}

function categorizePain(title: string): PainPointMatrixItem["category"] {
  const t = title.toLowerCase();
  if (/whatsapp|email|chat|communicat/i.test(t)) return "Communication";
  if (/excel|data|history|crm/i.test(t)) return "Data";
  if (/sales|customer|quote|commercial/i.test(t)) return "Commercial";
  if (/invoice|collect|credit|finance|purchas/i.test(t)) return "Financial";
  if (/approv|policy|compliance/i.test(t)) return "Compliance";
  if (/system|software|sap|zoho/i.test(t)) return "Technology";
  if (/management|handoff|ownership/i.test(t)) return "Management";
  return "Operational";
}

function buildOpportunities(
  workspace: CompanyWorkspace,
  capabilities: BlueprintCapability[],
  refs: BlueprintEvidenceRef[],
): OpportunityMatrixItem[] {
  const items: OpportunityMatrixItem[] = workspace.opportunities
    .slice(0, 4)
    .map((opp, index) => ({
      id: createId("opp"),
      horizon:
        index === 0
          ? "Quick Wins"
          : index === 1
            ? "30-day Projects"
            : index === 2
              ? "90-day Projects"
              : "Strategic Initiatives",
      title: opp.title,
      description: opp.description,
      relatedCapabilityIds: capabilities.slice(0, 2).map((c) => c.id),
      evidence: refs.slice(0, 2),
    }));

  if (items.length === 0) {
    items.push({
      id: createId("opp"),
      horizon: "Quick Wins",
      title: "Centralize customer history",
      description:
        "Move critical commercial context out of personal chat into a shared system.",
      relatedCapabilityIds: capabilities.slice(0, 1).map((c) => c.id),
      evidence: refs.slice(0, 2),
    });
    items.push({
      id: createId("opp"),
      horizon: "Strategic Initiatives",
      title: "Business OS foundation",
      description:
        "Establish core modules that replace spreadsheet-and-chat operating modes.",
      relatedCapabilityIds: capabilities.map((c) => c.id),
      evidence: refs.slice(0, 2),
    });
  }

  return items;
}

function buildModules(
  workspace: CompanyWorkspace,
  capabilities: BlueprintCapability[],
): BlueprintModule[] {
  if (workspace.modules.length > 0) {
    return workspace.modules.map((mod, index) => ({
      id: mod.id,
      name: mod.name,
      purpose: mod.purpose,
      priority: mod.priority,
      capabilityIds: capabilities.slice(index, index + 2).map((c) => c.id),
    }));
  }

  return capabilities.slice(0, 4).map((cap, index) => ({
    id: createId("bmod"),
    name: cap.name,
    purpose: cap.purpose,
    priority: index < 2 ? "core" : "supporting",
    capabilityIds: [cap.id],
  }));
}

function summarizeCurrent(
  workspace: CompanyWorkspace,
  systems: SystemInventoryItem[],
): string {
  const tools = systems.map((s) => s.name).slice(0, 4).join(", ");
  const pains = workspace.painPoints
    .map((p) => p.title)
    .slice(0, 3)
    .join("; ");
  return `Hoy ${workspace.companyName} opera con ${tools || "herramientas informales"}.${pains ? ` Fricciones clave: ${pains}.` : ""}`;
}

function summarizeFuture(
  workspace: CompanyWorkspace,
  modules: BlueprintModule[],
): string {
  const mods = modules.map((m) => moduleLabel(m.name)).slice(0, 5).join(", ");
  return `El modelo operativo futuro se centra en ${mods || "los módulos centrales de ISALWA"}, con dueños claros, registros duraderos y menos traspasos manuales.`;
}

function buildFutureArchitecture(
  workspace: CompanyWorkspace,
  systems: SystemInventoryItem[],
  modules: BlueprintModule[],
): FutureArchitecture {
  return {
    current: {
      horizon: "current",
      summary: summarizeCurrent(workspace, systems),
      systems: systems.map((s) => s.name),
      capabilities: workspace.modules.map((m) => m.name),
      notes: workspace.painPoints.slice(0, 3).map((p) => p.title),
    },
    transition: {
      horizon: "transition",
      summary:
        "Estabilizar registros, digitalizar aprobaciones e introducir una verdad compartida de clientes/pedidos mientras las herramientas actuales siguen en uso.",
      systems: [...systems.map((s) => s.name), "ISALWA (piloto)"],
      capabilities: modules.slice(0, 3).map((m) => m.name),
      notes: [
        "Operar en paralelo los procesos críticos",
        "Capacitar a los dueños de cada proceso",
        "Retirar gradualmente los registros personales",
      ],
    },
    future: {
      horizon: "future",
      summary: summarizeFuture(workspace, modules),
      systems: ["ISALWA OS", ...systems.filter((s) => /sap|zoho|erp/i.test(s.name)).map((s) => s.name)],
      capabilities: modules.map((m) => m.name),
      notes: [
        "Una sola verdad operativa",
        "Aprobaciones automatizadas donde la política lo permita",
        "Asistente de IA sobre datos duraderos",
      ],
    },
  };
}
