"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExplainedRecommendationCard } from "@/components/workspace/executive/explained-recommendation-card";
import { ConfidenceMeter } from "@/components/workspace/executive/confidence-meter";
import {
  ReadinessConflictList,
  ReadinessTopicList,
  StillLearningList,
} from "@/components/workspace/executive/readiness-panel";
import { SectionShell, type SectionTone } from "@/components/workspace/section-shell";
import {
  healthStatusLabel,
  maturityLabel,
  recommendationStrength,
  severityLabel,
} from "@/lib/presentation";
import type {
  ExecutiveCockpit,
  ExecutiveDashboardModel,
} from "@/lib/executive";
import type { ExplainedRecommendation } from "@/lib/explanations";
import type { ReadinessAssessment } from "@/lib/readiness";

/**
 * Mission 13 — Executive Dashboard Redesign. This is the consulting-briefing
 * body of the Dashboard tab: sections 2–8 of the fixed order (Business
 * Understanding → What We Keep Learning → Top 3 Priorities → Critical Risks →
 * Recent Discoveries → Roadmap Progress → Recommended Systems). Section 1
 * (Today's Focus) and section 9 (Upcoming Consultant Actions) live one level
 * up in `workspace-view.tsx`, where the page-level "what should I do next"
 * state already exists. Presentation/reorder only — every value below is
 * produced by an existing engine; nothing here is invented.
 *
 * Section 3 is the Consultant Readiness Engine's home on the Dashboard: the
 * concrete gaps between what we know and what we would need to advise with
 * confidence, in the client's language.
 */
