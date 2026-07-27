"use client";

import { Card } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import { formatTimelineDate } from "@/lib/timeline";
import {
  compareSnapshots,
  getSinceLastVisitComparison,
  sortEvolutionTimeline,
} from "@/lib/history";
import {
  evolutionKindLabel,
  maturityLabel,
  understandingLevel,
} from "@/lib/presentation";
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
  const { t } = useTranslations();
  if (!history || history.snapshots.length === 0) {
    return (
      <Card className="border-[var(--isalwa-tint-green-border)]/50 bg-white/80 px-5 py-5 shadow-none">
        <p className="text-sm text-[var(--isalwa-slate)]">
          {t("companyEvolutionPanel.empty")}
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
      <Card className="border-[var(--isalwa-tint-green-border)]/50 bg-white/80 px-5 py-6 shadow-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
          {t("companyEvolutionPanel.kicker")}
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-[var(--isalwa-kiln)]">
          {t("companyEvolutionPanel.title")}
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {t("companyEvolutionPanel.summary", {
            snapshots: history.snapshots.length,
            captureWord: t(
              history.snapshots.length === 1
                ? "companyEvolutionPanel.captureOne"
                : "companyEvolutionPanel.captureMany",
            ),
            milestones: history.milestones.length,
            milestoneWord: t(
              history.milestones.length === 1
                ? "companyEvolutionPanel.milestoneOne"
                : "companyEvolutionPanel.milestoneMany",
            ),
          })}
        </p>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label={t("companyEvolutionPanel.understanding")}
            value={`${latest.businessUnderstanding}% · ${understandingLevel(latest.businessUnderstanding).toLowerCase()}`}
          />
          <Stat
            label={t("companyEvolutionPanel.maturity")}
            value={maturityLabel(latest.maturityOverall, "percent")}
          />
          <Stat
            label={t("companyEvolutionPanel.lastVisit")}
            value={
              history.lastVisitAt
                ? formatTimelineDate(history.lastVisitAt)
                : "—"
            }
          />
        </dl>
      </Card>

      <ChangeSection
        title={t("companyEvolutionPanel.whatChanged.title")}
        description={t("companyEvolutionPanel.whatChanged.description")}
        items={vsPrevious.whatChanged}
        empty={t("companyEvolutionPanel.whatChanged.empty")}
      />

      <ChangeSection
        title={t("companyEvolutionPanel.sinceLastVisit.title")}
        description={t("companyEvolutionPanel.sinceLastVisit.description")}
        items={sinceLastVisit.whatChanged}
        empty={t("companyEvolutionPanel.sinceLastVisit.empty")}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChangeSection
          title={t("companyEvolutionPanel.progress.title")}
          description={t("companyEvolutionPanel.progress.description")}
          items={mergeUnique(vsPrevious.progress, sinceLastVisit.progress)}
          empty={t("companyEvolutionPanel.progress.empty")}
          tone="progress"
        />
        <ChangeSection
          title={t("companyEvolutionPanel.regression.title")}
          description={t("companyEvolutionPanel.regression.description")}
          items={mergeUnique(vsPrevious.regression, sinceLastVisit.regression)}
          empty={t("companyEvolutionPanel.regression.empty")}
          tone="regression"
        />
      </div>

      <ChangeSection
        title={t("companyEvolutionPanel.futureFocus.title")}
        description={t("companyEvolutionPanel.futureFocus.description")}
        items={sinceLastVisit.futureFocus}
        empty={t("companyEvolutionPanel.futureFocus.empty")}
        tone="focus"
      />

      <Card className="border-[var(--isalwa-mist)]/70 bg-white/70 px-5 py-5 shadow-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
          {t("companyEvolutionPanel.timelineKicker")}
        </p>
        {timeline.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
            {t("companyEvolutionPanel.timelineEmpty")}
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
    <div className="rounded-2xl border border-[var(--isalwa-tint-green-border)]/60 bg-[var(--isalwa-tint-green)]/40 px-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
        {label}
      </dt>
      <dd className="mt-1 text-lg text-[var(--isalwa-kiln)]">{value}</dd>
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
      ? "border-[var(--isalwa-tint-green-border)]/60"
      : tone === "regression"
        ? "border-[var(--isalwa-tint-red-border)]/60"
        : tone === "focus"
          ? "border-[var(--isalwa-tint-blue-border)]/60"
          : "border-[var(--isalwa-mist)]/70";

  return (
    <Card className={`bg-white/80 px-5 py-5 shadow-none ${border}`}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {title}
      </p>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">{description}</p>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--isalwa-slate)]">{empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((change) => (
            <li key={change.id} className="text-sm leading-relaxed">
              <span className="text-[var(--isalwa-kiln)]">{change.title}</span>
              <span className="text-[var(--isalwa-slate)]/60"> · </span>
              <span className="text-[var(--isalwa-slate)]">{change.description}</span>
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
      ? "bg-[var(--isalwa-success)]"
      : entry.polarity === "regression"
        ? "bg-[var(--isalwa-danger)]"
        : entry.polarity === "focus"
          ? "bg-[var(--isalwa-info)]"
          : "bg-[var(--isalwa-slate)]/60";

  return (
    <li className="relative pl-6">
      <span className={`absolute left-0 top-2 h-1.5 w-1.5 rounded-full ${dot}`} />
      <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {formatTimelineDate(entry.at)} · {evolutionKindLabel(entry.kind)}
      </p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{entry.title}</p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">{entry.description}</p>
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
