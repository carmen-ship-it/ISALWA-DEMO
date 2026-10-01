import type {
  CompanyWorkspace,
  PlanificacionClientQuestion,
  PlanificacionPlanItem,
} from "@/types";
import { nowIso } from "@/lib/utils";
import {
  itemDerivationMeta,
  planificacionItemId,
  planificacionQuestionId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

/**
 * Admin self-service vs engineering boundary (Increment 5.1).
 */
export function deriveAdminGovernanceRequirements(
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
    const stableKey = stableKeyFor("technical_requirement", `admin-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Límite admin vs ingeniería — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "handoff-admin-self-service",
    "Handoff: administración ordinaria sin ingeniería",
    "Tras el handoff, ISALWA administra empleados, clientes, proveedores, contactos y reasignaciones " +
      "ordinarias desde el producto — auditado, sin Carmen para lo normal.",
    {
      osModuleHint: "AdminSelfService",
      recommendation: "Ver ADMIN_SELF_SERVICE_BOUNDARY.md — clases A/B/C/D.",
    },
  );

  push(
    "admin-not-bypass",
    "Auto-servicio admin no bypass de seguridad",
    "Cada comando admin: tenant-scoped, autorizado, validado, auditado, respaldado por evento.",
    { osModuleHint: "AdminSelfService:Security" },
  );

  push(
    "storage-api-contract",
    "Contratos de almacenamiento y API antes de runtime",
    "STORAGE_CONTRACT y API_SERVICE_CONTRACT definen dónde vive la verdad y command/query — " +
      "implementación posterior debe cumplirlos.",
    { osModuleHint: "Foundation:Contracts" },
  );

  push(
    "integration-engineering",
    "Conectar contabilidad / WhatsApp = ingeniería + integración",
    "Clase C/D: nuevas conexiones, credenciales, adaptadores — no auto-servicio admin ordinario.",
    { osModuleHint: "Integration:Governed" },
  );

  push(
    "config-vs-code",
    "Configuración de empresa vs cambio de software",
    "Empleados, parties, relaciones, políticas dentro de capacidades soportadas = configuración (A/B). " +
      "Nuevos tipos de rol de sistema o capacidad = ingeniería (C).",
    { osModuleHint: "ConfigVsCode" },
  );

  void workspace;
  return items;
}

export function deriveAdminGovernanceQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const questions: PlanificacionClientQuestion[] = [];

  const push = (keySeed: string, question: string, understanding: string, why: string) => {
    const stableKey = stableKeyFor("client_decision", `admin-q-${keySeed}`);
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
    "approval-thresholds",
    "¿Quién aprueba descuentos, crédito, fusiones de clientes y cambios de NIT?",
    "Matriz A/B propuesta — umbrales ISALWA no confirmados.",
    "Política de aprobación y scopes admin.",
  );

  push(
    "dept-structure",
    "¿Cuál es la estructura real de departamentos y equipos hoy?",
    "Organigrama no cargado en Architect.",
    "DepartmentAssignment y permisos.",
  );

  return questions;
}
