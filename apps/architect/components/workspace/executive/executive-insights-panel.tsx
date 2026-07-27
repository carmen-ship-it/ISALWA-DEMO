"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Clock,
  Compass,
  Eye,
  Network,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ExecutiveDetail } from "@/components/workspace/executive-detail";
import { useTranslations } from "@/lib/i18n";
import { formatTimelineDate } from "@/lib/timeline";
import { cn } from "@/lib/utils";
import type {
  BusinessDnaTrait,
  ExecutiveInsights,
  InsightEvidence,
} from "@/lib/insights";

const STRENGTH_DOT: Record<BusinessDnaTrait["strength"], string> = {
  alta: "bg-[var(--isalwa-success)]",
  media: "bg-[var(--isalwa-warning)]",
  baja: "bg-[var(--isalwa-danger)]",
  emergente: "bg-[var(--isalwa-slate)]/40",
};

const RISK_DOT: Record<"alta" | "media" | "baja", string> = {
  alta: "bg-[var(--isalwa-danger)]",
  media: "bg-[var(--isalwa-warning)]",
  baja: "bg-[var(--isalwa-success)]",
};

function GroupHeader({
  icon: Icon,
  kicker,
  title,
  description,
}: {
  icon: LucideIcon;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--isalwa-kiln)] text-white shadow-sm">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--isalwa-slate)]/80">
          {kicker}
        </p>
        <h3 className="architect-serif mt-1.5 text-2xl leading-tight text-[var(--isalwa-kiln)]">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {description}
        </p>
      </div>
    </div>
  );
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 rounded-2xl border border-dashed border-[var(--isalwa-mist)] bg-white/60 px-4 py-3 text-sm text-[var(--isalwa-slate)]/80">
      {children}
    </p>
  );
}

function EvidenceList({ evidence }: { evidence: InsightEvidence[] }) {
  if (evidence.length === 0) return null;
  return (
    <ul className="mt-3 space-y-1.5">
      {evidence.map((item, i) => (
        <li key={`${item.kind}-${item.id}-${i}`} className="text-sm text-[var(--isalwa-slate)]">
          <span className="text-[var(--isalwa-slate)]/60">— </span>
          {item.quote ?? item.label}
        </li>
      ))}
    </ul>
  );
}

