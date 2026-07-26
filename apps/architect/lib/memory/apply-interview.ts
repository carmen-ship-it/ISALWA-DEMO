import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  ConversationRecord,
  Interview,
  Meeting,
  Person,
  TimelineEvent,
} from "@/types";
import {
  appendBlueprintVersion,
  blueprintTimelineEvent,
  deriveBusinessBlueprint,
  ensureBlueprints,
} from "@/lib/blueprint";
import { deriveSolutionArchitecture } from "@/lib/solution";
import { deriveBusinessProcesses } from "@/lib/processes";
import { buildDeliverablesPackage } from "@/lib/deliverables";
import { assembleImplementationPackage } from "@/lib/implementation-package";
import {
  deriveBrandExperience,
} from "@/lib/brand";
import { deriveCompanyModel } from "@/lib/company-model";
import { evolveLivingReport } from "@/lib/reports/living-report";
import { buildTimelineEventsFromInterview } from "@/lib/timeline/events";
import { placeholderTranscriptDocument } from "@/lib/documents/placeholders";
import { moduleLabel } from "@/lib/presentation";

/**
 * Apply a completed interview into durable company memory.
 * Never discards prior workspace knowledge — merges and evolves.
 */
export function applyInterviewToWorkspace(
  workspace: CompanyWorkspace,
  interview: Interview,
): {
  workspace: CompanyWorkspace;
  meeting: Meeting;
  conversation: ConversationRecord;
} {
  const stamp = nowIso();
  const understanding = interview.memory.score.overall;
  const report = interview.report
    ? evolveLivingReport(workspace.currentReport, interview.report)
    : workspace.currentReport;

  const meeting: Meeting = {
    id: createId("meeting"),
    workspaceId: workspace.id,
    title: `Descubrimiento · ${new Date(stamp).toLocaleDateString("es", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`,
    date: stamp,
    participants: interview.participant.name
      ? [interview.participant.name]
      : [],
    conversationId: null,
    interviewId: interview.id,
    summary: buildMeetingSummary(interview),
    discoveries: interview.memory.knownFacts.map((f) => f.statement).slice(0, 8),
    questionsAnswered: interview.conversation.answers
      .map((a) => a.value)
      .slice(0, 8),
    questionsRemaining: interview.memory.score.stillNeed,
    generatedReport: report,
    businessUnderstandingAfter: understanding,
  };

  const timelineExtras = buildTimelineEventsFromInterview(
    workspace.id,
    meeting.id,
    interview,
  );

  const meetingEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: "Reunión de descubrimiento completada",
    description: meeting.summary,
    category: "meeting",
    meetingId: meeting.id,
  };

  const timeline = [meetingEvent, ...timelineExtras, ...workspace.timeline].sort(
    (a, b) => b.date.localeCompare(a.date),
  );

  const people = upsertParticipant(workspace, interview, stamp);

  const conversation: ConversationRecord = {
    id: createId("conversation"),
    workspaceId: workspace.id,
    interviewId: interview.id,
    createdAt: interview.createdAt,
    updatedAt: stamp,
    memory: interview.memory,
    phase: interview.phase,
    participantName: interview.participant.name,
    companyName:
      interview.business.companyName ??
      interview.participant.companyName ??
      workspace.companyName,
  };

  meeting.conversationId = conversation.id;

  const documents = [
    placeholderTranscriptDocument(workspace.id, meeting.title, stamp),
    ...workspace.documents,
  ];

  const priorBlueprints = ensureBlueprints(workspace.blueprints);
  const nextBlueprint = deriveBusinessBlueprint({
    workspace: {
      ...workspace,
      meetings: [meeting, ...workspace.meetings],
      painPoints: interview.memory.painPoints.length
        ? interview.memory.painPoints
        : workspace.painPoints,
      openQuestions:
        report?.unansweredQuestions ??
        interview.memory.score.stillNeed ??
        workspace.openQuestions,
      recommendations: report?.opportunities ?? workspace.recommendations,
      modules: report?.potentialModules ?? workspace.modules,
      opportunities: mergeById(workspace.opportunities, interview.opportunities),
      conversationMemory: interview.memory,
      currentReport: report,
    },
    interview,
    meetingId: meeting.id,
    priorVersions: priorBlueprints,
  });
  const blueprints = appendBlueprintVersion(priorBlueprints, nextBlueprint);
  const blueprintEvent = blueprintTimelineEvent(nextBlueprint);

  const workspaceForSolution: CompanyWorkspace = {
    ...workspace,
    meetings: [meeting, ...workspace.meetings],
    blueprints,
    currentBlueprintId: nextBlueprint.id,
    conversationMemory: interview.memory,
    currentReport: report,
    painPoints: interview.memory.painPoints.length
      ? interview.memory.painPoints
      : workspace.painPoints,
    modules: report?.potentialModules ?? workspace.modules,
  };

  const solutionArchitecture = deriveSolutionArchitecture({
    workspace: workspaceForSolution,
    blueprint: nextBlueprint,
  });

  const workspaceForProcesses: CompanyWorkspace = {
    ...workspaceForSolution,
    solutionArchitecture,
  };

  const businessProcesses = deriveBusinessProcesses({
    workspace: workspaceForProcesses,
    blueprint: nextBlueprint,
  });

  const workspaceForBrand: CompanyWorkspace = {
    ...workspaceForProcesses,
    businessProcesses,
  };

  const brandExperience = deriveBrandExperience({
    workspace: workspaceForBrand,
    blueprint: nextBlueprint,
  });

  const companyModel = deriveCompanyModel({
    workspace: {
      ...workspace,
      solutionArchitecture,
      businessProcesses,
      brandExperience,
    },
    blueprint: nextBlueprint,
  });

  const workspaceForDeliverables: CompanyWorkspace = {
    ...workspaceForBrand,
    brandExperience,
  };

  const deliverables = buildDeliverablesPackage(workspaceForDeliverables);

  const workspaceForImplementation: CompanyWorkspace = {
    ...workspaceForDeliverables,
    deliverables,
  };

  const implementationPackage = assembleImplementationPackage(
    workspaceForImplementation,
  );

  const solutionEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: `Arquitectura de solución · Blueprint v${nextBlueprint.version}`,
    description: solutionArchitecture.summary,
    category: "solution",
    meetingId: meeting.id,
  };

  const processEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: `Procesos de negocio · Blueprint v${nextBlueprint.version}`,
    description: businessProcesses.summary,
    category: "process",
    meetingId: meeting.id,
  };

  const brandEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: `Marca y experiencia · Blueprint v${nextBlueprint.version}`,
    description: brandExperience.summary,
    category: "brand",
    meetingId: meeting.id,
  };

  const companyModelEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: `Modelo de la empresa · Blueprint v${nextBlueprint.version}`,
    description: companyModel.summary,
    category: "company_model",
    meetingId: meeting.id,
  };

  const deliverableEvent: TimelineEvent = {
    id: createId("timeline"),
    workspaceId: workspace.id,
    date: stamp,
    title: `Entregables · Blueprint v${nextBlueprint.version}`,
    description: deliverables.summary,
    category: "deliverable",
    meetingId: meeting.id,
  };

  const implementationEvent: TimelineEvent | null = implementationPackage
    ? {
        id: createId("timeline"),
        workspaceId: workspace.id,
        date: stamp,
        title: implementationPackage.gate.ready
          ? `Paquete de implementación · Blueprint v${nextBlueprint.version}`
          : `Paquete de implementación (pendiente) · Blueprint v${nextBlueprint.version}`,
        description: implementationPackage.summary,
        category: "implementation",
        meetingId: meeting.id,
      }
    : null;

  const next: CompanyWorkspace = {
    ...workspace,
    companyName:
      interview.business.companyName ??
      interview.participant.companyName ??
      workspace.companyName,
    industry:
      interview.business.industry !== "unknown"
        ? interview.business.industry
        : workspace.industry,
    updatedAt: stamp,
    currentStage: workspace.currentStage === "Discovery" ? "Discovery" : workspace.currentStage,
    businessUnderstanding: understanding,
    currentReport: report,
    meetings: [meeting, ...workspace.meetings],
    observations: mergeById(workspace.observations, interview.observations),
    recommendations: report?.opportunities ?? workspace.recommendations,
    opportunities: mergeById(workspace.opportunities, interview.opportunities),
    modules: report?.potentialModules ?? workspace.modules,
    timeline: [
      ...(implementationEvent ? [implementationEvent] : []),
      deliverableEvent,
      companyModelEvent,
      brandEvent,
      processEvent,
      solutionEvent,
      blueprintEvent,
      ...timeline,
    ],
    documents,
    knowledge: workspace.knowledge,
    blueprints,
    currentBlueprintId: nextBlueprint.id,
    solutionArchitecture,
    businessProcesses,
    brandExperience,
    companyModel,
    deliverables,
    implementationPackage,
    people,
    openQuestions:
      report?.unansweredQuestions ??
      interview.memory.score.stillNeed ??
      workspace.openQuestions,
    painPoints: interview.memory.painPoints.length
      ? interview.memory.painPoints
      : workspace.painPoints,
    lastActivityAt: stamp,
    lastActivityLabel: "Reunión recién completada",
    suggestedNextMeeting: suggestNextMeeting(interview),
    conversationMemory: interview.memory,
    activeInterviewId: null,
    lastMeetingId: meeting.id,
  };

  return { workspace: next, meeting, conversation };
}

