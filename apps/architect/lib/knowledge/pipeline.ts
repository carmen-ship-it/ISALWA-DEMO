import type { KnowledgePipelineStage } from "@/types";

/**
 * Processing pipeline.
 *
 * Upload → Parser → Knowledge Extraction → Memory → Recommendations → Reasoning Engine
 *
 * Mission 3: architecture only, no stage executed.
 * Mission "Executive Knowledge Intake": Upload, Parser, and Knowledge Extraction
 * are wired via `lib/knowledge/intake.ts` — deterministic metadata heuristics
 * (filename + extension), no OCR/LLM. Memory is picked up by the existing
 * Resume Engine bridge (`lib/knowledge/bridge.ts`) the next time discovery
 * resumes. Recommendations / Reasoning Engine remain future work.
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
