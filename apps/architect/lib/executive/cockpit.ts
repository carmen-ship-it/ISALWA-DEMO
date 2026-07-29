/**
 * Assemble ExecutiveCockpit — Mission 13.
 * Extends Mission 9.5 deriveExecutiveExperience; does not replace engines.
 */

import type {
  CompanyWorkspace,
  MaturityDimension,
  ScoredDimension,
} from "@/types";
import {
  departmentLabel,
  healthLabel,
  moduleLabel,
  phaseLabel,
} from "@/lib/presentation";
import { deriveCockpitAlerts } from "./alerts";
import { deriveDailySummary } from "./daily-summary";
import { deriveExecutiveScore } from "./executive-score";
import { deriveCockpitPriorities } from "./priorities";
import {
  deriveCockpitQuickWins,
  deriveCockpitStrategicOpportunities,
} from "./recommendations";
import type {
  AiReadinessProgress,
  AutomationProgress,
  BusinessHealthSurface,
  DepartmentHealthItem,
  DiscoveryItem,
  ExecutiveCockpit,
  PendingDecision,
  RoadmapProgress,
} from "./types";

const DEPT_MATURITY: Record<string, MaturityDimension[]> = {
  Sales: ["sales", "customer"],
  Purchasing: ["operations", "documentation"],
  Finance: ["finance", "data"],
  Production: ["operations", "automation"],
  Warehouse: ["operations", "data"],
  Maintenance: ["operations", "technology"],
  Operations: ["operations", "automation"],
  Management: ["leadership", "documentation"],
  Support: ["customer", "people"],
};

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bandLabel(score: number | null): string {
  if (score == null) return "Sin señal";
  if (score >= 75) return "Sólida";
  if (score >= 55) return "Estable";
  if (score >= 35) return "En desarrollo";
  return "Necesita más conocimiento";
}

function gaugeLabelEs(id: string, fallback: string): string {
  const map: Record<string, string> = {
    commercial: "Comercial",
    operations: "Operaciones",
    technology: "Tecnología",
    people: "Personas",
    processes: "Procesos",
    data: "Datos",
    ai_readiness: "Preparación para IA",
    execution: "Ejecución",
  };
  return map[id] ?? fallback;
}

function avgMaturity(
  dims: ScoredDimension[],
  ids: MaturityDimension[],
): number | null {
  const matched = dims.filter((d) =>
    ids.includes(d.id as MaturityDimension),
  );
  if (matched.length === 0) return null;
  return clamp(
    matched.reduce((s, d) => s + d.score, 0) / matched.length,
  );
}

function deriveBusinessHealth(
  workspace: CompanyWorkspace,
): BusinessHealthSurface {
  const health = workspace.conversationMemory?.consulting?.health;
  if (!health) {
    return { overall: null, label: "Aún sin evaluar", gauges: [] };
  }
  return {
    overall: health.overall,
    label: healthLabel(health.overall, "percent"),
    gauges: health.gauges.map((g) => ({
      id: g.id,
      label: gaugeLabelEs(g.id, g.label),
      score: g.score,
    })),
  };
}

function deriveDepartmentHealth(
  workspace: CompanyWorkspace,
): DepartmentHealthItem[] {
  const consulting = workspace.conversationMemory?.consulting;
  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  const maturityDims = consulting?.maturity.dimensions ?? [];
  const pains = workspace.painPoints;

  const deptNames =
    blueprint?.departments.map((d) => d.name) ??
    workspace.solutionArchitecture?.departments ??
    Object.keys(DEPT_MATURITY);

  const unique = Array.from(new Set(deptNames)).slice(0, 8);

  return unique.map((name) => {
    const keys = DEPT_MATURITY[name] ?? ["operations"];
    let score = avgMaturity(maturityDims, keys);

    const relatedPains = pains.filter((p) =>
      new RegExp(name, "i").test(`${p.title} ${p.description} ${p.category}`),
    );
    if (score != null && relatedPains.length > 0) {
      score = clamp(score - relatedPains.length * 4);
    }

    const evidence: string[] = [];
    if (relatedPains[0]) evidence.push(relatedPains[0].title);
    const dimEvidence = maturityDims
      .filter((d) => keys.includes(d.id as MaturityDimension))
      .flatMap((d) => d.evidence)
      .slice(0, 2);
    evidence.push(...dimEvidence);

    return {
      id: name.toLowerCase(),
      name: departmentLabel(name),
      score,
      label: bandLabel(score),
      evidence: evidence.slice(0, 3),
    };
  });
}

function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

function deriveRecentDiscoveries(
  workspace: CompanyWorkspace,
): DiscoveryItem[] {
  const items: DiscoveryItem[] = [];

  const timelineDiscoveries = workspace.timeline
    .filter(
      (e) =>
        e.category === "discovery" ||
        e.category === "knowledge" ||
        e.category === "meeting",
    )
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  for (const event of timelineDiscoveries) {
    items.push({
      id: event.id,
      title: event.title,
      detail: event.description,
      date: event.date,
    });
  }

  if (items.length < 3) {
    for (const meeting of workspace.meetings.slice().reverse()) {
      for (const d of meeting.discoveries.slice(0, 2)) {
        items.push({
          id: `${meeting.id}-${hashId(d)}`,
          title: d,
          detail: meeting.summary || meeting.title,
          date: meeting.date,
        });
        if (items.length >= 5) break;
      }
      if (items.length >= 5) break;
    }
  }

  if (items.length < 3) {
    for (const pain of workspace.painPoints.slice(0, 3)) {
      items.push({
        id: pain.id,
        title: pain.title,
        detail: pain.description,
        date: null,
      });
    }
  }

  return items.slice(0, 6);
}

