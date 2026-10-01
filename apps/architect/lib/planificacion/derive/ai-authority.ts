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
 * AI authority matrix as Planificación architecture requirements.
 */
export function deriveAiAuthorityRequirements(
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
    const stableKey = stableKeyFor("technical_requirement", `ai-authority-${keySeed}`);
    items.push({
      id: planificacionItemId(stableKey),
      stableKey,
      kind: "technical_requirement",
      title,
      body,
      evidenceRefs: [
        quoteEvidence("workspace", "Matriz de autoridad IA — arquitectura OS"),
      ],
      governanceStatus: "propuesta",
      sourceEngines: ["workspace"],
      ...meta,
      ...extra,
    });
  };

  push(
    "ai-not-source-of-truth",
    "IA sobre la verdad — no segunda fuente de verdad",
    "Clasificar, resumir, sugerir, detectar patrones y proponer coincidencias — " +
      "nunca alterar silenciosamente registros autoritativos.",
    { osModuleHint: "Intelligence" },
  );

  push(
    "ai-retrieval-auth",
    "Recuperación IA bajo autorización del usuario",
    "Retrieval y herramientas IA filtradas por tenant, rol, territorio y campo — " +
      "sin «super-prompt» que evite RBAC.",
    { osModuleHint: "Intelligence" },
  );

  push(
    "ai-provenance",
    "Provenance de salida IA",
    "modelId, evidenceRefs, confidence, governanceStatus, retrievalContext, timestamp. " +
      "FACT → PATTERN → CONCLUSION → RECOMMENDATION.",
    { osModuleHint: "Intelligence" },
  );

  push(
    "never-auto-merge",
    "Nunca fusión automática de identidad",
    "Coincidencias propuestas; fusión CONFIRM o APPROVAL según riesgo financiero.",
    { osModuleHint: "IdentityResolution" },
  );

  push(
    "never-auto-money",
    "Nunca precio, crédito o fiscal sin humano",
    "Precio aplicado, extensión de crédito, documento fiscal, envío externo — APPROVAL o CONFIRM explícito.",
    { osModuleHint: "HumanAuthority" },
  );

  push(
    "ai-suggestion-audit",
    "Log de sugerencias IA",
    "Registrar lo que la IA mostró antes de que el humano actúe — para auditoría y disputas.",
    { osModuleHint: "Audit" },
  );

  push(
    "locked-dept-no-ai-fake",
    "Sin inteligencia de departamento bloqueado",
    "IA no resume Finanzas/Almacén como operativos cuando capability = LOCKED.",
    { osModuleHint: "CapabilityRegistry" },
  );

  void workspace;
  return items;
}

export function deriveAiAuthorityQuestions(): PlanificacionClientQuestion[] {
  const derivedAt = nowIso();
  const meta = itemDerivationMeta(derivedAt);
  const stableKey = stableKeyFor("client_decision", "ai-q-never-automate");
  return [
    {
      id: planificacionQuestionId(stableKey),
      stableKey,
      question: "¿Qué acciones NUNCA deben automatizarse (precio, crédito, mensajes, fiscal)?",
      ourUnderstanding:
        "Mission 15 y arquitectura proponen humano en el loop para dinero y legal — límites ISALWA no evidenciados.",
      whyItMatters: "Define kill switches y matriz AUTO/SUGGEST/APPROVAL/NEVER.",
      status: "pendiente",
      derivedAt,
      derivationVersion: meta.derivationVersion,
    },
  ];
}
