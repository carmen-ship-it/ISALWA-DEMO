/**
 * Memory facade — thin on purpose.
 *
 * Wraps the existing conversation / company-memory building blocks
 * (`lib/memory/apply-interview.ts`, `lib/search`) so future AI call sites
 * (chat grounded in company memory, deliverable drafting, etc.) have one
 * place to ask "what does Architect already know" — without re-deriving or
 * duplicating Mission G's working-memory model.
 */
import type { ConversationMemory } from "@/types";

export { applyInterviewToWorkspace } from "@/lib/memory/apply-interview";
export { searchCompanyMemory } from "@/lib/search";

/**
 * Render a workspace's current conversation memory as compact context text
 * for a prompt. Deliberately small and lossy — a full RetrievalPack
 * (Mission C) replaces this with ranked, cited context; this exists so an AI
 * call site has *something* today without reaching into Mission G's internals
 * directly.
 */
export function summarizeWorkingMemoryForPrompt(memory: ConversationMemory): string {
  const facts = memory.knownFacts.slice(0, 8).map((fact) => `- ${fact.statement}`);
  const pains = memory.painPoints
    .slice(0, 5)
    .map((pain) => `- ${pain.title}: ${pain.description}`);
  const stillNeed = memory.score.stillNeed.slice(0, 5).map((item) => `- ${item}`);

  const sections = [
    facts.length ? `Known facts:\n${facts.join("\n")}` : null,
    pains.length ? `Pain points:\n${pains.join("\n")}` : null,
    stillNeed.length ? `Still need to learn:\n${stillNeed.join("\n")}` : null,
  ].filter((section): section is string => Boolean(section));

  return sections.join("\n\n");
}
