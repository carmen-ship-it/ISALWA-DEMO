import type {
  CompanyWorkspace,
  PlanificacionClientQuestion,
  PlanificacionPlanItem,
} from "@/types";
import { nowIso } from "@/lib/utils";
import {
  hasDiscoveryContent,
  itemDerivationMeta,
  planificacionItemId,
  planificacionQuestionId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

const FINANCE_CAPABILITY_KEY = "finance";
const WAREHOUSE_CAPABILITY_KEY = "warehouse";

/**
 * Finance boundary, projections, cross-department dependencies — architecture only.
 * Never fabricates AR balances, invoice counts, or connected Finance KPIs.
 */
export function deriveFinanceDependencyRequirements(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];
  const hasDiscovery = hasDiscoveryContent(workspace);

  const push = (
    keySeed: string,
    title: string,
    body: string,
    extra?: Partial<PlanificacionPlanItem>,
  ) => {
    const stableKey = stableKeyFor("technical_requirement", `finance-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Arquitectura Finanzas / dependencias — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "finance-locked",
    "Finanzas / cobranzas — capacidad LOCKED (no implementada)",
    "Sin KPI financieros fabricados, sin saldo AR inventado, sin dashboard de cobranzas falso. " +
      "El centro de comando muestra: Finanzas no conectada / no verificada.",
    {
      osModuleHint: "Finance:LOCKED",
      governanceStatus: "propuesta",
      rationale: "Commercial primero; Finance se activa solo con aprobación + fuente + conexión.",
    },
  );

  push(
    "authority-boundary",
    "Límite de autoridad: OS comercial vs sistema contable externo",
    "OS autoritativo en: oportunidad, cotización, orden comercial, memoria de precio, comunicación, compromisos comerciales. " +
      "Externo autoritativo en: factura fiscal oficial, GL, AR/AP oficial, nómina, valoración inventario. " +
      "OS proyecta — no crea segundo ledger contable.",
    {
      osModuleHint: "FinanceBoundary",
      recommendation: "Ver FINANCE_ACCOUNTING_BOUNDARY.md y matriz Bolivia.",
    },
  );

  push(
    "finance-adapter",
    "Adaptador de integración contable (sin vendor predeterminado)",
    "External Accounting → Integration Adapter → ingest validado → BusinessEvents → proyecciones OS. " +
      "QuickBooks en Architect es scaffold — no recomendación para ISALWA.",
    {
      osModuleHint: "FinanceAdapter",
      dependencies: ["Validación: sistema contable actual de ISALWA"],
    },
  );

  push(
    "finance-projection",
    "Modelo FinanceProjection",
    "Proyecciones: referencia factura, estado, saldo, aging, pago, hold de crédito — con source, freshness, provenance, conflictState. " +
      "Si OS y externo difieren: reconciliación explícita, nunca elección silenciosa.",
    { osModuleHint: "FinanceProjection" },
  );

  push(
    "commercial-finance-events",
    "Eventos Commercial ↔ Finance (ejemplos arquitectónicos)",
    "Ejemplos ilustrativos — no flujos aprobados: order.confirmed → invoice.requested; " +
      "invoice.issued (ref externa) → balance.updated; credit.hold → bloqueo comercial. " +
      "Requieren validación con ISALWA y sistema contable real.",
    {
      governanceStatus: "requiere_confirmacion",
      rationale: "Arquitectura de eventos — no requisito operativo confirmado.",
    },
  );

  push(
    "collections-promise",
    "Promesa de pago y cobranzas (proyección futura)",
    "Promise-to-pay como compromiso temporal con evento y atención auto-resoluble. " +
      "Sin implementar cobranzas hasta Finance/Collections activos.",
    {
      osModuleHint: "Collections",
      governanceStatus: "requiere_confirmacion",
    },
  );

  push(
    "sin-fiscal-deferred",
    "SIN / facturación electrónica — vía fiscal futura",
    "Blueprint: relevancia a mediano plazo; demo simula sin integración legal. " +
      "Arquitectura reserva capa fiscal sin afirmar estado SIN de ISALWA.",
    {
      governanceStatus: "requiere_confirmacion",
      rationale: "PRODUCT_BLUEPRINT §0.3 — validar con propietaria y contador.",
    },
  );

  if (hasDiscovery) {
    push(
      "cross-dept-finance-hold",
      "Dependencia Commercial → Finance: hold de crédito",
      "Cuando Finance esté ACTIVE: hold aplicado bloquea cotización/pedido comercial con evento y auditoría. " +
        "Mientras LOCKED: atención «crédito no verificado por sistema contable».",
      {
        osModuleHint: "CrossDept:Finance→Commercial",
      },
    );

    push(
      "cross-dept-warehouse-availability",
      "Dependencia Commercial → Almacén: disponibilidad",
      "Cuando Almacén ACTIVE: evento de disponibilidad puede verificar promesa comercial. " +
        "Mientras LOCKED: «disponibilidad no conectada — promesa comercial no verificada».",
      {
        osModuleHint: "CrossDept:Warehouse→Commercial",
      },
    );

    push(
      "cross-dept-operations-delivery",
      "Dependencia Commercial → Operaciones: entrega",
      "Entrega programada requiere Operaciones conectada; si no, honest unavailable.",
      {
        osModuleHint: "CrossDept:Operations→Commercial",
      },
    );
  }

  // Explicit locked capability registry entries for tests
  const financeKey = stableKeyFor("capability", `command-center-locked-${FINANCE_CAPABILITY_KEY}`);
  items.push({
    id: planificacionItemId(financeKey),
    stableKey: financeKey,
    kind: "technical_requirement",
    title: "Registro: Finance = LOCKED",
    body: "Capacidad Finanzas bloqueada — sin métricas, reportes IA ni flujos que pretendan cobranza operativa.",
    evidenceRefs: [quoteEvidence("workspace", "Capability registry — Finance locked")],
    governanceStatus: "propuesta",
    sourceEngines: ["workspace"],
    osModuleHint: "CapabilityRegistry:Finance",
    ...meta,
  });

  const warehouseKey = stableKeyFor(
    "capability",
    `command-center-locked-${WAREHOUSE_CAPABILITY_KEY}`,
  );
  items.push({
    id: planificacionItemId(warehouseKey),
    stableKey: warehouseKey,
    kind: "technical_requirement",
    title: "Registro: Almacén = LOCKED",
    body: "Sin stock simulado ni confirmación de disponibilidad hasta activación y datos reales.",
    evidenceRefs: [quoteEvidence("workspace", "Capability registry — Warehouse locked")],
    governanceStatus: "propuesta",
    sourceEngines: ["workspace"],
    osModuleHint: "CapabilityRegistry:Warehouse",
    ...meta,
  });

  return items;
}

export function deriveFinanceDependencyQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const questions: PlanificacionClientQuestion[] = [];

  const push = (keySeed: string, question: string, understanding: string, why: string) => {
    const stableKey = stableKeyFor("client_decision", `finance-q-${keySeed}`);
    questions.push({
      id: planificacionQuestionId(stableKey),
      stableKey,
      question,
      ourUnderstanding: understanding,
      whyItMatters: why,
      status: "pendiente",
      derivedAt,
      derivationVersion: meta.derivationVersion,
    });
  };

  push(
    "accounting-system",
    "¿Qué sistema de contabilidad o facturación usa ISALWA hoy?",
    "QuickBooks aparece scaffolded en Architect — no evidencia de uso en ISALWA.",
    "Selección de adaptador e límites de autoridad OS vs externo.",
  );

  push(
    "who-operates-accounting",
    "¿Quién opera el sistema contable (interno, contador externo)?",
    "Desconocido — puede ser contador-operado con export Excel.",
    "Define ingest manual vs API y responsabilidades.",
  );

  push(
    "who-issues-invoices",
    "¿Quién emite las facturas y en qué sistema?",
    "Flujo cotización→factura inferido en blueprint; sistema real no evidenciado.",
    "Eventos invoice.requested / invoice.issued y handoffs.",
  );

  push(
    "sin-active",
    "¿SIN / facturación electrónica ya está activa o es plan futuro?",
    "Blueprint: relevancia a mediano plazo; demo sin fiscal real.",
    "Alcance de lane Finance y adaptador fiscal Bolivia.",
  );

  push(
    "payment-recording",
    "¿Cómo se registran los pagos hoy?",
    "Readiness gap posible en finance_process — sin respuesta en piloto.",
    "Eventos payment.received y reconciliación.",
  );

  push(
    "ar-tracking",
    "¿Cómo se da seguimiento a cuentas por cobrar y saldos?",
    "Cobranzas inferida como función — herramienta actual desconocida.",
    "Proyección AR y atención de cobranza.",
  );

  push(
    "credit-approval",
    "¿Quién aprueba crédito, límites y excepciones de cobranza?",
    "Oportunidad consulting: umbrales de aprobación — sin datos ISALWA.",
    "Matriz de autoridad y holds.",
  );

  push(
    "stock-truth",
    "¿Dónde vive la verdad de stock para cotizar?",
    "Almacén locked; proceso real no en ws_isalwa.",
    "Dependencia Commercial → Almacén y promesas verificadas.",
  );

  push(
    "commercial-team-size",
    "¿Cuántas personas en comercial y pueden varios trabajar la misma cuenta?",
    "Demo universe tiene cast ficticio — tamaño real no evidenciado.",
    "Modelo multi-persona y ownership.",
  );

  push(
    "pricing-approval",
    "¿Quién aprueba descuentos y excepciones de precio?",
    "Pregunta frecuente en planificación migrada — sin respuesta persistida en piloto vacío.",
    "ApprovalRequest y umbrales.",
  );

  return questions;
}
