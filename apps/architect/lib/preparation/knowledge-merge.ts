/**
 * Merge available in-app knowledge into a deterministic preparation input.
 * Reuses Knowledge Center + workspace memory — no uploads, OCR, or connectors.
 */

import {
  ensureWorkspaceKnowledge,
  hasProcessedKnowledge,
} from "@/lib/knowledge";
import type {
  CompanyWorkspace,
  DiscoveryScore,
  Industry,
  KnowledgeCoverageSlice,
  KnowledgeAsset,
  KnowledgeAssetType,
  KnowledgeCategory,
} from "@/types";
import type { PreparationSourceKind } from "./sources";

/** Normalized input for brief assembly — pure data, no I/O. */
export interface PreparationInput {
  workspaceId: string;
  companyName: string;
  industry: Industry;
  businessUnderstanding: number;
  knownFacts: string[];
  painPoints: string[];
  openQuestions: string[];
  unknownAreas: string[];
  departments: string[];
  currentSoftware: string[];
  knowledgeThemes: string[];
  knowledgeCoverage: KnowledgeCoverageSlice[];
  discoveryScore: DiscoveryScore | null;
  consultingRiskTitles: string[];
  consultingQuickWins: string[];
  consultingOpportunityTitles: string[];
  meetingDiscoveries: string[];
  whiteboardModules: string[];
  /** Source kinds implied by existing in-app assets (not fetched). */
  impliedSourceKinds: PreparationSourceKind[];
  processedAssetCount: number;
  hasProcessedKnowledge: boolean;
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

const ASSET_TYPE_TO_SOURCE: Partial<
  Record<KnowledgeAssetType, PreparationSourceKind>
> = {
  meeting_transcript: "meeting_transcripts",
  customer_list: "customer_databases",
  sales_data: "crm_exports",
  invoice: "invoices",
  image: "images",
  company_document: "documents",
  process_document: "documents",
  policy: "documents",
  presentation: "documents",
};

const CATEGORY_TO_SOURCE: Partial<
  Record<KnowledgeCategory, PreparationSourceKind>
> = {
  "Meeting Transcripts": "meeting_transcripts",
  "Customer Lists": "customer_databases",
  "Sales Data": "crm_exports",
  Invoices: "invoices",
  Images: "images",
  "Company Documents": "documents",
  "Process Documents": "documents",
  Policies: "documents",
  Presentations: "documents",
};

/**
 * Map existing Knowledge assets / workspace documents to FUTURE source kinds.
 * Does not fetch or parse — only classifies what is already in memory.
 */
export function implySourceKindsFromAssets(
  assets: KnowledgeAsset[],
  documentKinds: string[],
): PreparationSourceKind[] {
  const kinds = new Set<PreparationSourceKind>();

  for (const asset of assets) {
    const fromType = ASSET_TYPE_TO_SOURCE[asset.type];
    if (fromType) kinds.add(fromType);
    const fromCategory = CATEGORY_TO_SOURCE[asset.category];
    if (fromCategory) kinds.add(fromCategory);

    const blob = `${asset.title} ${asset.source} ${asset.tags.join(" ")}`.toLowerCase();
    if (/\.xlsx?|excel|spreadsheet/.test(blob)) kinds.add("excel");
    if (/\.pdf|pdf/.test(blob)) kinds.add("pdf");
    if (/\.docx?|word/.test(blob)) kinds.add("word");
    if (/crm/.test(blob)) kinds.add("crm_exports");
    if (/erp/.test(blob)) kinds.add("erp_exports");
    if (/org.?chart|organigrama/.test(blob)) kinds.add("organizational_charts");
    if (/email|correo/.test(blob)) kinds.add("email");
    if (/website|sitio|web/.test(blob)) kinds.add("website");
    if (/linkedin|instagram|facebook|social/.test(blob)) {
      kinds.add("social_media");
    }
  }

  for (const kind of documentKinds) {
    const normalized = kind.toLowerCase();
    if (normalized.includes("transcript")) kinds.add("meeting_transcripts");
    if (normalized.includes("excel")) kinds.add("excel");
    if (normalized.includes("pdf")) kinds.add("pdf");
    if (normalized.includes("crm")) kinds.add("crm_exports");
    if (normalized.includes("erp")) kinds.add("erp_exports");
    if (normalized.includes("photo") || normalized.includes("image")) {
      kinds.add("images");
    }
    if (normalized.includes("whatsapp") || normalized.includes("email")) {
      kinds.add("email");
    }
  }

  return Array.from(kinds);
}

/**
 * Merge CompanyWorkspace + Knowledge Center + memory into PreparationInput.
 */
export function mergeKnowledgeForPreparation(
  workspace: CompanyWorkspace,
): PreparationInput {
  const knowledge = ensureWorkspaceKnowledge(workspace.knowledge);
  const memory = workspace.conversationMemory;
  const consulting = memory?.consulting ?? null;

  const knownFacts = uniqueStrings([
    ...(memory?.knownFacts.map((f) => f.statement) ?? []),
    ...workspace.meetings.flatMap((m) => m.discoveries),
    ...knowledge.themes,
    ...(memory?.whiteboard.facts ?? []),
  ]);

  const painPoints = uniqueStrings([
    ...workspace.painPoints.map((p) => p.title),
    ...(memory?.painPoints.map((p) => p.title) ?? []),
    ...(memory?.summary.painPoints ?? []),
    ...(memory?.whiteboard.painPoints ?? []),
  ]);

  const openQuestions = uniqueStrings([
    ...workspace.openQuestions,
    ...(memory?.questionsRemaining.map((q) => q.label) ?? []),
    ...(memory?.score.stillNeed ?? []),
  ]);

  const unknownAreas = uniqueStrings([
    ...knowledge.unknownAreas,
    ...(memory?.unknownFacts.map((u) => u.label) ?? []),
    ...(memory?.summary.missingInformation ?? []),
    ...(memory?.whiteboard.unknowns ?? []),
    ...(memory?.score.stillNeed ?? []),
  ]);

  const departments = uniqueStrings([
    ...(memory?.summary.departments ?? []),
    ...workspace.people
      .map((p) => p.department)
      .filter((d): d is string => Boolean(d)),
  ]);

  const currentSoftware = uniqueStrings([
    ...(memory?.summary.currentSoftware ?? []),
    ...(memory?.whiteboard.currentSystems ?? []),
  ]);

  const consultingRiskTitles =
    consulting?.risks.map((r) => r.title) ??
    memory?.whiteboard.risks ??
    [];

  const consultingQuickWins =
    consulting?.opportunities
      .filter((o) => o.horizon === "Quick Wins")
      .map((o) => o.title) ?? [];

  const consultingOpportunityTitles =
    consulting?.opportunities.map((o) => o.title) ??
    memory?.whiteboard.opportunities ??
    [];

  const meetingDiscoveries = uniqueStrings(
    workspace.meetings.flatMap((m) => m.discoveries),
  );

  const whiteboardModules = uniqueStrings(
    memory?.whiteboard.potentialModules ?? [],
  );

  const processed = knowledge.assets.filter((a) => a.status === "processed");

  return {
    workspaceId: workspace.id,
    companyName: workspace.companyName,
    industry: workspace.industry,
    businessUnderstanding: workspace.businessUnderstanding,
    knownFacts,
    painPoints,
    openQuestions,
    unknownAreas,
    departments,
    currentSoftware,
    knowledgeThemes: knowledge.themes,
    knowledgeCoverage: knowledge.coverage,
    discoveryScore: memory?.score ?? null,
    consultingRiskTitles: uniqueStrings(consultingRiskTitles),
    consultingQuickWins: uniqueStrings(consultingQuickWins),
    consultingOpportunityTitles: uniqueStrings(consultingOpportunityTitles),
    meetingDiscoveries,
    whiteboardModules,
    impliedSourceKinds: implySourceKindsFromAssets(
      knowledge.assets,
      workspace.documents.map((d) => d.kind),
    ),
    processedAssetCount: processed.length,
    hasProcessedKnowledge: hasProcessedKnowledge(knowledge),
  };
}
