/**
 * Mission 21 — Living Document Ingestion: the client-facing "what changed"
 * summary after a batch of uploads. Extended by Mission 22 ("Teach
 * Architect") into a fuller Learning Summary that also answers how certain
 * we are and what's next — still zero recomputation.
 *
 * The AI Document Processing Pipeline (`pipeline.ts`) already computes, per
 * document, understanding before/after, new insights/recommendations, and
 * the intake merge counts (entities, relationships, rules, risks…). This
 * module composes those already-computed numbers across a whole upload
 * batch into ONE consulting-voice paragraph — "Después de revisar estos
 * documentos…" — plus a separate, honest note when one or more documents
 * could not actually be read. No second scoring model, no new engine call,
 * no recomputation: every figure here is copied straight off
 * `DocumentPipelineRun`.
 *
 * Mission 22 adds three things, all still pure composition:
 *   - an honest sentence for when Business Understanding did NOT move (the
 *     original version stayed silent about the percentage in that case —
 *     silence reads as "did we even do anything?"; now it says why, using
 *     only fields the pipeline already computed);
 *   - `certaintyNote` — "how certain are we", derived from how many
 *     documents were actually read (`readableCount`/`weakCount`) and the
 *     classification confidence already stored on each run's own
 *     `KnowledgeAsset.confidence` — never a new confidence score;
 *   - `nextStepNote` — an optional pass-through of a headline the caller
 *     already computed from the Missing Information Engine / NextStepVoice
 *     (e.g. `assessMissingInformation(workspace).opportunities[0]?.headline`)
 *     — this module never reaches into those engines itself, it only has a
 *     slot for the caller to hand one over.
 *
 * Same rule as `lib/consulting-intelligence/next-step-voice.ts`: every
 * string is generated here, in Spanish, and must never be routed through
 * `lib/i18n` (see `docs/ENGINEERING_GUIDELINES.md` §9) — only the card
 * chrome around it (kicker labels) goes through `useTranslations()`.
 */

import type { TextExtractionStatus } from "./extraction";
import type { DocumentPipelineRun } from "./pipeline";

export interface WeakExtractionDocument {
  fileName: string;
  reasonEs: string;
}

export interface DocumentChangeSummary {
  documentCount: number;
  /** Documents whose content was actually read (not just filed by name). */
  readableCount: number;
  weakCount: number;
  understandingBefore: number;
  understandingAfter: number;
  newInsights: number;
  newRecommendations: number;
  addedEntities: number;
  reinforcedEntities: number;
  addedRelationships: number;
  addedBusinessRules: number;
  addedPainSignals: number;
  addedRisks: number;
  addedOpportunities: number;
  /** The one consulting-voice paragraph — "Después de revisar…". Never empty. */
  message: string;
  /** Present only when at least one document's content could not be read. */
  honestNote: string | null;
  weakDocuments: WeakExtractionDocument[];
  /** "How certain are we" — derived from real read/classification data, never a new score. Never empty. */
  certaintyNote: string;
  /** "What's next" — only set when the caller passed one in from an existing engine; never invented here. */
  nextStepNote: string | null;
}

export interface BuildDocumentChangeSummaryOptions {
  /**
   * A next-best-action headline the caller already computed from the
   * Missing Information Engine or `NextStepVoice` (e.g.
   * `assessMissingInformation(workspace).opportunities[0]?.headline`).
   * Passed straight through, never rephrased or invented here.
   */
  nextStepNote?: string | null;
}

