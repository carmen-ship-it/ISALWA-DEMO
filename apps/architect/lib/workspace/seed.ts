import {
  createSeedBlueprints,
  emptyBlueprints,
  blueprintTimelineEvent,
  latestBlueprint,
} from "@/lib/blueprint";
import { deriveSolutionArchitecture } from "@/lib/solution";
import { deriveBusinessProcesses } from "@/lib/processes";
import { buildDeliverablesPackage } from "@/lib/deliverables";
import { assembleImplementationPackage } from "@/lib/implementation-package";
import { deriveBrandExperience } from "@/lib/brand";
import { deriveCompanyModel } from "@/lib/company-model";
import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  ConversationMemory,
  ConversationRecord,
  DiscoveryReport,
  Document,
  Industry,
  Meeting,
  Module,
  Person,
  Recommendation,
  TimelineEvent,
} from "@/types";
import { applyDiscoveryScore, createEmptyMemory } from "@/lib/reasoning";
import {
  emptyEvolutionHistory,
  ensureCompanyEvolution,
} from "@/lib/history";
import { emptyConsultingWhiteboardFields } from "@/lib/consulting";
import {
  createSeedKnowledge,
  emptyWorkspaceKnowledge,
  knowledgeTimelineEvents,
} from "@/lib/knowledge";

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

type SeedFact = { key: string; statement: string };

function seedMemory(overrides: Partial<ConversationMemory["summary"]>): ConversationMemory {
  const memory = createEmptyMemory();
  return {
    ...memory,
    summary: {
      ...memory.summary,
      ...overrides,
      industryConfidence:
        overrides.industryConfidence ??
        (overrides.industry && overrides.industry !== "unknown" ? 0.75 : 0),
      confidenceScore: 0,
    },
  };
}

