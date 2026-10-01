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
 * Workforce / organization lifecycle — architecture requirements (Increment 5.1).
 */
export function deriveWorkforceLifecycleRequirements(
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
    const stableKey = stableKeyFor("technical_requirement", `workforce-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Arquitectura ciclo de vida workforce — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "person-member-auth",
    "Persona ≠ miembro de organización ≠ identidad de acceso",
    "Tres conceptos separados: Person (identidad canónica), OrganizationMember (empleo en el tenant), " +
      "AuthIdentity (login). No colapsar en un solo «usuario» genérico.",
    { osModuleHint: "Workforce:Identity" },
  );

  push(
    "effective-dated-org",
    "Cambios de departamento y rol con vigencia",
    "Transferencia Commercial → Finance conserva historial: asignaciones con effectiveAt/endedAt, " +
      "eventos member.department.changed / member.role.changed — sin overwrite silencioso.",
    {
      osModuleHint: "Workforce:Organization",
      recommendation:
        "La atribución histórica en auditoría usa el rol/departamento vigente en occurredAt.",
    },
  );

  push(
    "delegation-expiry",
    "Delegación con alcance y expiración",
    "Delegación temporal: scope, startsAt, expiresAt, revocación, auditoría «en nombre de». " +
      "No reescribe ownership histórico; expira automáticamente.",
    { osModuleHint: "Workforce:Delegation" },
  );

  push(
    "termination-retain-person",
    "Baja: revocar acceso sin borrar Persona ni historial",
    "employment terminated + access revoked; Person y eventos/auditoría permanecen. " +
      "Atribución de trabajo completado no depende del departamento actual.",
    { osModuleHint: "Workforce:Lifecycle" },
  );

  push(
    "rehire-same-person",
    "Recontratación sobre la misma Persona canónica",
    "Nuevo período de OrganizationMember o reactivación — evitar duplicar identidad humana.",
    { governanceStatus: "requiere_confirmacion", osModuleHint: "Workforce:Lifecycle" },
  );

  push(
    "lifecycle-work-reassignment",
    "Reasignación de trabajo al cambiar departamento o baja",
    "WorkItems y aprobaciones pendientes: reasignación explícita o escalación a gerencia — " +
      "sin huérfanos silenciosos ni transferencia automática de aprobaciones.",
    { osModuleHint: "Workforce:WorkPolicy" },
  );

  void workspace;
  return items;
}

export function deriveWorkforceLifecycleQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const questions: PlanificacionClientQuestion[] = [];

  const push = (keySeed: string, question: string, understanding: string, why: string) => {
    const stableKey = stableKeyFor("client_decision", `workforce-q-${keySeed}`);
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
    "commercial-team-size",
    "¿Cuántas personas hay en comercial y pueden varios trabajar la misma cuenta?",
    "Tamaño y reglas de cuenta compartida no evidenciados en ws_isalwa.",
    "Modelo multi-persona, ownership y colaboradores.",
  );

  push(
    "who-is-admin",
    "¿Quién en ISALWA será administrador de personas y datos maestros después del handoff?",
    "Roles admin propuestos en arquitectura — sin nombres ni política confirmada.",
    "Alcance de auto-servicio admin vs aprobaciones.",
  );

  push(
    "leave-delegation-policy",
    "¿Cómo se cubre un gerente o asesor ausente (delegación, reasignación)?",
    "Política operativa no documentada en piloto.",
    "Reglas de delegación y expiración.",
  );

  return questions;
}
