/**
 * Snapshot diffs — what changed, progress, regression, future focus.
 */

import { moduleLabel, phaseLabel, severityLabel } from "@/lib/presentation";
import { createId } from "@/lib/utils";
import { formatStageLabel } from "@/lib/workspace/format";
import type {
  CompanySnapshot,
  EvolutionChangeItem,
  SnapshotComparison,
} from "@/types/history";

function item(
  area: EvolutionChangeItem["area"],
  polarity: EvolutionChangeItem["polarity"],
  title: string,
  description: string,
): EvolutionChangeItem {
  return {
    id: createId("echg"),
    area,
    polarity,
    title,
    description,
  };
}

function setDiff(before: string[], after: string[]): {
  added: string[];
  removed: string[];
} {
  const beforeSet = new Set(before.map((s) => s.toLowerCase()));
  const afterSet = new Set(after.map((s) => s.toLowerCase()));
  return {
    added: after.filter((s) => !beforeSet.has(s.toLowerCase())),
    removed: before.filter((s) => !afterSet.has(s.toLowerCase())),
  };
}

/**
 * Compare two immutable snapshots. `from` may be null (first baseline).
 */
export function compareSnapshots(
  from: CompanySnapshot | null,
  to: CompanySnapshot,
): SnapshotComparison {
  if (!from) {
    return {
      fromSnapshotId: null,
      toSnapshotId: to.id,
      fromAt: null,
      toAt: to.capturedAt,
      whatChanged: [
        item(
          "understanding",
          "neutral",
          "Línea base establecida",
          "Primera captura de la memoria evolutiva de la empresa.",
        ),
      ],
      progress: [],
      regression: [],
      futureFocus: buildFutureFocus(to),
    };
  }

  const whatChanged: EvolutionChangeItem[] = [];
  const progress: EvolutionChangeItem[] = [];
  const regression: EvolutionChangeItem[] = [];

  if (from.stage !== to.stage) {
    const change = item(
      "stage",
      "progress",
      "Etapa actualizada",
      `${formatStageLabel(from.stage)} → ${formatStageLabel(to.stage)}`,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const understandingDelta =
    to.businessUnderstanding - from.businessUnderstanding;
  if (understandingDelta >= 3) {
    const change = item(
      "understanding",
      "progress",
      "Comprensión del negocio",
      `${from.businessUnderstanding}% → ${to.businessUnderstanding}%`,
    );
    whatChanged.push(change);
    progress.push(change);
  } else if (understandingDelta <= -3) {
    const change = item(
      "understanding",
      "regression",
      "Comprensión del negocio",
      `${from.businessUnderstanding}% → ${to.businessUnderstanding}%`,
    );
    whatChanged.push(change);
    regression.push(change);
  }

  const fromMaturity = from.maturityOverall;
  const toMaturity = to.maturityOverall;
  if (fromMaturity != null && toMaturity != null) {
    const delta = toMaturity - fromMaturity;
    if (delta >= 3) {
      const change = item(
        "maturity",
        "progress",
        "Madurez empresarial",
        `${fromMaturity} → ${toMaturity}`,
      );
      whatChanged.push(change);
      progress.push(change);
    } else if (delta <= -3) {
      const change = item(
        "maturity",
        "regression",
        "Madurez empresarial",
        `${fromMaturity} → ${toMaturity}`,
      );
      whatChanged.push(change);
      regression.push(change);
    }
  } else if (fromMaturity == null && toMaturity != null) {
    const change = item(
      "maturity",
      "progress",
      "Madurez medida",
      `Puntuación inicial de madurez: ${toMaturity}`,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const moduleDiff = setDiff(
    from.modules.map((m) => m.name),
    to.modules.map((m) => m.name),
  );
  for (const name of moduleDiff.added) {
    const change = item("modules", "progress", "Módulo añadido", moduleLabel(name));
    whatChanged.push(change);
    progress.push(change);
  }
  for (const name of moduleDiff.removed) {
    const change = item("modules", "regression", "Módulo retirado", moduleLabel(name));
    whatChanged.push(change);
    regression.push(change);
  }

  const processDiff = setDiff(
    from.processes.workflowNames,
    to.processes.workflowNames,
  );
  for (const name of processDiff.added) {
    const change = item("processes", "progress", "Proceso documentado", name);
    whatChanged.push(change);
    progress.push(change);
  }
  if (to.processes.bottleneckCount > from.processes.bottleneckCount) {
    const change = item(
      "processes",
      "regression",
      "Nuevos cuellos de botella",
      `${from.processes.bottleneckCount} → ${to.processes.bottleneckCount}`,
    );
    whatChanged.push(change);
    regression.push(change);
  } else if (to.processes.bottleneckCount < from.processes.bottleneckCount) {
    const change = item(
      "processes",
      "progress",
      "Cuellos de botella reducidos",
      `${from.processes.bottleneckCount} → ${to.processes.bottleneckCount}`,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const recDiff = setDiff(
    from.recommendations.map((r) => r.title),
    to.recommendations.map((r) => r.title),
  );
  for (const title of recDiff.added) {
    const change = item(
      "recommendations",
      "progress",
      "Nueva recomendación",
      title,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const roadmapDiff = setDiff(
    from.roadmap.map((p) => p.name),
    to.roadmap.map((p) => p.name),
  );
  if (to.roadmap.length > from.roadmap.length || roadmapDiff.added.length > 0) {
    const change = item(
      "roadmap",
      "progress",
      "Hoja de ruta ampliada",
      roadmapDiff.added.length > 0
        ? roadmapDiff.added.map(phaseLabel).join(" · ")
        : `${from.roadmap.length} → ${to.roadmap.length} fases`,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const workDiff = setDiff(from.completedWork, to.completedWork);
  for (const label of workDiff.added) {
    const change = item(
      "completed_work",
      "progress",
      "Trabajo completado",
      label,
    );
    whatChanged.push(change);
    progress.push(change);
  }

  const riskDiff = setDiff(
    from.risks.map((r) => r.title),
    to.risks.map((r) => r.title),
  );
  for (const title of riskDiff.removed) {
    const change = item("risks", "progress", "Riesgo resuelto", title);
    whatChanged.push(change);
    progress.push(change);
  }
  for (const title of riskDiff.added) {
    const change = item("risks", "regression", "Nuevo riesgo", title);
    whatChanged.push(change);
    regression.push(change);
  }

  if (whatChanged.length === 0) {
    whatChanged.push(
      item(
        "understanding",
        "neutral",
        "Sin cambios materiales",
        "El estado del engagement se mantiene estable desde la captura anterior.",
      ),
    );
  }

  return {
    fromSnapshotId: from.id,
    toSnapshotId: to.id,
    fromAt: from.capturedAt,
    toAt: to.capturedAt,
    whatChanged,
    progress,
    regression,
    futureFocus: buildFutureFocus(to),
  };
}

function buildFutureFocus(snapshot: CompanySnapshot): EvolutionChangeItem[] {
  const focus: EvolutionChangeItem[] = [];

  for (const rec of snapshot.recommendations
    .filter((r) => r.priority === "now")
    .slice(0, 3)) {
    focus.push(
      item("recommendations", "focus", "Prioridad inmediata", rec.title),
    );
  }

  for (const risk of snapshot.risks
    .filter((r) => r.severity === "critical" || r.severity === "high")
    .slice(0, 3)) {
    focus.push(
      item(
        "risks",
        "focus",
        "Riesgo a vigilar",
        `${risk.title} (${severityLabel(risk.severity)})`,
      ),
    );
  }

  const nextPhase = snapshot.roadmap[0];
  if (nextPhase) {
    focus.push(
      item(
        "roadmap",
        "focus",
        "Siguiente fase",
        `Fase ${nextPhase.phase}: ${phaseLabel(nextPhase.name)}`,
      ),
    );
  }

  if (snapshot.openQuestionCount > 0) {
    focus.push(
      item(
        "understanding",
        "focus",
        "Preguntas abiertas",
        `${snapshot.openQuestionCount} pendientes de descubrimiento`,
      ),
    );
  }

  if (focus.length === 0) {
    focus.push(
      item(
        "understanding",
        "focus",
        "Continuar descubrimiento",
        "Profundizar evidencia y validar recomendaciones con liderazgo.",
      ),
    );
  }

  return focus;
}

export function findSnapshot(
  snapshots: CompanySnapshot[],
  id: string | null | undefined,
): CompanySnapshot | null {
  if (!id) return null;
  return snapshots.find((s) => s.id === id) ?? null;
}
