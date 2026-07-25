import type {
  BusinessBlueprint,
  CompanyWorkspace,
  SolutionEvidenceRef,
  SolutionModule,
  SolutionModuleName,
} from "@/types";
import { createId } from "@/lib/utils";

interface ModuleRule {
  name: SolutionModuleName;
  purpose: string;
  dependencies: SolutionModuleName[];
  futureExpansion: string[];
  match: (ctx: string) => boolean;
  confidence: number;
}

function blob(blueprint: BusinessBlueprint, workspace: CompanyWorkspace): string {
  return [
    ...blueprint.capabilities.map((c) => c.name),
    ...blueprint.modules.map((m) => m.name),
    ...blueprint.painPoints.map((p) => p.title),
    ...blueprint.systems.map((s) => s.name),
    ...blueprint.workflows.map((w) => w.name),
    ...workspace.modules.map((m) => m.name),
    ...workspace.painPoints.map((p) => p.title),
    ...(workspace.knowledge?.themes ?? []),
  ]
    .join(" ")
    .toLowerCase();
}

const RULES: ModuleRule[] = [
  {
    name: "CRM",
    purpose: "Single customer record and commercial history.",
    dependencies: [],
    futureExpansion: ["Account hierarchies", "Activity timelines"],
    match: (t) => /crm|customer|whatsapp|sales/i.test(t),
    confidence: 0.88,
  },
  {
    name: "Sales",
    purpose: "Pipeline, quoting, and order capture.",
    dependencies: ["CRM"],
    futureExpansion: ["Price lists", "Commission tracking"],
    match: (t) => /sales|quot|order|commercial/i.test(t),
    confidence: 0.9,
  },
  {
    name: "Purchasing",
    purpose: "Requests, quotations, and purchase orders.",
    dependencies: ["Approvals"],
    futureExpansion: ["Supplier scorecards"],
    match: (t) => /purchas|supplier|po\b/i.test(t),
    confidence: 0.86,
  },
  {
    name: "Inventory",
    purpose: "Stock truth and movement visibility.",
    dependencies: [],
    futureExpansion: ["Multi-warehouse", "Lot tracking"],
    match: (t) => /inventory|warehouse|stock/i.test(t),
    confidence: 0.84,
  },
  {
    name: "Production",
    purpose: "Work orders and shop-floor coordination.",
    dependencies: ["Inventory"],
    futureExpansion: ["BOM versions", "Capacity planning"],
    match: (t) => /production|manufactur|shop floor|work order/i.test(t),
    confidence: 0.85,
  },
  {
    name: "Maintenance",
    purpose: "Asset upkeep plans and work requests.",
    dependencies: ["Assets"],
    futureExpansion: ["Preventive schedules"],
    match: (t) => /maintenance|machine|equipment/i.test(t),
    confidence: 0.8,
  },
  {
    name: "Finance",
    purpose: "Invoicing and financial controls.",
    dependencies: ["Sales"],
    futureExpansion: ["Accounting export"],
    match: (t) => /finance|invoice|accounting/i.test(t),
    confidence: 0.82,
  },
  {
    name: "Collections",
    purpose: "Receivables follow-up and aging.",
    dependencies: ["Finance"],
    futureExpansion: ["Payment plans"],
    match: (t) => /collection|receivable|aging|payment/i.test(t),
    confidence: 0.8,
  },
  {
    name: "HR",
    purpose: "People records and role assignment.",
    dependencies: [],
    futureExpansion: ["Time tracking"],
    match: (t) => /\bhr\b|employee|people|team/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Projects",
    purpose: "Delivery work packaging and status.",
    dependencies: [],
    futureExpansion: ["Resource planning"],
    match: (t) => /project|delivery|engagement/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Customer Service",
    purpose: "Support tickets and customer care.",
    dependencies: ["CRM"],
    futureExpansion: ["SLA policies"],
    match: (t) => /support|service|ticket/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Compliance",
    purpose: "Policy adherence and auditability.",
    dependencies: ["Documents", "Approvals"],
    futureExpansion: ["Policy versions"],
    match: (t) => /compliance|audit|policy/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Analytics",
    purpose: "Trusted operational and commercial reporting.",
    dependencies: [],
    futureExpansion: ["Executive command center"],
    match: (t) => /report|analytics|visibility|dashboard/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Documents",
    purpose: "Controlled document store for evidence and SOPs.",
    dependencies: [],
    futureExpansion: ["Versioning", "e-sign"],
    match: (t) => /document|sop|pdf|policy/i.test(t),
    confidence: 0.76,
  },
  {
    name: "Assets",
    purpose: "Track owned equipment and asset lifecycle.",
    dependencies: [],
    futureExpansion: ["Depreciation hooks"],
    match: (t) => /asset|machine|equipment|fleet/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Fleet",
    purpose: "Vehicle and route operations.",
    dependencies: ["Assets"],
    futureExpansion: ["Telemetry"],
    match: (t) => /fleet|vehicle|truck/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Scheduling",
    purpose: "Allocate people, jobs, and capacity over time.",
    dependencies: [],
    futureExpansion: ["Optimization"],
    match: (t) => /schedul|dispatch|calendar/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Field Service",
    purpose: "Visits, field tasks, and on-site work.",
    dependencies: ["CRM", "Scheduling"],
    futureExpansion: ["Offline sync"],
    match: (t) => /field|visit|technician/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Approvals",
    purpose: "Thresholded decisions with audit trail.",
    dependencies: [],
    futureExpansion: ["Multi-step policies"],
    match: (t) => /approv|manual approv/i.test(t),
    confidence: 0.88,
  },
  {
    name: "Notifications",
    purpose: "Operational alerts and reminders.",
    dependencies: [],
    futureExpansion: ["Channel preferences"],
    match: (t) => /notif|alert|remind|whatsapp|message/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Knowledge",
    purpose: "Company memory and searchable evidence.",
    dependencies: ["Documents"],
    futureExpansion: ["Process maps"],
    match: (t) => /knowledge|document|sop|tribal/i.test(t),
    confidence: 0.75,
  },
  {
    name: "AI Assistant",
    purpose: "Assist on durable data — never become the source of truth.",
    dependencies: ["Knowledge", "CRM"],
    futureExpansion: ["Exception summarization"],
    match: (t) => /ai|assistant|automat/i.test(t),
    confidence: 0.55,
  },
];

export function detectModules(
  blueprint: BusinessBlueprint,
  workspace: CompanyWorkspace,
  evidence: SolutionEvidenceRef[],
): SolutionModule[] {
  const text = blob(blueprint, workspace);
  const detected: SolutionModule[] = [];

  for (const rule of RULES) {
    if (!rule.match(text)) continue;
    detected.push({
      id: createId("smod"),
      name: rule.name,
      purpose: rule.purpose,
      confidence: rule.confidence,
      evidence: evidence.slice(0, 3),
      dependencies: rule.dependencies,
      futureExpansion: rule.futureExpansion,
    });
  }

  // Always include Approvals + Notifications when any commercial/ops module exists
  if (
    detected.some((m) => ["Sales", "Purchasing", "Finance"].includes(m.name)) &&
    !detected.some((m) => m.name === "Approvals")
  ) {
    const approvals = RULES.find((r) => r.name === "Approvals");
    if (approvals) {
      detected.push({
        id: createId("smod"),
        name: "Approvals",
        purpose: approvals.purpose,
        confidence: 0.7,
        evidence: evidence.slice(0, 2),
        dependencies: [],
        futureExpansion: approvals.futureExpansion,
      });
    }
  }

  return detected;
}
