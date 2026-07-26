/**
 * Consultant Readiness Engine — the EvidenceSnapshot boundary.
 *
 * Every evidence source crosses this line before the engine reasons about
 * it. Today the collectors read Company Memory, the Knowledge Engine, the
 * Intake evidence log, Company Evolution history and the workspace record
 * itself. Adding a source later (uploads, e-mail archives, CRM/ERP exports)
 * means writing one more collector here — `evaluate.ts` never changes.
 *
 * Collectors copy, they do not compute: `strength` always comes from the
 * engine that produced the evidence.
 */

import { ensureWorkspaceKnowledge } from "@/lib/knowledge/coverage";
import {
  DIMENSION_EVIDENCE_KEYS,
  DIMENSION_LABELS,
} from "@/lib/reasoning/confidence/score";
import { nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  ConversationMemory,
  DimensionStatus,
  DiscoveryDimension,
  KnowledgeCoverageSlice,
  WorkspaceKnowledge,
} from "@/types";
import { AREA_TO_DIMENSIONS, TOPIC_PATTERNS } from "./topics";
import type {
  EvidenceInventory,
  EvidenceSignal,
  EvidenceSnapshot,
  ReadinessConflict,
  ReadinessTopicId,
} from "./types";

const CORE_TOPICS: DiscoveryDimension[] = [
  "sales",
  "customers",
  "geography",
  "team",
  "operations",
  "finance",
  "production",
  "systems",
];

/** Client-facing source names — the engine never shows internal source ids. */
const SOURCE_LABELS = {
  interview: "Entrevistas",
  document: "Documentos",
  imported_record: "Información importada",
  business_rule: "Reglas del negocio",
  meeting: "Reuniones",
  history: "Historial de la empresa",
} as const;

export interface EvidenceSnapshotInput {
  workspaceId: string;
  memory: ConversationMemory | null;
  knowledge: WorkspaceKnowledge | null;
  meetingCount?: number;
  revisionCount?: number;
  /** Business understanding as already published elsewhere (0–100). */
  overallUnderstanding?: number;
}

/**
 * Attach a topic to free text using the shared topic patterns. Returns null
 * when nothing matches — an unattributed signal still counts as evidence in
 * the inventory, it just does not lift a specific topic.
 */
function topicFromText(text: string): ReadinessTopicId | null {
  for (const topic of CORE_TOPICS) {
    if (TOPIC_PATTERNS[topic].test(text)) return topic;
  }
  return null;
}

function collectInterviewSignals(
  memory: ConversationMemory | null,
): EvidenceSignal[] {
  if (!memory) return [];
  return memory.knownFacts.map((fact) => ({
    id: fact.id,
    topic: fact.dimension ?? topicFromText(`${fact.key} ${fact.statement}`),
    source: "interview" as const,
    sourceLabel: SOURCE_LABELS.interview,
    statement: fact.statement,
    strength: Math.round(Math.max(0, Math.min(1, fact.confidence)) * 100),
    capturedAt: fact.createdAt ?? null,
  }));
}

function collectDocumentSignals(
  knowledge: WorkspaceKnowledge,
): EvidenceSignal[] {
  return knowledge.assets
    .filter((asset) => asset.status === "processed")
    .map((asset) => ({
      id: asset.id,
      topic:
        AREA_TO_DIMENSIONS[asset.coverageAreas[0] ?? "Operations"]?.[0] ??
        topicFromText(`${asset.title} ${asset.summary ?? ""}`),
      source: "document" as const,
      sourceLabel: SOURCE_LABELS.document,
      statement: asset.summary ?? asset.title,
      strength: Math.round(Math.max(0, Math.min(1, asset.confidence)) * 100),
      capturedAt: asset.processedAt ?? asset.uploadedAt,
    }));
}

/**
 * The Intake evidence ledger — already the landing zone for uploads,
 * transcripts, e-mail archives and CRM/ERP exports (`lib/intake`). Anything
 * a future source writes there is picked up here for free.
 */
function collectImportedSignals(
  knowledge: WorkspaceKnowledge,
): EvidenceSignal[] {
  return knowledge.evidenceLog.map((entry) => ({
    id: entry.id,
    topic: topicFromText(`${entry.statement} ${entry.sourceLabel}`),
    source: "imported_record" as const,
    sourceLabel: SOURCE_LABELS.imported_record,
    statement: entry.statement,
    strength: Math.round(Math.max(0, Math.min(1, entry.confidence)) * 100),
    capturedAt: entry.createdAt,
  }));
}

