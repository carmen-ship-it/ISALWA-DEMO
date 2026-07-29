import { createId, nowIso } from "@/lib/utils";
import { emptyConsultingIntelligence } from "@/lib/consulting";
import {
  healthStatusLabel,
  maturityLabel,
  phaseLabel,
  severityLabel,
  timelineEstimateLabel,
} from "@/lib/presentation";
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
    purpose: `Cierra la brecha de ${name.toLowerCase()} identificada durante el descubrimiento.`,
    priority: index < 3 ? "core" : "supporting",
    dependsOn: index === 0 ? [] : [names[0] ?? "CRM"],
  }));

  if (base.length === 0) {
    return [
      {
        id: "mod_crm",
        name: "CRM",
        purpose: "Un solo lugar para el historial de clientes y el contexto comercial.",
        priority: "core",
        dependsOn: [],
      },
      {
        id: "mod_sales",
        name: "Sales",
        purpose: "Hace visible y transferible el movimiento comercial.",
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
      horizon: "Fase 1 · Semanas 1–6",
      outcomes: [
        "Verdad compartida de clientes y pedidos",
        "Propiedad visible del trabajo activo",
      ],
      modules: modules.filter((m) => m.priority === "core").map((m) => m.name),
    },
    {
      id: "phase_control",
      name: "Control",
      horizon: "Fase 2 · Meses 2–4",
      outcomes: [
        "Menos registros duplicados",
        "Las excepciones se vuelven visibles a tiempo",
      ],
      modules: modules
        .filter((m) => m.priority === "supporting")
        .map((m) => m.name),
    },
    {
      id: "phase_leverage",
      name: "Leverage",
      horizon: "Fase 3 · Meses 4–8",
      outcomes: [
        "Automatización selectiva",
        "Visibilidad ejecutiva sin teatro de hojas de cálculo",
      ],
      modules: ["Centro de mando ejecutivo"],
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
          ? `El descubrimiento capturó una señal concreta para ${department}.`
          : `${department} fue identificado, pero el detalle del proceso sigue siendo limitado.`,
      evidence:
        evidence.length > 0
          ? evidence
          : interview.memory.score.stillNeed.includes(department)
            ? [`Pendiente: una comprensión más clara de ${department}.`]
            : [],
    };
  });
}

function workflowsFromInterview(interview: Interview): Workflow[] {
  const description =
    interview.business.description ??
    interview.memory.summary.belief ??
    "Aún sin describir.";

  return [
    {
      id: createId("workflow"),
      name: "Operación actual",
      summary: description,
      steps: [
        "Llega la demanda o la consulta",
        "El trabajo se coordina entre personas y herramientas",
        "La ejecución ocurre con visibilidad parcial",
        "Las excepciones se resuelven por teléfono, mensaje, hoja de cálculo o memoria",
        "Los resultados se reportan manualmente",
      ],
      friction: interview.memory.summary.painPoints,
      // The interview participant described this operation — that does not
      // make them its owner. No knowledge-graph "Owns" edge is available at
      // this stage (this report synthesizes straight from the raw
      // `Interview`, before the Company Model exists), so there is no
      // evidence to attribute here; leave empty rather than assume
      // interviewer == owner.
      owners: [],
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
      rationale: `${opportunity.description} Evidencia: “${opportunity.evidence[0] ?? "conversación"}”.`,
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
      title: "Crear un solo sistema de registro confiable",
      rationale:
        "La información crítica hoy aparece fragmentada entre herramientas y personas.",
      priority: "now",
      relatedPainPoints: interview.memory.painPoints.map((pain) => pain.id),
    },
  ];
}

