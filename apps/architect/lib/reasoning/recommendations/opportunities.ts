import { nowIso } from "@/lib/utils";
import type {
  ConversationMemory,
  Opportunity,
  OpportunityImpact,
} from "@/types";

interface OpportunityRule {
  id: string;
  title: string;
  impact: OpportunityImpact;
  description: string;
  requiresSignals?: string[];
  requiresIndustry?: string[];
  minPain?: number;
}

const RULES: OpportunityRule[] = [
  {
    id: "opp_digital_visit_reports",
    title: "Reportes de visita digitales",
    impact: "quick_win",
    description:
      "Reemplazar las notas de visita informales con reportes de campo estructurados que alimenten un único registro de cliente.",
    requiresSignals: ["manual", "paper", "whatsapp"],
  },
  {
    id: "opp_approval_workflows",
    title: "Flujos de aprobación",
    impact: "medium",
    description:
      "Hacer explícitas las aprobaciones de compras y comerciales, con respaldos y umbrales.",
    requiresSignals: ["approvals"],
  },
  {
    id: "opp_production_dashboard",
    title: "Tablero de planificación de producción",
    impact: "high",
    description:
      "Dar a la dirección una vista en vivo de la demanda frente a la capacidad y el trabajo abierto.",
    requiresIndustry: ["manufacturing", "distribution"],
  },
  {
    id: "opp_command_center",
    title: "Centro de mando ejecutivo",
    impact: "strategic",
    description:
      "Unificar las señales de ventas, operaciones y caja en una sola vista operativa ejecutiva.",
    minPain: 2,
  },
  {
    id: "opp_crm",
    title: "CRM centralizado",
    impact: "high",
    description:
      "Crear un historial único y buscable de clientes, conversaciones y compromisos.",
    requiresSignals: ["whatsapp", "visibility", "excel"],
  },
  {
    id: "opp_inventory_truth",
    title: "Capa de verdad de inventario",
    impact: "high",
    description:
      "Cerrar la brecha entre los conteos de hojas de cálculo y la realidad física.",
    requiresIndustry: ["distribution", "manufacturing"],
    requiresSignals: ["excel"],
  },
];

export function generateOpportunities(
  memory: ConversationMemory,
  signalIds: string[],
  existingIds: Set<string>,
): Opportunity[] {
  const created: Opportunity[] = [];
  const industry = memory.summary.industry;
  const painCount = memory.painPoints.length;

  for (const rule of RULES) {
    if (existingIds.has(rule.id)) continue;
    if (
      rule.requiresIndustry &&
      !rule.requiresIndustry.includes(industry)
    ) {
      continue;
    }
    if (rule.minPain !== undefined && painCount < rule.minPain) continue;
    if (rule.requiresSignals) {
      const hit = rule.requiresSignals.some((id) => signalIds.includes(id));
      if (!hit) continue;
    }

    const evidence = memory.knownFacts
      .slice(-3)
      .flatMap((fact) => fact.evidence)
      .slice(0, 2);

    if (evidence.length === 0 && memory.summary.belief) {
      evidence.push(memory.summary.belief);
    }
    if (evidence.length === 0) continue;

    created.push({
      id: rule.id,
      title: rule.title,
      impact: rule.impact,
      description: rule.description,
      evidence,
      createdAt: nowIso(),
    });
  }

  return created;
}

export function impactLabel(impact: OpportunityImpact): string {
  switch (impact) {
    case "quick_win":
      return "Victoria rápida";
    case "medium":
      return "Impacto medio";
    case "high":
      return "Impacto alto";
    case "strategic":
      return "Estratégico";
  }
}
