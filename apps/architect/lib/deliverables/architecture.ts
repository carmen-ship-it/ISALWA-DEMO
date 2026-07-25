import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  TechnicalArchitectureDeliverable,
} from "@/types";

/** Conceptual technical architecture only — no code, SQL, or OpenAPI. */
export function buildTechnicalArchitecture(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): TechnicalArchitectureDeliverable {
  const solution = workspace.solutionArchitecture;

  return {
    kind: "technical_architecture",
    systemModules: solution?.modules.map((m) => m.name) ?? [],
    databaseConcepts:
      solution?.database.map(
        (t) => `${t.entity}: ${t.fields.map((f) => f.name).join(", ")}`,
      ) ?? [],
    apiConcepts:
      solution?.apis.map(
        (a) => `${a.resource} [${a.operations.join(", ")}]`,
      ) ?? [],
    permissions: solution?.permissions.map((p) => p.capability) ?? [],
    authentication: [
      "Role-based authentication mapped to Solution roles",
      "Session or SSO deferred to implementation mission",
      "Least-privilege defaults for operational roles",
    ],
    audit: [
      "Audit create/update/delete on financial and approval entities",
      "Preserve actor, timestamp, and prior value for approvals",
      "Timeline events remain the consulting-side audit companion",
    ],
    integrations: solution?.integrations.map(
      (i) => `${i.name} — ${i.status}: ${i.purpose}`,
    ) ?? [],
    evidence: evidence.slice(0, 4),
  };
}
