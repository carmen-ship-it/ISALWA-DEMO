/**
 * Unified Business Knowledge Intake — extractors.
 *
 * Every extractor is either:
 *  (a) "designed" — a real, deterministic, metadata/keyword heuristic. No
 *      OpenAI, no OCR, no third-party parsing. Same technique the existing
 *      Knowledge Engine already uses (`classifyKnowledgeUpload`), applied
 *      uniformly across every source type; or
 *  (b) "planned" — filed honestly as received, content not read yet.
 *
 * The pipeline (`pipeline.ts`) is fully wired end to end regardless of which
 * bucket a source falls in — only the *content reading* is stubbed for (b).
 *
 * AI Document Processing Pipeline: the file extractors now read
 * `unit.textContent` when the document pipeline was able to extract text
 * (`lib/documents/extraction.ts`) or OCR it. When text is present they run
 * the same twelve detectors as manual notes and transcripts
 * (`detectors.ts`); when it is not, they fall back to the filename/type
 * classification they always did, and say so.
 */

import { createId, nowIso } from "@/lib/utils";
import { classifyKnowledgeUpload } from "@/lib/knowledge/intake";
import type {
  Evidence,
  IntakeExtractionResult,
  IntakeExtractor,
  IntakeSlots,
  IntakeSourceType,
  IntakeUnit,
} from "./contracts";
import { emptyIntakeSlots } from "./contracts";
import { detectBusinessSignals } from "./detectors";

function evidenceFor(
  unit: IntakeUnit,
  statement: string,
  confidence: number,
  slot: Evidence["slot"],
): Evidence {
  return {
    id: createId("evidence"),
    workspaceId: unit.workspaceId,
    sourceType: unit.sourceType,
    sourceId: unit.id,
    sourceLabel: unit.label,
    capturedAt: nowIso(),
    statement,
    confidence,
    slot,
  };
}