export function ExecutiveInsightsPanel({
  insights,
}: {
  insights: ExecutiveInsights;
}) {
  const { t } = useTranslations();
  if (insights.isEarlyStage) {
    return (
      <Card className="px-6 py-8 text-center">
        <p className="architect-serif text-2xl text-[var(--isalwa-kiln)]">
          {t("executiveInsightsPanel.earlyStageTitle")}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {t("executiveInsightsPanel.earlyStageDescription")}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Business DNA */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Brain}
          kicker={t("executiveInsightsPanel.dna.kicker")}
          title={t("executiveInsightsPanel.dna.title")}
          description={t("executiveInsightsPanel.dna.description")}
        />
        {insights.businessDna.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.dna.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {insights.businessDna.map((trait) => (
              <div
                key={trait.id}
                className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {trait.label}
                  </p>
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        STRENGTH_DOT[trait.strength],
                      )}
                      aria-hidden
                    />
                    {t(`executiveInsightsPanel.strength.${trait.strength}`)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  {trait.observation}
                </p>
                <EvidenceList evidence={trait.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 2. Business Blind Spots */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Eye}
          kicker={t("executiveInsightsPanel.blindSpots.kicker")}
          title={t("executiveInsightsPanel.blindSpots.title")}
          description={t("executiveInsightsPanel.blindSpots.description")}
        />
        {insights.blindSpots.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.blindSpots.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.blindSpots.map((spot) => (
              <div
                key={spot.id}
                className="rounded-2xl border border-[var(--isalwa-tint-violet-border)]/80 bg-[var(--isalwa-tint-violet)]/40 px-4 py-4"
              >
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{spot.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  {spot.observation}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.1em] text-[var(--isalwa-slate)]/60">
                  {t("executiveInsightsPanel.blindSpots.whyItMatters")}
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{spot.whyItMatters}</p>
                <EvidenceList evidence={spot.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 3. Who Should We Talk To Next */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Users}
          kicker={t("executiveInsightsPanel.nextConversations.kicker")}
          title={t("executiveInsightsPanel.nextConversations.title")}
          description={t("executiveInsightsPanel.nextConversations.description")}
        />
        {insights.nextConversations.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.nextConversations.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.nextConversations.map((next) => (
              <div
                key={next.id}
                className="rounded-2xl border border-[var(--isalwa-tint-blue-border)]/80 bg-[var(--isalwa-tint-blue)]/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {next.personName ?? next.roleHint}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/80">
                    {t("executiveInsightsPanel.nextConversations.infoGain", {
                      label: next.infoGainLabel,
                    })}
                  </span>
                </div>
                {next.departmentHint ? (
                  <p className="mt-0.5 text-xs text-[var(--isalwa-slate)]/80">
                    {next.departmentHint}
                  </p>
                ) : null}
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  {next.reason}
                </p>
                <EvidenceList evidence={next.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 4. Three Things That Surprised Us */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Sparkles}
          kicker={t("executiveInsightsPanel.surprises.kicker")}
          title={t("executiveInsightsPanel.surprises.title")}
          description={t("executiveInsightsPanel.surprises.description")}
        />
        {insights.surprises.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.surprises.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {insights.surprises.map((surprise, i) => (
              <div
                key={surprise.id}
                className="rounded-2xl border border-[var(--isalwa-tint-amber-border)]/80 bg-[var(--isalwa-tint-amber)]/40 px-4 py-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-tint-amber-ink)]">
                  {t("executiveInsightsPanel.surprises.findingNumber", { number: i + 1 })}
                </p>
                <p className="mt-1.5 text-sm font-medium text-[var(--isalwa-kiln)]">
                  {surprise.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  {surprise.narrative}
                </p>
                <EvidenceList evidence={surprise.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 5. Institutional Memory */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Network}
          kicker={t("executiveInsightsPanel.institutionalMemory.kicker")}
          title={t("executiveInsightsPanel.institutionalMemory.title")}
          description={t("executiveInsightsPanel.institutionalMemory.description")}
        />
        {insights.institutionalMemory.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.institutionalMemory.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-4">
            {insights.institutionalMemory.map((entry) => (
              <ExecutiveDetail
                key={entry.id}
                summary={
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {entry.recommendationTitle}
                  </p>
                }
                labelExpand={t("executiveInsightsPanel.institutionalMemory.expand")}
                labelCollapse={t("executiveInsightsPanel.institutionalMemory.collapse")}
                className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-4"
              >
                <div className="space-y-3">
                  {entry.whyWeBelieve.map((line, i) => (
                    <p key={i} className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
                      {line}
                    </p>
                  ))}
                  {entry.evidenceQuotes.length > 0 ? (
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                        {t("executiveInsightsPanel.institutionalMemory.evidenceLabel")}
                      </p>
                      <ul className="mt-1.5 space-y-1">
                        {entry.evidenceQuotes.map((q, i) => (
                          <li key={i} className="text-sm text-[var(--isalwa-slate)]">
                            — {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 pt-2">
                    {entry.chain.map((step, i) => (
                      <span key={step.id} className="flex items-center gap-2">
                        <span className="rounded-full bg-[var(--isalwa-mist)] px-3 py-1 text-[11px] text-[var(--isalwa-slate)]">
                          {step.label} · {step.count}
                        </span>
                        {i < entry.chain.length - 1 ? (
                          <span className="text-[var(--isalwa-slate)]/40" aria-hidden>
                            →
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              </ExecutiveDetail>
            ))}
          </div>
        )}
      </Card>

      {/* 6. Business Evolution */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={TrendingUp}
          kicker={t("executiveInsightsPanel.evolution.kicker")}
          title={t("executiveInsightsPanel.evolution.title")}
          description={t("executiveInsightsPanel.evolution.description")}
        />
        <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {insights.businessEvolution.narrative}
        </p>
        {insights.businessEvolution.moments.length > 0 ? (
          <ol className="mt-4 space-y-3 border-l border-[var(--isalwa-mist)] pl-4">
            {insights.businessEvolution.moments.map((moment) => (
              <li key={moment.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 h-2 w-2 rounded-full",
                    moment.polarity === "progress"
                      ? "bg-[var(--isalwa-success)]"
                      : moment.polarity === "regression"
                        ? "bg-[var(--isalwa-danger)]"
                        : "bg-[var(--isalwa-slate)]/40",
                  )}
                  aria-hidden
                />
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                  {formatTimelineDate(moment.at)}
                </p>
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{moment.title}</p>
                <p className="text-sm text-[var(--isalwa-slate)]">{moment.description}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </Card>

      {/* 7. Future Readiness */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Compass}
          kicker={t("executiveInsightsPanel.futureReadiness.kicker")}
          title={t("executiveInsightsPanel.futureReadiness.title")}
          description={t("executiveInsightsPanel.futureReadiness.description")}
        />
        {insights.futureReadiness.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.futureReadiness.empty")}
          </EmptyNote>
        ) : (
          <div className="mt-5 space-y-3">
            {insights.futureReadiness.map((prediction) => (
              <div
                key={prediction.id}
                className="rounded-2xl border border-[var(--isalwa-tint-amber-border)]/80 bg-[var(--isalwa-tint-amber)]/40 px-4 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {prediction.struggle}
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/80">
                    {prediction.horizon}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                  <span className="text-[var(--isalwa-slate)]/60">
                    {t("executiveInsightsPanel.futureReadiness.whyPrefix")}
                  </span>
                  {prediction.why}
                </p>
                <EvidenceList evidence={prediction.evidence} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 8. Knowledge Concentration */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Network}
          kicker={t("executiveInsightsPanel.knowledgeConcentration.kicker")}
          title={t("executiveInsightsPanel.knowledgeConcentration.title")}
          description={t("executiveInsightsPanel.knowledgeConcentration.description")}
        />
        <p className="mt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {insights.knowledgeConcentration.headline}
        </p>
        {insights.knowledgeConcentration.nodes.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {insights.knowledgeConcentration.nodes.map((node) => (
              <div
                key={node.id}
                className="rounded-2xl border border-[var(--isalwa-mist)]/80 bg-white/70 px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    {node.kind === "sin_dueño_claro"
                      ? t("executiveInsightsPanel.knowledgeConcentration.noOwner", {
                          holder: node.holder,
                        })
                      : node.holder}
                  </p>
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.1em] text-[var(--isalwa-slate)]/60">
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", RISK_DOT[node.concentrationRisk])}
                      aria-hidden
                    />
                    {t(`executiveInsightsPanel.risk.${node.concentrationRisk}`)}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]">
                  {node.knowledgeAreas.join(" · ")}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>

      {/* 9. Business Intelligence Timeline */}
      <Card className="px-5 py-6 sm:px-7 sm:py-7">
        <GroupHeader
          icon={Clock}
          kicker={t("executiveInsightsPanel.learnedTimeline.kicker")}
          title={t("executiveInsightsPanel.learnedTimeline.title")}
          description={t("executiveInsightsPanel.learnedTimeline.description")}
        />
        {insights.learnedTimeline.length === 0 ? (
          <EmptyNote>
            {t("executiveInsightsPanel.learnedTimeline.empty")}
          </EmptyNote>
        ) : (
          <ol className="mt-4 space-y-3">
            {insights.learnedTimeline.map((entry, i) => (
              <li key={entry.id}>
                <div className="flex items-baseline gap-3">
                  <p className="w-20 shrink-0 text-[11px] uppercase tracking-[0.1em] text-[var(--isalwa-slate)]/60">
                    {formatTimelineDate(entry.at)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                      {t("executiveInsightsPanel.learnedTimeline.learnedPrefix", {
                        headline: entry.headline,
                      })}
                    </p>
                    <p className="text-sm text-[var(--isalwa-slate)]">{entry.detail}</p>
                  </div>
                </div>
                {i < insights.learnedTimeline.length - 1 ? (
                  <Separator className="mt-3" />
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
