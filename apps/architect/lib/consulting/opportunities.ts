import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingOpportunity,
  ConsultingOpportunityHorizon,
  ConversationMemory,
  OpportunityDifficulty,
} from "@/types";

interface OpportunityRule {
  id: string;
  title: string;
  horizon: ConsultingOpportunityHorizon;
  estimatedImpact: string;
  difficulty: OpportunityDifficulty;
  dependencies: string[];
  departmentsAffected: string[];
  test: (blob: string, signalIds: Set<string>, painCount: number) => boolean;
}

const RULES: OpportunityRule[] = [
  {
    id: "opp_shared_customer_record",
    title: "Crear un registro de clientes compartido",
    horizon: "Quick Wins",
    estimatedImpact: "Detiene la pérdida de historial comercial en cuestión de semanas",
    difficulty: "low",
    dependencies: ["Acuerdo del dueño sobre el sistema de registro"],
    departmentsAffected: ["Sales", "Support"],
    test: (blob, signals) =>
      signals.has("whatsapp") || /customer history|lost.*whatsapp/i.test(blob),
  },
  {
    id: "opp_approval_thresholds",
    title: "Codificar umbrales de aprobación",
    horizon: "30-day",
    estimatedImpact: "Elimina las colas silenciosas y la política desigual",
    difficulty: "moderate",
    dependencies: ["Política de finanzas", "Aprobadores de respaldo"],
    departmentsAffected: ["Purchasing", "Finance", "Management"],
    test: (_b, signals) => signals.has("approvals"),
  },
  {
    id: "opp_retire_load_bearing_excel",
    title: "Retirar los procesos que dependen de Excel",
    horizon: "90-day",
    estimatedImpact: "Reduce el error y la desviación de versiones en toda la operación",
    difficulty: "high",
    dependencies: ["Selección de módulos", "Plan de migración de datos"],
    departmentsAffected: ["Operations", "Finance", "Sales"],
    test: (_b, signals) => signals.has("excel"),
  },
  {
    id: "opp_sop_pack",
    title: "Publicar un paquete mínimo de procedimientos",
    horizon: "30-day",
    estimatedImpact: "Reduce el tiempo de incorporación y el riesgo de conocimiento tribal",
    difficulty: "moderate",
    dependencies: ["Dueños de proceso designados"],
    departmentsAffected: ["Operations", "People"],
    test: (blob) => /no sop|no documentation|tribal|undocumented/i.test(blob),
  },
  {
    id: "opp_executive_visibility",
    title: "Establecer una vista operativa ejecutiva",
    horizon: "6-month",
    estimatedImpact: "El liderazgo decide con la verdad actual, no con hojas de cálculo de fin de mes",
    difficulty: "high",
    dependencies: ["Métricas confiables", "Módulos centrales en operación"],
    departmentsAffected: ["Management", "Operations", "Finance"],
    test: (_b, _s, painCount) => painCount >= 2,
  },
  {
    id: "opp_automation_layer",
    title: "Automatizar la detección de excepciones",
    horizon: "1-year",
    estimatedImpact: "Los gerentes intervienen a tiempo en vez de limpiar después",
    difficulty: "high",
    dependencies: ["Datos operativos limpios", "Propiedad clara"],
    departmentsAffected: ["Operations", "Technology"],
    test: (blob, signals) =>
      signals.has("manual") || /manual|bottleneck|duplicate/i.test(blob),
  },
  {
    id: "opp_business_os",
    title: "Fundar el sistema operativo del negocio",
    horizon: "strategic",
    estimatedImpact: "La empresa opera sobre capacidades duraderas, no sobre chats y archivos",
    difficulty: "high",
    dependencies: ["Acuerdo sobre el blueprint", "Inversión por fases"],
    departmentsAffected: ["Management", "Operations", "Sales", "Finance"],
    test: (_b, _s, painCount) => painCount >= 1,
  },
];

/**
 * Translate findings into timed opportunities — deterministic.
 */
export function evaluateOpportunities(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingOpportunity[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => p.title),
    ...memory.summary.painPoints,
  ]
    .join(" ")
    .toLowerCase();
  const signalIds = new Set(business.signals.map((s) => s.id));
  const painCount = memory.painPoints.length;

  const out: ConsultingOpportunity[] = [];
  for (const rule of RULES) {
    if (!rule.test(blob, signalIds, painCount)) continue;
    out.push({
      id: createId(rule.id),
      title: rule.title,
      horizon: rule.horizon,
      estimatedImpact: rule.estimatedImpact,
      difficulty: rule.difficulty,
      dependencies: rule.dependencies,
      departmentsAffected: rule.departmentsAffected,
      evidence: memory.painPoints.map((p) => p.title).slice(0, 3),
      confidence: 0.74,
    });
  }

  return out;
}
