/**
 * Consultant Readiness Engine — topic catalog.
 *
 * Topics are the discovery dimensions the platform already uses; this file
 * only adds the client-facing vocabulary the engine needs to say *what is
 * missing* instead of *how confident a model is*.
 *
 * `MISSING_INFORMATION_LABELS` is keyed by the very same evidence fact keys
 * `computeDiscoveryScore` counts (`DIMENSION_EVIDENCE_KEYS`), so a gap can
 * never drift away from what the score actually measured. Derived keys
 * (`fact_*`, `evidence_*`) are deliberately absent: they are bookkeeping, not
 * something a client can answer.
 */

import type {
  DiscoveryDimension,
  KnowledgeCoverageArea,
} from "@/types";

/** Knowledge coverage areas → discovery dimensions (Mission 2 mapping). */
export const AREA_TO_DIMENSIONS: Record<
  KnowledgeCoverageArea,
  DiscoveryDimension[]
> = {
  Customers: ["customers"],
  Sales: ["sales"],
  Operations: ["operations"],
  Finance: ["finance"],
  HR: ["team"],
};

/** Inverse lookup — which coverage area, if any, backs a topic. */
export const DIMENSION_TO_AREA: Partial<
  Record<DiscoveryDimension, KnowledgeCoverageArea>
> = {
  customers: "Customers",
  sales: "Sales",
  operations: "Operations",
  finance: "Finance",
  team: "HR",
};

/**
 * What we still need to understand, per evidence key, in the words a
 * consultant would use in the room.
 */
export const MISSING_INFORMATION_LABELS: Record<string, string> = {
  sales_motion: "cómo se cierra una venta, desde el primer contacto hasta el pedido",
  order_intake: "cómo llegan y se registran los pedidos",
  customer_contact: "por qué canales los buscan los clientes cada día",
  customer_count: "a cuántos clientes activos atienden hoy",
  geography: "en qué ciudades o regiones operan",
  team_structure: "cómo está organizado el equipo y quién responde por qué",
  departments: "qué áreas existen hoy dentro de la empresa",
  bottlenecks: "qué frena al equipo en una semana normal",
  inventory_flow: "cómo se mueve el inventario desde la compra hasta la entrega",
  fulfillment: "cómo se prepara y se entrega un pedido",
  finance_process: "cómo funcionan la facturación y el cobro",
  approvals: "cómo se aprueban las compras y quién autoriza",
  collections: "cómo se le da seguimiento a la cobranza",
  revenue_stage: "en qué etapa de ingresos está la empresa",
  production_planning: "cómo se planifica la producción o la reposición",
  manufacturing_flow: "cómo avanza una orden dentro de la planta",
  work_orders: "cómo se generan y se controlan las órdenes de trabajo",
  current_software: "qué sistemas usan hoy para operar",
  information_storage: "dónde se guarda la información importante",
  excel_depth: "para qué se usa Excel exactamente",
  whatsapp_depth: "qué decisiones se coordinan por WhatsApp",
  paper_depth: "qué sigue registrándose en papel",
};

/**
 * What to bring, in the words a consultant would ask for in the room, when a
 * gap can plausibly be closed by a document instead of another interview
 * question. Keyed by the same evidence fact keys as `MISSING_INFORMATION_LABELS`
 * — a suggestion can never name a gap the score does not measure. Missing
 * entries fall back to `null` (nothing concrete to request yet), never a
 * generic "sube un documento".
 */
