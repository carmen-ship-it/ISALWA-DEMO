/**
 * Deterministic immutable workspace snapshots for Mission 15.
 * Content hash ignores volatile timestamps so regenerate-on-migrate does not spam history.
 */

import { createId, nowIso } from "@/lib/utils";
import { latestBlueprint } from "@/lib/blueprint";
import { isDiscoverySessionMeeting } from "@/lib/memory/meeting-kind";
import type {
  CompanySnapshot,
  SnapshotModuleRef,
  SnapshotProcessSummary,
  SnapshotRecommendationRef,
  SnapshotRiskRef,
  SnapshotRoadmapPhase,
} from "@/types/history";
import type {
  CompanyWorkspace,
} from "@/types";

/** Stable JSON for hashing — sorted keys, no undefined. */
export function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(",")}}`;
}

/** FNV-1a 32-bit — deterministic, sync, no crypto dependency. */
export function hashContent(payload: unknown): string {
  const input = stableSerialize(payload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function materialPayload(workspace: CompanyWorkspace) {
  const consulting = workspace.conversationMemory?.consulting ?? null;
  const maturity = consulting?.maturity ?? null;
  const blueprint = latestBlueprint(workspace.blueprints ?? []);

  const modules = collectModules(workspace);
  const processes = collectProcesses(workspace);
  const recommendations = collectRecommendations(workspace);
  const roadmap = collectRoadmap(workspace);
  const risks = collectRisks(workspace);
  const completedWork = collectCompletedWork(workspace);

  return {
    stage: workspace.currentStage,
    businessUnderstanding: workspace.businessUnderstanding,
    maturityOverall: maturity?.overall ?? null,
    maturityByDimension: (maturity?.dimensions ?? [])
      .map((d) => ({ id: d.id, score: d.score }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    modules,
    processes,
    recommendations,
    roadmap,
    completedWork,
    risks,
    openQuestionCount: workspace.openQuestions.length,
    meetingCount: workspace.meetings.length,
    blueprintVersion: blueprint?.version ?? null,
  };
}

function collectModules(workspace: CompanyWorkspace): SnapshotModuleRef[] {
  const fromWorkspace = workspace.modules.map((m) => ({
    id: m.id,
    name: m.name,
    priority: m.priority,
  }));
  const fromSolution = (workspace.solutionArchitecture?.modules ?? []).map(
    (m) => ({
      id: m.id,
      name: m.name,
      priority: "solution",
    }),
  );
  const seen = new Set<string>();
  const merged: SnapshotModuleRef[] = [];
  for (const mod of [...fromWorkspace, ...fromSolution]) {
    const key = mod.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(mod);
  }
  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

function collectProcesses(workspace: CompanyWorkspace): SnapshotProcessSummary {
  const model = workspace.businessProcesses;
  if (!model) {
    return {
      workflowCount: 0,
      bottleneckCount: 0,
      automationCandidateCount: 0,
      workflowNames: [],
      summary: null,
    };
  }
  return {
    workflowCount: model.workflows.length,
    bottleneckCount: model.bottlenecks.length,
    automationCandidateCount: model.automationCandidates.length,
    workflowNames: model.workflows
      .map((w) => w.name)
      .sort((a, b) => a.localeCompare(b)),
    summary: model.summary,
  };
}

function collectRecommendations(
  workspace: CompanyWorkspace,
): SnapshotRecommendationRef[] {
  const fromWorkspace = workspace.recommendations.map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
  }));
  const fromConsulting = (
    workspace.conversationMemory?.consulting?.recommendations ?? []
  ).map((r) => ({
    id: r.id,
    title: r.title,
    priority: r.priority,
  }));
  const seen = new Set<string>();
  const merged: SnapshotRecommendationRef[] = [];
  for (const rec of [...fromWorkspace, ...fromConsulting]) {
    const key = rec.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(rec);
  }
  return merged.sort((a, b) => a.title.localeCompare(b.title));
}

function collectRoadmap(workspace: CompanyWorkspace): SnapshotRoadmapPhase[] {
  const phases = workspace.solutionArchitecture?.roadmap ?? [];
  return phases
    .map((p) => ({
      id: p.id,
      phase: p.phase,
      name: p.name,
      modules: [...p.modules].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.phase - b.phase);
}

function collectRisks(workspace: CompanyWorkspace): SnapshotRiskRef[] {
  const consultingRisks =
    workspace.conversationMemory?.consulting?.risks ?? [];
  if (consultingRisks.length > 0) {
    return consultingRisks
      .map((r) => ({
        id: r.id,
        title: r.title,
        severity: r.severity,
        patternId: r.patternId,
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  return workspace.observations
    .filter((o) => o.severity === "critical" || o.risk)
    .map((o) => ({
      id: o.id,
      title: o.title,
      severity: o.severity,
      patternId: null,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

function collectCompletedWork(workspace: CompanyWorkspace): string[] {
  const items: string[] = [];

  for (const meeting of workspace.meetings) {
    items.push(
      isDiscoverySessionMeeting(meeting)
        ? `Reunión: ${meeting.title}`
        : `Transcripción procesada: ${meeting.title}`,
    );
  }

  if (workspace.deliverables) {
    items.push(
      `Entregables · Blueprint v${workspace.deliverables.blueprintVersion ?? "?"}`,
    );
  }

  if (workspace.currentReport) {
    items.push("Informe vivo generado");
  }

  const decisionEvents = workspace.timeline.filter(
    (e) => e.category === "decision",
  );
  for (const event of decisionEvents.slice(0, 12)) {
    items.push(`Decisión: ${event.title}`);
  }

  return [...new Set(items)].sort((a, b) => a.localeCompare(b));
}

/**
 * Capture an immutable snapshot from current workspace state.
 * Does not mutate the workspace or prior history.
 */
export function captureWorkspaceSnapshot(
  workspace: CompanyWorkspace,
  capturedAt: string = nowIso(),
): CompanySnapshot {
  const material = materialPayload(workspace);
  return {
    id: createId("snap"),
    capturedAt,
    contentHash: hashContent(material),
    ...material,
  };
}

export function snapshotsEqualByHash(
  a: CompanySnapshot | null | undefined,
  b: CompanySnapshot | null | undefined,
): boolean {
  if (!a || !b) return false;
  return a.contentHash === b.contentHash;
}