function buildMeetingSummary(interview: Interview): string {
  const company =
    interview.business.companyName ??
    interview.participant.companyName ??
    "la empresa";
  const pains = interview.memory.whiteboard.painPoints.slice(0, 3);
  const still = interview.memory.score.stillNeed[0];
  const painLine =
    pains.length > 0 ? ` Dolor confirmado: ${pains.join("; ")}.` : "";
  const openLine = still ? ` Aún abierto: ${still}.` : "";
  return `Sesión de descubrimiento para ${company}.${painLine}${openLine}`.trim();
}

function suggestNextMeeting(interview: Interview): string {
  const next = interview.memory.score.stillNeed[0];
  if (next) return `Continuar descubrimiento — foco en ${next}`;
  if (interview.memory.whiteboard.potentialModules[0]) {
    return `Revisar el alcance del módulo ${moduleLabel(interview.memory.whiteboard.potentialModules[0])}`;
  }
  return "Revisar el informe vivo con liderazgo";
}

function upsertParticipant(
  workspace: CompanyWorkspace,
  interview: Interview,
  stamp: string,
): Person[] {
  const name = interview.participant.name;
  if (!name) return workspace.people;

  const existing = workspace.people.find(
    (p) => p.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    return workspace.people.map((p) =>
      p.id === existing.id
        ? {
            ...p,
            role: interview.participant.role ?? p.role,
            lastSeen: stamp,
          }
        : p,
    );
  }

  const person: Person = {
    id: createId("person"),
    workspaceId: workspace.id,
    name,
    role: interview.participant.role,
    department: null,
    email: null,
    phone: null,
    notes: "Participante del descubrimiento",
    lastSeen: stamp,
  };
  return [person, ...workspace.people];
}

function mergeById<T extends { id: string }>(prior: T[], next: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of prior) map.set(item.id, item);
  for (const item of next) map.set(item.id, item);
  return [...map.values()];
}
