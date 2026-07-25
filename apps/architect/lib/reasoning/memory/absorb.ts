import { createId, nowIso } from "@/lib/utils";
import {
  composeIndustryBelief,
  detectIndustry,
  industryLabel,
} from "@/lib/reasoning/industry/detect";
import {
  detectSignals,
  extractTools,
  mergeSignals,
  mentionsTrigger,
} from "@/lib/reasoning/industry/signals";
import {
  applyDiscoveryScore,
  createEmptyScore,
} from "@/lib/reasoning/confidence/score";
import {
  emptyConsultingIntelligence,
  emptyConsultingWhiteboardFields,
} from "@/lib/consulting";
import type {
  BusinessProfile,
  ConversationMemory,
  DiscoveryDimension,
  KnownFact,
  PainPoint,
  Question,
  WhiteboardState,
} from "@/types";

export function createEmptyMemory(): ConversationMemory {
  return {
    summary: {
      companyName: null,
      industry: "unknown",
      industryLabel: "Unknown",
      industryConfidence: 0,
      departments: [],
      currentSoftware: [],
      companySize: null,
      revenueStage: null,
      businessModel: null,
      customerCountHint: null,
      teamHint: null,
      geographyHint: null,
      painPoints: [],
      opportunities: [],
      missingInformation: [
        "Ventas",
        "Clientes",
        "Geografía",
        "Equipo",
        "Operaciones",
        "Finanzas",
        "Producción",
        "Sistemas",
      ],
      confidenceScore: 0,
      belief: "Estamos empezando a comprender esta empresa.",
    },
    knownFacts: [],
    unknownFacts: [],
    hypotheses: [],
    assumptions: [],
    contradictions: [],
    painPoints: [],
    improvementIdeas: [],
    questionsRemaining: [],
    askedQuestionKeys: [],
    followUpQueue: [],
    score: createEmptyScore(),
    whiteboard: {
      businessModel: null,
      commercialTeam: null,
      customers: null,
      currentSystems: [],
      painPoints: [],
      potentialModules: [],
      ...emptyConsultingWhiteboardFields(),
    },
    consulting: emptyConsultingIntelligence(),
  };
}

function upsertFact(
  facts: KnownFact[],
  fact: Omit<KnownFact, "id" | "createdAt"> & { id?: string },
): KnownFact[] {
  const existingIndex = facts.findIndex((item) => item.key === fact.key);
  const next: KnownFact = {
    id: fact.id ?? createId("fact"),
    createdAt: nowIso(),
    key: fact.key,
    statement: fact.statement,
    evidence: fact.evidence,
    confidence: fact.confidence,
    dimension: fact.dimension,
  };

  if (existingIndex === -1) return [...facts, next];
  const copy = [...facts];
  copy[existingIndex] = {
    ...copy[existingIndex],
    ...next,
    id: copy[existingIndex].id,
    createdAt: copy[existingIndex].createdAt,
  };
  return copy;
}

