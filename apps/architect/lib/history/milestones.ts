/**
 * Derive append-only milestones from snapshot transitions.
 */

import { moduleLabel } from "@/lib/presentation";
import { createId } from "@/lib/utils";
import { formatStageLabel } from "@/lib/workspace/format";
import type {
  CompanySnapshot,
  EvolutionMilestone,
  EvolutionMilestoneKind,
  EvolutionChangeArea,
} from "@/types/history";

function milestone(
  kind: EvolutionMilestoneKind,
  area: EvolutionChangeArea,
  at: string,
  snapshotId: string,
  title: string,
  description: string,
): EvolutionMilestone {
  return {
    id: createId("emile"),
    at,
    kind,
    title,
    description,
    snapshotId,
    area,
  };
}

function nameSet(items: Array<{ name?: string; title?: string }>): Set<string> {
  return new Set(
    items
      .map((i) => (i.name ?? i.title ?? "").toLowerCase())
      .filter(Boolean),
  );
}

export function deriveMilestones(
  from: CompanySnapshot | null,
  to: CompanySnapshot,
): EvolutionMilestone[] {
  if (!from) {
    return [
      milestone(
        "baseline",
        "understanding",
        to.capturedAt,
        to.id,
        "Memoria evolutiva iniciada",
        "Se estableció la línea base del engagement de consultoría.",
      ),
    ];
  }

  const out: EvolutionMilestone[] = [];
  const at = to.capturedAt;
  const snapId = to.id;

  if (from.stage !== to.stage) {
    out.push(
      milestone(
        "stage_changed",
        "stage",
        at,
        snapId,
        "Cambio de etapa",
        `${formatStageLabel(from.stage)} → ${formatStageLabel(to.stage)}`,
      ),
    );
  }

  const uDelta = to.businessUnderstanding - from.businessUnderstanding;
  if (uDelta >= 5) {
    out.push(
      milestone(
        "understanding_up",
        "understanding",
        at,
        snapId,
        "Comprensión reforzada",
        `Comprensión del negocio: ${from.businessUnderstanding}% → ${to.businessUnderstanding}%`,
      ),
    );
  } else if (uDelta <= -5) {
    out.push(
      milestone(
        "understanding_down",
        "understanding",
        at,
        snapId,
        "Comprensión revisada a la baja",
        `Comprensión del negocio: ${from.businessUnderstanding}% → ${to.businessUnderstanding}%`,
      ),
    );
  }

  if (from.maturityOverall != null && to.maturityOverall != null) {
    const mDelta = to.maturityOverall - from.maturityOverall;
    if (mDelta >= 5) {
      out.push(
        milestone(
          "maturity_up",
          "maturity",
          at,
          snapId,
          "Madurez al alza",
          `Madurez: ${from.maturityOverall} → ${to.maturityOverall}`,
        ),
      );
    } else if (mDelta <= -5) {
      out.push(
        milestone(
          "maturity_down",
          "maturity",
          at,
          snapId,
          "Madurez a la baja",
          `Madurez: ${from.maturityOverall} → ${to.maturityOverall}`,
        ),
      );
    }
  }

  const fromMods = nameSet(from.modules);
  for (const mod of to.modules) {
    if (!fromMods.has(mod.name.toLowerCase())) {
      out.push(
        milestone(
          "module_added",
          "modules",
          at,
          snapId,
          "Módulo incorporado",
          moduleLabel(mod.name),
        ),
      );
    }
  }
  const toMods = nameSet(to.modules);
  for (const mod of from.modules) {
    if (!toMods.has(mod.name.toLowerCase())) {
      out.push(
        milestone(
          "module_removed",
          "modules",
          at,
          snapId,
          "Módulo retirado",
          moduleLabel(mod.name),
        ),
      );
    }
  }

  const fromProcs = new Set(
    from.processes.workflowNames.map((n) => n.toLowerCase()),
  );
  for (const name of to.processes.workflowNames) {
    if (!fromProcs.has(name.toLowerCase())) {
      out.push(
        milestone(
          "process_added",
          "processes",
          at,
          snapId,
          "Proceso añadido",
          name,
        ),
      );
    }
  }

  const fromRecs = new Set(
    from.recommendations.map((r) => r.title.toLowerCase()),
  );
  for (const rec of to.recommendations) {
    if (!fromRecs.has(rec.title.toLowerCase())) {
      out.push(
        milestone(
          "recommendation_added",
          "recommendations",
          at,
          snapId,
          "Recomendación nueva",
          rec.title,
        ),
      );
    }
  }

  if (to.roadmap.length > from.roadmap.length) {
    out.push(
      milestone(
        "roadmap_advanced",
        "roadmap",
        at,
        snapId,
        "Hoja de ruta avanzada",
        `${from.roadmap.length} → ${to.roadmap.length} fases`,
      ),
    );
  }

  const fromWork = new Set(from.completedWork.map((w) => w.toLowerCase()));
  for (const work of to.completedWork) {
    if (!fromWork.has(work.toLowerCase())) {
      out.push(
        milestone(
          "work_completed",
          "completed_work",
          at,
          snapId,
          "Trabajo completado",
          work,
        ),
      );
    }
  }

  const fromRisks = new Set(from.risks.map((r) => r.title.toLowerCase()));
  const toRisks = new Set(to.risks.map((r) => r.title.toLowerCase()));
  for (const risk of from.risks) {
    if (!toRisks.has(risk.title.toLowerCase())) {
      out.push(
        milestone(
          "risk_resolved",
          "risks",
          at,
          snapId,
          "Riesgo resuelto",
          risk.title,
        ),
      );
    }
  }
  for (const risk of to.risks) {
    if (!fromRisks.has(risk.title.toLowerCase())) {
      out.push(
        milestone(
          "risk_emerged",
          "risks",
          at,
          snapId,
          "Nuevo riesgo",
          risk.title,
        ),
      );
    }
  }

  return out;
}