export const MISSING_INFORMATION_UPLOAD_HINTS: Record<string, string> = {
  sales_motion: "el manual o guion de ventas",
  order_intake: "el formulario o flujo de toma de pedidos",
  customer_contact: "el directorio de canales de atención al cliente",
  customer_count: "el listado o reporte de clientes activos",
  team_structure: "el organigrama del equipo",
  departments: "el organigrama del equipo",
  bottlenecks: "el mapa o SOP de los procesos operativos",
  inventory_flow: "la política de manejo de inventario",
  fulfillment: "el procedimiento de preparación y entrega de pedidos",
  finance_process: "el proceso de facturación y cobranza",
  approvals: "la política de aprobación de compras",
  collections: "el reporte o política de cobranza",
  revenue_stage: "el estado financiero o reporte de ingresos",
  production_planning: "el plan de producción o reposición",
  manufacturing_flow: "el diagrama del proceso de manufactura",
  work_orders: "el formato de órdenes de trabajo",
  current_software: "el inventario de sistemas o licencias que usan hoy",
  information_storage: "el mapa de dónde se guarda la información",
  excel_depth: "las hojas de cálculo que usan para operar",
  whatsapp_depth: "las conversaciones o acuerdos por WhatsApp que definen el proceso",
  paper_depth: "los formularios o registros en papel",
};

/** Why each topic matters for the advice we are preparing. */
export const TOPIC_STAKES: Record<DiscoveryDimension, string> = {
  sales: "Sin esto, cualquier recomendación comercial sería una suposición.",
  customers:
    "Define a quién sirve la empresa y qué debe proteger cualquier cambio.",
  geography: "Marca el alcance real de la operación y de la implementación.",
  team: "Muestra quién decide, quién ejecuta y dónde se concentra el riesgo.",
  operations: "Aquí viven los cuellos de botella que más cuestan tiempo y dinero.",
  finance: "Determina la velocidad del efectivo y dónde se frena el flujo de caja.",
  production: "Ordena la capacidad y los compromisos de entrega.",
  systems: "Es el punto de partida real para diseñar lo que sigue.",
};

/** Keyword patterns used to attach a contradiction to a topic. */
export const TOPIC_PATTERNS: Record<DiscoveryDimension, RegExp> = {
  sales: /venta|comercial|pedido|cotiza|sales|quote|pipeline/i,
  customers: /cliente|customer|atenci[oó]n/i,
  geography: /regi[oó]n|ciudad|plaza|sucursal|geograf/i,
  team: /equipo|persona|rol|departamento|team|capacity|rr\.?\s*hh/i,
  operations:
    /operaci|proceso|inventario|entrega|almac[eé]n|bottleneck|process|ad.?hoc/i,
  finance: /financ|factura|cobro|cobran|aprobaci|approv|precio|margen/i,
  production: /producci|planta|manufactur|orden de trabajo/i,
  systems:
    /sistema|software|excel|hoja de c[aá]lculo|spreadsheet|whatsapp|papel|erp|crm|visibilidad|visibility/i,
};

/**
 * Presentation estimate for one clarification, consistent with the ~25-minute
 * interview budget in `data/catalog.ts`. Deliberately coarse: the client is
 * told "unos X minutos", never a fake precise figure.
 */
export const MINUTES_PER_CLARIFICATION = 2;

export function readinessStateLabel(
  state: "ready" | "almost_ready" | "needs_information",
): string {
  switch (state) {
    case "ready":
      return "Listo";
    case "almost_ready":
      return "Casi listo";
    default:
      return "Necesitamos más información";
  }
}

/**
 * How the sources line up, said plainly. `por_confirmar` returns null on
 * purpose: "still to confirm" is the normal state and does not deserve a
 * badge of its own.
 */
export function consistencyLabel(
  consistency: "confirmada" | "por_confirmar" | "con_diferencias",
): string | null {
  if (consistency === "confirmada") return "Confirmado con documentos";
  if (consistency === "con_diferencias") return "Hay algo por aclarar";
  return null;
}

/** Concrete missing-information phrase for an evidence key, when it has one. */
export function missingInformationLabel(key: string): string | null {
  return MISSING_INFORMATION_LABELS[key] ?? null;
}

/** What to upload to close an evidence key, when a concrete document exists. */
export function missingInformationUploadHint(key: string): string | null {
  return MISSING_INFORMATION_UPLOAD_HINTS[key] ?? null;
}
