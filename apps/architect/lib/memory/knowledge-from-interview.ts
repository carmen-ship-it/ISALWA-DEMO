/**
 * Manufacturing Learning Pipeline — Interview → Knowledge Graph.
 *
 * Conversation evidence becomes durable knowledge the exact same way
 * document evidence already does: the same twelve deterministic detectors
 * (`detectBusinessSignals`), the same additive entity/relationship merge
 * (`mergeIntakeEntities` / `mergeIntakeRelationships`), and the same
 * append-only evidence ledger — all reused verbatim from `lib/intake`, the
 * path documents and meeting transcripts already go through
 * (`lib/intake/pipeline.ts`). No parallel extraction system, no invented
 * entities: a mention only becomes knowledge if the deterministic detectors
 * actually find it in what the participant said.
 *
 * This runs synchronously against the in-memory workspace inside
 * `applyInterviewToWorkspace` (pure function, no store I/O) rather than
 * through `ingestSource` (which fetches and saves the workspace itself) —
 * calling the async store-backed pipeline from here would race the caller's
 * own fetch/save of the same workspace. Reusing the merge primitives
 * directly is the smallest correct integration.
 */

import { createId } from "@/lib/utils";
import { detectBusinessSignals } from "@/lib/intake/detectors";
import { mergeIntakeEntities } from "@/lib/intake/entities";
import { mergeIntakeRelationships } from "@/lib/intake/relationships";
import { appendEvidenceLog } from "@/lib/intake/evidence";
import { buildLearnedLines } from "@/lib/intake/summary";
import {
  buildWorkspaceKnowledge,
  ensureWorkspaceKnowledge,
} from "@/lib/knowledge/coverage";
import type { IntakeUnit } from "@/lib/intake/contracts";
import type {
  CompanyWorkspace,
  Interview,
  KnowledgeAsset,
  Meeting,
  WorkspaceKnowledge,
} from "@/types";

/** The conversation text already captured on the interview — no extra capture, no re-asking. */
function interviewTranscriptText(interview: Interview): string {
  return interview.conversation.answers
    .map((answer) => answer.value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

/**
 * Merge one completed interview's conversation text into the workspace's
 * existing Knowledge Graph. Works without any document upload — the
 * interview text itself is the evidence. Additive only: the entity and
 * relationship merges match by name, so a later document mentioning the
 * same department/system/process reinforces confidence instead of
 * duplicating it, and a re-run over the same answers (e.g. a heal) does not
 * inflate counts beyond normal reinforcement.
 */
export function mergeInterviewIntoKnowledge(
  workspace: CompanyWorkspace,
  interview: Interview,
  meeting: Meeting,
  stamp: string,
): WorkspaceKnowledge {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const text = interviewTranscriptText(interview);
  if (!text) return knowledge;

  const unit: IntakeUnit = {
    id: createId("intake_unit"),
    workspaceId: workspace.id,
    sourceType: "interview",
    label: meeting.title,
    receivedAt: stamp,
    metadata: { interviewId: interview.id, meetingId: meeting.id },
    textContent: text,
  };

  // Knowledge Memory Links — resolves bare mentions ("we", "el proceso")
  // against whatever this workspace already knows, exactly as a document
  // scan would, so conversation evidence links into the same graph.
  const scan = detectBusinessSignals(unit, text, knowledge.entities);

  const asset: KnowledgeAsset = {
    id: createId("asset"),
    workspaceId: workspace.id,
    title: meeting.title,
    // Same asset type/category the intake pipeline uses for a pasted
    // meeting transcript (`lib/intake/pipeline.ts` NON_FILE_ASSET_TYPE) —
    // a completed discovery interview is that same evidence shape.
    type: "meeting_transcript",
    category: "Meeting Transcripts",
    source: "Entrevista guiada · Conocimiento del negocio",
    status: "processed",
    uploadedAt: stamp,
    processedAt: stamp,
    summary: `Evidencia de la entrevista de descubrimiento: ${scan.scannedSentences} declaraciones revisadas.`,
    tags: ["interview"],
    confidence: 0.55,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations", "HR"],
  };

  const entityMerge = mergeIntakeEntities(
    knowledge.entities,
    scan.slots.entities,
    workspace.id,
    asset.id,
  );
  const relationshipMerge = mergeIntakeRelationships(
    knowledge.relationships,
    scan.slots.relationships,
    workspace.id,
    asset.id,
    entityMerge.nameIndex,
  );

  const learnedLine = buildLearnedLines(
    {
      addedEntities: entityMerge.added,
      reinforcedEntities: entityMerge.reinforced,
      addedRelationships: relationshipMerge.added,
      addedFacts: scan.slots.facts.length,
      addedBusinessRules: 0,
      addedContradictions: 0,
      addedPainSignals: 0,
      addedRisks: 0,
      addedOpportunities: 0,
      addedUnknowns: 0,
    },
    meeting.title,
  )[0];

  const nextThemes = Array.from(
    new Set([
      ...knowledge.themes,
      ...scan.slots.facts.slice(0, 3).map((fact) => fact.statement),
    ]),
  ).slice(0, 12);

  return buildWorkspaceKnowledge({
    assets: [...knowledge.assets, asset],
    entities: entityMerge.entities,
    relationships: relationshipMerge.relationships,
    summary: learnedLine ?? knowledge.summary ?? "",
    themes: nextThemes,
    lastAnalysisAt: stamp,
    // Untouched by this path — carried through so an interview merge can
    // never silently wipe out document-derived business rules/contradictions.
    businessRules: knowledge.businessRules,
    contradictions: knowledge.contradictions,
    evidenceLog: appendEvidenceLog(knowledge.evidenceLog, scan.evidence),
    chunks: knowledge.chunks,
  });
}
