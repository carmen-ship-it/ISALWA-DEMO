import { createId } from "@/lib/utils";
import type {
  ConceptualField,
  ConceptualTable,
  SolutionEntity,
  SolutionEntityName,
  SolutionEvidenceRef,
} from "@/types";

const BASE_FIELDS: ConceptualField[] = [
  {
    name: "id",
    kind: "string",
    required: true,
    optional: false,
    audit: false,
    futureExtension: false,
    description: "Stable identifier",
  },
  {
    name: "createdAt",
    kind: "date",
    required: true,
    optional: false,
    audit: true,
    futureExtension: false,
    description: "Created timestamp",
  },
  {
    name: "updatedAt",
    kind: "date",
    required: true,
    optional: false,
    audit: true,
    futureExtension: false,
    description: "Updated timestamp",
  },
];

function field(
  name: string,
  kind: ConceptualField["kind"],
  required: boolean,
  description: string,
): ConceptualField {
  return {
    name,
    kind,
    required,
    optional: !required,
    audit: false,
    futureExtension: false,
    description,
  };
}

function fieldsFor(entity: SolutionEntityName): ConceptualField[] {
  switch (entity) {
    case "Customer":
      return [
        field("name", "string", true, "Legal or trading name"),
        field("status", "enum", true, "Active / inactive"),
        field("ownerEmployeeId", "relation", false, "Account owner"),
      ];
    case "Quote":
      return [
        field("customerId", "relation", true, "Customer reference"),
        field("amount", "number", true, "Quoted amount"),
        field("status", "enum", true, "Draft / sent / accepted"),
      ];
    case "Order":
      return [
        field("customerId", "relation", true, "Customer reference"),
        field("quoteId", "relation", false, "Source quote"),
        field("status", "enum", true, "Open / fulfilled / cancelled"),
      ];
    case "Invoice":
      return [
        field("orderId", "relation", false, "Source order"),
        field("amount", "number", true, "Invoice total"),
        field("dueDate", "date", true, "Payment due"),
      ];
    case "Payment":
      return [
        field("invoiceId", "relation", true, "Invoice reference"),
        field("amount", "number", true, "Amount received"),
        field("receivedAt", "date", true, "Receipt date"),
      ];
    case "Purchase Order":
      return [
        field("supplierId", "relation", true, "Supplier reference"),
        field("amount", "number", true, "PO total"),
        field("status", "enum", true, "Draft / approved / ordered"),
      ];
    default:
      return [
        field("name", "string", false, "Display name"),
        field("status", "enum", false, "Lifecycle status"),
        {
          name: "metadata",
          kind: "json",
          required: false,
          optional: true,
          audit: false,
          futureExtension: true,
          description: "Future extension bag",
        },
      ];
  }
}

/**
 * Conceptual database model — no SQL, no Prisma.
 */
export function detectDatabase(
  entities: SolutionEntity[],
  evidence: SolutionEvidenceRef[],
): ConceptualTable[] {
  return entities.map((entity) => ({
    id: createId("stable"),
    entity: entity.name,
    fields: [...BASE_FIELDS, ...fieldsFor(entity.name)],
    relationships: [],
    confidence: entity.confidence,
    evidence: evidence.slice(0, 2),
  }));
}
