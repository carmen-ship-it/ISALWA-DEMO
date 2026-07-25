import type {
  CompanyWorkspace,
  DeliverableEvidenceRef,
  PrdDeliverable,
} from "@/types";

export function buildPrd(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): PrdDeliverable {
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const processes = workspace.businessProcesses;
  const consulting = workspace.conversationMemory?.consulting;

  const goals = [
    `Replace fragile tools with a durable operating system for ${workspace.companyName}`,
    ...(blueprint?.opportunities.slice(0, 4).map((o) => o.title) ?? []),
  ];

  const users =
    solution?.roles.map((r) => r.name) ??
    blueprint?.roles ??
    ["Owner", "Manager", "Operator"];

  const functionalRequirements = [
    ...(solution?.modules.map(
      (m) => `Support ${m.name}: ${m.purpose}`,
    ) ?? []),
    ...(processes?.workflows.map(
      (w) => `Execute workflow “${w.name}” when ${w.trigger}`,
    ) ?? []),
  ].slice(0, 20);

  const nonFunctionalRequirements = [
    "Audit trail on approvals and financial mutations",
    "Role-based access control for all modules",
    "Mobile-usable for field and warehouse roles where evidenced",
    "Exportable operational reports",
    "Deterministic configuration from Business Blueprint",
  ];

  const acceptanceCriteria = [
    "Each Phase 1 module can complete its primary happy-path workflow end-to-end",
    "Approvals enforce authority rules captured in discovery",
    "Manual spreadsheet steps targeted in Phase 1 are retired or dual-run with audit",
    "Cursor Context document remains accurate against shipped modules",
  ];

  const futureScope = [
    ...(solution?.aiAgents.map((a) => a.name) ?? []),
    ...(blueprint?.opportunities
      .filter((o) => o.horizon === "Strategic Initiatives" || o.horizon === "Innovation")
      .map((o) => o.title) ?? []),
  ];

  const outOfScope = [
    "Physical ERP replacement for systems marked retain",
    "Unvalidated integrations without evidence",
    "Custom AI models before foundation data quality exists",
  ];

  return {
    kind: "prd",
    goals,
    users,
    requirements: [
      ...functionalRequirements.slice(0, 8),
      ...nonFunctionalRequirements.slice(0, 3),
    ],
    functionalRequirements,
    nonFunctionalRequirements,
    acceptanceCriteria,
    dependencies: [
      ...(solution?.modules.flatMap((m) => m.dependencies) ?? []),
      ...(processes?.dependencies.map((d) => d.relationship) ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i),
    futureScope,
    outOfScope,
    risks: (consulting?.risks ?? [])
      .slice(0, 8)
      .map((r) => `${r.title} (${r.severity})`),
    evidence: evidence.slice(0, 6),
  };
}
