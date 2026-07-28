/**
 * Mission 21 — Living Document Ingestion: the client-facing "what changed"
 * summary after a batch of uploads.
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
 * Same rule as `lib/consulting-intelligence/next-step-voice.ts`: every
 * string is generated here, in Spanish, and must never be routed through
 * `lib/i18n` (see `docs/ENGINEERING_GUIDELINES.md` §9) — only the card
 * chrome around it (a kicker label) goes through `useTranslations()`.
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
  };
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

  if (understandingAfter > understandingBefore) {
    clauses.push(
      `la comprensión del negocio subió de ${understandingBefore}% a ${understandingAfter}%`,
    );
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