function extractCountHint(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractDepartments(text: string): string[] {
  const departments: Array<{ label: string; pattern: RegExp }> = [
    { label: "Ventas", pattern: /\b(sales|ventas|comercial)\b/i },
    { label: "Operaciones", pattern: /\b(operations|operaciones)\b/i },
    { label: "Finanzas", pattern: /\b(finance|finanzas|contabilidad)\b/i },
    { label: "Producción", pattern: /\b(production|producción|produccion)\b/i },
    { label: "Soporte", pattern: /\b(support|soporte|atención|atencion)\b/i },
    { label: "Compras", pattern: /\b(purchasing|compras|procurement)\b/i },
    { label: "Logística", pattern: /\b(logistics|logística|logistica)\b/i },
    { label: "Almacén", pattern: /\b(warehouse|almacén|almacen|bodega)\b/i },
    { label: "Marketing", pattern: /\bmarketing\b/i },
    { label: "RR.HH.", pattern: /\b(hr|rr\.?hh|recursos humanos)\b/i },
  ];
  return departments
    .filter((dept) => dept.pattern.test(text))
    .map((dept) => dept.label);
}

function extractRevenueStage(text: string): string | null {
  if (/startup|early stage|etapa temprana|recién empez|recien empez/i.test(text))
    return "Etapa temprana";
  if (/growing|growth|scaling|creciendo|crecimiento|escalando/i.test(text))
    return "Crecimiento";
  if (/mature|established|decades|consolidada|establecida|décadas|decadas/i.test(text))
    return "Consolidada";
  if (/\$\s?\d|\bmillion\b|\brevenue\b|ingresos|facturaci[oó]n/i.test(text))
    return "Ingresos mencionados";
  return null;
}

function extractCompanySize(text: string): string | null {
  const employees = extractCountHint(text, [
    /(\d{1,4})\s*(?:employees|people|staff|advisors|sellers|salespeople|empleados|personas|asesores|vendedores)/i,
    /(?:team of|equipo de)\s*(\d{1,4})/i,
  ]);
  if (employees) return `${employees} personas`;
  if (/small (company|team|business)|empresa pequeñ|equipo pequeñ/i.test(text))
    return "Empresa pequeña";
  if (/mid[- ]?size|medium|mediana/i.test(text)) return "Empresa mediana";
  if (/large|enterprise|grande|corporaci/i.test(text)) return "Empresa grande";
  return null;
}

function suggestModules(
  industry: ConversationMemory["summary"]["industry"],
  tools: string[],
  painTitles: string[],
): string[] {
  const modules = new Set<string>(["CRM", "Sales"]);

  if (industry === "manufacturing" || /production/i.test(painTitles.join(" "))) {
    modules.add("Production");
    modules.add("Maintenance");
  }
  if (industry === "distribution" || tools.some((t) => /excel/i.test(t))) {
    modules.add("Purchasing");
  }
  if (/approv|manual/i.test(painTitles.join(" "))) {
    modules.add("Approvals");
  }
  if (/collect|invoice|finance/i.test(painTitles.join(" "))) {
    modules.add("Collections");
  }
  if (industry === "construction") {
    modules.add("Jobs");
    modules.add("Change Orders");
  }

  return [...modules];
}

function buildWhiteboard(memory: ConversationMemory): WhiteboardState {
  return {
    businessModel:
      memory.summary.businessModel ??
      (memory.summary.industry !== "unknown"
        ? memory.summary.industryLabel
        : null),
    commercialTeam: memory.summary.teamHint,
    customers: memory.summary.customerCountHint,
    currentSystems: memory.summary.currentSoftware,
    painPoints: memory.summary.painPoints,
    potentialModules: suggestModules(
      memory.summary.industry,
      memory.summary.currentSoftware,
      memory.summary.painPoints,
    ),
    facts: memory.whiteboard?.facts ?? [],
    hypotheses: memory.whiteboard?.hypotheses ?? [],
    risks: memory.whiteboard?.risks ?? [],
    unknowns: memory.whiteboard?.unknowns ?? [],
    assumptions: memory.whiteboard?.assumptions ?? [],
    contradictions: memory.whiteboard?.contradictions ?? [],
    ideas: memory.whiteboard?.ideas ?? [],
    opportunities: memory.whiteboard?.opportunities ?? [],
  };
}

function painPointsFromSignals(
  signals: BusinessProfile["signals"],
  quote: string,
): PainPoint[] {
  return signals.map((signal) => ({
    id: `pain_${signal.id}`,
    title: signal.label,
    description: `Referenced in conversation: “${quote.slice(0, 140)}${quote.length > 140 ? "…" : ""}”.`,
    category:
      signal.category === "tool" ||
      signal.category === "process" ||
      signal.category === "industry"
        ? "other"
        : signal.category,
    severity:
      signal.category === "approvals" || signal.category === "visibility"
        ? "critical"
        : "notable",
    evidence: [quote],
  }));
}

export function absorbAnswerIntoMemory(
  memory: ConversationMemory,
  business: BusinessProfile,
  answerText: string,
  question: Question | null,
): { memory: ConversationMemory; business: BusinessProfile } {
  const quote = answerText.trim();
  const detected = detectIndustry(
    [business.description, quote].filter(Boolean).join("\n"),
  );
  const signals = mergeSignals(business.signals, detectSignals(quote));
  const tools = Array.from(
    new Set([...business.currentTools, ...extractTools(quote)]),
  );
  const departments = Array.from(
    new Set([...business.departments, ...extractDepartments(quote)]),
  );

  const industry =
    detected.confidence >= business.industryConfidence
      ? detected.industry
      : business.industry;
  const industryConfidence = Math.max(
    business.industryConfidence,
    detected.confidence,
  );

  const belief = composeIndustryBelief(quote, industry);
  const customerHint =
    extractCountHint(quote, [
      /(\d{2,5})\s*(?:customers|clients|accounts|clientes|cuentas)/i,
    ]) ?? memory.summary.customerCountHint;
  const teamHint =
    extractCountHint(quote, [
      /(\d{1,4})\s*(?:advisors|sellers|salespeople|reps|employees|people|asesores|vendedores|empleados|personas)/i,
    ]) ??
    extractCompanySize(quote) ??
    memory.summary.teamHint;
  const geographyHint =
    extractCountHint(quote, [
      /(\d{1,3})\s*(?:cities|regions|states|countries|branches|locations|ciudades|regiones|estados|países|paises|sucursales|ubicaciones)/i,
    ]) ??
    (/nationwide|national|local|regional|international|nacional|internacional|todo el país|todo el pais/i.exec(
      quote,
    )?.[0] ??
      memory.summary.geographyHint);
  const companySize = extractCompanySize(quote) ?? memory.summary.companySize;
  const revenueStage =
    extractRevenueStage(quote) ??
    business.revenueStage ??
    memory.summary.revenueStage;

  let businessModel = business.businessModel ?? memory.summary.businessModel;
  if (belief.belief.includes("manufacturing distributor")) {
    businessModel = "Manufacturer / Distributor";
  } else if (industry !== "unknown" && !businessModel) {
    businessModel = industryLabel(industry);
  }

  let knownFacts = [...memory.knownFacts];
  const dimension: DiscoveryDimension | undefined = question?.dimension;

  if (question?.questionKey) {
    knownFacts = upsertFact(knownFacts, {
      key: question.questionKey,
      statement: quote,
      evidence: [quote],
      confidence: 0.85,
      dimension,
    });
  }

  if (customerHint) {
    knownFacts = upsertFact(knownFacts, {
      key: "fact_customers",
      statement: `Customer footprint: ${customerHint}`,
      evidence: [quote],
      confidence: 0.8,
      dimension: "customers",
    });
  }
  if (teamHint) {
    knownFacts = upsertFact(knownFacts, {
      key: "fact_team",
      statement: `Team signal: ${teamHint}`,
      evidence: [quote],
      confidence: 0.8,
      dimension: "team",
    });
  }
  if (geographyHint) {
    knownFacts = upsertFact(knownFacts, {
      key: "fact_geography",
      statement: `Geography signal: ${geographyHint}`,
      evidence: [quote],
      confidence: 0.75,
      dimension: "geography",
    });
  }
  if (tools.length > 0) {
    knownFacts = upsertFact(knownFacts, {
      key: "current_software",
      statement: `Current systems include: ${tools.join(", ")}`,
      evidence: [quote],
      confidence: 0.9,
      dimension: "systems",
    });
  }
  if (departments.length > 0) {
    knownFacts = upsertFact(knownFacts, {
      key: "departments",
      statement: `Departments mentioned: ${departments.join(", ")}`,
      evidence: [quote],
      confidence: 0.8,
      dimension: "team",
    });
  }

  const askedQuestionKeys = question?.questionKey
    ? Array.from(new Set([...memory.askedQuestionKeys, question.questionKey]))
    : memory.askedQuestionKeys;

  const painPoints = painPointsFromSignals(signals, quote);
  const painTitles = Array.from(
    new Set([
      ...memory.summary.painPoints,
      ...painPoints.map((pain) => pain.title),
    ]),
  );

  const nextBusiness: BusinessProfile = {
    ...business,
    industry,
    industryConfidence,
    currentTools: tools,
    signals,
    departments,
    sizeHint: companySize,
    revenueStage,
    businessModel,
  };

  let nextMemory: ConversationMemory = {
    ...memory,
    knownFacts,
    askedQuestionKeys,
    painPoints: [
      ...memory.painPoints.filter(
        (pain) => !painPoints.some((next) => next.id === pain.id),
      ),
      ...painPoints,
    ],
    hypotheses: [
      {
        id: "hyp_industry",
        statement: belief.belief,
        confidence: belief.confidence,
        evidence: [quote],
        status: "active",
      },
      ...memory.hypotheses.filter((item) => item.id !== "hyp_industry"),
    ],
    summary: {
      ...memory.summary,
      companyName: business.companyName ?? memory.summary.companyName,
      industry,
      industryLabel: industryLabel(industry),
      industryConfidence,
      departments,
      currentSoftware: tools.map((tool) =>
        tool === "WhatsApp" ? "WhatsApp Business" : tool,
      ),
      companySize,
      revenueStage,
      businessModel,
      customerCountHint: customerHint
        ? `${customerHint} customers`
        : memory.summary.customerCountHint,
      teamHint: teamHint
        ? /\d/.test(teamHint)
          ? teamHint.includes("people")
            ? teamHint
            : `${teamHint} people`
          : teamHint
        : memory.summary.teamHint,
      geographyHint,
      painPoints: painTitles,
      belief: belief.belief,
      confidenceScore: memory.summary.confidenceScore,
    },
  };

  // Queue dig-deeper follow-ups when triggers appear — never continue past them.
  nextMemory = enqueueFollowUps(nextMemory, quote);

  nextMemory = applyDiscoveryScore(nextMemory);
  nextMemory = {
    ...nextMemory,
    whiteboard: buildWhiteboard(nextMemory),
    unknownFacts: nextMemory.score.dimensions
      .filter((d) => d.applicable !== false && !d.covered)
      .map((d) => ({
        id: `unknown_${d.id}`,
        key: d.id,
        label: d.label,
        priority: 100 - d.confidence,
        dimension: d.id,
        reason: `Aún falta claridad sobre ${d.label}.`,
      })),
    questionsRemaining: nextMemory.score.dimensions
      .filter((d) => d.applicable !== false && !d.covered)
      .map((d) => ({
        id: `remaining_${d.id}`,
        key: d.id,
        label: d.label,
        priority: 100 - d.confidence,
        dimension: d.id,
        reason: `Prioridad pendiente: ${d.label}`,
      })),
  };

  return { memory: nextMemory, business: nextBusiness };
}

function enqueueFollowUps(
  memory: ConversationMemory,
  quote: string,
): ConversationMemory {
  const queue = [...memory.followUpQueue];
  const asked = new Set(memory.askedQuestionKeys);

  const excelFollowUps = [
    {
      key: "excel_how_many",
      prompt: "¿Cuántos archivos de Excel están en uso activo realmente?",
      priority: 98,
      dimension: "systems" as const,
      followUpOf: "excel",
    },
    {
      key: "excel_owners",
      prompt: "¿Quién es dueño de esas hojas de cálculo?",
      priority: 97,
      dimension: "systems" as const,
      followUpOf: "excel",
    },
    {
      key: "excel_deleted",
      prompt: "¿Qué pasaría si mañana se borraran esos archivos de Excel?",
      priority: 96,
      dimension: "systems" as const,
      followUpOf: "excel",
    },
    {
      key: "excel_editors",
      prompt: "¿Cuántas personas los editan?",
      priority: 95,
      dimension: "systems" as const,
      followUpOf: "excel",
    },
    {
      key: "excel_versions",
      prompt: "¿Existen distintas versiones del mismo archivo?",
      priority: 94,
      dimension: "team" as const,
      followUpOf: "excel",
    },
  ];

  const whatsappFollowUps = [
    {
      key: "wa_numbers",
      prompt: "¿Cuántos números corporativos de WhatsApp usan?",
      priority: 98,
      dimension: "systems" as const,
      followUpOf: "whatsapp",
    },
    {
      key: "wa_who_answers",
      prompt: "¿Quién responde esas conversaciones?",
      priority: 97,
      dimension: "customers" as const,
      followUpOf: "whatsapp",
    },
    {
      key: "wa_assignment",
      prompt: "¿Cómo se asignan las conversaciones en el equipo?",
      priority: 96,
      dimension: "sales" as const,
      followUpOf: "whatsapp",
    },
    {
      key: "wa_departure",
      prompt: "¿Qué pasa con el historial cuando alguien se va?",
      priority: 95,
      dimension: "customers" as const,
      followUpOf: "whatsapp",
    },
    {
      key: "wa_search",
      prompt: "¿Cómo buscan hoy conversaciones antiguas?",
      priority: 94,
      dimension: "systems" as const,
      followUpOf: "whatsapp",
    },
  ];

  const paperFollowUps = [
    {
      key: "paper_why",
      prompt:
        "¿Por qué el papel sigue presente — requisito legal, costumbre o necesidad offline?",
      priority: 98,
      dimension: "operations" as const,
      followUpOf: "paper",
    },
    {
      key: "paper_where",
      prompt: "¿Dónde entra el papel al proceso y dónde deja de usarse?",
      priority: 96,
      dimension: "operations" as const,
      followUpOf: "paper",
    },
  ];

  const maybeEnqueue = (
    trigger: "excel" | "whatsapp" | "paper",
    items: Array<{
      key: string;
      prompt: string;
      priority: number;
      dimension: DiscoveryDimension;
      followUpOf: string;
    }>,
  ) => {
    if (!mentionsTrigger(quote, trigger)) return;
    for (const item of items) {
      if (asked.has(item.key)) continue;
      if (queue.some((q) => q.key === item.key)) continue;
      queue.push({
        ...item,
        kind: "long_text",
        reason: `Seguimiento profundo tras mencionar ${trigger}.`,
      });
    }
  };

  maybeEnqueue("excel", excelFollowUps);
  maybeEnqueue("whatsapp", whatsappFollowUps);
  maybeEnqueue("paper", paperFollowUps);

  return {
    ...memory,
    followUpQueue: queue.sort((a, b) => b.priority - a.priority),
  };
}
