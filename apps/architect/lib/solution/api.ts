import { createId } from "@/lib/utils";
import type {
  ConceptualApi,
  SolutionEntity,
  SolutionEvidenceRef,
} from "@/types";

const RESOURCE_MAP: Partial<
  Record<SolutionEntity["name"], { resource: string; ops: ConceptualApi["operations"] }>
> = {
  Customer: { resource: "Customers", ops: ["list", "get", "create", "update"] },
  Quote: { resource: "Quotes", ops: ["list", "get", "create", "update", "action"] },
  Order: { resource: "Orders", ops: ["list", "get", "create", "update"] },
  Invoice: { resource: "Invoices", ops: ["list", "get", "create", "update"] },
  Visit: { resource: "Visits", ops: ["list", "get", "create", "update"] },
  Message: { resource: "Messages", ops: ["list", "get", "create"] },
  Approval: { resource: "Approvals", ops: ["list", "get", "action"] },
  Payment: { resource: "Payments", ops: ["list", "get", "create"] },
  "Purchase Order": {
    resource: "PurchaseOrders",
    ops: ["list", "get", "create", "update", "action"],
  },
  "Purchase Request": {
    resource: "PurchaseRequests",
    ops: ["list", "get", "create", "update", "action"],
  },
  Supplier: { resource: "Suppliers", ops: ["list", "get", "create", "update"] },
  "Inventory Item": {
    resource: "InventoryItems",
    ops: ["list", "get", "create", "update"],
  },
};

/**
 * Conceptual API surfaces — contracts only.
 */
export function detectApis(
  entities: SolutionEntity[],
  evidence: SolutionEvidenceRef[],
): ConceptualApi[] {
  const apis: ConceptualApi[] = [];
  for (const entity of entities) {
    const mapped = RESOURCE_MAP[entity.name];
    if (!mapped) continue;
    apis.push({
      id: createId("sapi"),
      resource: mapped.resource,
      operations: mapped.ops,
      relatedEntity: entity.name,
      confidence: entity.confidence,
      evidence: evidence.slice(0, 2),
    });
  }
  return apis;
}