function seedWorkspace(input: {
  id: string;
  companyName: string;
  industry: Industry;
  stage: CompanyWorkspace["currentStage"];
  lastLabel: string;
  daysSinceActivity: number;
  painTitles: string[];
  modules: string[];
  openQuestions: string[];
  facts: SeedFact[];
  personName: string;
  personRole: string;
}): CompanyWorkspace {
  const createdAt = daysAgo(input.daysSinceActivity + 14);
  const updatedAt = daysAgo(input.daysSinceActivity);
  const meetingId = createId("meeting");
  let memory = seedMemory({
    companyName: input.companyName,
    industry: input.industry,
    industryLabel: input.industry,
    painPoints: input.painTitles,
    missingInformation: input.openQuestions,
    belief: `${input.companyName} · Descubrimiento en curso`,
  });

  memory.knownFacts = input.facts.map((fact) => ({
    id: createId("fact"),
    key: fact.key,
    statement: fact.statement,
    evidence: ["Sesión de descubrimiento anterior"],
    confidence: 0.85,
    createdAt: updatedAt,
  }));

  memory.whiteboard = {
    ...memory.whiteboard,
    painPoints: input.painTitles,
    potentialModules: input.modules,
    currentSystems:
      input.industry === "manufacturing"
        ? ["Excel", "WhatsApp"]
        : ["Correo", "Hojas de cálculo"],
    ...emptyConsultingWhiteboardFields(),
    facts: input.facts.map((f) => f.statement),
    unknowns: input.openQuestions,
    risks: input.painTitles.map((title) => `${title} (relevante)`),
  };

  memory.painPoints = input.painTitles.map((title) => ({
    id: createId("pain"),
    title,
    description: title,
    category: "manual_work" as const,
    severity: "notable" as const,
    evidence: ["Reunión anterior"],
  }));

  memory = applyDiscoveryScore(memory);
  const understanding = memory.score.overall;

  const timeline: TimelineEvent[] = [
    {
      id: createId("timeline"),
      workspaceId: input.id,
      date: createdAt,
      title: "Workspace created",
      description: `Began discovery for ${input.companyName}.`,
      category: "meeting",
    },
    {
      id: createId("timeline"),
      workspaceId: input.id,
      date: daysAgo(input.daysSinceActivity + 7),
      title: "Commercial context captured",
      description: input.facts[0]?.statement ?? "Hechos iniciales del negocio registrados.",
      category: "discovery",
      meetingId,
    },
    {
      id: createId("timeline"),
      workspaceId: input.id,
      date: updatedAt,
      title: "Pain points confirmed",
      description: input.painTitles.slice(0, 2).join(" · "),
      category: "discovery",
      meetingId,
    },
  ];

  const person: Person = {
    id: createId("person"),
    workspaceId: input.id,
    name: input.personName,
    role: input.personRole,
    department: null,
    email: null,
    phone: null,
    notes: "Primary discovery contact",
    lastSeen: updatedAt,
  };

  const meeting: Meeting = {
    id: meetingId,
    workspaceId: input.id,
    title: "Discovery session 1",
    date: daysAgo(input.daysSinceActivity + 1),
    participants: [input.personName],
    conversationId: null,
    interviewId: null,
    summary: `Covered commercial motion and current tools for ${input.companyName}.`,
    discoveries: input.facts.map((f) => f.statement),
    questionsAnswered: input.facts.map((f) => f.statement),
    questionsRemaining: input.openQuestions,
    generatedReport: null,
    businessUnderstandingAfter: understanding,
  };

  const modules: Module[] = input.modules.map((name, index) => ({
    id: `mod_${name.toLowerCase().replace(/\s+/g, "_")}`,
    name,
    purpose: `Address ${name.toLowerCase()} gaps surfaced in discovery.`,
    priority: index < 2 ? "core" : "supporting",
    dependsOn: [],
  }));

  const recommendations: Recommendation[] = input.modules.slice(0, 2).map((name) => ({
    id: createId("rec"),
    title: `Introduce ${name}`,
    rationale: `Evidence from discovery suggests ${name.toLowerCase()} is a high-leverage starting point.`,
    priority: "now",
    relatedPainPoints: input.painTitles.slice(0, 1),
  }));

  const documents: Document[] = [
    {
      id: createId("doc"),
      workspaceId: input.id,
      kind: "Interview Transcript",
      title: "Discovery session 1 transcript",
      createdAt: meeting.date,
      source: "interview",
      status: "designed",
      metadata: { note: "Legacy document stub — Knowledge Center is canonical" },
    },
  ];

  const knowledge = createSeedKnowledge(input.id);
  const knowledgeEvents = knowledgeTimelineEvents(input.id, knowledge);

  const partialWorkspace = {
    id: input.id,
    companyName: input.companyName,
    industry: input.industry,
    createdAt,
    updatedAt,
    currentStage: input.stage,
    businessUnderstanding: understanding,
    currentReport: null as null,
    meetings: [meeting],
    observations: [] as [],
    recommendations,
    opportunities: [] as [],
    modules,
    timeline: [...knowledgeEvents, ...timeline].sort((a, b) =>
      b.date.localeCompare(a.date),
    ),
    documents,
    knowledge,
    blueprints: emptyBlueprints(),
    currentBlueprintId: null as string | null,
    solutionArchitecture: null,
    businessProcesses: null,
    brandExperience: null,
    brandOverrides: null,
    deliverables: null,
    companyModel: null,
    implementationPackage: null,
    evolutionHistory: emptyEvolutionHistory(),
    people: [person],
    openQuestions: input.openQuestions,
    painPoints: memory.painPoints,
    status: "active" as const,
    lastActivityAt: updatedAt,
    lastActivityLabel: input.lastLabel,
    suggestedNextMeeting: input.openQuestions[0]
      ? `Continuar descubrimiento — foco en ${input.openQuestions[0]}`
      : "Revisar recomendaciones con liderazgo",
    conversationMemory: memory,
    activeInterviewId: null as string | null,
    lastMeetingId: meetingId,
  };

  const blueprints = createSeedBlueprints(partialWorkspace);
  const blueprintEvents = blueprints.map(blueprintTimelineEvent);
  const currentBlueprint = latestBlueprint(blueprints);
  const solutionArchitecture = currentBlueprint
    ? deriveSolutionArchitecture({
        workspace: {
          ...partialWorkspace,
          blueprints,
          currentBlueprintId: currentBlueprint.id,
        },
        blueprint: currentBlueprint,
      })
    : null;

  const businessProcesses =
    currentBlueprint && solutionArchitecture
      ? deriveBusinessProcesses({
          workspace: {
            ...partialWorkspace,
            blueprints,
            currentBlueprintId: currentBlueprint.id,
            solutionArchitecture,
          },
          blueprint: currentBlueprint,
        })
      : currentBlueprint
        ? deriveBusinessProcesses({
            workspace: {
              ...partialWorkspace,
              blueprints,
              currentBlueprintId: currentBlueprint.id,
              solutionArchitecture: null,
            },
            blueprint: currentBlueprint,
          })
        : null;

  const solutionEvents: TimelineEvent[] = solutionArchitecture
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: solutionArchitecture.generatedAt,
          title: `Solution Architecture · Blueprint v${solutionArchitecture.blueprintVersion}`,
          description: solutionArchitecture.summary,
          category: "solution",
        },
      ]
    : [];

  const processEvents: TimelineEvent[] = businessProcesses
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: businessProcesses.generatedAt,
          title: `Business Processes · Blueprint v${businessProcesses.blueprintVersion}`,
          description: businessProcesses.summary,
          category: "process",
        },
      ]
    : [];

  const seededWorkspace = {
    ...partialWorkspace,
    blueprints,
    currentBlueprintId: blueprints[0]?.id ?? null,
    solutionArchitecture,
    businessProcesses,
  };

  const brandExperience = currentBlueprint
    ? deriveBrandExperience({
        workspace: seededWorkspace,
        blueprint: currentBlueprint,
      })
    : null;

  const companyModel = currentBlueprint
    ? deriveCompanyModel({
        workspace: { ...seededWorkspace, brandExperience },
        blueprint: currentBlueprint,
      })
    : null;

  const workspaceWithBrand = {
    ...seededWorkspace,
    brandExperience,
  };

  const deliverables = currentBlueprint
    ? buildDeliverablesPackage({ ...workspaceWithBrand, companyModel })
    : null;

  const workspaceWithDeliverables = {
    ...workspaceWithBrand,
    deliverables,
  };

  const implementationPackage = assembleImplementationPackage(
    workspaceWithDeliverables,
  );

  const brandEvents: TimelineEvent[] = brandExperience
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: brandExperience.generatedAt,
          title: `Brand & Experience · Blueprint v${brandExperience.blueprintVersion}`,
          description: brandExperience.summary,
          category: "brand",
        },
      ]
    : [];

  const companyModelEvents: TimelineEvent[] = companyModel
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: companyModel.generatedAt,
          title: `Company Model · Blueprint v${companyModel.blueprintVersion}`,
          description: companyModel.summary,
          category: "company_model",
        },
      ]
    : [];

  const deliverableEvents: TimelineEvent[] = deliverables
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: deliverables.generatedAt,
          title: `Deliverables · Blueprint v${deliverables.blueprintVersion ?? 1}`,
          description: deliverables.summary,
          category: "deliverable",
        },
      ]
    : [];

  const implementationEvents: TimelineEvent[] = implementationPackage
    ? [
        {
          id: createId("timeline"),
          workspaceId: input.id,
          date: implementationPackage.generatedAt,
          title: implementationPackage.gate.ready
            ? `Implementation Package · Blueprint v${implementationPackage.blueprintVersion ?? 1}`
            : `Implementation Package (gated) · ${input.companyName}`,
          description: implementationPackage.summary,
          category: "implementation",
        },
      ]
    : [];

  return ensureCompanyEvolution({
    ...seededWorkspace,
    brandExperience,
    companyModel,
    deliverables,
    implementationPackage,
    evolutionHistory: emptyEvolutionHistory(),
    timeline: [
      ...implementationEvents,
      ...companyModelEvents,
      ...deliverableEvents,
      ...brandEvents,
      ...processEvents,
      ...solutionEvents,
      ...blueprintEvents,
      ...partialWorkspace.timeline,
    ].sort((a, b) => b.date.localeCompare(a.date)),
  });
}