export function ExecutiveDashboard({
  model,
  cockpit,
  readiness,
  explainedRecommendations = [],
  evidenceChips = [],
}: {
  model: ExecutiveDashboardModel;
  cockpit: ExecutiveCockpit;
  /** Consultant Readiness Engine assessment for this workspace. */
  readiness: ReadinessAssessment;
  explainedRecommendations?: ExplainedRecommendation[];
  /** Short Spanish evidence chips (e.g. "4 reuniones") for the understanding meter. */
  evidenceChips?: string[];
}) {
  const cockpitRecs = explainedRecommendations
    .filter((r) => r.priority === "now" || r.priority === "next")
    .slice(0, 3);

  const topPriorities = cockpit.priorities.slice(0, 3);

  return (
    <div className="space-y-16">
      {/* 2 · Business Understanding — progress */}
      <BriefingSection
        tone="health"
        kicker="2 · Comprensión del negocio"
        title="Qué tan bien entendemos el negocio"
        description={cockpit.dailySummary}
      >
        <Card className="border-[var(--isalwa-tint-teal-border)]/60 bg-white/85 px-6 py-6 shadow-none">
          <ConfidenceMeter
            value={model.businessUnderstanding}
            evidence={evidenceChips}
          />
          {/*
            Readiness narrative — extends the Mission 11 understanding
            sentence with which areas are already firm and which ones we are
            still learning, so the number is never the whole answer.
          */}
          <p className="mt-4 border-t border-[var(--isalwa-mist)]/60 pt-4 text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {readiness.narrative}
          </p>
        </Card>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Card className="border-[var(--isalwa-tint-blue-border)]/70 bg-white/85 px-5 py-5 shadow-[var(--isalwa-shadow-resting)]">
            <p className="isalwa-kicker isalwa-ink-blue">Salud del negocio</p>
            <p className="architect-serif mt-3 text-4xl text-[var(--isalwa-kiln)]">
              {cockpit.score.overall}
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{cockpit.score.label}</p>
            <div className="isalwa-risk-bar mt-4 !h-1.5">
              <motion.span
                className="!rounded-full bg-[var(--isalwa-info)]"
                initial={{ width: 0 }}
                animate={{ width: `${cockpit.score.overall}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </Card>
          <MetricTile
            label="Madurez operativa"
            value={maturityLabel(model.maturity, "percent")}
          />
          <MetricTile
            label="Calidad de la evidencia"
            value={
              model.consultingConfidence != null
                ? recommendationStrength(model.consultingConfidence).replace(
                    "Fortaleza de la recomendación: ",
                    "",
                  )
                : "—"
            }
            hint={
              model.consultingConfidence != null
                ? recommendationStrength(model.consultingConfidence)
                : undefined
            }
          />
        </div>

        {/* Secondary detail — department-level and dimension-level understanding. */}
        <div className="mt-8 space-y-6 border-t border-[var(--isalwa-mist)]/60 pt-6">
          <SecondarySubsection
            title="Salud por departamento"
            hint="Qué tan sólida se ve la operación de cada área, según la madurez y los problemas detectados en el diagnóstico."
          >
            {cockpit.departmentHealth.length === 0 ? (
              <EmptyHint />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cockpit.departmentHealth.map((dept) => (
                  <Card
                    key={dept.id}
                    className="border-[var(--isalwa-mist)]/70 bg-white/80 px-4 py-4 shadow-none"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                        {dept.name}
                      </p>
                      <p className="text-xs text-[var(--isalwa-slate)]/80">{dept.label}</p>
                    </div>
                    <p className="mt-2 text-2xl tabular-nums text-[var(--isalwa-kiln)]">
                      {dept.score != null ? dept.score : "—"}
                    </p>
                    {dept.evidence[0] ? (
                      <p className="mt-2 line-clamp-2 text-xs text-[var(--isalwa-slate)]/80">
                        {dept.evidence[0]}
                      </p>
                    ) : null}
                  </Card>
                ))}
              </div>
            )}
          </SecondarySubsection>

          <SecondarySubsection
            title="Qué entendemos de cada área"
            hint="Dónde ya podemos recomendar con seguridad y dónde seguimos aprendiendo."
          >
            <ReadinessTopicList topics={readiness.topics} />
          </SecondarySubsection>

          {cockpit.businessHealth.gauges.length > 0 ? (
            <SecondarySubsection
              title="Indicadores de salud"
              hint="Salud relativa de cada área del negocio — Saludable, Requiere atención o Crítico."
            >
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {cockpit.businessHealth.gauges.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-[var(--isalwa-tint-green-border)]/60 bg-white/70 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                      {g.label}
                    </p>
                    <p className="mt-1 text-lg text-[var(--isalwa-kiln)]">
                      {healthStatusLabel(g.score)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-[var(--isalwa-slate)]/80">
                Lectura consultiva: {cockpit.businessHealth.label}
              </p>
            </SecondarySubsection>
          ) : null}
        </div>
      </BriefingSection>

      {/* 3 · What We Keep Learning — the Consultant Readiness Engine. */}
      <BriefingSection
        tone="problems"
        kicker="3 · Qué seguimos aprendiendo"
        title="Lo que todavía necesitamos entender"
        description={readiness.advice.detail}
      >
        <StillLearningList assessment={readiness} />

        <div className="mt-6 rounded-2xl border border-[var(--isalwa-mist)]/70 bg-white/70 px-5 py-4">
          <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
            {readiness.advice.headline}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--isalwa-slate)]/85">
            {readiness.advice.nextStep}
          </p>
        </div>

        <ReadinessConflictList assessment={readiness} />
      </BriefingSection>

      {/* 4 · Top 3 Priorities */}
      <BriefingSection
        tone="executive"
        kicker="4 · Prioridades principales"
        title="Las 3 prioridades que más importan hoy"
        description="Lo que conviene resolver primero, ordenado por urgencia."
      >
        {cockpitRecs.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {cockpitRecs.map((rec, i) => (
              <ExplainedRecommendationCard
                key={rec.id}
                explained={rec}
                index={i}
                compact
              />
            ))}
          </div>
        ) : (
          <CockpitList
            items={topPriorities.map((p) => ({
              id: p.id,
              primary: p.title,
              meta: urgencyLabel(p.urgency),
              secondary: p.rationale,
            }))}
          />
        )}

        {/* Secondary — quick wins and strategic opportunities support the priorities above without competing with them. */}
        {cockpit.quickWins.length > 0 || cockpit.strategicOpportunities.length > 0 ? (
          <div className="mt-8 grid gap-6 border-t border-[var(--isalwa-mist)]/60 pt-6 sm:grid-cols-2">
            <SecondarySubsection title="Victorias rápidas">
              <CockpitList
                items={cockpit.quickWins.map((w) => ({
                  id: w.id,
                  primary: w.title,
                  meta: w.horizon,
                  secondary: w.rationale,
                }))}
              />
            </SecondarySubsection>
            <SecondarySubsection title="Oportunidades estratégicas">
              <CockpitList
                items={cockpit.strategicOpportunities.map((o) => ({
                  id: o.id,
                  primary: o.title,
                  meta: o.horizon,
                  secondary: o.rationale,
                }))}
              />
            </SecondarySubsection>
          </div>
        ) : null}
      </BriefingSection>

      {/* 5 · Critical Risks */}
      <BriefingSection
        tone="risks"
        kicker="5 · Riesgos críticos"
        title="Lo que más nos preocupa"
        description="Riesgos abiertos que todavía no tienen mitigación confirmada."
      >
        <CockpitList
          items={cockpit.openRisks.map((r) => ({
            id: r.id,
            primary: r.title,
            meta: severityLabel(r.severity),
            secondary: r.detail,
          }))}
        />
      </BriefingSection>

      {/* 6 · Recent Discoveries */}
      <BriefingSection
        tone="problems"
        kicker="6 · Descubrimientos recientes"
        title="Lo que aprendimos últimamente"
        description="Hallazgos nuevos, tal como quedaron registrados en el expediente."
      >
        <CockpitList
          items={cockpit.recentDiscoveries.map((d) => ({
            id: d.id,
            primary: d.title,
            meta: d.date ? formatShortDate(d.date) : null,
            secondary: d.detail,
          }))}
        />
      </BriefingSection>

      {/* 7 · Roadmap Progress */}
      <BriefingSection
        tone="blueprint"
        kicker="7 · Avance de la hoja de ruta"
        title="Hacia dónde vamos"
        description={cockpit.roadmap.summary}
      >
        <ProgressCard
          title="Avance de la hoja de ruta"
          score={cockpit.roadmap.percent}
          label={
            cockpit.roadmap.totalPhases > 0
              ? `${cockpit.roadmap.totalPhases} fases`
              : cockpit.roadmap.summary
          }
          detail={null}
        />
        {cockpit.roadmap.phases.length > 0 ? (
          <ol className="mt-6 space-y-3">
            {cockpit.roadmap.phases.map((phase) => (
              <li
                key={`${phase.phase}-${phase.name}`}
                className="flex items-start gap-3 text-sm"
              >
                <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-[var(--isalwa-slate)]/60">
                  Fase {phase.phase}
                </span>
                <div>
                  <p className="text-[var(--isalwa-kiln)]">{phase.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--isalwa-slate)]/80">
                    {phase.status === "designed"
                      ? "Enfoque inmediato"
                      : "Planificada"}
                    {phase.modules.length > 0
                      ? ` · ${phase.modules.slice(0, 3).join(" · ")}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-6 text-sm text-[var(--isalwa-slate)]/60">
            Las fases aparecerán cuando el sistema recomendado tome forma.
          </p>
        )}
      </BriefingSection>

      {/* 8 · Recommended Systems */}
      <BriefingSection
        tone="processes"
        kicker="8 · Sistemas recomendados"
        title="Qué deberíamos implementar"
        description="Áreas de inversión sugeridas a partir de la evidencia reunida."
      >
        {model.investmentAreas.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {model.investmentAreas.map((area) => (
              <li
                key={area}
                className="isalwa-surface-green rounded-full px-4 py-2 text-sm text-[var(--isalwa-kiln)]"
              >
                {area}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyHint text="Las recomendaciones de sistemas aparecen cuando el diseño toma forma." />
        )}

        <div className="mt-8 grid gap-3 border-t border-[var(--isalwa-mist)]/60 pt-6 sm:grid-cols-2">
          <ProgressCard
            title="Avance de automatización"
            score={cockpit.automation.score}
            label={cockpit.automation.label}
            detail={
              cockpit.automation.candidateCount > 0
                ? `${cockpit.automation.candidateCount} candidato${cockpit.automation.candidateCount === 1 ? "" : "s"}`
                : cockpit.automation.highlights[0] ?? null
            }
          />
          <ProgressCard
            title="Preparación para IA"
            score={cockpit.aiReadiness.score}
            label={cockpit.aiReadiness.label}
            detail={cockpit.aiReadiness.blockers[0] ?? null}
          />
        </div>
      </BriefingSection>
    </div>
  );
}

function BriefingSection({
  tone,
  kicker,
  title,
  description,
  children,
}: {
  tone: SectionTone;
  kicker: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <SectionShell
      tone={tone}
      kicker={kicker}
      title={title}
      description={description}
      className="sm:px-7 sm:py-8"
    >
      {children}
    </SectionShell>
  );
}

function SecondarySubsection({
  title,
  hint,
  children,
}: {
  title: string;
  /** One-line plain-language explanation of what this metric means. */
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {title}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]/70">{hint}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {label}
      </p>
      <p className="mt-2 text-lg leading-snug text-[var(--isalwa-kiln)]">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--isalwa-slate)]/60">{hint}</p>
      ) : null}
    </Card>
  );
}

