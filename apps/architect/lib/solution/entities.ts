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
import { buildEvidenceBlob } from "./modules";

interface EntityRule {
  name: SolutionEntityName;
  purpose: string;
  owningModule: SolutionModuleName | null;
  /**
   * `text` is the narrow blueprint/module-name blob every rule has always
   * used. `broaderText` additionally covers capabilities, pain points and
   * systems (see `buildEvidenceBlob`) — only offered to rules that need a
   * wider evidence net (e.g. manufacturing signals like "BOM"/"work order"
   * that a client mentions in a pain point, not a formal entity name).
   * Existing rules keep matching on `text` only, so behavior for every
   * non-manufacturing entity is unchanged.
   */
  requires: (
    modules: Set<SolutionModuleName>,
    text: string,
    broaderText: string,
  ) => boolean;
  confidence: number;
}

/** Manufacturing text signals — same keyword set as the `Production`
 * industry profile (`data/catalog.ts`) so evidence bars stay consistent. */
const BOM_SIGNAL = /\bbom\b|bill of materials?|lista de materiales|receta de producci[oó]n/i;

const RULES: EntityRule[] = [
  {
    name: "Customer",
    purpose: "A quién le vende y atiende la empresa.",
    owningModule: "CRM",
    requires: (m) => m.has("CRM") || m.has("Sales"),
    confidence: 0.92,
  },
  {
    name: "Contact",
    purpose: "Personas relacionadas con una cuenta de cliente.",
    owningModule: "CRM",
    requires: (m) => m.has("CRM"),
    confidence: 0.84,
  },
  {
    name: "Location",
    purpose: "Sitios, plantas, almacenes o ubicaciones de clientes.",
    owningModule: "CRM",
    requires: (m, t) => m.has("CRM") || /location|warehouse|plant|city/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Quote",
    purpose: "Oferta comercial antes de la confirmación del pedido.",
    owningModule: "Sales",
    requires: (m) => m.has("Sales"),
    confidence: 0.88,
  },
  {
    name: "Order",
    purpose: "Compromiso comercial confirmado de entrega.",
    owningModule: "Sales",
    requires: (m) => m.has("Sales"),
    confidence: 0.9,
  },
  {
    name: "Invoice",
    purpose: "Solicitud de pago por trabajo entregado.",
    owningModule: "Finance",
    requires: (m) => m.has("Finance") || m.has("Collections"),
    confidence: 0.86,
  },
  {
    name: "Payment",
    purpose: "Aplicación de efectivo contra facturas.",
    owningModule: "Collections",
    requires: (m) => m.has("Collections") || m.has("Finance"),
    confidence: 0.82,
  },
  {
    name: "Visit",
    purpose: "Registro de visita comercial o de campo.",
    owningModule: "Field Service",
    requires: (m) => m.has("Field Service"),
    confidence: 0.8,
  },
  {
    name: "Task",
    purpose: "Unidad de trabajo asignable.",
    owningModule: "Projects",
    requires: (m) => m.has("Projects") || m.has("Scheduling") || m.has("Field Service"),
    confidence: 0.7,
  },
  {
    name: "Message",
    purpose: "Comunicación registrada relacionada con trabajo o clientes.",
    owningModule: "Notifications",
    requires: (m, t) => m.has("Notifications") || /whatsapp|message/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Purchase Request",
    purpose: "Necesidad interna antes de la compra.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.86,
  },
  {
    name: "Purchase Order",
    purpose: "Compromiso de compra a un proveedor.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.88,
  },
  {
    name: "Supplier",
    purpose: "Proveedor de bienes o servicios.",
    owningModule: "Purchasing",
    requires: (m) => m.has("Purchasing"),
    confidence: 0.85,
  },
  {
    name: "Inventory Item",
    purpose: "Unidad de inventario o material.",
    owningModule: "Inventory",
    requires: (m) => m.has("Inventory") || m.has("Production"),
    confidence: 0.84,
  },
  {
    name: "Machine",
    purpose: "Equipo de producción u operativo.",
    owningModule: "Maintenance",
    requires: (m) => m.has("Maintenance") || m.has("Production"),
    confidence: 0.8,
  },
  {
    name: "Maintenance Plan",
    purpose: "Mantenimiento planificado para activos/máquinas.",
    owningModule: "Maintenance",
    requires: (m) => m.has("Maintenance"),
    confidence: 0.78,
  },
  {
    name: "Employee",
    purpose: "Persona que trabaja en la empresa.",
    owningModule: "HR",
    requires: () => true,
    confidence: 0.75,
  },
  {
    name: "Role",
    purpose: "Conjunto de responsabilidades para el control de acceso.",
    owningModule: null,
    requires: () => true,
    confidence: 0.8,
  },
  {
    name: "Permission",
    purpose: "Capacidad otorgada dentro del sistema operativo.",
    owningModule: null,
    requires: () => true,
    confidence: 0.78,
  },
  {
    name: "Document",
    purpose: "Archivo controlado o artefacto de evidencia.",
    owningModule: "Documents",
    requires: (m) => m.has("Documents") || m.has("Knowledge"),
    confidence: 0.8,
  },
  {
    name: "Asset",
    purpose: "Elemento propio con ciclo de vida rastreado.",
    owningModule: "Assets",
    requires: (m) => m.has("Assets") || m.has("Maintenance"),
    confidence: 0.76,
  },
  {
    name: "Risk",
    purpose: "Riesgo operativo o comercial rastreado.",
    owningModule: "Compliance",
    requires: (m, t) => m.has("Compliance") || /risk/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Workflow",
    purpose: "Definición de proceso operativo con nombre.",
    owningModule: null,
    requires: (_m, t) => /workflow|process|approv/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Approval",
    purpose: "Decisión registrada contra un umbral o política.",
    owningModule: "Approvals",
    requires: (m) => m.has("Approvals"),
    confidence: 0.88,
  },
  // Manufacturing signals — gated on the `Production` capability actually
  // being recommended (see `lib/solution/modules.ts`), never invented just
  // because the client is a manufacturer. Confidence stays below the CRM/
  // Sales entities above: presence of the module implies work happens on a
  // shop floor, but the exact shape of that work is still being validated
  // with the client (see `NO_FABRICATED_CONTENT.md` / AI Constitution).
  {
    name: "Work Order",
    purpose: "Orden de trabajo que da seguimiento a una producción específica en planta.",
    owningModule: "Production",
    requires: (m) => m.has("Production"),
    confidence: 0.68,
  },
  {
    name: "Bill of Materials",
    purpose: "Lista de materiales y componentes necesarios para producir un artículo.",
    owningModule: "Production",
    // Requires the Production capability AND an explicit BOM/material-list
    // mention — "Production" alone does not prove the client formally
    // tracks bills of materials (many shops still run this from memory or a
    // spreadsheet), so this stays unlearned until that evidence shows up.
    requires: (m, _t, broaderText) => m.has("Production") && BOM_SIGNAL.test(broaderText),
    confidence: 0.6,
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
  const broaderText = buildEvidenceBlob(blueprint, workspace);

  // Prefer blueprint entity names when they map to canonical set
  const fromBlueprint = blueprint.entities
    .map((e) => e.name)
    .filter((name): name is SolutionEntityName =>
      RULES.some((r) => r.name === name),
    );

  const entities: SolutionEntity[] = [];
  for (const rule of RULES) {
    const blueprintHit = fromBlueprint.includes(rule.name);
    if (!blueprintHit && !rule.requires(moduleSet, text, broaderText)) continue;
    entities.push({
      id: createId("sent"),
      name: rule.name,
      purpose: rule.purpose,
      confidence: blueprintHit ? Math.min(0.95, rule.confidence + 0.05) : rule.confidence,
      evidence: evidence.slice(0, 3),
      owningModule: rule.owningModule,
    });
  }

  return entities;
}
