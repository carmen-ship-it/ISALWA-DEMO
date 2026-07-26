import { createId } from "@/lib/utils";
import type {
  BusinessProfile,
  ConsultingRisk,
  ConsultingRiskPatternId,
  ConversationMemory,
  RiskSeverity,
} from "@/types";

interface RiskRule {
  patternId: ConsultingRiskPatternId;
  title: string;
  severity: RiskSeverity;
  businessImpact: string;
  recommendedMitigation: string;
  test: (ctx: RiskContext) => { hit: boolean; evidence: string[]; confidence: number };
}

interface RiskContext {
  blob: string;
  memory: ConversationMemory;
  business: BusinessProfile;
  signalIds: Set<string>;
}

const RULES: RiskRule[] = [
  {
    patternId: "excel_dependency",
    title: "Dependencia de Excel",
    severity: "high",
    businessImpact:
      "La verdad operativa se fragmenta entre archivos; las decisiones se retrasan y los errores se acumulan.",
    recommendedMitigation:
      "Designar un sistema de registro y retirar por proceso las hojas de cálculo que sostienen la operación.",
    test: ({ signalIds, blob, memory }) => ({
      hit: signalIds.has("excel") || /excel|spreadsheet/i.test(blob),
      evidence: [
        ...memory.summary.currentSoftware.filter((t) => /excel|sheet/i.test(t)),
        ...memory.painPoints
          .filter((p) => /excel|spreadsheet/i.test(p.title))
          .map((p) => p.title),
      ].slice(0, 3),
      confidence: 0.86,
    }),
  },
  {
    patternId: "whatsapp_dependency",
    title: "Dependencia de WhatsApp",
    severity: "high",
    businessImpact:
      "El historial de clientes y negociaciones vive en dispositivos personales; la continuidad se rompe cuando alguien se va.",
    recommendedMitigation:
      "Capturar las conversaciones comerciales en un registro de clientes compartido con propiedad clara.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("whatsapp") || /whatsapp/i.test(blob),
      evidence: ["Mensajería usada como flujo de trabajo"],
      confidence: 0.84,
    }),
  },
  {
    patternId: "paper_forms",
    title: "Formularios en papel",
    severity: "moderate",
    businessImpact: "Ciclos lentos, papeleo extraviado y trazabilidad débil.",
    recommendedMitigation:
      "Digitalizar primero los formularios de mayor volumen; mantener explícitas las excepciones.",
    test: ({ signalIds }) => ({
      hit: signalIds.has("paper"),
      evidence: ["Señal de proceso basado en papel"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "manual_approvals",
    title: "Aprobaciones manuales",
    severity: "high",
    businessImpact: "El trabajo se encola detrás de personas; la política es informal y desigual.",
    recommendedMitigation:
      "Codificar umbrales, respaldos y rastros de aprobación en un flujo compartido.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("approvals") || /manual approv/i.test(blob),
      evidence: ["Señal de cuello de botella en aprobaciones"],
      confidence: 0.82,
    }),
  },
  {
    patternId: "duplicate_work",
    title: "Trabajo duplicado",
    severity: "moderate",
    businessImpact: "El costo y la tasa de error suben cuando los mismos datos se capturan repetidamente.",
    recommendedMitigation:
      "Capturar una sola vez en la entrada; propagar a través de los módulos en vez de recapturar.",
    test: ({ signalIds }) => ({
      hit: signalIds.has("duplicate") || signalIds.has("repeated"),
      evidence: ["Señal de trabajo duplicado / repetido"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "manual_reporting",
    title: "Reportes manuales",
    severity: "moderate",
    businessImpact: "El liderazgo ve la foto de ayer; el reporte consume tiempo escaso.",
    recommendedMitigation:
      "Definir métricas confiables y generarlas directamente desde los sistemas operativos.",
    test: ({ signalIds, blob }) => ({
      hit: signalIds.has("reports") || /manual report|end of (the )?month/i.test(blob),
      evidence: ["Señal de reporte manual"],
      confidence: 0.78,
    }),
  },
  {
    patternId: "tribal_knowledge",
    title: "Conocimiento tribal",
    severity: "critical",
    businessImpact:
      "La empresa no puede escalar ni recuperarse si las personas clave no están disponibles.",
    recommendedMitigation:
      "Externalizar los procedimientos críticos y la propiedad hacia una memoria empresarial duradera.",
    test: ({ blob }) => ({
      hit: /tribal|only .+ knows|in (my|his|her) head|key person/i.test(blob),
      evidence: ["Lenguaje que sugiere conocimiento concentrado en personas"],
      confidence: 0.75,
    }),
  },
  {
    patternId: "no_documentation",
    title: "Sin documentación",
    severity: "high",
    businessImpact: "La capacitación, la calidad y la continuidad dependen de la tradición oral.",
    recommendedMitigation:
      "Comenzar con los cinco procedimientos de mayor riesgo y mantenerlos con dueño y vigentes.",
    test: ({ blob }) => ({
      hit: /no (sop|documentation|docs)|don'?t (have|use) (sops?|documentation)|undocumented/i.test(
        blob,
      ),
      evidence: ["Se mencionó una brecha de documentación"],
      confidence: 0.8,
    }),
  },
  {
    patternId: "single_employee_owns_everything",
    title: "Una sola persona concentra todo",
    severity: "critical",
    businessImpact: "Riesgo de dependencia crítica sobre aprobaciones, clientes u operaciones.",
    recommendedMitigation:
      "Introducir respaldos, colas compartidas y claridad de roles en las rutas críticas.",
    test: ({ blob, memory }) => ({
      hit:
        /one person|only (i|he|she|one)|single (person|owner|employee)|everything goes through/i.test(
          blob,
        ) ||
        (memory.summary.teamHint !== null &&
          /1|one|solo/i.test(memory.summary.teamHint)),
      evidence: ["Se sugiere concentración de la propiedad"],
      confidence: 0.72,
    }),
  },
  {
    patternId: "no_audit_trail",
    title: "Sin rastro de auditoría",
    severity: "high",
    businessImpact: "Las disputas y las revisiones de cumplimiento no pueden reconstruir las decisiones.",
    recommendedMitigation:
      "Registrar quién aprobó qué, cuándo, y contra qué versión de política.",
    test: ({ blob }) => ({
      hit: /no audit|no trail|can'?t (prove|show)|no history of approv/i.test(blob),
      evidence: ["Preocupación por la trazabilidad"],
      confidence: 0.7,
    }),
  },
  {
    patternId: "no_backups",
    title: "Sin respaldos",
    severity: "critical",
    businessImpact: "La pérdida de datos operativos se vuelve una amenaza existencial.",
    recommendedMitigation:
      "Establecer propiedad de respaldos y pruebas de recuperación para los repositorios críticos.",
    test: ({ blob }) => ({
      hit: /no backup|without backup|lost (the )?file|drive (died|failed)/i.test(blob),
      evidence: ["Brecha de respaldo / recuperación"],
      confidence: 0.78,
    }),
  },
  {
    patternId: "customer_concentration",
    title: "Concentración de clientes",
    severity: "high",
    businessImpact: "Choque de ingresos si un grupo reducido de clientes se va.",
    recommendedMitigation:
      "Medir la concentración, proteger las cuentas clave y diversificar la adquisición.",
    test: ({ blob }) => ({
      hit: /few customers|top (client|customer)|concentrat|depend on one customer/i.test(
        blob,
      ),
      evidence: ["Posible concentración de clientes"],
      confidence: 0.68,
    }),
  },
  {
    patternId: "supplier_concentration",
    title: "Concentración de proveedores",
    severity: "moderate",
    businessImpact: "Una disrupción de suministro se propaga a producción y entrega.",
    recommendedMitigation:
      "Mapear los proveedores críticos y definir fuentes alternas para los SKU principales.",
    test: ({ blob }) => ({
      hit: /one supplier|single vendor|only supplier|supplier risk/i.test(blob),
      evidence: ["Posible concentración de proveedores"],
      confidence: 0.66,
    }),
  },
];

/**
 * Operational risk pattern detection — deterministic.
 */
export function evaluateRisks(
  memory: ConversationMemory,
  business: BusinessProfile,
): ConsultingRisk[] {
  const blob = [
    ...memory.knownFacts.map((f) => f.statement),
    ...memory.painPoints.map((p) => `${p.title} ${p.description}`),
    ...memory.summary.painPoints,
    business.description ?? "",
  ]
    .join("\n")
    .toLowerCase();

  const signalIds = new Set(business.signals.map((s) => s.id));
  const ctx: RiskContext = { blob, memory, business, signalIds };
  const risks: ConsultingRisk[] = [];

  for (const rule of RULES) {
    const result = rule.test(ctx);
    if (!result.hit) continue;
    risks.push({
      id: createId("crisk"),
      patternId: rule.patternId,
      title: rule.title,
      severity: rule.severity,
      confidence: result.confidence,
      businessImpact: rule.businessImpact,
      recommendedMitigation: rule.recommendedMitigation,
      evidence:
        result.evidence.length > 0
          ? result.evidence
          : [`Patrón detectado: ${rule.title}`],
    });
  }

  return risks.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function severityRank(severity: RiskSeverity): number {
  switch (severity) {
    case "critical":
      return 4;
    case "high":
      return 3;
    case "moderate":
      return 2;
    case "low":
      return 1;
  }
}
