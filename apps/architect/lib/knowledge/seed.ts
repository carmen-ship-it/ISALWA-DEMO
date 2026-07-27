import { createId } from "@/lib/utils";
import type {
  KnowledgeAsset,
  KnowledgeCategory,
  TimelineEvent,
  WorkspaceKnowledge,
} from "@/types";
import { emptyWorkspaceKnowledge } from "./coverage";

/**
 * Knowledge seed — HOTFIX (see apps/architect/NO_FABRICATED_CONTENT.md).
 *
 * This previously fabricated two "processed" documents (a presentation and
 * process notes, tagged `source: "... · mock"`) for the pilot workspace that
 * were never actually uploaded, plus a summary claiming they had been
 * reviewed. That is exactly the kind of invented business fact the product
 * principles forbid ("never fabricate; every fact traces to evidence").
 * The Knowledge Center now starts honestly empty for every workspace,
 * including the pilot, until Carmen/Álvaro upload something real.
 */
export function createSeedKnowledge(_workspaceId: string): WorkspaceKnowledge {
  return emptyWorkspaceKnowledge();
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
  "Manual Notes",
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
      description: a.summary ?? `${a.title} se agregó al conocimiento de la empresa.`,
      category: "knowledge" as const,
    }));
}

export function timelineTitleForAsset(asset: KnowledgeAsset): string {
  switch (asset.type) {
    case "customer_list":
      return "Base de clientes importada";
    case "sales_data":
      return "Historial de ventas importado";
    case "policy":
      return `${asset.title.replace(/\s+v\d+$/i, "")} agregada`;
    case "meeting_transcript":
      return "Transcripción de reunión procesada";
    case "presentation":
      return "Presentación analizada";
    case "process_document":
      return "Documento de proceso agregado";
    default:
      return `${asset.title} procesado`;
  }
}
