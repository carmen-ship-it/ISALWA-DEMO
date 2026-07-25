import {
  createSeedBlueprints,
  emptyBlueprints,
  blueprintTimelineEvent,
  latestBlueprint,
} from "@/lib/blueprint";
import { deriveSolutionArchitecture } from "@/lib/solution";
import { deriveBusinessProcesses } from "@/lib/processes";
import { buildDeliverablesPackage } from "@/lib/deliverables";
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
import { createEmptyMemory } from "@/lib/reasoning";
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

function seedMemory(overrides: Partial<ConversationMemory["summary"]>): ConversationMemory {
  const memory = createEmptyMemory();
  return {
    ...memory,
    summary: {
      ...memory.summary,
      ...overrides,
      confidenceScore: overrides.confidenceScore ?? memory.summary.confidenceScore,
    },
    score: {
      ...memory.score,
      overall: overrides.confidenceScore ?? 0,
    },
  };
}

function seedWorkspace(input: {
  id: string;
  companyName: string;
  industry: Industry;
  understanding: number;
  stage: CompanyWorkspace["currentStage"];
  lastLabel: string;
  daysSinceActivity: number;
  painTitles: string[];
  modules: string[];
  openQuestions: string[];
  facts: string[];
  personName: string;
  personRole: string;
}): CompanyWorkspace {
  const createdAt = daysAgo(input.daysSinceActivity + 14);
  const updatedAt = daysAgo(input.daysSinceActivity);
  const meetingId = createId("meeting");
  const memory = seedMemory({
    companyName: input.companyName,
    industry: input.industry,
    industryLabel: input.industry,
    confidenceScore: input.understanding,
    painPoints: input.painTitles,
    missingInformation: input.openQuestions,
    belief: `${input.companyName} · Discovery in progress`,
  });

  memory.knownFacts = input.facts.map((statement, index) => ({
    id: createId("fact"),
    key: `seed_fact_${index}`,
    statement,
    evidence: ["Prior discovery session"],
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
        : ["Email", "Spreadsheets"],
    ...emptyConsultingWhiteboardFields(),
    facts: input.facts,
    unknowns: input.openQuestions,
    risks: input.painTitles.map((title) => `${title} (notable)`),
  };

  memory.painPoints = input.painTitles.map((title) => ({
    id: createId("pain"),
    title,
    description: title,
    category: "manual_work" as const,
    severity: "notable" as const,
    evidence: ["Prior meeting"],
  }));

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
      description: input.facts[0] ?? "Initial business facts recorded.",
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
    discoveries: input.facts,
    questionsAnswered: input.facts,
    questionsRemaining: input.openQuestions,
    generatedReport: null,
    businessUnderstandingAfter: input.understanding,
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
    businessUnderstanding: input.understanding,
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
    deliverables: null,
    people: [person],
    openQuestions: input.openQuestions,
    painPoints: memory.painPoints,
    status: "active" as const,
    lastActivityAt: updatedAt,
    lastActivityLabel: input.lastLabel,
    suggestedNextMeeting: input.openQuestions[0]
      ? `Continue discovery — focus on ${input.openQuestions[0]}`
      : "Review recommendations with leadership",
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

  const deliverables = currentBlueprint
    ? buildDeliverablesPackage(seededWorkspace)
    : null;

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

  return {
    ...seededWorkspace,
    deliverables,
    timeline: [
      ...deliverableEvents,
      ...processEvents,
      ...solutionEvents,
      ...blueprintEvents,
      ...partialWorkspace.timeline,
    ].sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** Demo companies so Home never feels like a blank chatbot. */
export function createSeedWorkspaces(): CompanyWorkspace[] {
  return [
    seedWorkspace({
      id: "ws_acme",
      companyName: "Acme",
      industry: "manufacturing",
      understanding: 83,
      stage: "Discovery",
      lastLabel: "Last meeting yesterday",
      daysSinceActivity: 1,
      painTitles: [
        "Excel everywhere",
        "Lost WhatsApp history",
        "No purchasing workflow",
      ],
      modules: ["Sales", "Purchasing", "Production", "Collections"],
      openQuestions: ["Inventory", "Maintenance"],
      facts: [
        "You have 3 sales advisors.",
        "Around 500 customers.",
        "Customer history lives mostly in WhatsApp.",
        "Purchasing approvals are manual.",
      ],
      personName: "Álvaro",
      personRole: "founder",
    }),
    seedWorkspace({
      id: "ws_isalwa",
      companyName: "ISALWA",
      industry: "services",
      understanding: 71,
      stage: "Design",
      lastLabel: "Last meeting 3 days ago",
      daysSinceActivity: 3,
      painTitles: [
        "Consulting knowledge lives in people",
        "Project handoffs lose context",
      ],
      modules: ["CRM", "Projects", "Knowledge"],
      openQuestions: ["Delivery capacity", "Pricing model"],
      facts: [
        "ISALWA builds operating systems for mid-market companies.",
        "Discovery currently happens through Architect interviews.",
      ],
      personName: "Carmen",
      personRole: "founder",
    }),
    seedWorkspace({
      id: "ws_viaggio",
      companyName: "Viaggio",
      industry: "distribution",
      understanding: 62,
      stage: "Discovery",
      lastLabel: "Last meeting last week",
      daysSinceActivity: 7,
      painTitles: [
        "Orders tracked in chat",
        "No shared inventory view",
      ],
      modules: ["Orders", "Inventory", "Logistics"],
      openQuestions: ["Warehouse process", "Customer credit"],
      facts: [
        "Regional distribution across three cities.",
        "Sales reps close deals by phone and WhatsApp.",
      ],
      personName: "Sofia",
      personRole: "operations",
    }),
    seedWorkspace({
      id: "ws_abc",
      companyName: "ABC Manufacturing",
      industry: "manufacturing",
      understanding: 54,
      stage: "Discovery",
      lastLabel: "Last meeting 2 weeks ago",
      daysSinceActivity: 14,
      painTitles: [
        "Shop floor status is verbal",
        "BOM changes are emailed",
      ],
      modules: ["Production", "Inventory", "Quality"],
      openQuestions: ["Production", "Quality holds", "Shipping"],
      facts: [
        "Family-owned plant with ~80 employees.",
        "Production schedule lives in a whiteboard and Excel.",
      ],
      personName: "Miguel",
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
    deliverables: null,
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
