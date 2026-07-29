import { createId } from "@/lib/utils";
import type {
  SolutionEntity,
  SolutionEntityName,
  SolutionEvidenceRef,
  SolutionRelationship,
} from "@/types";

/**
 * Entity-relationship CATALOG — a deterministic ERP/manufacturing data-model
 * template, filtered down to whichever entities happen to be present.
 *
 * IMPORTANT (truthfulness): every edge below is a plausible data-model
 * *hypothesis* for the software to be built — never a fact discovered about
 * how this specific client's business actually operates today. The client
 * may not have Quotes, may skip Invoices, may run production entirely from
 * memory. `detectRelationships` always tags these with
 * `source: "catalog_inferred"` and a capped confidence so the UI can present
 * them as "suggested, pending validation" rather than discovered truth.
 * Real, client-specific relationships belong in
 * `workspace.knowledge.relationships` (see `lib/company-model/relationships.ts`,
 * which already prefers that evidence over any template).
 */
const CATALOG: Array<{
  from: SolutionEntityName;
  cardinality: SolutionRelationship["cardinality"];
  to: SolutionEntityName;
  label: string;
  /** Overrides the default catalog confidence for edges resting on a
   * thinner evidence bar than the core commercial chain (e.g. manufacturing
   * entities gated only on the Production module being recommended). */
  confidence?: number;
}> = [
  { from: "Customer", cardinality: "has many", to: "Contact", label: "Customer has many Contacts" },
  { from: "Customer", cardinality: "has many", to: "Quote", label: "Customer has many Quotes" },
  { from: "Customer", cardinality: "has many", to: "Order", label: "Customer has many Orders" },
  { from: "Quote", cardinality: "creates", to: "Order", label: "Quote creates Order" },
  { from: "Order", cardinality: "creates", to: "Invoice", label: "Order creates Invoice" },
  { from: "Invoice", cardinality: "receives", to: "Payment", label: "Invoice receives Payment" },
  { from: "Supplier", cardinality: "owns", to: "Purchase Order", label: "Supplier owns Purchase Orders" },
  {
    from: "Purchase Request",
    cardinality: "creates",
    to: "Purchase Order",
    label: "Purchase Request creates Purchase Order",
  },
  { from: "Purchase Order", cardinality: "receives", to: "Approval", label: "Purchase Order receives Approval" },
  { from: "Customer", cardinality: "has many", to: "Visit", label: "Customer has many Visits" },
  { from: "Employee", cardinality: "has many", to: "Task", label: "Employee has many Tasks" },
  { from: "Employee", cardinality: "belongs to", to: "Role", label: "Employee belongs to Role" },
  { from: "Role", cardinality: "has many", to: "Permission", label: "Role has many Permissions" },
  { from: "Machine", cardinality: "has many", to: "Maintenance Plan", label: "Machine has many Maintenance Plans" },
  { from: "Inventory Item", cardinality: "belongs to", to: "Location", label: "Inventory Item belongs to Location" },
  { from: "Document", cardinality: "belongs to", to: "Customer", label: "Document may belong to Customer" },
  { from: "Approval", cardinality: "belongs to", to: "Workflow", label: "Approval belongs to Workflow" },
  // Manufacturing chain — only ever surfaces when `lib/solution/entities.ts`
  // has already gated "Work Order" / "Bill of Materials" into existence for
  // this client, so this never appears as a generic template on its own.
  {
    from: "Order",
    cardinality: "creates",
    to: "Work Order",
    label: "Order creates Work Order",
    confidence: 0.45,
  },
  {
    from: "Work Order",
    cardinality: "belongs to",
    to: "Bill of Materials",
    label: "Work Order belongs to Bill of Materials",
    confidence: 0.4,
  },
  {
    from: "Work Order",
    cardinality: "creates",
    to: "Inventory Item",
    label: "Work Order creates Inventory Item",
    confidence: 0.45,
  },
  {
    from: "Bill of Materials",
    cardinality: "has many",
    to: "Inventory Item",
    label: "Bill of Materials has many Inventory Items",
    confidence: 0.4,
  },
];

/** Entities that only exist when manufacturing evidence was found — used
 * elsewhere (executive blueprint, solution panel) to decide whether to show
 * an honest "still learning production" state instead of only the generic
 * commercial chain. */
export const MANUFACTURING_ENTITY_NAMES: SolutionEntityName[] = [
  "Work Order",
  "Bill of Materials",
];

export function hasManufacturingRelationshipEvidence(
  relationships: SolutionRelationship[],
): boolean {
  return relationships.some(
    (rel) =>
      MANUFACTURING_ENTITY_NAMES.includes(rel.fromEntity) ||
      MANUFACTURING_ENTITY_NAMES.includes(rel.toEntity),
  );
}

export function detectRelationships(
  entities: SolutionEntity[],
  evidence: SolutionEvidenceRef[],
): SolutionRelationship[] {
  const present = new Set(entities.map((e) => e.name));
  return CATALOG.filter((rel) => present.has(rel.from) && present.has(rel.to)).map(
    (rel) => ({
      id: createId("srel"),
      fromEntity: rel.from,
      cardinality: rel.cardinality,
      toEntity: rel.to,
      label: rel.label,
      confidence: rel.confidence ?? 0.55,
      source: "catalog_inferred" as const,
      evidence: evidence.slice(0, 2),
    }),
  );
}
