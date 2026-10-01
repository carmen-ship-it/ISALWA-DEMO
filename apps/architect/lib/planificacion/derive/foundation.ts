import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  itemDerivationMeta,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

/**
 * OS foundation architecture requirements for Planificación — not OS implementation.
 * Visible even on empty workspace as propuesta; never fabricates operational KPIs.
 */
export function deriveFoundationRequirements(
  workspace: CompanyWorkspace,
): PlanificacionPlanItem[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const items: PlanificacionPlanItem[] = [];

  const push = (
    keySeed: string,
    title: string,
    body: string,
    extra?: Partial<PlanificacionPlanItem>,
  ) => {
    const stableKey = stableKeyFor("technical_requirement", `foundation-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Requisito de arquitectura ISALWA OS — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "tenant-isolation",
    "Aislamiento por tenant (organización)",
    "Cada registro operativo del sistema debe pertenecer a una organización/tenant. " +
      "Commercial es el primer carril activo, pero la arquitectura debe ser multi-tenant desde el diseño.",
    {
      rationale:
        "V1 puede operar una sola empresa real; el límite tenant es no negociable para seguridad y futuro SaaS.",
      osModuleHint: "Tenant",
      recommendation: "organizationId en todos los objetos tenant-owned; sin consultas cross-tenant.",
    },
  );

  push(
    "multi-person-org",
    "Departamentos con varias personas — no un dueño único",
    "Modelo: Tenant → Departamento → Equipo (opcional) → Usuario → Roles con alcance. " +
      "Una cuenta u oportunidad puede tener dueño, colaboradores, observadores, aprobador y delegación — " +
      "con historial de ownership, no un solo assignedTo mutable.",
    {
      osModuleHint: "Organization",
      recommendation:
        "Historial de reasignación, trabajo concurrente y escalación a gerencia — auditado por eventos.",
    },
  );

  push(
    "rbac-field-sensitivity",
    "RBAC, alcance y sensibilidad de campos",
    "Autorización por capacidad + departamento/equipo/territorio/dueño. " +
      "Campos sensibles (NIT, margen, crédito, cuerpo WhatsApp) con máscara por rol. " +
      "La recuperación de contexto para IA debe usar exactamente el mismo alcance que el usuario.",
    {
      osModuleHint: "Authorization",
      dependencies: ["Autenticación", "Modelo de roles ISALWA"],
    },
  );

  push(
    "capability-registry",
    "Registro de activación de capacidades",
    "Estados: LOCKED → APPROVED → CONNECTING → ACTIVE → DEGRADED. " +
      "Command Center, IA, flujos y reportes deben conocer el estado — sin KPI fabricados para áreas bloqueadas.",
    {
      osModuleHint: "CapabilityRegistry",
      recommendation:
        "Finance, Almacén, Operaciones, etc. muestran honestamente «no conectado» hasta activación real.",
    },
  );

  push(
    "event-spine",
    "Event spine — memoria operativa canónica",
    "BusinessEvent append-only: occurredAt (negocio) vs recordedAt (sistema), actor, provenance, " +
      "correlationId, idempotencyKey. Correcciones mediante eventos gobernados, no reescritura silenciosa.",
    { osModuleHint: "EventSpine" },
  );

  push(
    "transactional-outbox",
    "Outbox transaccional + idempotencia de ingestión",
    "Si la escritura en BD tiene éxito pero falla la publicación del evento, outbox garantiza entrega. " +
      "Webhooks WhatsApp duplicados, filas Excel repetidas y pagos replay no deben duplicar eventos.",
    {
      osModuleHint: "EventSpine",
      dependencies: ["Event spine", "Cola de trabajos"],
    },
  );

  push(
    "hard-vs-soft-truth",
    "Verdad dura vs inteligencia blanda",
    "Duro: cotización aceptada, pago registrado, visita, aprobación. " +
      "Blando: score, sentimiento, conclusión IA, precio sugerido. " +
      "FACT → PATTERN → CONCLUSION → RECOMMENDATION con provenance.",
    { osModuleHint: "Intelligence" },
  );

  push(
    "audit-provenance",
    "Auditoría y provenance",
    "Quién, qué, cuándo, fuente, antes/después, sugerencia IA asociada, aprobación. " +
      "Requerido para dinero, identidad, permisos y comunicaciones externas.",
    { osModuleHint: "Audit" },
  );

  push(
    "demo-production-isolation",
    "Separación demo / producción / simulación",
    "Universe demo, prototipo comercial y simulación ejecutiva no pueden contaminar la verdad del tenant de producción. " +
      "dataOrigin explícito en eventos y cargas.",
    {
      osModuleHint: "Tenant",
      rationale: "El piloto ws_isalwa permanece vacío; el demo OS usa datos sintéticos aislados.",
    },
  );

  push(
    "break-glass",
    "Acceso consultor / break-glass",
    "Soporte consultor con grant temporal, auditado y con expiración — nunca bypass de RBAC para IA.",
    { osModuleHint: "Authorization" },
  );

  push(
    "reporting-query-lens",
    "Reportes como consulta autorizada",
    "Reportes = query + filtros + alcance de permisos — no warehouse copiado que derive de la verdad operativa.",
    { osModuleHint: "Reporting" },
  );

  push(
    "knowledge-vs-runtime",
    "Conocimiento aprobado ≠ hecho operativo",
    "SOPs y políticas aprobadas en Architect/OS knowledge vault — versionadas. " +
      "No reescriben eventos históricos al cambiar el procedimiento.",
    { osModuleHint: "Knowledge" },
  );

  // Workspace context does not change foundation items — intentional for Increment 5
  void workspace;

  return items;
}
