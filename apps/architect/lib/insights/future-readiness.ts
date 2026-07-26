/**
 * 7. Future Readiness — evidence-backed predictions of where growth will
 * struggle, with WHY only (no generic advice). Reuses `ConsultingRisk`
 * patterns already detected by `lib/consulting/risk.ts` — projects each
 * pattern forward instead of describing it as a present-day problem again.
 */

import type { CompanyWorkspace, ConsultingRiskPatternId, RiskSeverity } from "@/types";
import { consultingOf, riskEvidence } from "./shared";
import type { FutureReadinessPrediction } from "./types";

const STRUGGLE_BY_PATTERN: Partial<Record<ConsultingRiskPatternId, string>> = {
  excel_dependency:
    "El seguimiento en hojas de cálculo dejará de sostenerse en cuanto crezca el volumen de clientes o pedidos.",
  whatsapp_dependency:
    "La continuidad comercial seguirá dependiendo de teléfonos personales — el riesgo crece con cada canal nuevo de venta.",
  manual_approvals:
    "Las aprobaciones manuales se convertirán en el cuello de botella que frene el crecimiento, no el mercado.",
  single_employee_owns_everything:
    "El crecimiento se topará con el techo de lo que una sola persona puede sostener antes de romperse.",
  customer_concentration:
    "Un crecimiento apalancado en pocos clientes deja a la empresa expuesta si uno de ellos se va.",
  supplier_concentration:
    "Cualquier interrupción del proveedor único pesará más entre más crezca la demanda que depende de él.",
  no_documentation:
    "Incorporar gente nueva será cada vez más lento y más caro sin procedimientos por escrito.",
  tribal_knowledge:
    "Escalar el equipo será más difícil mientras el conocimiento operativo siga viviendo solo en la cabeza de unas pocas personas.",
  manual_reporting:
    "El tiempo dedicado a armar reportes crecerá al mismo ritmo que el negocio, en lugar de mantenerse constante.",
  duplicate_work:
    "El trabajo duplicado consumirá proporcionalmente más horas del equipo mientras más operaciones se sumen.",
  paper_forms:
    "El papeleo se acumulará más rápido que la capacidad del equipo para procesarlo a medida que crece el volumen.",
  no_audit_trail:
    "Sostener el crecimiento sin un historial claro de aprobaciones complicará auditorías y decisiones de inversión futuras.",
  no_backups:
    "El riesgo de pérdida de información crece junto con la cantidad de datos operativos que el negocio ya no puede perder.",
};

const SEVERITY_HORIZON: Record<RiskSeverity, FutureReadinessPrediction["horizon"]> = {
  critical: "corto plazo",
  high: "corto plazo",
  moderate: "mediano plazo",
  low: "largo plazo",
};

export function deriveFutureReadiness(
  workspace: CompanyWorkspace,
): FutureReadinessPrediction[] {
  const consulting = consultingOf(workspace);
  if (!consulting) return [];

  return consulting.risks
    .filter((risk) => STRUGGLE_BY_PATTERN[risk.patternId])
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map((risk) => ({
      id: `future_${risk.id}`,
      struggle: STRUGGLE_BY_PATTERN[risk.patternId]!,
      why: risk.businessImpact,
      evidence: riskEvidence(risk),
      horizon: SEVERITY_HORIZON[risk.severity],
    }));
}
