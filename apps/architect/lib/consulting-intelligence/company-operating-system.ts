/**
 * Mission 25 — Company Operating System (product pass).
 *
 * Presentation hub: Conversation → Knowledge → Company Brain → Operating System.
 * Module readiness/confidence/evidence come from Mission 26 living deliverable
 * versions + workspace fingerprint — never a second scorer.
 */

import {
  buildLivingDeliverablesOverview,
  livingDeliverableCopy,
  computeKnowledgeFingerprint,
} from "@/lib/deliverables/living";
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

export type OperatingSystemReadiness =
  | "ready"
  | "partial"
  | "needs_knowledge"
  | "roadmap";

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
  modules: OperatingSystemModule[];
  evolutionEvents: TimelineEvent[];
}

function readinessFromOverview(
  item: LivingDeliverableOverview,
  confidence: number,
  missingCount: number,
): { readiness: OperatingSystemReadiness; readinessLabel: string } {
  if (item.updateAvailable) {
    return { readiness: "partial", readinessLabel: "Actualización disponible" };
  }
  if (item.latest && confidence >= 55 && missingCount === 0) {
    return { readiness: "ready", readinessLabel: "Listo" };
  }
  if (item.latest || confidence >= 35) {
    return {
      readiness: "partial",
      readinessLabel: "Parcial — necesita más conocimiento",
    };
  }
  return {
    readiness: "needs_knowledge",
    readinessLabel: "Necesita más conocimiento",
  };
}

function moduleFromLiving(
  workspace: CompanyWorkspace,
  item: LivingDeliverableOverview,
): OperatingSystemModule {
  const copy = livingDeliverableCopy(item.kind, workspace.companyName);
  const confidence = item.latest?.confidence ?? computeKnowledgeFingerprint(workspace).understandingPercent;
  const evidenceCount =
    item.latest?.evidenceCount ?? computeKnowledgeFingerprint(workspace).evidenceCount;
  const missingCount = item.latest?.missingInformation.length ?? 1;
  const { readiness, readinessLabel } = readinessFromOverview(
    item,
    confidence,
    item.latest ? missingCount : 99,
  );

  return {
    id: item.kind,
    title: copy.title,
    description: copy.description,
    readiness,
    readinessLabel,
    confidence,
    evidenceCount,
    generatedFrom: [
      "Company Brain",
      "Blueprint",
      "Modelo de la empresa",
      "Evidencia",
    ],
    lastUpdatedAt: item.latest?.generatedAt ?? null,
    becauseWeUnderstand:
      evidenceCount > 0
        ? `Podemos generar esto porque Architect ya reunió evidencia real sobre ${workspace.companyName} (${evidenceCount} señales).`
        : `Architect todavía necesita más evidencia para completar ${copy.shortTitle} con confianza.`,
    deliverableKind: item.kind,
    updateAvailable: item.updateAvailable,
    hasVersion: Boolean(item.latest),
    generateLabel: item.updateAvailable
      ? copy.updateLabel
      : item.latest
        ? copy.regenerateLabel
        : copy.generateLabel,
  };
}

export function buildCompanyOperatingSystem(
  workspace: CompanyWorkspace,
): OperatingSystemReport {
  const overview = buildLivingDeliverablesOverview(workspace);
  const understandingPercent = computeKnowledgeFingerprint(workspace).understandingPercent;

  const modules: OperatingSystemModule[] = overview.map((item) =>
    moduleFromLiving(workspace, item),
  );

  modules.push({
    id: "ai_knowledge_base",
    title: "Base de conocimiento con IA",
    description:
      "En el futuro, los documentos que Architect genera serán buscables: un empleado preguntará “¿cómo pido vacaciones?” y recibirá la respuesta desde SU manual — no desde un GPT genérico.",
    readiness: "roadmap",
    readinessLabel: "Hoja de ruta",
    confidence: 0,
    evidenceCount: 0,
    generatedFrom: ["Company Brain", "Entregables vivos"],
    lastUpdatedAt: null,
    becauseWeUnderstand:
      "Se activa cuando el Manual y los SOPs existen como entregables vivos.",
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
    generatedFrom: ["Timeline", "Blueprint", "Entregables"],
    lastUpdatedAt: workspace.timeline?.[0]?.date ?? null,
    becauseWeUnderstand:
      "Mostramos solo eventos reales del timeline — nunca actividad inventada.",
    deliverableKind: null,
    updateAvailable: false,
    hasVersion: (workspace.timeline ?? []).length > 0,
    generateLabel: "Ver evolución",
  });

  const evolutionEvents = [...(workspace.timeline ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);

  return {
    companyName: workspace.companyName,
    understandingPercent,
    headline: `Architect ha aprendido lo suficiente para empezar a construir el sistema operativo de ${workspace.companyName}.`,
    pipelineNote:
      "Todo lo de abajo se genera desde el Company Brain. Cada entrevista, reunión, documento, proceso y recomendación lo hace más inteligente.",
    modules,
    evolutionEvents,
  };
}
