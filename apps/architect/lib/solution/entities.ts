import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  CompanyWorkspace,
  SolutionEntity,
  SolutionEntityName,
  SolutionEvidenceRef,
  SolutionModule,
  SolutionModuleName,
} from "@/types";

interface EntityRule {
  name: SolutionEntityName;
  purpose: string;
  owningModule: SolutionModuleName | null;
  requires: (modules: Set<SolutionModuleName>, text: string) => boolean;
  confidence: number;
}

const RULES: EntityRule[] = [
  {
    name: "Customer",
    purpose: "Who the company sells to and serves.",
    owningModule: "CRM",
    requires: (m) => m.has("CRM") || m.has("Sales"),
    confidence: 0.92,
  },
  {
    name: "Contact",
    purpose: "People related to a customer account.",
    owningModule: "CRM",
    requires: (m) => m.has("CRM"),
    confidence: 0.84,
  },
  {
    name: "Location",
    purpose: "Sites, plants, warehouses, or customer locations.",
    owningModule: "CRM",
    requires: (m, t) => m.has("CRM") || /location|warehouse|plant|city/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Quote",
    purpose: "Commercial offer before order confirmation.",
    owningModule: "Sales",
    requires: (m) => m.has("Sales"),
    confidence: 0.88,
  },
  {
    name: "Order",
    purpose: "Confirmed commercial commitment to deliver.",
    owningModule: "Sales",
    requires: (m) => m.has("Sales"),
    confidence: 0.9,
  },
  {
    name: "Invoice",
    purpose: "Request for payment against delivered work.",
    owningModule: "Finance",
    requires: (m) => m.has("Finance") || m.has("Collections"),
    confidence: 0.86,
  },
  {
    name: "Payment",
    purpose: "Cash application against invoices.",
    owningModule: "Collections",
    requires: (m) => m.has("Collections") || m.has("Finance"),
    confidence: 0.82,
  },
  {
    name: "Visit",
    purpose: "Field or commercial visit record.",
    owningModule: "Field Service",
    requires: (m) => m.has("Field Service"),
    confidence: 0.8,
  },
  {
    name: "Task",
    purpose: "Assignable unit of work.",
    owningModule: "Projects",
    requires: (m) => m.has("Projects") || m.has("Scheduling") || m.has("Field Service"),
    confidence: 0.7,
  },
  {
    name: "Message",
    purpose: "Captured communication related to work or customers.",
    owningModule: "Notifications",
    requires: (m, t) => m.has("Notifications") || /whatsapp|message/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Purchase Request",
    purpose: "Internal need before purchasing.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.86,
  },
  {
    name: "Purchase Order",
    purpose: "Commitment to buy from a supplier.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.88,
  },
  {
    name: "Supplier",
    purpose: "Vendor providing goods or services.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.85,
  },
  {
    name: "Inventory Item",
    purpose: "Stock-keeping unit or material.",
    owningModule: "Inventory",
    requires: (m) => m.has("Inventory") || m.has("Production"),
    confidence: 0.84,
  },
  {
    name: "Machine",
    purpose: "Production or operational equipment.",
    owningModule: "Maintenance",
    requires: (m) => m.has("Maintenance") || m.has("Production"),
    confidence: 0.8,
  },
  {
    name: "Maintenance Plan",
    purpose: "Planned upkeep for assets/machines.",
    owningModule: "Maintenance",
    requires: (m) => m.has("Maintenance"),
    confidence: 0.78,
  },
  {
    name: "Employee",
    purpose: "Person working in the company.",
    owningModule: "HR",
    requires: () => true,
    confidence: 0.75,
  },
  {
    name: "Role",
    purpose: "Named responsibility set for access control.",
    owningModule: null,
    requires: () => true,
    confidence: 0.8,
  },
  {
    name: "Permission",
    purpose: "Capability grant within the operating system.",
    owningModule: null,
    requires: () => true,
    confidence: 0.78,
  },
  {
    name: "Document",
    purpose: "Controlled file or evidence artifact.",
    owningModule: "Documents",
    requires: (m) => m.has("Documents") || m.has("Knowledge"),
    confidence: 0.8,
  },
  {
    name: "Asset",
    purpose: "Tracked owned item with lifecycle.",
    owningModule: "Assets",
    requires: (m) => m.has("Assets") || m.has("Maintenance"),
    confidence: 0.76,
  },
  {
    name: "Risk",
    purpose: "Tracked operational or commercial risk.",
    owningModule: "Compliance",
    requires: (m, t) => m.has("Compliance") || /risk/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Workflow",
    purpose: "Named operating process definition.",
    owningModule: null,
    requires: (_m, t) => /workflow|process|approv/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Approval",
    purpose: "Recorded decision against a threshold or policy.",
    owningModule: "Approvals",
    requires: (m) => m.has("Approvals"),
    confidence: 0.88,
  },
];

/**
 * Canonical entities — only when modules/evidence support them.
 */
export function detectEntities(
  blueprint: BusinessBlueprint,
  workspace: CompanyWorkspace,
  modules: SolutionModule[],
  evidence: SolutionEvidenceRef[],
): SolutionEntity[] {
  const moduleSet = new Set(modules.map((m) => m.name));
  const text = [
    ...blueprint.entities.map((e) => e.name),
    ...blueprint.workflows.map((w) => w.name),
    ...modules.map((m) => m.name),
  ]
    .join(" ")
    .toLowerCase();

  // Prefer blueprint entity names when they map to canonical set
  const fromBlueprint = blueprint.entities
    .map((e) => e.name)
    .filter((name): name is SolutionEntityName =>
      RULES.some((r) => r.name === name),
    );

  const entities: SolutionEntity[] = [];
  for (const rule of RULES) {
    const blueprintHit = fromBlueprint.includes(rule.name);
    if (!blueprintHit && !rule.requires(moduleSet, text)) continue;
    entities.push({
      id: createId("sent"),
      name: rule.name,
      purpose: rule.purpose,
      confidence: blueprintHit ? Math.min(0.95, rule.confidence + 0.05) : rule.confidence,
      evidence: evidence.slice(0, 3),
      owningModule: rule.owningModule,
    });
  }

  void workspace;
  return entities;
}
