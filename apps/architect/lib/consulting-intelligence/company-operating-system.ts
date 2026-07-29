/**
 * Mission 25 + Mission 27 — Company Operating System.
 *
 * Deliverables are outputs. The Company Operating System is the product.
 * This module composes Mission 26 living generators + Readiness inventory into
 * capability categories, honest Build status, Business Impact, and progress —
 * never a second scorer or document catalog.
 *
 * Pipeline: Conversation → Knowledge → Company Brain → Operating System → Business Results
 */

import {
  buildLivingDeliverablesOverview,
  livingDeliverableCopy,
  computeKnowledgeFingerprint,
} from "@/lib/deliverables/living";
import { snapshotFromWorkspace } from "@/lib/readiness";
import type {
  CompanyWorkspace,
  LivingDeliverableKind,
  LivingDeliverableOverview,
  TimelineEvent,
} from "@/types";

export type OperatingSystemModuleId =
  | LivingDeliverableKind
  | "ai_knowledge_base"
  | "evolution_timeline";

/** @deprecated Mission 25 labels — prefer OsArtifactStatus (Mission 27). */
export type OperatingSystemReadiness =
  | "ready"
  | "partial"
  | "needs_knowledge"
  | "roadmap";

export type OsArtifactStatus =
  | "not_started"
  | "needs_knowledge"
  | "ready_to_build"
  | "update_available";

export type OsCapabilityCategoryId =
  | "foundation"
  | "people"
  | "operations"
  | "ai"
  | "growth";

export interface OsBuiltFrom {
  interviewFacts: number;
  documents: number;
  /** Real human discovery sessions only — never internal transcript ingestion (`meetings` below still exists for the evidence-count total). */
  discoverySessions: number;
  /** All `Meeting` records (discovery sessions + transcript ingestion) — internal evidence-count total, never rendered as "reuniones" on its own. */
  meetings: number;
}

export interface OsProgressBar {
  id: "knowledge" | "operating_system" | "documentation" | "training" | "automation";
  label: string;
  percent: number;
}

export interface OsPipelineStep {
  id: string;
  label: string;
}

export interface OperatingSystemArtifact {
  kind: LivingDeliverableKind;
  categoryId: OsCapabilityCategoryId;
  categoryLabel: string;
  /** Capability system this output belongs to (e.g. People System). */
  capabilitySystem: string;
  title: string;
  shortTitle: string;
  description: string;
  status: OsArtifactStatus;
  statusLabel: string;
  confidencePercent: number;
  businessImpact: string[];
  missingInformation: string[];
  builtFrom: OsBuiltFrom;
  whyMatters: string;
  buildLabel: string;
  buildBusyLabel: string;
  hasVersion: boolean;
  version: number | null;
  lastUpdatedAt: string | null;
  updateAvailable: boolean;
  evidenceCount: number;
}

export interface OsCapabilityCategory {
  id: OsCapabilityCategoryId;
  label: string;
  systemLabel: string;
  artifacts: OperatingSystemArtifact[];
}

/** Legacy Mission 25 module shape — still exported for any residual callers. */
export interface OperatingSystemModule {
  id: OperatingSystemModuleId;
  title: string;
  description: string;
  readiness: OperatingSystemReadiness;
  readinessLabel: string;
  confidence: number;
  evidenceCount: number;
  generatedFrom: string[];
  lastUpdatedAt: string | null;
  becauseWeUnderstand: string;
  deliverableKind: LivingDeliverableKind | null;
  updateAvailable: boolean;
  hasVersion: boolean;
  generateLabel: string;
}

export interface OperatingSystemReport {
  companyName: string;
  understandingPercent: number;
  headline: string;
  pipelineNote: string;
  /** Mission 27 product promise. */
  promise: string;
  pipeline: OsPipelineStep[];
  progress: OsProgressBar[];
  categories: OsCapabilityCategory[];
  artifacts: OperatingSystemArtifact[];
  modules: OperatingSystemModule[];
  evolutionEvents: TimelineEvent[];
}

const CATEGORY_META: Record<
  OsCapabilityCategoryId,
  { label: string; systemLabel: string }
