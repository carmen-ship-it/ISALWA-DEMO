/**
 * Consulting Intelligence Agent — internal working memory collectors.
 *
 * Every collector below is a *reader*. None of them scores, ranks or infers
 * anything: each one takes what an existing engine already published and
 * copies it into the agent's private notebook, tagging it with the engine it
 * came from so a human can always trace a note back to its source.
 *
 * That constraint is what keeps the agent from becoming a second brain
 * competing with the first one.
 */

import { createId } from "@/lib/utils";
import { evaluateContradictions } from "@/lib/consulting";
import { missingInformationUploadHint } from "@/lib/readiness/topics";
import { buildRetrievalPackSync } from "@/lib/ai/retrieval";
import type { RetrievalItem, RetrievalItemKind } from "@/lib/ai/retrieval";
import type {
  ConfidenceCategory,
  ExplainableConfidenceReport,
  MissingInformationReport,
  ReadinessAssessment,
  ReadinessLearningItem,
} from "@/lib/readiness";
import type { CompanyWorkspace } from "@/types";
import type {
  HighestValueUnknown,
  MissingEvidenceItem,
  RelatedEvidenceItem,
  WorkingContradiction,
  WorkingNote,
} from "./types";

const MAX_NOTES = 12;
const MAX_EVIDENCE_PACK = 10;

/** Hypotheses the interview reasoning already formed. */
export function collectHypotheses(workspace: CompanyWorkspace): WorkingNote[] {
  const memory = workspace.conversationMemory;
  if (!memory) return [];
  return memory.hypotheses
    .filter((hypothesis) => hypothesis.status === "active")
    .slice(0, MAX_NOTES)
    .map((hypothesis) => ({
      id: hypothesis.id,
      statement: hypothesis.statement,
      basis: "memoria de conversación · hipótesis",
      confidence: normalizeConfidence(hypothesis.confidence),
    }));
}

/** Assumptions we are running on, with the risk the engine attached. */
export function collectAssumptions(workspace: CompanyWorkspace): WorkingNote[] {
  const memory = workspace.conversationMemory;
  if (!memory) return [];
  return memory.assumptions.slice(0, MAX_NOTES).map((assumption) => ({
    id: assumption.id,
    statement: assumption.risk
      ? `${assumption.statement} — riesgo si es falso: ${assumption.risk}`
      : assumption.statement,
    basis: "memoria de conversación · supuesto",
    confidence: null,
  }));
}

/**
 * Why confidence sits where it does, per category — the Explainable
 * Confidence report's own `why` sentences.
 */
export function collectConfidenceNotes(
  confidence: ExplainableConfidenceReport,
): WorkingNote[] {
  // Core categories average to the published overall; supplementary ones are
  // honest context that never moves it. Both are worth a note, core first.
  const categories: ConfidenceCategory[] = [
    ...confidence.coreCategories,
    ...confidence.supplementaryCategories,
  ];

  return categories.slice(0, MAX_NOTES).map((category) => ({
    id: category.id,
    statement: `${category.label}: ${category.why}`,
    basis: "confianza explicable",
    confidence: category.score,
  }));
}

/**
 * Contradictions from both places the platform already finds them: the
 * interview's soft claim-pair detector and the Knowledge vault's own
 * document-vs-prior-statement check.
 */
export function collectContradictions(
  workspace: CompanyWorkspace,
  assessment: ReadinessAssessment,
  latestText?: string,
): WorkingContradiction[] {
  const out: WorkingContradiction[] = [];

  const memory = workspace.conversationMemory;
  if (memory) {
    for (const found of evaluateContradictions(memory, latestText)) {
      out.push({
        id: found.id,
        statement: found.statement,
        claimA: found.claimA,
        claimB: found.claimB,
        confidence: normalizeConfidence(found.confidence),
        basis: "detector de contradicciones (entrevista)",
      });
    }
  }

  for (const vault of workspace.knowledge?.contradictions ?? []) {
    if (out.some((item) => item.statement === vault.statement)) continue;
    out.push({
      id: vault.id,
      statement: vault.statement,
      claimA: null,
      claimB: null,
      confidence: normalizeConfidence(vault.confidence),
      basis: "bóveda de conocimiento (documentos)",
    });
  }

  // Source disagreements the Readiness Engine already surfaces as soft asks.
  for (const conflict of assessment.conflicts) {
    if (out.some((item) => item.statement === conflict.statement)) continue;
    out.push({
      id: conflict.id,
      statement: conflict.statement,
      claimA: null,
      claimB: null,
      confidence: null,
      basis: `consistencia entre fuentes (${conflict.sourceLabels.join(" · ")})`,
    });
  }

  return out.slice(0, MAX_NOTES);
}

/** Ranked missing evidence — the Missing Information Engine's own ranking. */
export function collectMissingEvidence(
  missing: MissingInformationReport,
): MissingEvidenceItem[] {
  return missing.opportunities.slice(0, MAX_NOTES).map((opportunity) => ({
    id: opportunity.id,
    topic: opportunity.topic,
    topicLabel: opportunity.topicLabel,
    gaps: opportunity.gaps,
    uploadSuggestions: opportunity.uploadSuggestions,
    estimatedLiftPercent: opportunity.estimatedLiftPercent,
  }));
}

