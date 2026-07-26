/**
 * Main preparation entry — Architect never starts with a blank mind.
 * Deterministic only: workspace + knowledge + memory → PreparationBrief.
 */

import type { CompanyWorkspace } from "@/types";
import {
  assemblePreparationBrief,
  type PreparationBrief,
} from "./company-brief";
import { mergeKnowledgeForPreparation } from "./knowledge-merge";

/**
 * Prepare for an interview from every available in-app source.
 *
 * Today: CompanyWorkspace, Knowledge Center, conversationMemory,
 * openQuestions, painPoints, discovery score, consulting signals.
 *
 * Deferred: uploads, OCR, AI extraction, live connectors.
 */
export function prepareCompany(workspace: CompanyWorkspace): PreparationBrief {
  const input = mergeKnowledgeForPreparation(workspace);
  return assemblePreparationBrief(input);
}