/** Pilot seed — single real company only (no placeholder multi-tenant demos). */
export function createSeedWorkspaces(): CompanyWorkspace[] {
  return [
    seedWorkspace({
      id: "ws_isalwa",
      companyName: "ISALWA",
      industry: "services",
      stage: "Design",
      lastLabel: "Última reunión hace 3 días",
      daysSinceActivity: 3,
      painTitles: [
        "El conocimiento de consultoría vive en las personas",
        "Los traspasos de proyecto pierden contexto",
      ],
      modules: ["CRM", "Proyectos", "Conocimiento"],
      openQuestions: ["Capacidad de entrega", "Modelo de precios"],
      facts: [
        {
          key: "fact_sales",
          statement:
            "ISALWA construye sistemas operativos para empresas de mercado medio.",
        },
        {
          key: "fact_customers",
          statement:
            "Los clientes son empresas que necesitan ordenar operaciones y decisiones.",
        },
        {
          key: "current_software",
          statement:
            "El descubrimiento hoy ocurre mediante entrevistas en Architect.",
        },
        {
          key: "team_structure",
          statement: "Álvaro es el contacto principal del lado cliente.",
        },
        {
          key: "bottlenecks",
          statement:
            "El conocimiento de proyectos se pierde entre reuniones y personas.",
        },
      ],
      personName: "Álvaro",
      personRole: "owner",
    }),
  ];
}

