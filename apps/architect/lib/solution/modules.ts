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

/**
 * Broad, deterministic evidence blob (capabilities, workflows, systems, pain
 * points, knowledge themes). Exported for reuse by `./entities.ts` so
 * manufacturing-signal entities are gated on the same evidence breadth as
 * the `Production` module itself — no separate, weaker text scan.
 */
export function buildEvidenceBlob(
  blueprint: BusinessBlueprint,
  workspace: CompanyWorkspace,
): string {
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
    purpose: "Registro único de clientes e historial comercial.",
    dependencies: [],
    futureExpansion: ["Jerarquías de cuentas", "Líneas de tiempo de actividad"],
    match: (t) => /crm|customer|whatsapp|sales/i.test(t),
    confidence: 0.88,
  },
  {
    name: "Sales",
    purpose: "Pipeline, cotización y captura de pedidos.",
    dependencies: ["CRM"],
    futureExpansion: ["Listas de precios", "Seguimiento de comisiones"],
    match: (t) => /sales|quot|order|commercial/i.test(t),
    confidence: 0.9,
  },
  {
    name: "Purchasing",
    purpose: "Solicitudes, cotizaciones y órdenes de compra.",
    dependencies: ["Approvals"],
    futureExpansion: ["Tarjetas de puntuación de proveedores"],
    match: (t) => /purchas|supplier|po\b/i.test(t),
    confidence: 0.86,
  },
  {
    name: "Inventory",
    purpose: "Verdad de inventario y visibilidad de movimientos.",
    dependencies: [],
    futureExpansion: ["Múltiples almacenes", "Seguimiento de lotes"],
    match: (t) => /inventory|warehouse|stock/i.test(t),
    confidence: 0.84,
  },
  {
    name: "Production",
    purpose: "Órdenes de trabajo y coordinación de planta.",
    dependencies: ["Inventory"],
    futureExpansion: ["Versiones de BOM", "Planificación de capacidad"],
    match: (t) => /production|manufactur|shop floor|work order/i.test(t),
    confidence: 0.85,
  },
  {
    name: "Maintenance",
    purpose: "Planes de mantenimiento y solicitudes de trabajo.",
    dependencies: ["Assets"],
    futureExpansion: ["Programas preventivos"],
    match: (t) => /maintenance|machine|equipment/i.test(t),
    confidence: 0.8,
  },
  {
    name: "Finance",
    purpose: "Facturación y controles financieros.",
    dependencies: ["Sales"],
    futureExpansion: ["Exportación contable"],
    match: (t) => /finance|invoice|accounting/i.test(t),
    confidence: 0.82,
  },
  {
    name: "Collections",
    purpose: "Seguimiento de cuentas por cobrar y antigüedad de saldos.",
    dependencies: ["Finance"],
    futureExpansion: ["Planes de pago"],
    match: (t) => /collection|receivable|aging|payment/i.test(t),
    confidence: 0.8,
  },
  {
    name: "HR",
    purpose: "Registros de personas y asignación de roles.",
    dependencies: [],
    futureExpansion: ["Control de tiempo"],
    match: (t) => /\bhr\b|employee|people|team/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Projects",
    purpose: "Empaquetado y estado del trabajo de entrega.",
    dependencies: [],
    futureExpansion: ["Planificación de recursos"],
    match: (t) => /project|delivery|engagement/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Customer Service",
    purpose: "Tickets de soporte y atención al cliente.",
    dependencies: ["CRM"],
    futureExpansion: ["Políticas de SLA"],
    match: (t) => /support|service|ticket/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Compliance",
    purpose: "Cumplimiento de políticas y capacidad de auditoría.",
    dependencies: ["Documents", "Approvals"],
    futureExpansion: ["Versiones de políticas"],
    match: (t) => /compliance|audit|policy/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Analytics",
    purpose: "Reportes operativos y comerciales confiables.",
    dependencies: [],
    futureExpansion: ["Centro de mando ejecutivo"],
    match: (t) => /report|analytics|visibility|dashboard/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Documents",
    purpose: "Repositorio de documentos controlado para evidencia y SOPs.",
    dependencies: [],
    futureExpansion: ["Versionado", "Firma electrónica"],
    match: (t) => /document|sop|pdf|policy/i.test(t),
    confidence: 0.76,
  },
  {
    name: "Assets",
    purpose: "Seguimiento de equipos propios y ciclo de vida de activos.",
    dependencies: [],
    futureExpansion: ["Cálculo de depreciación"],
    match: (t) => /asset|machine|equipment|fleet/i.test(t),
    confidence: 0.72,
  },
  {
    name: "Fleet",
    purpose: "Operaciones de vehículos y rutas.",
    dependencies: ["Assets"],
    futureExpansion: ["Telemetría"],
    match: (t) => /fleet|vehicle|truck/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Scheduling",
    purpose: "Asignación de personas, trabajos y capacidad en el tiempo.",
    dependencies: [],
    futureExpansion: ["Optimización"],
    match: (t) => /schedul|dispatch|calendar/i.test(t),
    confidence: 0.74,
  },
  {
    name: "Field Service",
    purpose: "Visitas, tareas de campo y trabajo en sitio.",
    dependencies: ["CRM", "Scheduling"],
    futureExpansion: ["Sincronización sin conexión"],
    match: (t) => /field|visit|technician/i.test(t),
    confidence: 0.78,
  },
  {
    name: "Approvals",
    purpose: "Decisiones con umbrales y rastro de auditoría.",
    dependencies: [],
    futureExpansion: ["Políticas de múltiples pasos"],
    match: (t) => /approv|manual approv/i.test(t),
    confidence: 0.88,
  },
  {
    name: "Notifications",
    purpose: "Alertas y recordatorios operativos.",
    dependencies: [],
    futureExpansion: ["Preferencias de canal"],
    match: (t) => /notif|alert|remind|whatsapp|message/i.test(t),
    confidence: 0.7,
  },
  {
    name: "Knowledge",
    purpose: "Memoria de la empresa y evidencia buscable.",
    dependencies: ["Documents"],
    futureExpansion: ["Mapas de procesos"],
    match: (t) => /knowledge|document|sop|tribal/i.test(t),
    confidence: 0.75,
  },
  {
    name: "AI Assistant",
    purpose: "Asistir sobre datos duraderos — nunca convertirse en la fuente de verdad.",
    dependencies: ["Knowledge", "CRM"],
    futureExpansion: ["Resumen de excepciones"],
    match: (t) => /ai|assistant|automat/i.test(t),
    confidence: 0.55,
  },
];

export function detectModules(
  blueprint: BusinessBlueprint,
  workspace: CompanyWorkspace,
  evidence: SolutionEvidenceRef[],
): SolutionModule[] {
  const text = buildEvidenceBlob(blueprint, workspace);
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
