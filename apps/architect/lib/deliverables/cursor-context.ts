import type {
  CompanyWorkspace,
  CursorContextDeliverable,
  DeliverableEvidenceRef,
} from "@/types";

/**
 * Master context document for Cursor — structured, deterministic, no LLM.
 */
export function buildCursorContext(
  workspace: CompanyWorkspace,
  evidence: DeliverableEvidenceRef[],
): CursorContextDeliverable {
  const solution = workspace.solutionArchitecture;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const processes = workspace.businessProcesses;
  const company = workspace.companyName;

  const purpose = `This software exists to operate ${company} as a coherent business operating system — capturing customers, orders, approvals, operations, and finance with auditability, replacing evidenced spreadsheet/chat fragility.`;

  const coreModules =
    solution?.modules.map((m) => `${m.name}: ${m.purpose}`) ??
    blueprint?.modules.map((m) => `${m.name}: ${m.purpose}`) ??
    [];

  const businessRules =
    solution?.businessRules.map((r) => r.statement) ??
    blueprint?.operatingRules.map((r) => r.statement) ??
    [];

  const criticalWorkflows =
    processes?.workflows.map(
      (w) => `${w.name} — trigger: ${w.trigger}; ${w.steps.length} steps`,
    ) ??
    blueprint?.workflows.map((w) => w.name) ??
    [];

  const importantConstraints = [
    "Never invent workflows or entities without evidence from the Business Blueprint / Process Engine",
    "Respect approval authorities and thresholds captured in discovery",
    "Prefer extending @isalwa design language when UI is in scope — but this Architect package is documentation-only",
    "Do not introduce parallel CRM/ERP modules already marked for retirement without migration plan",
    ...(solution?.approvalRules.map((r) => `Approval: ${r.statement}`) ?? []),
  ];

  const domainLanguage = [
    ...(solution?.entities.map((e) => e.name) ??
      blueprint?.entities.map((e) => e.name) ??
      []),
    ...(blueprint?.capabilities.map((c) => c.name) ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  const successMetrics = [
    ...(processes?.workflows.flatMap((w) =>
      w.metrics
        ? [
            `${w.name}: automation ${Math.round(w.metrics.automationScore * 100)}%, coverage ${Math.round(w.metrics.documentationScore * 100)}%`,
          ]
        : [],
    ) ?? []),
    ...(blueprint?.workflows.flatMap((w) => w.metrics) ?? []),
    "Reduce manual approvals cycle time",
    "Eliminate duplicate entry between evidenced systems",
  ].slice(0, 10);

  const doNot = [
    "Do NOT generate production code from this Architect app in Mission 9",
    "Do NOT invent customers, products, or policies not present in evidence",
    "Do NOT bypass approval rules",
    "Do NOT replace the Process Engine with a second workflow model",
    "Do NOT use LLM-generated diagrams as source of truth",
    "Do NOT ship features outside the phased roadmap without updating the Blueprint",
  ];

  const narrative = [
    purpose,
    "",
    "Core modules:",
    ...coreModules.map((m) => `- ${m}`),
    "",
    "Business rules:",
    ...businessRules.slice(0, 12).map((r) => `- ${r}`),
    "",
    "Critical workflows:",
    ...criticalWorkflows.slice(0, 10).map((w) => `- ${w}`),
    "",
    "Important constraints:",
    ...importantConstraints.map((c) => `- ${c}`),
    "",
    "Domain language:",
    `- ${domainLanguage.join(", ")}`,
    "",
    "Success metrics:",
    ...successMetrics.map((m) => `- ${m}`),
    "",
    "Do NOT:",
    ...doNot.map((d) => `- ${d}`),
  ].join("\n");

  return {
    kind: "cursor_context",
    purpose,
    coreModules,
    businessRules,
    criticalWorkflows,
    importantConstraints,
    domainLanguage,
    successMetrics,
    doNot,
    narrative,
    evidence: evidence.slice(0, 6),
  };
}