function EmptyHint({ text }: { text?: string }) {
  return (
    <p className="text-sm text-[var(--isalwa-slate)]/60">
      {text ?? "Aparecerá a medida que crezca la evidencia…"}
    </p>
  );
}

function CockpitList({
  items,
}: {
  items: Array<{
    id: string;
    primary: string;
    meta: string | null;
    secondary: string | null | undefined;
  }>;
}) {
  if (items.length === 0) return <EmptyHint />;
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="text-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[var(--isalwa-slate)]">{item.primary}</p>
            {item.meta ? (
              <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--isalwa-slate)]/60">
                {item.meta}
              </span>
            ) : null}
          </div>
          {item.secondary ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
              {item.secondary}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ProgressCard({
  title,
  score,
  label,
  detail,
}: {
  title: string;
  score: number | null;
  label: string;
  detail: string | null;
}) {
  return (
    <Card className="border-[var(--isalwa-mist)]/70 bg-white/80 px-5 py-4 shadow-none">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
        {title}
      </p>
      <p className="mt-2 text-2xl tabular-nums text-[var(--isalwa-kiln)]">
        {score != null ? score : "—"}
      </p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{label}</p>
      {detail ? (
        <p className="mt-2 line-clamp-2 text-xs text-[var(--isalwa-slate)]/80">{detail}</p>
      ) : null}
    </Card>
  );
}

function urgencyLabel(u: "now" | "next" | "later"): string {
  switch (u) {
    case "now":
      return "Ahora";
    case "next":
      return "Siguiente";
    default:
      return "Más adelante";
  }
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("es", {
    day: "numeric",
    month: "short",
  });
}
