import { createId } from "@/lib/utils";
import type {
  SolutionEntity,
  SolutionEntityName,
  SolutionEvidenceRef,
  SolutionRelationship,
} from "@/types";

const CATALOG: Array<{
  from: SolutionEntityName;
  cardinality: SolutionRelationship["cardinality"];
  to: SolutionEntityName;
  label: string;
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
];

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
      confidence: 0.82,
      evidence: evidence.slice(0, 2),
    }),
  );
}
