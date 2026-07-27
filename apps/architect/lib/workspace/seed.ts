import { emptyBlueprints } from "@/lib/blueprint";
import { emptyEvolutionHistory } from "@/lib/history";
import { emptyWorkspaceKnowledge } from "@/lib/knowledge";
import {
  PILOT_COMPANY_NAME,
  PILOT_COMPANY_WORKSPACE_ID,
} from "@/lib/auth/constants";
import { createId, nowIso } from "@/lib/utils";
import type {
  CompanyWorkspace,
  ConversationRecord,
  DiscoveryReport,
  Industry,
} from "@/types";

/**
 * Honest empty workspace shell — no fabricated facts, meetings, pain points,
 * modules, or recommendations. Every gauge (Business Understanding, Health,
 * Maturity) reads 0 / "aún sin evaluar" until a real discovery interview or
 * a real document upload produces evidence. See NO_FABRICATED_CONTENT.md.
 */
export function createEmptyWorkspace(
  companyName: string,
  industry: Industry = "unknown",
  id: string = createId("ws"),
): CompanyWorkspace {
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
        title: "Espacio de trabajo creado",
        description: `Se inició la memoria de la empresa para ${companyName}.`,
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
    lastActivityLabel: "Recién creado",
    suggestedNextMeeting: "Iniciar la primera entrevista de descubrimiento",
    conversationMemory: null,
    activeInterviewId: null,
    lastMeetingId: null,
  };
}

/**
 * Pilot seed — single real company (`ws_isalwa`/"ISALWA"), the shell Carmen
 * (consultant) and Álvaro (client) log into. No invented discovery facts,
 * meetings, pain points, modules, or recommendations: those inflated
 * Business Understanding, Health, and Maturity with evidence that was never
 * actually gathered (see NO_FABRICATED_CONTENT.md and I18N_100.md). The
 * workspace starts honestly empty; every score comes from a real interview
 * or a real document upload, never from this seed.
 */
export function createSeedWorkspaces(): CompanyWorkspace[] {
  return [
    createEmptyWorkspace(
      PILOT_COMPANY_NAME,
      "unknown",
      PILOT_COMPANY_WORKSPACE_ID,
    ),
  ];
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
