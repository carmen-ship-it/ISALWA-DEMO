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
 * Party graph + data entry architecture — requirements and open validation questions.
 */
export function deriveIdentityEntryRequirements(
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
    const stableKey = stableKeyFor("technical_requirement", `identity-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Arquitectura Party / identidad — Planificación"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "party-graph",
    "Grafo canónico: Persona, Cuenta, Contacto, Lead, Oportunidad",
    "Una verdad de identidad — no bases de clientes separadas por canal (WhatsApp, Excel, CRM). " +
      "Persona → Contacto en Cuenta → Cuenta → Oportunidad.",
    { osModuleHint: "PartyGraph" },
  );

  push(
    "resolution-pipeline",
    "Pipeline de resolución de identidad",
    "Entrada cruda → candidatos de coincidencia → confianza → confirmación humana si ambiguo → identidad canónica. " +
      "Sin fusión silenciosa — especialmente con historial financiero.",
    {
      osModuleHint: "IdentityResolution",
      recommendation: "Fusión con saldo o facturas abiertas requiere aprobación, no solo puntaje alto.",
    },
  );

  push(
    "merge-split-governance",
    "Gobernanza de fusión / división",
    "Merge y split generan eventos de auditoría, snapshot antes/después y aprobación según riesgo.",
    { osModuleHint: "PartyGraph" },
  );

  push(
    "fast-lead-capture",
    "Captura rápida de lead (campo / móvil)",
    "Entrada en segundos: teléfono o nombre + territorio; NIT y empresa completa pueden confirmarse después. " +
      "Todo converge al mismo pipeline de identidad/eventos.",
    {
      osModuleHint: "CommercialCapture",
      dependencies: ["Validación cliente: mínimo de captura"],
    },
  );

  push(
    "entry-channels-unified",
    "Entrada unificada: manual, Excel, WhatsApp, email, documentos",
    "Manual, importación, mensajería y notas de llamada/visita — mismo ingest → identidad → eventos. " +
      "No crear un «cliente WhatsApp» distinto del «cliente Excel».",
    { osModuleHint: "Ingest" },
  );

  push(
    "fiscal-identity-fields",
    "Identidad fiscal en Cuenta (NIT, razón social)",
    "Campos fiscales en el grafo de party — validación y conflicto cuando difieren de sistema contable externo. " +
      "No afirmar NIT de clientes sin evidencia.",
    {
      governanceStatus: "requiere_confirmacion",
      osModuleHint: "PartyGraph",
      rationale: "NIT público de ISALWA S.R.L. es conocido; NIT de clientes requiere validación.",
    },
  );

  void workspace;
  return items;
}

export function deriveIdentityEntryQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const questions: PlanificacionClientQuestion[] = [];

  const push = (keySeed: string, question: string, understanding: string, why: string) => {
    const stableKey = stableKeyFor("client_decision", `identity-q-${keySeed}`);
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
    "customer-lists",
    "¿Existe hoy una lista de clientes — o varias hojas/archivos distintos?",
    "No hay evidencia en el piloto de una lista autorizada cargada en Architect.",
    "Desbloquea deduplicación, importación y grafo canónico de Cuentas.",
  );

  push(
    "duplicate-handling",
    "¿Cómo se manejan hoy los clientes duplicados?",
    "Arquitectura requiere cola de conflictos — proceso actual desconocido.",
    "Define reglas de fusión y quién aprueba.",
  );

  push(
    "nit-timing",
    "¿El NIT del cliente se captura al primer contacto o solo al facturar?",
    "Bolivia B2B suele usar NIT — momento exacto en ISALWA no evidenciado.",
    "Define campos obligatorios en captura rápida vs facturación.",
  );

  push(
    "lead-entry-today",
    "¿Cómo ingresa un lead hoy un asesor? (WhatsApp, llamada, visita, Excel, otro)",
    "Canal principal de entrada no documentado en ws_isalwa.",
    "Prioriza diseño de captura móvil y ingestión.",
  );

  return questions;
}
