import { createId } from "@/lib/utils";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  KnowledgeEntity,
  TimelineEvent,
  WorkspaceKnowledge,
} from "@/types";
import { buildWorkspaceKnowledge, emptyWorkspaceKnowledge } from "./coverage";

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function asset(input: Omit<KnowledgeAsset, "id"> & { id?: string }): KnowledgeAsset {
  return {
    id: input.id ?? createId("asset"),
    ...input,
  };
}

function entity(
  input: Omit<KnowledgeEntity, "id" | "metadata"> & {
    id?: string;
    metadata?: Record<string, string>;
  },
): KnowledgeEntity {
  return {
    id: input.id ?? createId("entity"),
    metadata: input.metadata ?? {},
    ...input,
  };
}

/** Knowledge seed for the pilot company only. */
export function createSeedKnowledge(workspaceId: string): WorkspaceKnowledge {
  if (workspaceId === "ws_isalwa") {
    return seedLight(workspaceId, {
      summary:
        "Two strategy decks and a project handoff note were reviewed before the last session.",
      themes: [
        "Consulting knowledge lives in people",
        "Project handoffs lose context",
      ],
      days: 4,
    });
  }
  return emptyWorkspaceKnowledge();
}

function seedLight(
  workspaceId: string,
  opts: { summary: string; themes: string[]; days: number },
): WorkspaceKnowledge {
  const processed = daysAgo(opts.days);
  const deck = asset({
    workspaceId,
    title: "Operating Overview Deck",
    type: "presentation",
    category: "Presentations",
    source: "powerpoint · mock",
    status: "processed",
    uploadedAt: daysAgo(opts.days + 1),
    processedAt: processed,
    summary: opts.summary,
    tags: ["overview"],
    confidence: 0.7,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations", "Sales"],
  });
  const processDoc = asset({
    workspaceId,
    title: "Process Notes",
    type: "process_document",
    category: "Process Documents",
    source: "word · mock",
    status: "processed",
    uploadedAt: daysAgo(opts.days + 1),
    processedAt: processed,
    summary: "Partial process notes with several unknown owners.",
    tags: ["process"],
    confidence: 0.62,
    entities: [],
    relationships: [],
    coverageAreas: ["Operations"],
  });

  const company = entity({
    workspaceId,
    kind: "Company",
    name: "ISALWA",
    summary: opts.summary,
    sourceAssetIds: [deck.id, processDoc.id],
    confidence: 0.75,
  });

  return buildWorkspaceKnowledge({
    assets: [deck, processDoc],
    entities: [company],
    relationships: [],
    summary: opts.summary,
    themes: opts.themes,
    lastAnalysisAt: processed,
  });
}

export const KNOWLEDGE_CATEGORIES: readonly KnowledgeCategory[] = [
  "Company Documents",
  "Meeting Transcripts",
  "Customer Lists",
  "Sales Data",
  "Invoices",
  "Presentations",
  "Images",
  "Process Documents",
  "Policies",
  "Future Imports",
] as const;

/** Timeline events derived from processed knowledge assets. */
export function knowledgeTimelineEvents(
  workspaceId: string,
  knowledge: WorkspaceKnowledge,
): TimelineEvent[] {
  return knowledge.assets
    .filter((a) => a.status === "processed" && a.processedAt)
    .map((a) => ({
      id: createId("timeline"),
      workspaceId,
      date: a.processedAt as string,
      title: timelineTitleForAsset(a),
      description: a.summary ?? `${a.title} added to company knowledge.`,
      category: "knowledge" as const,
    }));
}

function timelineTitleForAsset(asset: KnowledgeAsset): string {
  switch (asset.type) {
    case "customer_list":
      return "Customer Database Imported";
    case "sales_data":
      return "Sales History Imported";
    case "policy":
      return `${asset.title.replace(/\s+v\d+$/i, "")} Added`;
    case "meeting_transcript":
      return "Meeting Transcript Processed";
    case "presentation":
      return "Presentation Analyzed";
    case "process_document":
      return "Process Document Added";
    default:
      return `${asset.title} Processed`;
  }
}