> = {
  foundation: {
    label: "Fundamentos",
    systemLabel: "Sistema de fundamentos",
  },
  people: {
    label: "Personas",
    systemLabel: "Sistema de personas",
  },
  operations: {
    label: "Operaciones",
    systemLabel: "Sistema de operaciones",
  },
  ai: {
    label: "IA y automatización",
    systemLabel: "Sistema de IA y automatización",
  },
  growth: {
    label: "Crecimiento",
    systemLabel: "Sistema de crecimiento",
  },
};

const KIND_CATEGORY: Record<LivingDeliverableKind, OsCapabilityCategoryId> = {
  business_blueprint: "foundation",
  company_playbook: "foundation",
  employee_handbook: "people",
  job_description_library: "people",
  training_academy: "people",
  sop_library: "operations",
  ai_playbook: "ai",
  improvement_roadmap: "growth",
};

const CATEGORY_ORDER: OsCapabilityCategoryId[] = [
  "foundation",
  "people",
  "operations",
  "ai",
  "growth",
];

/** Business Impact — why the capability matters (people buy fewer problems). */
const BUSINESS_IMPACT: Record<LivingDeliverableKind, string[]> = {
  business_blueprint: [
    "Decisiones alineadas con cómo opera el negocio de verdad",
    "Menos ambigüedad entre dueños y equipo",
    "Base clara para priorizar tecnología e inversión",
  ],
  company_playbook: [
    "Cultura y principios escritos, no solo en la cabeza del dueño",
    "Onboarding más rápido a la forma de decidir de la empresa",
    "Menos fricción entre departamentos",
  ],
  employee_handbook: [
    "Onboarding más rápido",
    "Políticas más consistentes",
    "Menos preguntas repetidas a RR. HH.",
    "Menor riesgo de cumplimiento",
  ],
  sop_library: [
    "Ejecución consistente",
    "Delegación más fácil",
    "Capacitación más rápida",
    "Menos conocimiento tribal",
  ],
  job_description_library: [
    "Roles claros y responsabilidades explícitas",
    "Contratación y evaluación más justas",
    "Menos solapamiento o huecos entre puestos",
  ],
  training_academy: [
    "Equipos productivos más pronto",
    "Menos dependencia de una sola persona",
    "Calidad más predecible en el trabajo diario",
  ],
  ai_playbook: [
    "Prioridad clara de dónde la IA aporta primero",
    "Menos experimentos sin retorno",
    "Riesgo y gobernanza visibles antes de automatizar",
  ],
  improvement_roadmap: [
    "Mayor eficiencia operativa",
    "Prioridades de implementación claras",
    "Mejor visibilidad del retorno (ROI)",
  ],
};

const WHY_MATTERS: Record<LivingDeliverableKind, string> = {
  business_blueprint:
    "Es el mapa único de cómo opera la empresa — sin él, cada decisión parte de supuestos distintos.",
  company_playbook:
    "Convierte la forma de trabajar de la empresa en un sistema compartido, no en costumbres personales.",
  employee_handbook:
    "Los empleados necesitan expectativas consistentes; el manual es la salida del Sistema de Personas.",
  sop_library:
    "Los procesos repetibles son el Sistema de Operaciones; los SOPs son su representación escrita.",
  job_description_library:
    "Sin roles claros, el Sistema de Personas no escala ni se puede delegar con confianza.",
  training_academy:
    "Capacitar es cómo el Sistema de Personas multiplica lo que ya saben los mejores.",
  ai_playbook:
    "La automatización sin criterio crea caos; este playbook ancla el Sistema de IA al negocio real.",
  improvement_roadmap:
    "El Sistema de Crecimiento necesita un orden honesto de qué mejorar primero y por qué.",
};

function statusFromOverview(
  item: LivingDeliverableOverview,
  understandingPercent: number,
  missingCount: number,
): { status: OsArtifactStatus; statusLabel: string } {
  if (item.updateAvailable) {
    return {
      status: "update_available",
      statusLabel: "Actualización disponible",
    };
  }
  if (!item.latest) {
    if (understandingPercent >= 35) {
      return {
        status: "ready_to_build",
        statusLabel: "Listo para construir",
      };
    }
    if (understandingPercent > 0) {
      return {
        status: "needs_knowledge",
        statusLabel: "Necesita más conocimiento",
      };
    }
    return {
      status: "not_started",
      statusLabel: "Sin iniciar",
    };
  }
  if (missingCount >= 3 || (item.latest.confidence < 0.45 && missingCount > 0)) {
    return {
      status: "needs_knowledge",
      statusLabel: "Necesita más conocimiento",
    };
  }
  // Built and stable — surface as ready-to-build language for "can strengthen"
  // is wrong; keep needs_knowledge false. Use not_started bucket only for empty.
  // Display layer shows Version N; status chip uses a calm "Construido" via label:
  return {
    status: "ready_to_build",
    statusLabel: "Construido",
  };
}

