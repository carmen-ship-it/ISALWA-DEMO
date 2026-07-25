import { createId } from "@/lib/utils";
import type {
  BusinessBlueprint,
  SolutionEvidenceRef,
  SolutionModule,
  SolutionModuleName,
  SolutionPermission,
  SolutionRole,
  SolutionRoleName,
} from "@/types";

interface RoleRule {
  name: SolutionRoleName;
  responsibilities: string[];
  needs: string[];
  primaryScreens: string[];
  match: (modules: Set<SolutionModuleName>, roles: string[]) => boolean;
}

const ROLE_RULES: RoleRule[] = [
  {
    name: "Owner",
    responsibilities: ["Set priorities", "Approve major commitments"],
    needs: ["Executive visibility", "Exception queues"],
    primaryScreens: ["Dashboard", "Reports"],
    match: (_m, roles) =>
      roles.some((r) => /owner|founder/i.test(r)) || true,
  },
  {
    name: "Manager",
    responsibilities: ["Oversee teams", "Approve within threshold"],
    needs: ["Team workload", "Approvals inbox"],
    primaryScreens: ["Dashboard", "Approvals", "Reports"],
    match: (m) => m.size > 0,
  },
  {
    name: "Sales",
    responsibilities: ["Manage pipeline", "Create quotes and orders"],
    needs: ["Customer history", "Quote tools"],
    primaryScreens: ["Customers", "Sales"],
    match: (m) => m.has("Sales") || m.has("CRM"),
  },
  {
    name: "Purchasing",
    responsibilities: ["Source suppliers", "Issue purchase orders"],
    needs: ["Approval status", "Supplier records"],
    primaryScreens: ["Purchasing"],
    match: (m) => m.has("Purchasing"),
  },
  {
    name: "Production",
    responsibilities: ["Execute work orders", "Report shop status"],
    needs: ["Demand signal", "Inventory availability"],
    primaryScreens: ["Production"],
    match: (m) => m.has("Production"),
  },
  {
    name: "Accounting",
    responsibilities: ["Invoice", "Apply payments", "Report cash"],
    needs: ["Order truth", "Collections queue"],
    primaryScreens: ["Finance", "Reports"],
    match: (m) => m.has("Finance") || m.has("Collections"),
  },
  {
    name: "Operations",
    responsibilities: ["Coordinate handoffs", "Clear exceptions"],
    needs: ["Process visibility", "Task queues"],
    primaryScreens: ["Operations", "Dashboard"],
    match: (m) => m.has("Scheduling") || m.has("Inventory") || m.has("Field Service"),
  },
  {
    name: "Warehouse",
    responsibilities: ["Receive and issue stock", "Maintain counts"],
    needs: ["Inventory truth", "Location context"],
    primaryScreens: ["Inventory"],
    match: (m) => m.has("Inventory"),
  },
  {
    name: "HR",
    responsibilities: ["Maintain employee records", "Role assignment"],
    needs: ["People directory"],
    primaryScreens: ["Settings"],
    match: (m) => m.has("HR"),
  },
  {
    name: "Technician",
    responsibilities: ["Perform maintenance or field work"],
    needs: ["Work orders", "Asset history"],
    primaryScreens: ["Production", "Field Service"],
    match: (m) => m.has("Maintenance") || m.has("Field Service"),
  },
  {
    name: "Field Rep",
    responsibilities: ["Execute visits", "Capture field notes"],
    needs: ["Customer context", "Visit forms"],
    primaryScreens: ["Customers", "Field Service"],
    match: (m) => m.has("Field Service"),
  },
  {
    name: "Administrator",
    responsibilities: ["Configure access", "Manage users"],
    needs: ["Permission controls"],
    primaryScreens: ["Settings"],
    match: () => true,
  },
];

const PERMISSION_CATALOG: Array<{
  capability: string;
  description: string;
  module: SolutionModuleName | null;
  forRoles: SolutionRoleName[];
}> = [
  {
    capability: "View Customers",
    description: "Read customer records and history.",
    module: "CRM",
    forRoles: ["Owner", "Manager", "Sales", "Field Rep"],
  },
  {
    capability: "Edit Customers",
    description: "Create and update customer records.",
    module: "CRM",
    forRoles: ["Sales", "Manager", "Administrator"],
  },
  {
    capability: "Delete Customers",
    description: "Remove or archive customer records.",
    module: "CRM",
    forRoles: ["Administrator", "Owner"],
  },
  {
    capability: "Approve Discounts",
    description: "Authorize non-standard commercial terms.",
    module: "Sales",
    forRoles: ["Manager", "Owner"],
  },
  {
    capability: "Approve Purchases",
    description: "Authorize purchase requests and orders.",
    module: "Purchasing",
    forRoles: ["Manager", "Owner", "Purchasing"],
  },
  {
    capability: "View Financial Reports",
    description: "Access finance and collections reports.",
    module: "Finance",
    forRoles: ["Owner", "Manager", "Accounting"],
  },
  {
    capability: "Export Data",
    description: "Export operational datasets.",
    module: "Analytics",
    forRoles: ["Owner", "Manager", "Administrator"],
  },
  {
    capability: "Manage Users",
    description: "Invite users and assign roles.",
    module: null,
    forRoles: ["Administrator", "Owner"],
  },
  {
    capability: "Configure AI",
    description: "Enable or constrain AI assistant behavior.",
    module: "AI Assistant",
    forRoles: ["Administrator", "Owner"],
  },
];

export function detectRoles(
  blueprint: BusinessBlueprint,
  modules: SolutionModule[],
  evidence: SolutionEvidenceRef[],
): { roles: SolutionRole[]; permissions: SolutionPermission[] } {
  const moduleSet = new Set(modules.map((m) => m.name));
  const knownRoles = blueprint.roles;

  const permissions: SolutionPermission[] = PERMISSION_CATALOG.filter((p) =>
    p.module ? moduleSet.has(p.module) || p.module === "Analytics" : true,
  )
    .filter((p) => (p.module === "AI Assistant" ? moduleSet.has("AI Assistant") : true))
    .map((p) => ({
      id: createId("sperm"),
      capability: p.capability,
      description: p.description,
      module: p.module,
      confidence: 0.8,
      evidence: evidence.slice(0, 2),
    }));

  const roles: SolutionRole[] = [];
  for (const rule of ROLE_RULES) {
    if (!rule.match(moduleSet, knownRoles)) continue;
    const permissionIds = permissions
      .filter((p) =>
        PERMISSION_CATALOG.some(
          (c) =>
            c.capability === p.capability &&
            c.forRoles.includes(rule.name),
        ),
      )
      .map((p) => p.id);

    roles.push({
      id: createId("srole"),
      name: rule.name,
      responsibilities: rule.responsibilities,
      needs: rule.needs,
      permissionIds,
      primaryScreens: rule.primaryScreens,
      confidence: 0.8,
      evidence: evidence.slice(0, 2),
    });
  }

  return { roles, permissions };
}