function metaString(unit: IntakeUnit, key: string): string | null {
  const value = unit.metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metaNumber(unit: IntakeUnit, key: string): number | null {
  const value = unit.metadata[key];
  return typeof value === "number" ? value : null;
}

/** Same filename-heuristic classification the Knowledge Engine already uses — reused, not duplicated. */
function fileLikeExtraction(unit: IntakeUnit): {
  slots: IntakeSlots;
  evidence: Evidence[];
  status: IntakeExtractionResult["status"];
} {
  const fileName = metaString(unit, "fileName") ?? unit.label;
  const fileSize = metaNumber(unit, "fileSize") ?? 0;
  const mimeType = metaString(unit, "mimeType") ?? "";
  const classification = classifyKnowledgeUpload({
    name: fileName,
    size: fileSize,
    mimeType,
  });

  const slots = emptyIntakeSlots();
  const evidence: Evidence[] = [];
  const status: IntakeExtractionResult["status"] =
    classification.providerStatus === "designed" ? "processed" : "queued";

  if (status !== "processed") {
    return { slots, evidence, status };
  }

  const statement = `"${fileName}" clasificado como ${classification.category.toLowerCase()} (por nombre y tipo de archivo).`;
  const ev = evidenceFor(unit, statement, classification.confidence, "fact");
  evidence.push(ev);
  slots.facts.push({
    id: createId("fact"),
    key: null,
    statement,
    evidenceIds: [ev.id],
    confidence: classification.confidence,
  });

  const docEv = evidenceFor(unit, statement, classification.confidence, "entity");
  evidence.push(docEv);
  slots.entities.push({
    id: createId("entity"),
    kind: "Document",
    name: fileName,
    summary: statement,
    evidenceIds: [docEv.id],
    confidence: classification.confidence,
    metadata: { category: classification.category },
  });

  return { slots, evidence, status };
}

function mergeSlots(base: IntakeSlots, extra: IntakeSlots): IntakeSlots {
  return {
    facts: [...base.facts, ...extra.facts],
    entities: [...base.entities, ...extra.entities],
    relationships: [...base.relationships, ...extra.relationships],
    unknowns: [...base.unknowns, ...extra.unknowns],
    contradictions: [...base.contradictions, ...extra.contradictions],
    businessRules: [...base.businessRules, ...extra.businessRules],
    painSignals: [...base.painSignals, ...extra.painSignals],
    opportunities: [...base.opportunities, ...extra.opportunities],
  };
}

function notImplementedResult(
  unit: IntakeUnit,
  reasonEs: string,
): IntakeExtractionResult {
  return {
    unitId: unit.id,
    status: "queued",
    message: `Extractor for "${unit.sourceType}" is architecture-only — content reading is not implemented yet.`,
    messageEs: reasonEs,
    slots: emptyIntakeSlots(),
    evidence: [],
  };
}

/**
 * File sources. Two paths, and the client is always told which one ran:
 *
 *  - Text was available (plain text / Markdown / CSV read in the browser, or
 *    OCR output when a vision key is configured): classification *plus* the
 *    full twelve-detector content scan.
 *  - No text available (PDF/Office binaries with no parser installed): the
 *    original filename/type classification only, described as such.
 */
function makeFileExtractor(id: IntakeSourceType): IntakeExtractor {
  return {
    id,
    status: "designed",
    async extract(unit) {
      const classified = fileLikeExtraction(unit);
      const text = unit.textContent?.trim();

      if (!text) {
        if (classified.status !== "processed") {
          return notImplementedResult(
            unit,
            `"${unit.label}" recibido — este formato aún no tiene lectura de contenido activa.`,
          );
        }
        return {
          unitId: unit.id,
          status: classified.status,
          message: `"${unit.label}" classified from filename/type metadata — no content parsed.`,
          messageEs: `"${unit.label}" clasificado por nombre y tipo de archivo — sin lectura de contenido todavía.`,
          slots: classified.slots,
          evidence: classified.evidence,
        };
      }

      const scan = detectBusinessSignals(unit, text);
      return {
        unitId: unit.id,
        status: "processed",
        message: `Read ${scan.scannedSentences} statements from "${unit.label}" and scanned them with the twelve deterministic business detectors.`,
        messageEs: `Leímos "${unit.label}": ${scan.scannedSentences} declaraciones revisadas con detectores de negocio (personas, sistemas, procesos, riesgos y más).`,
        slots: mergeSlots(classified.slots, scan.slots),
        evidence: [...classified.evidence, ...scan.evidence],
        detections: scan.detections,
      };
    },
  };
}

function makeTextExtractor(id: IntakeSourceType): IntakeExtractor {
  return {
    id,
    status: "designed",
    async extract(unit) {
      const text = unit.textContent?.trim();
      if (!text) {
        const title = metaString(unit, "title") ?? unit.label;
        return {
          unitId: unit.id,
          status: "queued",
          message: `"${title}" received without text — filed for later review.`,
          messageEs: `"${title}" recibido sin texto — archivado para revisión posterior.`,
          slots: emptyIntakeSlots(),
          evidence: [],
        };
      }
      const scan = detectBusinessSignals(unit, text);
      return {
        unitId: unit.id,
        status: "processed",
        message: `Scanned ${scan.scannedSentences} statements for deterministic keyword signals — no AI/NLP.`,
        messageEs: `Se revisaron ${scan.scannedSentences} declaraciones con reglas de palabras clave — sin IA.`,
        slots: scan.slots,
        evidence: scan.evidence,
        detections: scan.detections,
      };
    },
  };
}

const INTERVIEW_EXTRACTOR: IntakeExtractor = {
  id: "interview",
  status: "designed",
  async extract(unit) {
    return {
      unitId: unit.id,
      status: "processed",
      message:
        "Interview evidence is already captured directly in ConversationMemory — no duplicate extraction here.",
      messageEs:
        "La evidencia de la entrevista ya se captura en la Memoria de la Conversación — sin extracción duplicada aquí.",
      slots: emptyIntakeSlots(),
      evidence: [],
    };
  },
};

const PLANNED_MESSAGES_ES: Partial<Record<IntakeSourceType, string>> = {
  image: "Imagen recibida — la lectura óptica (OCR) aún no está activa.",
  audio_transcript:
    "Audio recibido — la conversión de voz a texto aún no está activa.",
  crm_export: "Exportación de CRM recibida — el lector estructurado está planeado.",
  erp_export: "Exportación de ERP recibida — el lector estructurado está planeado.",
  accounting_export:
    "Exportación contable recibida — el lector estructurado está planeado.",
  email_archive: "Archivo de correo recibido — la minería de contenido está planeada.",
  folder: "Carpeta recibida — la sincronización continua está planeada.",
  api_connector: "Conector API registrado — la sincronización en vivo está planeada.",
};

function makePlannedExtractor(id: IntakeSourceType): IntakeExtractor {
  return {
    id,
    status: "planned",
    async extract(unit) {
      return notImplementedResult(
        unit,
        PLANNED_MESSAGES_ES[id] ??
          `"${unit.label}" recibido — extractor planeado, aún no implementado.`,
      );
    },
  };
}

/**
 * Images stay "planned" as a source because reading them depends on an OCR
 * key the deployment may not have (`lib/documents/ocr.ts`). When OCR did run
 * and produced text, this extractor is indistinguishable from any other
 * document: same detectors, same slots. When it did not, the honest
 * "OCR is not active" message is preserved verbatim.
 */
const IMAGE_EXTRACTOR: IntakeExtractor = {
  id: "image",
  status: "planned",
  async extract(unit) {
    const text = unit.textContent?.trim();
    if (!text) {
      return notImplementedResult(unit, PLANNED_MESSAGES_ES.image!);
    }
    const scan = detectBusinessSignals(unit, text);
    return {
      unitId: unit.id,
      status: "processed",
      message: `OCR text for "${unit.label}" scanned with the twelve deterministic business detectors.`,
      messageEs: `Texto reconocido de "${unit.label}" (lectura óptica): ${scan.scannedSentences} declaraciones revisadas.`,
      slots: scan.slots,
      evidence: scan.evidence,
      detections: scan.detections,
    };
  },
};

export const INTAKE_EXTRACTORS: Readonly<Record<IntakeSourceType, IntakeExtractor>> = {
  interview: INTERVIEW_EXTRACTOR,
  pdf: makeFileExtractor("pdf"),
  word: makeFileExtractor("word"),
  excel: makeFileExtractor("excel"),
  powerpoint: makeFileExtractor("powerpoint"),
  csv: makeFileExtractor("csv"),
  text_file: makeFileExtractor("text_file"),
  meeting_transcript: makeTextExtractor("meeting_transcript"),
  manual_notes: makeTextExtractor("manual_notes"),
  image: IMAGE_EXTRACTOR,
  audio_transcript: makePlannedExtractor("audio_transcript"),
  crm_export: makePlannedExtractor("crm_export"),
  erp_export: makePlannedExtractor("erp_export"),
  accounting_export: makePlannedExtractor("accounting_export"),
  email_archive: makePlannedExtractor("email_archive"),
  folder: makePlannedExtractor("folder"),
  api_connector: makePlannedExtractor("api_connector"),
} as const;

export function extractorFor(sourceType: IntakeSourceType): IntakeExtractor {
  return INTAKE_EXTRACTORS[sourceType] ?? makePlannedExtractor(sourceType);
}