export function synthesizeReport(interview: Interview): DiscoveryReport {
  const company =
    interview.business.companyName ??
    interview.participant.companyName ??
    "Esta empresa";
  const memory = {
    ...interview.memory,
    consulting:
      interview.memory.consulting ?? emptyConsultingIntelligence(),
  };
  const industry =
    memory.summary.industry === "unknown"
      ? "su mercado"
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
          description: `Evidencia: “${signal.evidence}”.`,
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
      (item) => `Aún falta claridad sobre: ${item}.`,
    ),
    ...memory.unknownFacts.slice(0, 3).map((item) => item.reason),
    "¿Quién es dueño de cada traspaso crítico, de principio a fin?",
    "¿En qué métricas confía hoy el liderazgo, y por qué?",
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  const risks = [
    ...interview.memory.consulting.risks.map(
      (risk) =>
        `${risk.title} (${severityLabel(risk.severity)}): ${risk.businessImpact}`,
    ),
    ...interview.observations
      .map((observation) => observation.risk)
      .filter((risk): risk is string => Boolean(risk)),
    "Sobre-automatizar traspasos que ya están rotos",
    "Reemplazar hojas de cálculo sin resolver primero la claridad de propiedad",
    ...(interview.business.signals.some((s) => s.id === "approvals")
      ? ["Cuellos de botella por aprobación concentrada en una sola persona"]
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
    .map((d) => `${d.label}: ${maturityLabel(d.score, "percent").toLowerCase()}`)
    .join(" · ");
  const healthLine = memory.consulting.health.gauges
    .map((g) => `${g.label}: ${healthStatusLabel(g.score, "percent").toLowerCase()}`)
    .join(" · ");

  const consultingOpps = memory.consulting.opportunities.map(
    (o) =>
      `${o.horizon}: ${o.title} — ${o.estimatedImpact} (dificultad: ${o.difficulty})`,
  );

  const consultingContradictions = memory.consulting.contradictions.map(
    (c) => c.statement,
  );

  const executiveSummary = `${company} es una operación de ${industry} con comprensión del negocio en ${memory.summary.confidenceScore}% y confianza consultiva en ${memory.consulting.confidence.overall}%. ${memory.summary.belief} Panorama de madurez — ${maturityLine || "emergente"}. La limitante no es la ambición — es la verdad operativa fragmentada entre personas y herramientas, con ${memory.consulting.risks.length} patrón${memory.consulting.risks.length === 1 ? "" : "es"} de riesgo relevante${memory.consulting.risks.length === 1 ? "" : "s"} a la vista.`;

  const businessSnapshot = [
    `Empresa: ${company}`,
    `Industria: ${memory.summary.industryLabel}`,
    memory.summary.businessModel
      ? `Modelo de negocio: ${memory.summary.businessModel}`
      : null,
    memory.summary.companySize
      ? `Escala: ${memory.summary.companySize}`
      : null,
    memory.summary.teamHint ? `Equipo: ${memory.summary.teamHint}` : null,
    memory.summary.customerCountHint
      ? `Clientes: ${memory.summary.customerCountHint}`
      : null,
    memory.summary.geographyHint
      ? `Geografía: ${memory.summary.geographyHint}`
      : null,
    memory.summary.revenueStage
      ? `Etapa de ingresos: ${memory.summary.revenueStage}`
      : null,
    systems.length > 0 ? `Sistemas: ${systems.join(", ")}` : null,
    `Salud del negocio: ${healthLine}`,
  ]
    .filter(Boolean)
    .join("\n");

  const opportunityRecs =
    memory.consulting.recommendations.length > 0
      ? memory.consulting.recommendations.map((rec) => ({
          id: rec.id,
          title: rec.title,
          rationale: `${rec.rationale} Evidencia: “${rec.evidence[0] ?? "descubrimiento"}”.`,
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
        : ["Detalle insuficiente sobre cuellos de botella — tratar como pregunta abierta."],
    departmentAnalysis: departmentAnalysis(interview),
    softwareRecommendations: [
      "No comprar software hasta que las decisiones de propiedad y sistema de registro estén claras.",
      "Reemplazar primero las hojas de cálculo y los flujos de mensajería que sostienen la operación.",
      "Preferir capacidades operativas modulares en vez de una suite monolítica.",
      ...systems.map((system) => `Planear una salida o integración deliberada para ${system}.`),
    ],
    painPoints,
    opportunities: opportunityRecs,
    potentialModules: modules,
    suggestedRoadmap: roadmap,
    estimatedPhases: roadmap.map(
      (phase) => `${phaseLabel(phase.name)} (${phase.horizon}): ${phase.outcomes.join("; ")}`,
    ),
    estimatedComplexity: complexity,
    estimatedTimeline: timeline,
    riskAreas: risks,
    aiOpportunities: [
      memory.consulting.health.gauges.find((g) => g.id === "ai_readiness")
        ? `Preparación para IA actualmente en ${memory.consulting.health.gauges.find((g) => g.id === "ai_readiness")?.score}% — mejorar la calidad de datos y procesos antes de automatizar por apariencia.`
        : "Evaluar la preparación para IA solo después de mejorar la claridad de datos y procesos.",
      "Redactar seguimientos a partir de contexto incompleto de pedidos o trabajos",
      "Detectar trabajo duplicado y campos faltantes en la captura",
      "Resumir colas de excepciones para los gerentes cada mañana",
      "Asistir en reportes sin convertirse en la fuente de verdad",
    ],
    futureIntegrations: Array.from(
      new Set([...systems, "Correo electrónico", "Contabilidad", "Mensajería"]),
    ),
    unansweredQuestions: unanswered,
    executiveConclusion: `El siguiente paso no es más conversación sobre software — es decidir el sistema de registro y el primer módulo que elimina la fricción más costosa. Con ${memory.summary.confidenceScore}% de comprensión del negocio y ${memory.consulting.confidence.overall}% de confianza consultiva, ${company} tiene suficiente claridad para iniciar una fase de cimientos disciplinada (${timelineEstimateLabel(timeline)}) mientras cierra deliberadamente las preguntas abiertas restantes${consultingContradictions.length > 0 ? " y aclara las inconsistencias aparentes" : ""}.`,
    consultingMaturity: maturityLine,
    consultingHealth: healthLine,
    consultingRisks: memory.consulting.risks.map(
      (r) => `${r.title} — ${r.recommendedMitigation}`,
    ),
    consultingContradictions,
    consultingOpportunities: consultingOpps,
  };
}
