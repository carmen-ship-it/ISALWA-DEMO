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
 */

import { createId, nowIso } from "@/lib/utils";
import { classifyKnowledgeUpload } from "@/lib/knowledge/intake";
import type {
  Evidence,
  IntakeEntity,
  IntakeExtractionResult,
  IntakeExtractor,
  IntakeFact,
  IntakeOpportunitySignal,
  IntakePainSignal,
  IntakeSlots,
  IntakeSourceType,
  IntakeUnit,
} from "./contracts";
import { emptyIntakeSlots } from "./contracts";

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

/** Deterministic keyword scan shared by meeting transcripts and manual notes. No NLP/AI. */
const DEPARTMENT_PATTERN =
  /ventas|sales|finanzas|contabilidad|accounting|operaciones|operations|recursos humanos|\brrhh\b|\bhr\b|compras|purchasing|producci[oó]n|production|log[ií]stica|logistics|almac[eé]n|warehouse|marketing|atenci[oó]n al cliente|customer service/i;
const SYSTEM_PATTERN =
  /excel|whatsapp|quickbooks|\bsap\b|salesforce|hubspot|\berp\b|\bcrm\b|correo|email|access|\bsql\b|sheets|notion|trello|asana|slack/i;
const ROLE_PATTERN =
  /gerente|director|encargad[oa]|supervisor|jefe|coordinador|responsable|due[nñ]{1,2}[oa]|owner|founder|\bceo\b|\bcfo\b|\bcoo\b/i;
const PAIN_PATTERN =
  /problema|lento|demora|\berror\b|falla|cuello de botella|se pierde|manual(mente)?|duplicad[oa]|no hay visibilidad|retraso/i;
const OPPORTUNITY_PATTERN =
  /oportunidad|podr[ií]amos|deber[ií]amos|automatizar|mejorar|ahorrar|reducir tiempo|falta un sistema/i;
const RULE_PATTERN =
  /siempre se debe|nunca se debe|es pol[ií]tica|no se permite|\bregla\b|obligatorio|requiere aprobaci[oó]n de/i;

function scanTextSignals(unit: IntakeUnit, text: string): {
  slots: IntakeSlots;
  evidence: Evidence[];
} {
  const slots = emptyIntakeSlots();
  const evidence: Evidence[] = [];
  const sentences = text
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3)
    .slice(0, 60); // deterministic cap — this is a heuristic scan, not a summarizer

  const seenEntities = new Set<string>();

  for (const sentence of sentences) {
    const factEv = evidenceFor(unit, sentence, 0.55, "fact");
    evidence.push(factEv);
    const fact: IntakeFact = {
      id: createId("fact"),
      key: null,
      statement: sentence,
      evidenceIds: [factEv.id],
      confidence: 0.55,
    };
    slots.facts.push(fact);

    const deptMatch = DEPARTMENT_PATTERN.exec(sentence);
    if (deptMatch) {
      const name = titleCase(deptMatch[0]);
      addEntity(slots, evidence, unit, seenEntities, "Department", name, sentence, 0.6);
    }
    const sysMatch = SYSTEM_PATTERN.exec(sentence);
    if (sysMatch) {
      const name = titleCase(sysMatch[0]);
      addEntity(slots, evidence, unit, seenEntities, "System", name, sentence, 0.6);
    }
    const roleMatch = ROLE_PATTERN.exec(sentence);
    if (roleMatch) {
      const name = titleCase(roleMatch[0]);
      addEntity(slots, evidence, unit, seenEntities, "Person", name, sentence, 0.5);
    }

    if (RULE_PATTERN.test(sentence)) {
      const ruleEv = evidenceFor(unit, sentence, 0.6, "business_rule");
      evidence.push(ruleEv);
      slots.businessRules.push({
        id: createId("rule"),
        statement: sentence,
        evidenceIds: [ruleEv.id],
        confidence: 0.6,
      });
    }
    if (PAIN_PATTERN.test(sentence)) {
      const painEv = evidenceFor(unit, sentence, 0.55, "pain_signal");
      evidence.push(painEv);
      const pain: IntakePainSignal = {
        id: createId("pain"),
        title: sentence.slice(0, 80),
        description: sentence,
        evidenceIds: [painEv.id],
        confidence: 0.55,
      };
      slots.painSignals.push(pain);
    }
    if (OPPORTUNITY_PATTERN.test(sentence)) {
      const oppEv = evidenceFor(unit, sentence, 0.5, "opportunity");
      evidence.push(oppEv);
      const opportunity: IntakeOpportunitySignal = {
        id: createId("opportunity"),
        title: sentence.slice(0, 80),
        description: sentence,
        evidenceIds: [oppEv.id],
        confidence: 0.5,
      };
      slots.opportunities.push(opportunity);
    }
  }

  return { slots, evidence };
}

function addEntity(
  slots: IntakeSlots,
  evidence: Evidence[],
  unit: IntakeUnit,
  seen: Set<string>,
  kind: IntakeEntity["kind"],
  name: string,
  sentence: string,
  confidence: number,
): void {
  const key = `${kind}:${name.toLowerCase()}`;
  const entEv = evidenceFor(unit, sentence, confidence, "entity");
  evidence.push(entEv);
  if (seen.has(key)) {
    const existing = slots.entities.find(
      (e) => e.kind === kind && e.name.toLowerCase() === name.toLowerCase(),
    );
    existing?.evidenceIds.push(entEv.id);
    return;
  }
  seen.add(key);
  slots.entities.push({
    id: createId("entity"),
    kind,
    name,
    summary: sentence,
    evidenceIds: [entEv.id],
    confidence,
    metadata: {},
  });
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

function makeFileExtractor(id: IntakeSourceType): IntakeExtractor {
  return {
    id,
    status: "designed",
    async extract(unit) {
      const { slots, evidence, status } = fileLikeExtraction(unit);
      if (status !== "processed") {
        return notImplementedResult(
          unit,
          `"${unit.label}" recibido — este formato aún no tiene lectura de contenido activa.`,
        );
      }
      return {
        unitId: unit.id,
        status,
        message: `"${unit.label}" classified from filename/type metadata — no content parsed.`,
        messageEs: `"${unit.label}" clasificado por nombre y tipo de archivo — sin lectura de contenido todavía.`,
        slots,
        evidence,
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
      const { slots, evidence } = scanTextSignals(unit, text);
      return {
        unitId: unit.id,
        status: "processed",
        message: `Scanned ${slots.facts.length} statements for deterministic keyword signals — no AI/NLP.`,
        messageEs: `Se revisaron ${slots.facts.length} declaraciones con reglas de palabras clave — sin IA.`,
        slots,
        evidence,
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
  image: makePlannedExtractor("image"),
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
