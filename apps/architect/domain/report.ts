import { createId, nowIso } from "@/lib/utils";
import { emptyConsultingIntelligence } from "@/lib/consulting";
import type {
  ComplexityLevel,
  DepartmentAnalysis,
  DiscoveryReport,
  Interview,
  Module,
  PainPoint,
  Recommendation,
  RoadmapPhase,
  TimelineEstimate,
  Workflow,
} from "@/types";

function estimateComplexity(interview: Interview): ComplexityLevel {
  const signalCount = interview.business.signals.length;
  const toolCount = interview.business.currentTools.length;
  const painCount = interview.memory.painPoints.length;
  const score = signalCount * 2 + toolCount + painCount;

  if (score >= 14) return "very_high";
  if (score >= 9) return "high";
  if (score >= 5) return "moderate";
  return "low";
}

function estimateTimeline(complexity: ComplexityLevel): TimelineEstimate {
  switch (complexity) {
    case "low":
      return "4–8 weeks";
    case "moderate":
      return "2–4 months";
    case "high":
      return "4–6 months";
    case "very_high":
      return "6–12 months";
  }
}

function modulesFromInterview(interview: Interview): Module[] {
  const names = interview.memory.whiteboard.potentialModules;
  const base: Module[] = names.map((name, index) => ({
    id: `mod_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    purpose: `Address the ${name.toLowerCase()} gap surfaced during discovery.`,
    priority: index < 3 ? "core" : "supporting",
    dependsOn: index === 0 ? [] : [names[0] ?? "CRM"],
  }));

  if (base.length === 0) {
    return [
      {
        id: "mod_crm",
        name: "CRM",
        purpose: "One place for customer history and commercial context.",
        priority: "core",
        dependsOn: [],
      },
      {
        id: "mod_sales",
        name: "Sales",
        purpose: "Make the commercial motion visible and transferable.",
        priority: "core",
        dependsOn: ["mod_crm"],
      },
    ];
  }

  return base;
}

function roadmapFromModules(modules: Module[]): RoadmapPhase[] {
  return [
    {
      id: "phase_foundation",
      name: "Foundation",
      horizon: "Phase 1 · Weeks 1–6",
      outcomes: [
        "Shared customer and order truth",
        "Visible ownership for active work",
      ],
      modules: modules.filter((m) => m.priority === "core").map((m) => m.name),
    },
    {
      id: "phase_control",
      name: "Control",
      horizon: "Phase 2 · Months 2–4",
      outcomes: [
        "Fewer duplicate entries",
        "Exceptions become visible early",
      ],
      modules: modules
        .filter((m) => m.priority === "supporting")
        .map((m) => m.name),
    },
    {
      id: "phase_leverage",
      name: "Leverage",
      horizon: "Phase 3 · Months 4–8",
      outcomes: [
        "Selective automation",
        "Executive visibility without spreadsheet theater",
      ],
      modules: ["Executive Command Center"],
    },
  ];
}

function departmentAnalysis(interview: Interview): DepartmentAnalysis[] {
  const departments =
    interview.business.departments.length > 0
      ? interview.business.departments
      : interview.memory.score.dimensions
          .filter((d) => d.covered)
          .map((d) => d.label);

  return departments.slice(0, 6).map((department) => {
    const relatedFacts = interview.memory.knownFacts.filter((fact) => {
      const dimMatch =
        Boolean(fact.dimension) &&
        department.toLowerCase().includes(String(fact.dimension));
      const textMatch = fact.statement
        .toLowerCase()
        .includes(department.toLowerCase());
      return dimMatch || textMatch;
    });
    const evidence = relatedFacts.flatMap((fact) => fact.evidence).slice(0, 2);
    return {
      department,
      findings:
        evidence.length > 0
          ? `Discovery captured concrete signal for ${department}.`
          : `${department} was identified, but deeper process detail remains limited.`,
      evidence:
        evidence.length > 0
          ? evidence
          : interview.memory.score.stillNeed.includes(department)
            ? [`Still open: clearer ${department} understanding.`]
            : [],
    };
  });
}

function workflowsFromInterview(interview: Interview): Workflow[] {
  const description =
    interview.business.description ??
    interview.memory.summary.belief ??
    "Not yet described.";

  return [
    {
      id: createId("workflow"),
      name: "Current operating motion",
      summary: description,
      steps: [
        "Demand or inquiry arrives",
        "Work is coordinated across people and tools",
        "Execution happens with partial visibility",
        "Exceptions are handled by phone, message, spreadsheet, or memory",
        "Outcomes are reported manually",
      ],
      friction: interview.memory.summary.painPoints,
      owners: interview.participant.role
        ? [interview.participant.role]
        : ["unspecified"],
    },
  ];
}

function opportunitiesAsRecommendations(
  interview: Interview,
): Recommendation[] {
  if (interview.opportunities.length > 0) {
    return interview.opportunities.map((opportunity) => ({
      id: opportunity.id,
      title: opportunity.title,
      rationale: `${opportunity.description} Evidence: “${opportunity.evidence[0] ?? "conversation"}”.`,
      priority:
        opportunity.impact === "quick_win"
          ? "now"
          : opportunity.impact === "strategic"
            ? "later"
            : "next",
      relatedPainPoints: interview.memory.painPoints.map((pain) => pain.id),
    }));
  }

  return [
    {
      id: createId("rec"),
      title: "Create one trusted system of record",
      rationale:
        "Critical information currently appears fragmented across tools and people.",
      priority: "now",
      relatedPainPoints: interview.memory.painPoints.map((pain) => pain.id),
    },
  ];
}

export function synthesizeReport(interview: Interview): DiscoveryReport {
  const company =
    interview.business.companyName ??
    interview.participant.companyName ??
    "This company";
  const memory = {
    ...interview.memory,
    consulting:
      interview.memory.consulting ?? emptyConsultingIntelligence(),
  };
  const industry =
    memory.summary.industry === "unknown"
      ? "their market"
      : memory.summary.industryLabel.toLowerCase();
  const complexity = estimateComplexity(interview);
  const timeline = estimateTimeline(complexity);
  const modules = modulesFromInterview(interview);
  const roadmap = roadmapFromModules(modules);
  const painPoints: PainPoint[] =
    memory.painPoints.length > 0
      ? memory.painPoints
      : interview.business.signals.map((signal) => ({
          id: createId("pain"),
          title: signal.label,
          description: `Evidence: “${signal.evidence}”.`,
          category:
            signal.category === "tool" ||
            signal.category === "process" ||
            signal.category === "industry"
              ? "other"
              : signal.category,
          severity: "notable",
          evidence: [signal.evidence],
        }));

  const systems =
    memory.summary.currentSoftware.length > 0
      ? memory.summary.currentSoftware
      : interview.business.currentTools;

  const unanswered = [
    ...memory.score.stillNeed.map(
      (item) => `Deeper clarity still needed on: ${item}.`,
    ),
    ...memory.unknownFacts.slice(0, 3).map((item) => item.reason),
    "Who owns each critical handoff end-to-end?",
    "Which metrics does leadership trust today, and why?",
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const risks = [
    ...interview.memory.consulting.risks.map(
      (risk) =>
        `${risk.title} (${risk.severity}): ${risk.businessImpact}`,
    ),
    ...interview.observations
      .map((observation) => observation.risk)
      .filter((risk): risk is string => Boolean(risk)),
    "Over-automating broken handoffs",
    "Replacing spreadsheets without replacing ownership clarity",
    ...(interview.business.signals.some((s) => s.id === "approvals")
      ? ["Single-person approval bottlenecks"]
      : []),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const bottlenecks = [
    ...memory.summary.painPoints,
    ...interview.conversation.answers
      .filter((answer) =>
        /slow|stuck|wait|bottleneck|delay/i.test(answer.value),
      )
      .map((answer) => answer.value.slice(0, 120)),
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const maturityLine = memory.consulting.maturity.dimensions
    .map((d) => `${d.label.replace(" maturity", "")} ${d.score}%`)
    .join(" · ");
  const healthLine = memory.consulting.health.gauges
    .map((g) => `${g.label} ${g.score}%`)
    .join(" · ");

  const consultingOpps = memory.consulting.opportunities.map(
    (o) =>
      `${o.horizon}: ${o.title} — ${o.estimatedImpact} (difficulty: ${o.difficulty})`,
  );

  const consultingContradictions = memory.consulting.contradictions.map(
    (c) => c.statement,
  );

  const executiveSummary = `${company} is a ${industry} operation with business understanding at ${memory.summary.confidenceScore}% and consulting confidence at ${memory.consulting.confidence.overall}%. ${memory.summary.belief} Maturity overview — ${maturityLine || "emerging"}. The constraint is not ambition — it is fragmented operational truth across people and tools, with ${memory.consulting.risks.length} material risk pattern${memory.consulting.risks.length === 1 ? "" : "s"} in view.`;

  const businessSnapshot = [
    `Company: ${company}`,
    `Industry: ${memory.summary.industryLabel}`,
    memory.summary.businessModel
      ? `Business model: ${memory.summary.businessModel}`
      : null,
    memory.summary.companySize
      ? `Scale: ${memory.summary.companySize}`
      : null,
    memory.summary.teamHint ? `Team: ${memory.summary.teamHint}` : null,
    memory.summary.customerCountHint
      ? `Customers: ${memory.summary.customerCountHint}`
      : null,
    memory.summary.geographyHint
      ? `Geography: ${memory.summary.geographyHint}`
      : null,
    memory.summary.revenueStage
      ? `Revenue stage: ${memory.summary.revenueStage}`
      : null,
    systems.length > 0 ? `Systems: ${systems.join(", ")}` : null,
    `Business health: ${healthLine}`,
  ]
    .filter(Boolean)
    .join("\n");

  const opportunityRecs =
    memory.consulting.recommendations.length > 0
      ? memory.consulting.recommendations.map((rec) => ({
          id: rec.id,
          title: rec.title,
          rationale: `${rec.rationale} Evidence: “${rec.evidence[0] ?? "discovery"}”.`,
          priority: rec.priority,
          relatedPainPoints: interview.memory.painPoints.map((pain) => pain.id),
        }))
      : opportunitiesAsRecommendations(interview);

  return {
    id: createId("report"),
    generatedAt: nowIso(),
    executiveSummary,
    businessSnapshot,
    companySummary: executiveSummary,
    currentWorkflow: workflowsFromInterview(interview),
    currentSystems: systems,
    risks,
    operationalBottlenecks:
      bottlenecks.length > 0
        ? bottlenecks
        : ["Insufficient bottleneck detail captured — treat as open question."],
    departmentAnalysis: departmentAnalysis(interview),
    softwareRecommendations: [
      "Do not buy software until ownership and system-of-record decisions are clear.",
      "Replace load-bearing spreadsheets and messaging workflows first.",
      "Prefer modular operating capabilities over a monolithic suite.",
      ...systems.map((system) => `Plan a deliberate exit or integration path for ${system}.`),
    ],
    painPoints,
    opportunities: opportunityRecs,
    potentialModules: modules,
    suggestedRoadmap: roadmap,
    estimatedPhases: roadmap.map(
      (phase) => `${phase.name} (${phase.horizon}): ${phase.outcomes.join("; ")}`,
    ),
    estimatedComplexity: complexity,
    estimatedTimeline: timeline,
    riskAreas: risks,
    aiOpportunities: [
      memory.consulting.health.gauges.find((g) => g.id === "ai_readiness")
        ? `AI readiness currently ${memory.consulting.health.gauges.find((g) => g.id === "ai_readiness")?.score}% — improve data and process clarity before automation theater.`
        : "Assess AI readiness only after data and process clarity improve.",
      "Drafting follow-ups from incomplete order or job context",
      "Detecting duplicate work and missing fields at intake",
      "Summarizing exception queues for managers each morning",
      "Assisting reporting without becoming the source of truth",
    ],
    futureIntegrations: Array.from(
      new Set([...systems, "Email", "Accounting", "Messaging"]),
    ),
    unansweredQuestions: unanswered,
    executiveConclusion: `The next step is not more software conversation — it is deciding the system of record and the first module that removes the most expensive friction. With ${memory.summary.confidenceScore}% business understanding and ${memory.consulting.confidence.overall}% consulting confidence, ${company} has enough clarity to begin a disciplined foundation phase (${timeline}) while deliberately closing remaining open questions${consultingContradictions.length > 0 ? " and clarifying apparent inconsistencies" : ""}.`,
    consultingMaturity: maturityLine,
    consultingHealth: healthLine,
    consultingRisks: memory.consulting.risks.map(
      (r) => `${r.title} — ${r.recommendedMitigation}`,
    ),
    consultingContradictions,
    consultingOpportunities: consultingOpps,
  };
}
