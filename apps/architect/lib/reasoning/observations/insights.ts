import { createId, nowIso } from "@/lib/utils";
import type {
  ConsultantInsight,
  ConversationMemory,
  Observation,
} from "@/types";

const INSIGHT_CONFIDENCE_GATE = 80;

interface InsightRule {
  id: string;
  requiredSignals?: string[];
  requiredFactKeys?: string[];
  minOverall?: number;
  title: string;
  body: (memory: ConversationMemory, evidence: string[]) => string;
  risk: (evidence: string[]) => string;
  recommendation: string;
  severity: Observation["severity"];
}

const RULES: InsightRule[] = [
  {
    id: "insight_individual_dependency",
    requiredSignals: ["whatsapp", "visibility"],
    minOverall: INSIGHT_CONFIDENCE_GATE,
    title: "El proceso comercial depende de personas",
    body: (_memory, evidence) =>
      `Su proceso comercial parece depender fuertemente de empleados individuales. Evidencia: “${evidence[0]}”.`,
    risk: () =>
      "Si un vendedor se va, el historial de clientes puede perderse o fragmentarse.",
    recommendation: "Centralizar la comunicación y el historial de clientes.",
    severity: "critical",
  },
  {
    id: "insight_excel_os",
    requiredSignals: ["excel"],
    minOverall: 70,
    title: "Las hojas de cálculo funcionan como el sistema operativo",
    body: (_memory, evidence) =>
      `El trabajo crítico parece vivir en hojas de cálculo en lugar de un sistema de registro duradero. Evidencia: “${evidence[0]}”.`,
    risk: () =>
      "El desfase de versiones y los errores silenciosos se vuelven inevitables a medida que más personas dependen de los archivos.",
    recommendation: "Identificar las hojas de cálculo críticas y reemplazarlas con flujos de trabajo estructurados.",
    severity: "notable",
  },
  {
    id: "insight_whatsapp_routing",
    requiredSignals: ["whatsapp"],
    minOverall: 72,
    title: "La mensajería está llevando el ruteo y la propiedad de los casos",
    body: (_memory, evidence) =>
      `La coordinación con clientes e interna parece transcurrir por hilos de mensajería. Evidencia: “${evidence[0]}”.`,
    risk: () =>
      "Las conversaciones no pueden asignarse, buscarse o transferirse de forma confiable cuando las personas cambian de rol.",
    recommendation: "Introducir propiedad explícita de las conversaciones e historial buscable.",
    severity: "notable",
  },
  {
    id: "insight_approvals",
    requiredSignals: ["approvals"],
    minOverall: 75,
    title: "Las aprobaciones concentran el riesgo",
    body: (_memory, evidence) =>
      `Las aprobaciones parecen concentradas y pueden bloquear la operación. Evidencia: “${evidence[0]}”.`,
    risk: () => "Una sola ausencia puede detener las compras, ventas o entregas.",
    recommendation: "Definir matrices de aprobación con respaldos y umbrales claros.",
    severity: "critical",
  },
  {
    id: "insight_no_history",
    requiredSignals: ["visibility"],
    minOverall: 78,
    title: "No hay historial de clientes centralizado",
    body: (_memory, evidence) =>
      `Parece no existir un historial de clientes compartido y confiable. Evidencia: “${evidence[0]}”.`,
    risk: () => "Cada traspaso reinicia el contexto y aumenta el riesgo de error.",
    recommendation: "Crear un único registro de clientes en el que ventas, operaciones y soporte puedan confiar.",
    severity: "critical",
  },
  {
    id: "insight_paper",
    requiredSignals: ["paper"],
    minOverall: 70,
    title: "El papel todavía sostiene la verdad operativa",
    body: (_memory, evidence) =>
      `Partes del proceso aún dependen del papel. Evidencia: “${evidence[0]}”.`,
    risk: () => "El hábito fuera de línea y las necesidades legales pueden ocultar deuda de proceso si no se examinan.",
    recommendation: "Separar la necesidad legal del hábito antes de digitalizar.",
    severity: "info",
  },
];

/**
 * Never hallucinate: only emit insights when signals/facts + evidence exist.
 * Prefer generating when overall confidence exceeds ~80%.
 */
export function generateInsights(
  memory: ConversationMemory,
  businessSignals: Array<{ id: string; evidence: string }>,
  existingObservationIds: Set<string>,
): { observations: Observation[]; insights: ConsultantInsight[] } {
  const observations: Observation[] = [];
  const insights: ConsultantInsight[] = [];
  const signalIds = new Set(businessSignals.map((s) => s.id));
  const factKeys = new Set(memory.knownFacts.map((f) => f.key));

  for (const rule of RULES) {
    if (existingObservationIds.has(rule.id)) continue;
    if (
      rule.minOverall !== undefined &&
      memory.score.overall < rule.minOverall &&
      memory.summary.confidenceScore < rule.minOverall
    ) {
      // Allow slightly earlier if strong signal cluster
      const strong =
        (rule.requiredSignals?.every((id) => signalIds.has(id)) ?? false) &&
        memory.score.overall >= Math.max(65, (rule.minOverall ?? 80) - 10);
      if (!strong) continue;
    }

    if (rule.requiredSignals?.some((id) => !signalIds.has(id))) continue;
    if (rule.requiredFactKeys?.some((key) => !factKeys.has(key))) continue;

    const evidence = businessSignals
      .filter((signal) => rule.requiredSignals?.includes(signal.id))
      .map((signal) => signal.evidence);

    const factEvidence = memory.knownFacts
      .filter((fact) => rule.requiredFactKeys?.includes(fact.key))
      .flatMap((fact) => fact.evidence);

    const allEvidence = [...evidence, ...factEvidence].filter(Boolean);
    if (allEvidence.length === 0) continue;

    const body = rule.body(memory, allEvidence);
    const risk = rule.risk(allEvidence);
    const confidence = Math.max(
      memory.score.overall,
      memory.summary.confidenceScore,
    );

    observations.push({
      id: rule.id,
      createdAt: nowIso(),
      title: rule.title,
      body,
      severity: rule.severity,
      signals: rule.requiredSignals ?? [],
      relatedTopics: [],
      evidence: allEvidence,
      risk,
      recommendation: rule.recommendation,
      confidence,
    });

    insights.push(
      {
        id: createId("insight"),
        kind: "observation",
        title: rule.title,
        body,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
      {
        id: createId("insight"),
        kind: "risk",
        title: "Riesgo",
        body: risk,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
      {
        id: createId("insight"),
        kind: "recommendation",
        title: "Recomendación",
        body: rule.recommendation,
        evidence: allEvidence,
        createdAt: nowIso(),
        confidence,
      },
    );
  }

  return { observations, insights };
}