function artifactFromLiving(
  workspace: CompanyWorkspace,
  item: LivingDeliverableOverview,
  builtFrom: OsBuiltFrom,
  understandingPercent: number,
): OperatingSystemArtifact {
  const copy = livingDeliverableCopy(item.kind, workspace.companyName);
  const categoryId = KIND_CATEGORY[item.kind];
  const meta = CATEGORY_META[categoryId];
  // latest.confidence is 0–1; understandingPercent is already 0–100
  const confidenceDisplay = item.latest
    ? Math.round(item.latest.confidence * 100)
    : understandingPercent;
  const missing = item.latest?.missingInformation ?? [];
  const { status, statusLabel } = statusFromOverview(
    item,
    understandingPercent,
    missing.length,
  );

  return {
    kind: item.kind,
    categoryId,
    categoryLabel: meta.label,
    capabilitySystem: meta.systemLabel,
    title: copy.title,
    shortTitle: copy.shortTitle,
    description: copy.description,
    status,
    statusLabel,
    confidencePercent: confidenceDisplay,
    businessImpact: BUSINESS_IMPACT[item.kind],
    missingInformation: missing,
    builtFrom,
    whyMatters: WHY_MATTERS[item.kind],
    buildLabel: item.updateAvailable
      ? copy.updateLabel
      : item.latest
        ? copy.regenerateLabel
        : copy.generateLabel,
    buildBusyLabel: copy.generateBusyLabel,
    hasVersion: Boolean(item.latest),
    version: item.latest?.version ?? null,
    lastUpdatedAt: item.latest?.generatedAt ?? null,
    updateAvailable: item.updateAvailable,
    evidenceCount:
      item.latest?.evidenceCount ??
      builtFrom.interviewFacts + builtFrom.documents + builtFrom.meetings,
  };
}

function toLegacyModule(artifact: OperatingSystemArtifact): OperatingSystemModule {
  const readinessMap: Record<OsArtifactStatus, OperatingSystemReadiness> = {
    not_started: "needs_knowledge",
    needs_knowledge: "needs_knowledge",
    ready_to_build: artifact.hasVersion ? "ready" : "partial",
    update_available: "partial",
  };
  return {
    id: artifact.kind,
    title: artifact.title,
    description: artifact.description,
    readiness: readinessMap[artifact.status],
    readinessLabel: artifact.statusLabel,
    confidence: artifact.confidencePercent,
    evidenceCount: artifact.evidenceCount,
    generatedFrom: [
      `${artifact.builtFrom.interviewFacts} hechos de entrevista`,
      `${artifact.builtFrom.documents} documentos`,
      `${artifact.builtFrom.discoverySessions} sesiones de descubrimiento`,
    ],
    lastUpdatedAt: artifact.lastUpdatedAt,
    becauseWeUnderstand: artifact.whyMatters,
    deliverableKind: artifact.kind,
    updateAvailable: artifact.updateAvailable,
    hasVersion: artifact.hasVersion,
    generateLabel: artifact.buildLabel,
  };
}