function pluralEs(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function weakReasonEs(status: TextExtractionStatus): string {
  switch (status) {
    case "requires_ocr":
      return "es una imagen y la lectura óptica no está activa en este entorno";
    case "empty":
      return "se abrió correctamente pero no contenía texto";
    default:
      return "es un formato que todavía no leemos por dentro — quedó clasificado por nombre";
  }
}

function sum(
  runs: readonly DocumentPipelineRun[],
  pick: (run: DocumentPipelineRun) => number,
): number {
  return runs.reduce((total, run) => total + pick(run), 0);
}

/**
 * `null` only when the batch is empty — callers should render nothing in
 * that case rather than an empty consulting sentence.
 */
export function buildDocumentChangeSummary(
  runs: readonly DocumentPipelineRun[],
  options?: BuildDocumentChangeSummaryOptions,
): DocumentChangeSummary | null {
  if (runs.length === 0) return null;

  const documentCount = runs.length;
  const weakDocuments: WeakExtractionDocument[] = runs
    .filter((run) => run.extraction.status !== "extracted")
    .map((run) => ({
      fileName: run.job.fileName,
      reasonEs: weakReasonEs(run.extraction.status),
    }));
  const readableCount = documentCount - weakDocuments.length;

  const understandingBefore = runs[0]!.understandingBefore;
  const understandingAfter = runs[runs.length - 1]!.understandingAfter;

  const newInsights = sum(runs, (run) => run.newInsights);
  const newRecommendations = sum(runs, (run) => run.newRecommendations);
  const addedEntities = sum(runs, (run) => run.report?.addedEntities ?? 0);
  const reinforcedEntities = sum(runs, (run) => run.report?.reinforcedEntities ?? 0);
  const addedRelationships = sum(runs, (run) => run.report?.addedRelationships ?? 0);
  const addedBusinessRules = sum(runs, (run) => run.report?.addedBusinessRules ?? 0);
  const addedPainSignals = sum(runs, (run) => run.report?.addedPainSignals ?? 0);
  const addedRisks = sum(runs, (run) => run.report?.addedRisks ?? 0);
  const addedOpportunities = sum(runs, (run) => run.report?.addedOpportunities ?? 0);

  const documentsWord =
    documentCount === 1 ? "este documento" : `estos ${documentCount} documentos`;

  const message =
    readableCount === 0
      ? `Revisamos ${documentsWord}, pero no pudimos leer su contenido todavía — quedaron archivados por nombre, listos para volver a analizarse en cuanto sumemos un lector para ese formato.`
      : buildLearnedMessage({
          documentsWord,
          understandingBefore,
          understandingAfter,
          addedEntities,
          reinforcedEntities,
          addedRelationships,
          addedBusinessRules,
          addedRisks,
          frictions: Math.max(0, addedPainSignals - addedRisks),
          addedOpportunities,
          newInsights,
          newRecommendations,
        });

  // Only worth a separate honest note when *some* documents did read
  // through — when none did, the main message above is already the
  // honest statement and a second one would just repeat it.
  const honestNote =
    weakDocuments.length > 0 && readableCount > 0 ? buildHonestNote(weakDocuments) : null;

  const nextStepNote = options?.nextStepNote?.trim() ? options.nextStepNote.trim() : null;

  return {
    documentCount,
    readableCount,
    weakCount: weakDocuments.length,
    understandingBefore,
    understandingAfter,
    newInsights,
    newRecommendations,
    addedEntities,
    reinforcedEntities,
    addedRelationships,
    addedBusinessRules,
    addedPainSignals,
    addedRisks,
    addedOpportunities,
    message,
    honestNote,
    weakDocuments,
    certaintyNote: buildCertaintyNote(runs, readableCount, weakDocuments.length, documentCount),
    nextStepNote,
  };
}

function buildCertaintyNote(
  runs: readonly DocumentPipelineRun[],
  readableCount: number,
  weakCount: number,
  documentCount: number,
): string {
  const confidences = runs
    .map((run) => run.asset.confidence)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const avgConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((total, value) => total + value, 0) / confidences.length) * 100)
      : null;

  if (readableCount === 0) {
    return documentCount === 1
      ? "Todavía no leímos el contenido — la clasificación es solo por nombre, así que la certeza es baja."
      : "Todavía no leímos el contenido de estos documentos — la clasificación es solo por nombre, así que la certeza es baja.";
  }

  const readClause =
    weakCount === 0
      ? documentCount === 1
        ? "Leímos el contenido completo"
        : `Leímos el contenido de los ${documentCount} documentos`
      : `Leímos ${readableCount} de ${documentCount} ${pluralEs(documentCount, "documento", "documentos")} (el resto quedó solo por nombre)`;

  if (avgConfidence !== null) {
    return `${readClause}. La clasificación por tipo/nombre trae ~${avgConfidence}% de confianza — no es un puntaje inventado, es la certeza que el propio clasificador ya reportó.`;
  }

  return `${readClause}. Todavía no hay una confianza de clasificación numérica que reportar para este lote.`;
}

