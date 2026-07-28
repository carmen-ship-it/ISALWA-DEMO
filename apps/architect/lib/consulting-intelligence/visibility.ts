/**
 * Consulting Intelligence Agent — the Client Mode gate.
 *
 * The agent's working memory is how the platform thinks in private:
 * hypotheses, assumptions, confidence notes, contradictions, risks. A client
 * (Álvaro) must never see any of it. Seeing "hipótesis" and "contradicción"
 * about their own company reads as the platform second-guessing them, and it
 * leaks the uncertainty the Readiness Engine exists to absorb.
 *
 * So there is exactly one way to read working memory, and it takes a role.
 * `client` always gets `null` — not a filtered subset, not an empty shell.
 * Consultants get the notebook.
 *
 * Rendering rule for anything downstream: if you did not get this object from
 * `consultingWorkingMemoryFor`, you must not render it.
 */

import type { ArchitectRole } from "@/types/auth";
import type { CompanyWorkspace } from "@/types";
import type { ConsultingWorkingMemory } from "./types";

/**
 * Working memory for a viewer, or `null` when they may not see it.
 *
 * The default is deliberately the safe one: any role that is not explicitly
 * `consultant` gets nothing.
 */
export function consultingWorkingMemoryFor(
  workspace: CompanyWorkspace,
  role: ArchitectRole,
): ConsultingWorkingMemory | null {
  if (role !== "consultant") return null;
  return workspace.consultingIntelligence ?? null;
}

/** True when this viewer may see internal consulting reasoning at all. */
export function canSeeConsultingWorkingMemory(role: ArchitectRole): boolean {
  return role === "consultant";
}

/**
 * Strip working memory out of a workspace before it crosses into Client Mode.
 *
 * Use this at any boundary that serializes a whole workspace toward the
 * client (API response, RSC payload, export). Cheaper and safer than
 * remembering to omit one field at every call site.
 */
export function withoutConsultingWorkingMemory(
  workspace: CompanyWorkspace,
): CompanyWorkspace {
  if (!workspace.consultingIntelligence) return workspace;
  return { ...workspace, consultingIntelligence: null };
}

/**
 * Workspace as a given role is allowed to see it.
 *
 * Consultants get it whole; everyone else gets it with the notebook removed.
 */
export function workspaceForRole(
  workspace: CompanyWorkspace,
  role: ArchitectRole,
): CompanyWorkspace {
  if (role === "consultant") return workspace;
  return withoutConsultingWorkingMemory(workspace);
}