export function createEmptyWorkspace(
  companyName: string,
  industry: Industry = "unknown",
): CompanyWorkspace {
  const id = createId("ws");
  const stamp = nowIso();
  return {
    id,
    companyName,
    industry,
    createdAt: stamp,
    updatedAt: stamp,
    currentStage: "Discovery",
    businessUnderstanding: 0,
    currentReport: null,
    meetings: [],
    observations: [],
    recommendations: [],
    opportunities: [],
    modules: [],
    timeline: [
      {
        id: createId("timeline"),
        workspaceId: id,
        date: stamp,
        title: "Workspace created",
        description: `Started company memory for ${companyName}.`,
        category: "meeting",
      },
    ],
    documents: [],
    knowledge: emptyWorkspaceKnowledge(),
    blueprints: emptyBlueprints(),
    currentBlueprintId: null,
    solutionArchitecture: null,
    businessProcesses: null,
    brandExperience: null,
    brandOverrides: null,
    deliverables: null,
    companyModel: null,
    implementationPackage: null,
    evolutionHistory: emptyEvolutionHistory(),
    people: [],
    openQuestions: [],
    painPoints: [],
    status: "active",
    lastActivityAt: stamp,
    lastActivityLabel: "Just created",
    suggestedNextMeeting: "Begin first discovery interview",
    conversationMemory: null,
    activeInterviewId: null,
    lastMeetingId: null,
  };
}

export type WorkspaceBundle = {
  workspaces: CompanyWorkspace[];
  conversations: ConversationRecord[];
};

export function createEmptyBundle(): WorkspaceBundle {
  return { workspaces: [], conversations: [] };
}

export function createSeedBundle(): WorkspaceBundle {
  return {
    workspaces: createSeedWorkspaces(),
    conversations: [],
  };
}

/** Living report merge helpers live in lib/reports — re-export types used by repos. */
export type LivingReportInput = {
  prior: DiscoveryReport | null;
  next: DiscoveryReport;
};
