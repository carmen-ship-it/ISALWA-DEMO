import type { CompanyWorkspace, PlanificacionPlanItem } from "@/types";
import { nowIso } from "@/lib/utils";
import {
  itemDerivationMeta,
  planificacionItemId,
  quoteEvidence,
  stableKeyFor,
} from "./helpers";

/**
 * Event vs work vs attention vs notification — architecture requirements.
 */
export function deriveEventsWorkAttentionRequirements(
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
    const stableKey = stableKeyFor("technical_requirement", `events-work-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Arquitectura eventos / trabajo / atención"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "event-not-work",
    "Evento ≠ trabajo — distinción explícita",
    "Evento: algo ocurrió (quote.accepted). WorkItem: alguien debe actuar. " +
      "AttentionItem: merece atención ahora. Notification: cómo avisar al humano — sparse.",
    { osModuleHint: "WorkModel" },
  );

  push(
    "work-ownership-history",
    "Ownership, delegación y reasignación auditada",
    "WorkItem con owner, colaboradores, observadores, cadena de aprobación. " +
      "Reasignación y delegación temporal generan eventos — no overwrite silencioso.",
    { osModuleHint: "WorkModel" },
  );

  push(
    "attention-auto-resolve",
    "Atención con resolución automática",
    "AttentionItem derivado de reglas: se invalida cuando el cliente responde, el pago llega, " +
      "otro usuario resuelve el bloqueo, o expira la promesa. No cada evento es notificación.",
    {
      osModuleHint: "AttentionEngine",
      recommendation: "Command Center prioriza atención, no contador de badges.",
    },
  );

  push(
    "event-activates-work",
    "Evento → contexto → trabajo",
    "Reglas: evento + estado + capacidad activa → WorkItem + asignación + SLA. " +
      "Ejemplo arquitectónico: aprobación concedida desbloquea siguiente responsable.",
    {
      osModuleHint: "WorkflowRules",
      rationale: "Flujos ISALWA específicos requieren validación — el mecanismo es genérico.",
    },
  );

  push(
    "occurred-vs-recorded",
    "occurredAt vs recordedAt",
    "Crítico para campo offline, importaciones tardías, webhooks y retrasos de contabilidad.",
    { osModuleHint: "EventSpine" },
  );

  push(
    "business-calendar-sla",
    "Calendario de negocio y SLA",
    "Horario laboral Bolivia, sábados según operación, ventanas WhatsApp, timers de escalación — " +
      "no SLA de reloj wall-clock ignorando calendario.",
    {
      governanceStatus: "requiere_confirmacion",
      osModuleHint: "BusinessCalendar",
    },
  );

  push(
    "no-notification-storm",
    "Supresión y agrupación de notificaciones",
    "Import masivo, webhooks duplicados y FYI no deben generar 500 badges. " +
      "Digest gerencial vs alertas críticas en tiempo real.",
    { osModuleHint: "Notifications" },
  );

  void workspace;
  return items;
}