function buildLearnedMessage(input: {
  documentsWord: string;
  understandingBefore: number;
  understandingAfter: number;
  addedEntities: number;
  reinforcedEntities: number;
  addedRelationships: number;
  addedBusinessRules: number;
  addedRisks: number;
  frictions: number;
  addedOpportunities: number;
  newInsights: number;
  newRecommendations: number;
}): string {
  const {
    documentsWord,
    understandingBefore,
    understandingAfter,
    addedEntities,
    reinforcedEntities,
    addedRelationships,
    addedBusinessRules,
    addedRisks,
    frictions,
    addedOpportunities,
    newInsights,
    newRecommendations,
  } = input;

  const clauses: string[] = [];
  const structuredDelta =
    addedEntities +
      reinforcedEntities +
      addedRelationships +
      addedBusinessRules +
      addedRisks +
      frictions +
      addedOpportunities >
    0;

  if (understandingAfter > understandingBefore) {
    clauses.push(
      `la comprensión del negocio subió de ${understandingBefore}% a ${understandingAfter}%`,
    );
  } else if (structuredDelta) {
    // The composite score is coarse and monotonic — real intake can land
    // without moving the rounded percentage. Say so instead of staying silent.
    if (reinforcedEntities > 0 && addedEntities === 0 && addedRelationships === 0) {
      clauses.push(
        `la comprensión se mantuvo en ${understandingAfter}% porque reforzamos lo que ya sabíamos`,
      );
    } else {
      clauses.push(
        `la comprensión general se mantuvo en ${understandingAfter}% — esto amplía el detalle sin cambiar aún el puntaje global`,
      );
    }
  }

  if (addedEntities > 0 || reinforcedEntities > 0) {
    const parts = [
      addedEntities > 0
        ? `${addedEntities} elemento${addedEntities === 1 ? "" : "s"} nuevo${addedEntities === 1 ? "" : "s"}`
        : null,
      reinforcedEntities > 0
        ? `${reinforcedEntities} confirmado${reinforcedEntities === 1 ? "" : "s"} de nuevo`
        : null,
    ].filter((part): part is string => Boolean(part));
    clauses.push(`identificamos ${parts.join(" y ")}`);
  }

  if (addedRelationships > 0) {
    clauses.push(
      `${addedRelationships} ${pluralEs(addedRelationships, "relación nueva", "relaciones nuevas")} en el mapa del negocio`,
    );
  }

  if (addedBusinessRules > 0) {
    clauses.push(
      `${addedBusinessRules} ${pluralEs(addedBusinessRules, "regla de negocio", "reglas de negocio")}`,
    );
  }

  if (addedRisks > 0) {
    clauses.push(`${addedRisks} ${pluralEs(addedRisks, "riesgo", "riesgos")} que conviene revisar`);
  }

  if (frictions > 0) {
    clauses.push(
      `${frictions} posible${frictions === 1 ? "" : "s"} ${pluralEs(frictions, "problema", "problemas")}`,
    );
  }

  if (addedOpportunities > 0) {
    clauses.push(
      `${addedOpportunities} ${pluralEs(addedOpportunities, "oportunidad", "oportunidades")}`,
    );
  }

  const lead = `Después de revisar ${documentsWord}`;

  if (clauses.length === 0) {
    const closing =
      newRecommendations > 0
        ? `, esto abrió ${newRecommendations} ${pluralEs(newRecommendations, "recomendación nueva", "recomendaciones nuevas")}.`
        : " no encontramos información estructurada nueva — confirma lo que ya sabíamos del negocio.";
    return `${lead}${closing}`;
  }

  let sentence = `${lead}, ${clauses.join(", ")}.`;

  if (newInsights > 0 || newRecommendations > 0) {
    const followParts = [
      newInsights > 0
        ? `${newInsights} ${pluralEs(newInsights, "hallazgo nuevo", "hallazgos nuevos")}`
        : null,
      newRecommendations > 0
        ? `${newRecommendations} ${pluralEs(newRecommendations, "recomendación nueva", "recomendaciones nuevas")}`
        : null,
    ].filter((part): part is string => Boolean(part));
    sentence += ` Esto abrió ${followParts.join(" y ")}.`;
  }

  return sentence;
}

function buildHonestNote(weak: WeakExtractionDocument[]): string {
  const shown = weak.slice(0, 3);
  const names = shown.map((doc) => `"${doc.fileName}"`).join(", ");
  const extra = weak.length - shown.length;
  const suffix = extra > 0 ? ` y ${extra} más` : "";
  const verb = weak.length === 1 ? "no se pudo leer" : "no se pudieron leer";
  return `Aviso honesto: ${names}${suffix} ${verb} todavía — quedaron archivados por nombre, sin perder nada, pero tampoco sumaron evidencia nueva esta vez.`;
}