/** Automation candidates the Business Process Engine already derived. */
export function collectAutomations(workspace: CompanyWorkspace): WorkingNote[] {
  const candidates = workspace.businessProcesses?.automationCandidates ?? [];
  const notes: WorkingNote[] = [];

  for (const candidate of candidates) {
    const statement =
      candidate.quickAutomation ??
      candidate.futureAutomation ??
      candidate.aiOpportunity;
    if (!statement) continue;
    notes.push({
      id: candidate.id,
      statement: `${statement} (impacto estimado: ${candidate.estimatedImpact})`,
      basis: "motor de procesos · candidato de automatización",
      confidence: normalizeConfidence(candidate.confidence),
    });
    if (notes.length >= MAX_NOTES) break;
  }

  return notes;
}

/** Implementation risks the consulting evaluation already flagged. */
export function collectImplementationRisks(
  workspace: CompanyWorkspace,
): WorkingNote[] {
  const risks = workspace.conversationMemory?.consulting?.risks ?? [];
  return risks.slice(0, MAX_NOTES).map((risk) => ({
    id: risk.id,
    statement: `${risk.title} — ${risk.businessImpact} Mitigación: ${risk.recommendedMitigation}`,
    basis: `inteligencia de consultoría · riesgo (${risk.severity})`,
    confidence: normalizeConfidence(risk.confidence),
  }));
}

/**
 * Areas to come back to — the topics the Readiness Engine says still need
 * information, phrased as the follow-up a consultant would schedule.
 */
export function collectFollowUpAreas(
  assessment: ReadinessAssessment,
): WorkingNote[] {
  return assessment.stillLearning.slice(0, MAX_NOTES).map((item) => ({
    id: item.id,
    statement: `${item.label}: ${item.question} (${item.why})`,
    basis: "motor de preparación · seguimiento",
    confidence: null,
  }));
}

const RETRIEVAL_SOURCE_LABEL_ES: Record<RetrievalItemKind, string> = {
  answer: "memoria de conversación · respuesta reciente",
  document_chunk: "documentos · fragmento recuperado",
  knowledge_entity: "grafo de conocimiento · entidad relacionada",
  readiness_gap: "motor de preparación · brecha abierta",
};

/**
 * Mission C — real retrieval. Builds the same `RetrievalPack` the guided
 * interview shows as "Basado en…" chips (`lib/ai/retrieval`), reusing its
 * four tiers — recent answers, matching document chunks, related knowledge
 * entities, open readiness gaps — instead of just copying the evidence
 * snapshot's strongest signals.
 *
 * Uses the synchronous, keyword-ranked pack: the cycle is synchronous by
 * contract (see `cycle.ts`) and runs from client code that cannot reach the
 * server-only embeddings key, so real semantic search stays the documented
 * upgrade path (`RETRIEVAL_PACK.md`) until a server-side call site exists.
 */
export function collectRelatedEvidence(
  workspace: CompanyWorkspace,
  gaps: ReadinessLearningItem[],
  query: string,
  meetingId?: string | null,
): RelatedEvidenceItem[] {
  const pack = buildRetrievalPackSync({
    query,
    memory: workspace.conversationMemory,
    knowledge: workspace.knowledge,
    gaps,
    meetingId: meetingId ?? null,
    limit: MAX_EVIDENCE_PACK,
  });

  return pack.items.map((item) => toRelatedEvidenceItem(item));
}

function toRelatedEvidenceItem(item: RetrievalItem): RelatedEvidenceItem {
  return {
    id: item.id,
    topic: item.topic,
    sourceLabel: RETRIEVAL_SOURCE_LABEL_ES[item.kind],
    statement: item.statement,
    strength: item.strength,
    kind: item.kind,
    provenance: item.provenance,
  };
}

/**
 * The single highest-value unknown — one, never a list.
 *
 * This is the Missing Information Engine's own top-ranked opportunity; the
 * agent picks, it does not re-rank.
 */
export function pickHighestValueUnknown(
  missing: MissingInformationReport,
): HighestValueUnknown | null {
  const top = missing.opportunities[0];
  if (!top) return null;

  const gap = top.gaps[0] ?? top.topicLabel;
  const howToClose =
    top.uploadSuggestions[0] ??
    missingInformationUploadHint(gap) ??
    null;

  return {
    topic: top.topic,
    topicLabel: top.topicLabel,
    gap,
    estimatedLiftPercent: top.estimatedLiftPercent,
    howToClose,
  };
}

/** Stable note id for collectors whose source has none. */
export function noteId(): string {
  return createId("ci_note");
}

/**
 * Engine confidences arrive on two scales: 0–1 (interview reasoning) and
 * 0–100 (scores/coverage). Normalize to 0–100 without ever inventing a
 * figure — `undefined` stays `null`.
 */
function normalizeConfidence(value: number | undefined | null): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (value <= 1) return Math.round(value * 100);
  return Math.round(value);
}