function derivePendingDecisions(
  workspace: CompanyWorkspace,
): PendingDecision[] {
  const decisions: PendingDecision[] = [];
  const seen = new Set<string>();

  const push = (id: string, title: string, detail: string) => {
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    decisions.push({ id, title, detail });
  };

  for (const q of workspace.openQuestions) {
    push(`oq-${hashId(q)}`, q, "Pregunta abierta del descubrimiento");
  }

  for (const c of workspace.conversationMemory?.consulting?.contradictions ??
    []) {
    push(
      `contra-${c.id}`,
      c.statement,
      "Posible contradicción — validar con el cliente",
    );
  }

  const blueprint = workspace.blueprints.find(
    (b) => b.id === workspace.currentBlueprintId,
  );
  for (const cap of blueprint?.capabilities ?? []) {
    if (cap.owner) continue;
    push(
      `cap-${cap.id}`,
      `Definir dueño de ${moduleLabel(cap.name)}`,
      "Capacidad sin responsable claro en el blueprint",
    );
    if (decisions.length >= 6) break;
  }

  return decisions.slice(0, 6);
}

function deriveAutomation(workspace: CompanyWorkspace): AutomationProgress {
  const processes = workspace.businessProcesses;
  const automationDim =
    workspace.conversationMemory?.consulting?.maturity.dimensions.find(
      (d) => d.id === "automation",
    );

  const candidates = processes?.automationCandidates ?? [];
  const workflowAvg =
    processes && processes.workflows.length > 0
      ? clamp(
          processes.workflows.reduce(
            (s, w) => s + w.metrics.automationScore,
            0,
          ) / processes.workflows.length,
        )
      : null;

  const score = workflowAvg ?? automationDim?.score ?? null;
  const highlights = candidates
    .slice(0, 4)
    .map(
      (c) =>
        c.quickAutomation ||
        c.futureAutomation ||
        c.aiOpportunity ||
        c.estimatedImpact,
    )
    .filter(Boolean) as string[];

  return {
    score,
    label: bandLabel(score),
    candidateCount: candidates.length,
    highlights,
  };
}

function deriveAiReadiness(workspace: CompanyWorkspace): AiReadinessProgress {
  const consulting = workspace.conversationMemory?.consulting;
  const gauge = consulting?.health.gauges.find((g) => g.id === "ai_readiness");
  const processAvg =
    workspace.businessProcesses &&
    workspace.businessProcesses.workflows.length > 0
      ? clamp(
          workspace.businessProcesses.workflows.reduce(
            (s, w) => s + w.metrics.aiReadiness,
            0,
          ) / workspace.businessProcesses.workflows.length,
        )
      : null;

  const score = gauge?.score ?? processAvg ?? null;
  const blockers: string[] = [];

  for (const risk of (consulting?.risks ?? []).slice(0, 3)) {
    if (
      /data|document|tribal|excel|backup|manual/i.test(
        `${risk.patternId} ${risk.title}`,
      )
    ) {
      blockers.push(risk.title);
    }
  }

  if (score != null && score < 40 && blockers.length === 0) {
    blockers.push(
      "Calidad de datos y claridad de procesos aún limitan la preparación para IA",
    );
  }

  return {
    score,
    label: bandLabel(score),
    blockers: blockers.slice(0, 3),
  };
}

function deriveRoadmap(workspace: CompanyWorkspace): RoadmapProgress {
  const phases = workspace.solutionArchitecture?.roadmap ?? [];
  const totalPhases = phases.length;
  const percent =
    totalPhases === 0
      ? workspace.solutionArchitecture
        ? 20
        : 0
      : clamp((1 / totalPhases) * 100 + 15);

  const mapped = phases.map((p) => ({
    phase: p.phase,
    name: phaseLabel(p.name),
    status: (p.phase === 1 ? "designed" : "planned") as "designed" | "planned",
    modules: p.modules.map((m) => moduleLabel(String(m))),
  }));

  let summary: string;
  if (totalPhases === 0) {
    summary =
      "La hoja de ruta aparece cuando las capacidades recomendadas se ordenan.";
  } else {
    summary = `${totalPhases} fase${totalPhases === 1 ? "" : "s"} diseñada${totalPhases === 1 ? "" : "s"} · enfoque inmediato: ${mapped[0]?.name ?? "Fase 1"}`;
  }

  return {
    totalPhases,
    designedPhases: mapped.filter((p) => p.status === "designed").length,
    percent,
    phases: mapped,
    summary,
  };
}

export function deriveExecutiveCockpit(
  workspace: CompanyWorkspace,
): ExecutiveCockpit {
  const score = deriveExecutiveScore(workspace);

  return {
    score,
    dailySummary: deriveDailySummary(workspace, score),
    businessHealth: deriveBusinessHealth(workspace),
    departmentHealth: deriveDepartmentHealth(workspace),
    priorities: deriveCockpitPriorities(workspace),
    openRisks: deriveCockpitAlerts(workspace),
    quickWins: deriveCockpitQuickWins(workspace),
    strategicOpportunities: deriveCockpitStrategicOpportunities(workspace),
    recentDiscoveries: deriveRecentDiscoveries(workspace),
    pendingDecisions: derivePendingDecisions(workspace),
    automation: deriveAutomation(workspace),
    aiReadiness: deriveAiReadiness(workspace),
    roadmap: deriveRoadmap(workspace),
  };
}
