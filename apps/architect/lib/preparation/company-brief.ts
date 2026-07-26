/**
 * Preparation Brief types + deterministic assembly.
 * Spanish interview opening for product consistency.
 */

import {
  derivePreparationConfidence,
  type PreparationConfidence,
} from "./confidence";
import {
  derivePreparationCoverage,
  type PreparationCoverage,
  type PreparationTopicId,
} from "./coverage";
import type { PreparationInput } from "./knowledge-merge";
import {
  PREPARATION_SOURCE_CONTRACTS,
  type PreparationSourceContract,
  type PreparationSourceKind,
} from "./sources";

/** Canonical pre-interview brief the Architect arrives with. */
export interface PreparationBrief {
  workspaceId: string;
  companyName: string;
  /** Already Known */
  alreadyKnown: string[];
  /** Likely Risks */
  likelyRisks: string[];
  /** Unknown Areas */
  unknownAreas: string[];
  /** Questions To Validate */
  questionsToValidate: string[];
  /** Departments Requiring Attention */
  departmentsRequiringAttention: string[];
  /** Potential Quick Wins */
  potentialQuickWins: string[];
  /** Potential Missing Systems */
  potentialMissingSystems: string[];
  confidence: PreparationConfidence;
  coverage: PreparationCoverage;
  /** Spanish greeting for interview start. */
  interviewOpening: string;
  /** Source kinds implied by current in-app evidence. */
  impliedSourceKinds: PreparationSourceKind[];
  /** Full FUTURE source catalog (contracts only). */
  futureSources: readonly PreparationSourceContract[];
}

const SYSTEM_GAP_RULES: Array<{
  pattern: RegExp;
  missing: string;
}> = [
  {
    pattern: /excel|spreadsheet|hoja de c[aá]lculo/i,
    missing: "Sistema de registro operativo (hoy depende de Excel)",
  },
  {
    pattern: /whatsapp|mensaje|chat/i,
    missing: "CRM / historial comercial compartido",
  },
  {
    pattern: /papel|manual|sin sistema|no system/i,
    missing: "Flujos digitales con auditoría",
  },
  {
    pattern: /aprobaci[oó]n|approval/i,
    missing: "Motor de aprobaciones con umbrales",
  },
  {
    pattern: /inventario|inventory|stock/i,
    missing: "Control de inventario en tiempo casi real",
  },
  {
    pattern: /factur|invoice|billing/i,
    missing: "Facturación integrada al operativo",
  },
  {
    pattern: /reporte|reporting|dashboard/i,
    missing: "Reporting ejecutivo automatizado",
  },
];

const TOPIC_LABELS_ES: Record<PreparationTopicId, string> = {
  Customers: "Clientes",
  Sales: "Ventas",
  Operations: "Operaciones",
  Finance: "Finanzas",
  HR: "Personas / RR.HH.",
  Systems: "Sistemas",
  Geography: "Geografía",
  Production: "Producción",
  Team: "Equipo",
};

/**
 * Translate a preparation topic id when it is a known coverage/topic area;
 * otherwise pass the value through untouched (it may already be free-form
 * Spanish text, e.g. a memory unknown-fact label).
 */
function topicLabel(topic: string): string {
  return TOPIC_LABELS_ES[topic as PreparationTopicId] ?? topic;
}

/**
 * Build Spanish interview opening from confidence + next clarification focus.
 */
export function buildInterviewOpening(input: {
  approximatePercent: number;
  clarifyFocus: string | null;
}): string {
  const x = Math.max(0, Math.min(100, Math.round(input.approximatePercent)));
  const focus =
    input.clarifyFocus?.trim() ||
    "algunos detalles operativos que aún no están claros";

  return `Revisé la información disponible de la empresa. Ya comprendo aproximadamente ${x}%. Ahora solo necesito aclarar ${focus}.`;
}

function deriveMissingSystems(input: PreparationInput): string[] {
  const blob = [
    ...input.painPoints,
    ...input.knownFacts,
    ...input.currentSoftware,
    ...input.consultingRiskTitles,
    ...input.knowledgeThemes,
  ].join(" · ");

  const missing: string[] = [];
  for (const rule of SYSTEM_GAP_RULES) {
    if (rule.pattern.test(blob)) {
      missing.push(rule.missing);
    }
  }

  // Modules on the whiteboard but not in current software → potential gaps.
  for (const mod of input.whiteboardModules.slice(0, 4)) {
    const already =
      input.currentSoftware.some((s) =>
        s.toLowerCase().includes(mod.toLowerCase().slice(0, 6)),
      ) || missing.some((m) => m.toLowerCase().includes(mod.toLowerCase()));
    if (!already) {
      missing.push(`Capacidad pendiente: ${mod}`);
    }
  }

  return unique(missing).slice(0, 8);
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}

/**
 * Assemble PreparationBrief from merged preparation input.
 */
export function assemblePreparationBrief(
  input: PreparationInput,
): PreparationBrief {
  const confidence = derivePreparationConfidence({
    businessUnderstanding: input.businessUnderstanding,
    discoveryScore: input.discoveryScore,
    knowledgeCoverage: input.knowledgeCoverage,
    knownFactCount: input.knownFacts.length,
    processedAssetCount: input.processedAssetCount,
  });

  const coverage = derivePreparationCoverage({
    knowledgeCoverage: input.knowledgeCoverage,
    discoveryScore: input.discoveryScore,
    departments: input.departments,
  });

  const alreadyKnown = unique([
    ...input.knownFacts,
    ...input.knowledgeThemes,
    ...input.meetingDiscoveries,
  ]).slice(0, 12);

  const likelyRisks = unique([
    ...input.consultingRiskTitles,
    ...input.painPoints.map((p) => `Riesgo operativo: ${p}`),
  ]).slice(0, 10);

  const unknownAreas = unique(input.unknownAreas.map(topicLabel)).slice(0, 12);

  const questionsToValidate = unique([
    ...input.openQuestions,
    ...unknownAreas.map((area) => `Validar: ${area}`),
  ]).slice(0, 12);

  const departmentsRequiringAttention = unique([
    ...coverage.requiringAttention.map(topicLabel),
    ...input.departments.filter((dept) => {
      const lower = dept.toLowerCase();
      return (
        input.painPoints.some((p) => p.toLowerCase().includes(lower)) ||
        unknownAreas.some((u) => u.toLowerCase().includes(lower))
      );
    }),
  ]).slice(0, 10);

  const potentialQuickWins = unique([
    ...input.consultingQuickWins,
    ...input.consultingOpportunityTitles.filter((title) =>
      /r[aá]pido|quick|compartid|shared|umbrales|sop/i.test(title),
    ),
  ]).slice(0, 8);

  const potentialMissingSystems = deriveMissingSystems(input);

  const clarifyFocus =
    questionsToValidate[0]?.replace(/^Validar:\s*/i, "") ??
    unknownAreas[0] ??
    departmentsRequiringAttention[0] ??
    null;

  const interviewOpening = buildInterviewOpening({
    approximatePercent: confidence.approximatePercent,
    clarifyFocus,
  });

  return {
    workspaceId: input.workspaceId,
    companyName: input.companyName,
    alreadyKnown,
    likelyRisks,
    unknownAreas,
    questionsToValidate,
    departmentsRequiringAttention,
    potentialQuickWins,
    potentialMissingSystems,
    confidence,
    coverage,
    interviewOpening,
    impliedSourceKinds: input.impliedSourceKinds,
    futureSources: PREPARATION_SOURCE_CONTRACTS,
  };
}