export function buildCompanyOperatingSystem(
  workspace: CompanyWorkspace,
): OperatingSystemReport {
  const overview = buildLivingDeliverablesOverview(workspace);
  const fingerprint = computeKnowledgeFingerprint(workspace);
  const understandingPercent = fingerprint.understandingPercent;
  const inventory = snapshotFromWorkspace(workspace).inventory;
  const builtFrom: OsBuiltFrom = {
    interviewFacts: inventory.interviewFacts,
    documents: inventory.documents,
    discoverySessions: inventory.discoverySessions,
    meetings: inventory.meetings,
  };

  const artifacts = overview.map((item) =>
    artifactFromLiving(workspace, item, builtFrom, understandingPercent),
  );

  const categories: OsCapabilityCategory[] = CATEGORY_ORDER.map((id) => {
    const meta = CATEGORY_META[id];
    return {
      id,
      label: meta.label,
      systemLabel: meta.systemLabel,
      artifacts: artifacts.filter((a) => a.categoryId === id),
    };
  }).filter((c) => c.artifacts.length > 0);

  const builtCount = artifacts.filter((a) => a.hasVersion).length;
  const totalKinds = artifacts.length || 1;
  const osPercent = Math.round((builtCount / totalKinds) * 100);
  const docPercent = osPercent;
  const trainingArtifact = artifacts.find((a) => a.kind === "training_academy");
  const aiArtifact = artifacts.find((a) => a.kind === "ai_playbook");
  const trainingPercent = trainingArtifact?.hasVersion
    ? trainingArtifact.confidencePercent
    : 0;
  const automationPercent = aiArtifact?.hasVersion
    ? aiArtifact.confidencePercent
    : 0;

  const progress: OsProgressBar[] = [
    {
      id: "knowledge",
      label: "Conocimiento",
      percent: understandingPercent,
    },
    {
      id: "operating_system",
      label: "Sistema operativo",
      percent: osPercent,
    },
    {
      id: "documentation",
      label: "Documentación",
      percent: docPercent,
    },
    {
      id: "training",
      label: "Capacitación",
      percent: trainingPercent,
    },
    {
      id: "automation",
      label: "Automatización",
      percent: automationPercent,
    },
  ];

  const evolutionEvents = [...(workspace.timeline ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  const modules: OperatingSystemModule[] = artifacts.map(toLegacyModule);
  modules.push({
    id: "ai_knowledge_base",
    title: "Base de conocimiento con IA",
    description:
      "En el futuro, los documentos que Architect genera serán buscables: un empleado preguntará “¿cómo pido vacaciones?” y recibirá la respuesta desde SU manual — no desde un GPT genérico.",
    readiness: "roadmap",
    readinessLabel: "Hoja de ruta",
    confidence: 0,
    evidenceCount: 0,
    generatedFrom: ["Company Brain", "Sistema operativo"],
    lastUpdatedAt: null,
    becauseWeUnderstand:
      "Se activa cuando el Manual y los SOPs existen como salidas del sistema operativo.",
    deliverableKind: null,
    updateAvailable: false,
    hasVersion: false,
    generateLabel: "Próximamente",
  });
  modules.push({
    id: "evolution_timeline",
    title: "Línea de evolución del sistema",
    description:
      "Cada vez que el Company Brain mejora, el Operating System evoluciona. Solo hitos reales.",
    readiness: (workspace.timeline ?? []).length > 0 ? "partial" : "needs_knowledge",
    readinessLabel: (workspace.timeline ?? []).length > 0 ? "Vivo" : "Sin hitos todavía",
    confidence: understandingPercent,
    evidenceCount: (workspace.timeline ?? []).length,
    generatedFrom: ["Timeline", "Blueprint", "Sistema operativo"],
    lastUpdatedAt: workspace.timeline?.[0]?.date ?? null,
    becauseWeUnderstand:
      "Mostramos solo eventos reales del timeline — nunca actividad inventada.",
    deliverableKind: null,
    updateAvailable: false,
    hasVersion: (workspace.timeline ?? []).length > 0,
    generateLabel: "Ver evolución",
  });

  return {
    companyName: workspace.companyName,
    understandingPercent,
    headline: `Architect está construyendo el sistema operativo de ${workspace.companyName}.`,
    pipelineNote:
      "Las salidas (PDF, Word, manuales, SOPs) son representaciones del mismo Company Brain — el producto es cómo opera la empresa.",
    promise:
      "El Sistema Operativo de tu empresa crece cada vez que Architect aprende algo nuevo sobre tu negocio.",
    pipeline: [
      { id: "conversation", label: "Conversación" },
      { id: "knowledge", label: "Conocimiento" },
      { id: "brain", label: "Company Brain" },
      { id: "os", label: "Sistema operativo" },
      { id: "results", label: "Resultados de negocio" },
    ],
    progress,
    categories,
    artifacts,
    modules,
    evolutionEvents,
  };
}