function collectBusinessRuleSignals(
  knowledge: WorkspaceKnowledge,
): EvidenceSignal[] {
  return knowledge.businessRules.map((rule) => ({
    id: rule.id,
    topic: topicFromText(rule.statement),
    source: "business_rule" as const,
    sourceLabel: SOURCE_LABELS.business_rule,
    statement: rule.statement,
    strength: Math.round(Math.max(0, Math.min(1, rule.confidence)) * 100),
    capturedAt: rule.createdAt,
  }));
}

/**
 * Disagreements between sources, gathered from the three places the platform
 * already records them. Phrasing is preserved as-is — those engines already
 * write soft, non-accusatory Spanish.
 */
function collectConflicts(
  memory: ConversationMemory | null,
  knowledge: WorkspaceKnowledge,
): ReadinessConflict[] {
  const conflicts: ReadinessConflict[] = [];
  const seen = new Set<string>();

  const push = (
    id: string,
    statement: string,
    sourceLabels: string[],
  ) => {
    const normalized = statement.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    conflicts.push({
      id,
      topic: topicFromText(statement),
      statement: statement.trim(),
      sourceLabels,
    });
  };

  for (const item of memory?.consulting?.contradictions ?? []) {
    push(item.id, item.statement, [SOURCE_LABELS.interview]);
  }
  for (const item of memory?.contradictions ?? []) {
    push(item.id, item.statement, [SOURCE_LABELS.interview]);
  }
  for (const item of knowledge.contradictions) {
    push(item.id, item.statement, [
      SOURCE_LABELS.document,
      SOURCE_LABELS.imported_record,
    ]);
  }

  return conflicts;
}

function collectMissingEvidenceKeys(
  memory: ConversationMemory | null,
): Record<ReadinessTopicId, string[]> {
  const known = new Set(memory?.knownFacts.map((fact) => fact.key) ?? []);
  return CORE_TOPICS.reduce(
    (acc, topic) => {
      acc[topic] = DIMENSION_EVIDENCE_KEYS[topic].filter(
        (key) => !known.has(key),
      );
      return acc;
    },
    {} as Record<ReadinessTopicId, string[]>,
  );
}

function fallbackDimensions(): DimensionStatus[] {
  return CORE_TOPICS.map((id) => ({
    id,
    label: DIMENSION_LABELS[id],
    covered: false,
    confidence: 0,
    applicable: true,
  }));
}

/**
 * Build the snapshot from whatever context is available. The interview
 * planner only ever holds a `ConversationMemory`; the workspace surfaces
 * hold everything.
 */
export function buildEvidenceSnapshot(
  input: EvidenceSnapshotInput,
): EvidenceSnapshot {
  const knowledge = ensureWorkspaceKnowledge(input.knowledge);
  const memory = input.memory;

  const signals: EvidenceSignal[] = [
    ...collectInterviewSignals(memory),
    ...collectDocumentSignals(knowledge),
    ...collectImportedSignals(knowledge),
    ...collectBusinessRuleSignals(knowledge),
  ];

  const dimensions =
    memory?.score.dimensions && memory.score.dimensions.length > 0
      ? memory.score.dimensions
      : fallbackDimensions();

  const inventory: EvidenceInventory = {
    interviewFacts: memory?.knownFacts.length ?? 0,
    documents: knowledge.assets.filter((a) => a.status === "processed").length,
    importedRecords: knowledge.evidenceLog.length,
    meetings: input.meetingCount ?? 0,
    businessRules: knowledge.businessRules.length,
    revisions: input.revisionCount ?? 0,
  };

  return {
    workspaceId: input.workspaceId,
    capturedAt: nowIso(),
    dimensions,
    coverage: knowledge.coverage as KnowledgeCoverageSlice[],
    signals,
    conflicts: collectConflicts(memory, knowledge),
    missingEvidenceKeys: collectMissingEvidenceKeys(memory),
    inventory,
    overallUnderstanding:
      input.overallUnderstanding ?? memory?.score.overall ?? 0,
  };
}

/** Snapshot for a full workspace — the surface used by every client screen. */
export function snapshotFromWorkspace(
  workspace: CompanyWorkspace,
): EvidenceSnapshot {
  return buildEvidenceSnapshot({
    workspaceId: workspace.id,
    memory: workspace.conversationMemory,
    knowledge: workspace.knowledge,
    meetingCount: workspace.meetings.length,
    revisionCount: workspace.evolutionHistory?.snapshots.length ?? 0,
    overallUnderstanding: workspace.businessUnderstanding,
  });
}

/**
 * Snapshot during a live interview, where only working memory exists.
 * Imported evidence has already been folded into memory as `evidence_*`
 * facts by `applyReadinessToMemory`, so the planner sees the same picture.
 */
export function snapshotFromMemory(
  memory: ConversationMemory,
  workspaceId = "interview",
): EvidenceSnapshot {
  return buildEvidenceSnapshot({
    workspaceId,
    memory,
    knowledge: null,
  });
}
