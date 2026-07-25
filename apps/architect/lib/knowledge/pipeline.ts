import type { KnowledgePipelineStage } from "@/types";

/**
 * Processing pipeline — architecture only.
 *
 * Upload → Parser → Knowledge Extraction → Memory → Recommendations → Reasoning Engine
 *
 * No stage is executed in Mission 3.
 */
export const KNOWLEDGE_PIPELINE: readonly KnowledgePipelineStage[] = [
  {
    id: "upload",
    title: "Upload",
    description: "Receive files and connector imports into the Knowledge Center.",
    status: "designed",
    next: "parser",
  },
  {
    id: "parser",
    title: "Parser",
    description: "Normalize PDF, Excel, Word, images, and exports into text/tables.",
    status: "designed",
    next: "knowledge_extraction",
  },
  {
    id: "knowledge_extraction",
    title: "Knowledge Extraction",
    description: "Extract entities, relationships, themes, and evidence spans.",
    status: "designed",
    next: "memory",
  },
  {
    id: "memory",
    title: "Memory",
    description: "Merge extracted evidence into Company Memory and the knowledge graph.",
    status: "designed",
    next: "recommendations",
  },
  {
    id: "recommendations",
    title: "Recommendations",
    description: "Surface modules, risks, and next questions from ingested evidence.",
    status: "planned",
    next: "reasoning_engine",
  },
  {
    id: "reasoning_engine",
    title: "Reasoning Engine",
    description:
      "Consultant brain consumes Conversation + Knowledge + Memory together.",
    status: "planned",
    next: null,
  },
] as const;
