"use client";

import { Card } from "@/components/ui/card";
import { formatTimelineDate } from "@/lib/timeline";
import {
  compareSnapshots,
  getSinceLastVisitComparison,
  sortEvolutionTimeline,
} from "@/lib/history";
import type {
  CompanyEvolutionHistory,
  EvolutionChangeItem,
  EvolutionChangePolarity,
  EvolutionTimelineEntry,
} from "@/types/history";

export function CompanyEvolutionPanel({
  history,
}: {
  history: CompanyEvolutionHistory | null | undefined;
}) {
  if (!history || history.snapshots.length === 0) {
    return (
      <Card className="border-emerald-100/50 bg-white/80 px-5 py-5 shadow-none">
        <p className="text-sm text-neutral-600">
          La evolución de la empresa aparece cuando Architect captura el estado
          del engagement. Cada visita conserva la historia — nada se sobrescribe.
        </p>
      </Card>
    );
  }

  const latest = history.snapshots[history.snapshots.length - 1]!;
  const previous =
    history.snapshots.length >= 2
      ? history.snapshots[history.snapshots.length - 2]!
      : null;
  const sinceLastVisit =
    getSinceLastVisitComparison(history) ??
    compareSnapshots(previous, latest);
  const vsPrevious = compareSnapshots(previous, latest);
  const timeline = sortEvolutionTimeline(history.timeline).slice(0, 10);

  return (
    <div className="space-y-5">
      <Card className="border-emerald-100/50 bg-white/80 px-5 py-6 shadow-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Memoria continua
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Relación de consultoría en el tiempo
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          {history.snapshots.length} captura
          {history.snapshots.length === 1 ? "" : "s"} ·{" "}
          {history.milestones.length} hito
          {history.milestones.length === 1 ? "" : "s"} · solo lectura ·
          historial acumulativo
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Comprensión"
            value={`${latest.businessUnderstanding}%`}
          />
          <Stat
            label="Madurez"
            value={
              latest.maturityOverall != null
                ? String(latest.maturityOverall)
                : "—"
            }
          />
          <Stat
            label="Última visita"
            value={
              history.lastVisitAt
                ? formatTimelineDate(history.lastVisitAt)
                : "—"
            }
          />
        </dl>
      </Card>

      <ChangeSection
        title="Qué cambió"
        description="Diferencias materiales respecto a la captura anterior."
        items={vsPrevious.whatChanged}
        empty="Sin cambios materiales entre capturas."
      />

      <ChangeSection
        title="Desde la última visita"
        description="Lo que evolucionó desde que dejó el espacio de trabajo."
        items={sinceLastVisit.whatChanged}
        empty="Primera visita o sin cambios desde la última sesión."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChangeSection
          title="Progreso"
          description="Avances en madurez, módulos, procesos y riesgos resueltos."
          items={mergeUnique(vsPrevious.progress, sinceLastVisit.progress)}
          empty="Aún no hay señales de progreso nuevas."
          tone="progress"
        />
        <ChangeSection
          title="Regresión"
          description="Señales que requieren atención — riesgos nuevos o retrocesos."
          items={mergeUnique(vsPrevious.regression, sinceLastVisit.regression)}
          empty="Sin regresiones detectadas."
          tone="regression"
        />
      </div>

      <ChangeSection
        title="Enfoque futuro"
        description="Prioridades inmediatas, riesgos a vigilar y siguiente fase."
        items={sinceLastVisit.futureFocus}
        empty="Continuar el descubrimiento con liderazgo."
        tone="focus"
      />

      <Card className="border-neutral-200/70 bg-white/70 px-5 py-5 shadow-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
          Línea de tiempo evolutiva
        </p>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">
            Los hitos aparecerán cuando el estado del engagement cambie.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {timeline.map((entry) => (
              <TimelineRow key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-emerald-100/60 bg-emerald-50/40 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-neutral-400">
        {label}
      </dt>
      <dd className="mt-1 text-lg text-neutral-950">{value}</dd>
    </div>
  );
}

function ChangeSection({
  title,
  description,
  items,
  empty,
  tone = "neutral",
}: {
  title: string;
  description: string;
  items: EvolutionChangeItem[];
  empty: string;
  tone?: EvolutionChangePolarity | "neutral";
}) {
  const border =
    tone === "progress"
      ? "border-emerald-100/60"
      : tone === "regression"
        ? "border-rose-100/60"
        : tone === "focus"
          ? "border-sky-100/60"
          : "border-neutral-200/70";

  return (
    <Card className={`bg-white/80 px-5 py-5 shadow-none ${border}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <p className="mt-2 text-sm text-neutral-500">{description}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((change) => (
            <li key={change.id} className="text-sm leading-relaxed">
              <span className="text-neutral-950">{change.title}</span>
              <span className="text-neutral-400"> · </span>
              <span className="text-neutral-600">{change.description}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TimelineRow({ entry }: { entry: EvolutionTimelineEntry }) {
  const dot =
    entry.polarity === "progress"
      ? "bg-emerald-500"
      : entry.polarity === "regression"
        ? "bg-rose-400"
        : entry.polarity === "focus"
          ? "bg-sky-500"
          : "bg-neutral-400";

  return (
    <li className="relative pl-6">
      <span className={`absolute left-0 top-2 h-1.5 w-1.5 rounded-full ${dot}`} />
      <p className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
        {formatTimelineDate(entry.at)} · {entry.kind.replace(/_/g, " ")}
      </p>
      <p className="mt-1 text-neutral-950">{entry.title}</p>
      <p className="mt-1 text-sm text-neutral-500">{entry.description}</p>
    </li>
  );
}

function mergeUnique(
  a: EvolutionChangeItem[],
  b: EvolutionChangeItem[],
): EvolutionChangeItem[] {
  const seen = new Set<string>();
  const out: EvolutionChangeItem[] = [];
  for (const item of [...a, ...b]) {
    const key = `${item.area}:${item.title}:${item.description}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
