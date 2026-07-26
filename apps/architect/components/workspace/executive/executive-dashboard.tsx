"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { ExplainedRecommendationCard } from "@/components/workspace/executive/explained-recommendation-card";
import { SectionShell } from "@/components/workspace/section-shell";
import {
  maturityLabel,
  recommendationStrength,
  riskLevelLabel,
  understandingLevel,
  understandingSentence,
} from "@/lib/presentation";
import type {
  ExecutiveCockpit,
  ExecutiveDashboardModel,
} from "@/lib/executive";
import type { ExplainedRecommendation } from "@/lib/explanations";

export function ExecutiveDashboard({
  model,
  cockpit,
  explainedRecommendations = [],
}: {
  model: ExecutiveDashboardModel;
  cockpit: ExecutiveCockpit;
  explainedRecommendations?: ExplainedRecommendation[];
}) {
  const understanding = understandingLevel(model.businessUnderstanding);
  const nextStep =
    model.executiveRecommendation ??
    model.priorities[0] ??
    cockpit.priorities[0]?.title ??
    "Continuar el descubrimiento para afinar prioridades.";
  const impact =
    model.topOpportunities[0] ??
    model.quickWins[0] ??
    cockpit.strategicOpportunities[0]?.title ??
    "El impacto se aclarará cuando las recomendaciones se consoliden.";
  const systems =
    model.investmentAreas.length > 0
      ? model.investmentAreas.slice(0, 4)
      : [];
  const riskHint = riskLevelLabel(model.riskLevel);

  const cockpitRecs = explainedRecommendations
    .filter((r) => r.priority === "now" || r.priority === "next")
    .slice(0, 4);


  const answers: Array<{
    question: string;
    answer: string;
    tone: "executive" | "health" | "risks" | "blueprint";
    detail?: string;
  }> = [
    {
      question: "¿Qué tan bien entendemos el negocio?",
      answer: understanding,
      detail: understandingSentence(model.businessUnderstanding),
      tone: "executive",
    },
    {
      question: "¿Cuál es el mayor riesgo?",
      answer: model.topRisk ?? "Aún no aparece un riesgo crítico",
      detail: riskHint || undefined,
      tone: "risks",
    },
    {
      question: "¿Cuáles son las prioridades?",
      answer:
        model.priorities.length > 0
          ? model.priorities.slice(0, 3).join(" · ")
          : cockpit.priorities.length > 0
            ? cockpit.priorities
                .slice(0, 3)
                .map((p) => p.title)
                .join(" · ")
            : "Las prioridades aparecen a medida que crece la evidencia",
      tone: "executive",
    },
    {
      question: "¿Qué debe pasar ahora?",
      answer: nextStep,
      tone: "health",
    },
    {
      question: "¿Qué sistemas recomendamos?",
      answer:
        systems.length > 0
          ? systems.join(" · ")
          : "Las recomendaciones de sistemas aparecen cuando el diseño toma forma",
      tone: "blueprint",
    },
    {
      question: "¿Qué impacto esperamos?",
      answer: impact,
      tone: "health",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Cabina ejecutiva
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Claridad para decidir.
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          {cockpit.dailySummary}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-sky-100/70 bg-white/85 px-5 py-5 shadow-none sm:col-span-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
            Salud del negocio
          </p>
          <p className="architect-serif mt-3 text-4xl text-neutral-950">
            {cockpit.score.overall}
          </p>
          <p className="mt-1 text-sm text-neutral-600">{cockpit.score.label}</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-neutral-100">
            <motion.div
              className="h-full rounded-full bg-sky-500/80"
              initial={{ width: 0 }}
              animate={{ width: `${cockpit.score.overall}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </Card>
        <MetricTile
          label="Madurez operativa"
          value={maturityLabel(model.maturity)}
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

      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Resumen en 30 segundos
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {answers.map((item, i) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * i, duration: 0.35 }}
            >
              <SectionShell
                tone={item.tone}
                className="h-full px-5 py-4 sm:px-5 sm:py-4"
              >
                <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
                  {item.question}
                </p>
                <p className="mt-2 text-base leading-snug text-neutral-950">
                  {item.answer}
                </p>
                {item.detail ? (
                  <p className="mt-2 text-xs leading-relaxed text-neutral-500">
                    {item.detail}
                  </p>
                ) : null}
              </SectionShell>
            </motion.div>
          ))}
        </div>
      </div>

      <CockpitSection title="Salud por departamento">
        {cockpit.departmentHealth.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cockpit.departmentHealth.map((dept) => (
              <Card
                key={dept.id}
                className="border-neutral-200/70 bg-white/80 px-4 py-4 shadow-none"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900">
                    {dept.name}
                  </p>
                  <p className="text-xs text-neutral-500">{dept.label}</p>
                </div>
                <p className="mt-2 text-2xl tabular-nums text-neutral-950">
                  {dept.score != null ? dept.score : "—"}
                </p>
                {dept.evidence[0] ? (
                  <p className="mt-2 line-clamp-2 text-xs text-neutral-500">
                    {dept.evidence[0]}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </CockpitSection>

      <div className="grid gap-6 lg:grid-cols-2">
        {cockpitRecs.length > 0 ? (
          <div className="space-y-3 lg:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
              Prioridades justificadas
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {cockpitRecs.map((rec, i) => (
                <ExplainedRecommendationCard
                  key={rec.id}
                  explained={rec}
                  index={i}
                  compact
                />
              ))}
            </div>
          </div>
        ) : (
          <CockpitList
            title="Prioridades actuales"
            items={cockpit.priorities.map((p) => ({
              id: p.id,
              primary: p.title,
              meta: urgencyLabel(p.urgency),
              secondary: p.rationale,
            }))}
          />
        )}
        <CockpitList
          title="Riesgos abiertos"
          items={cockpit.openRisks.map((r) => ({
            id: r.id,
            primary: r.title,
            meta: severityLabel(r.severity),
            secondary: r.detail,
          }))}
        />
        <CockpitList
          title="Victorias rápidas"
          items={cockpit.quickWins.map((w) => ({
            id: w.id,
            primary: w.title,
            meta: w.horizon,
            secondary: w.rationale,
          }))}
        />
        <CockpitList
          title="Oportunidades estratégicas"
          items={cockpit.strategicOpportunities.map((o) => ({
            id: o.id,
            primary: o.title,
            meta: o.horizon,
            secondary: o.rationale,
          }))}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CockpitList
          title="Descubrimientos recientes"
          items={cockpit.recentDiscoveries.map((d) => ({
            id: d.id,
            primary: d.title,
            meta: d.date ? formatShortDate(d.date) : null,
            secondary: d.detail,
          }))}
        />
        <CockpitList
          title="Decisiones pendientes"
          items={cockpit.pendingDecisions.map((d) => ({
            id: d.id,
            primary: d.title,
            meta: null,
            secondary: d.detail,
          }))}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
        <ProgressCard
          title="Avance de la hoja de ruta"
          score={cockpit.roadmap.percent}
          label={
            cockpit.roadmap.totalPhases > 0
              ? `${cockpit.roadmap.totalPhases} fases`
              : cockpit.roadmap.summary
          }
          detail={
            cockpit.roadmap.totalPhases > 0 ? cockpit.roadmap.summary : null
          }
        />
      </div>

      {cockpit.businessHealth.gauges.length > 0 ? (
        <CockpitSection title="Indicadores de salud">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {cockpit.businessHealth.gauges.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-emerald-100/60 bg-white/70 px-4 py-3"
              >
                <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                  {g.label}
                </p>
                <p className="mt-1 text-lg tabular-nums text-neutral-950">
                  {g.score}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-neutral-500">
            Lectura consultiva: {cockpit.businessHealth.label}
            {cockpit.businessHealth.overall != null
              ? ` (${cockpit.businessHealth.overall})`
              : ""}
          </p>
        </CockpitSection>
      ) : null}

      {cockpit.roadmap.phases.length > 0 ? (
        <CockpitSection title="Hoja de ruta — fases">
          <ol className="space-y-3">
            {cockpit.roadmap.phases.map((phase) => (
              <li
                key={`${phase.phase}-${phase.name}`}
                className="flex items-start gap-3 text-sm"
              >
                <span className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                  Fase {phase.phase}
                </span>
                <div>
                  <p className="text-neutral-900">{phase.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">
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
        </CockpitSection>
      ) : null}
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
      <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
        {label}
      </p>
      <p className="mt-2 text-lg leading-snug text-neutral-950">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-neutral-400">{hint}</p>
      ) : null}
    </Card>
  );
}

function CockpitSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-sm text-neutral-400">
      Aparecerá a medida que crezca la evidencia…
    </p>
  );
}

function CockpitList({
  title,
  items,
}: {
  title: string;
  items: Array<{
    id: string;
    primary: string;
    meta: string | null;
    secondary: string | null | undefined;
  }>;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      {items.length === 0 ? (
        <EmptyHint />
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-neutral-800">{item.primary}</p>
                {item.meta ? (
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                    {item.meta}
                  </span>
                ) : null}
              </div>
              {item.secondary ? (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                  {item.secondary}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
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
    <Card className="border-neutral-200/70 bg-white/80 px-5 py-4 shadow-none">
      <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      <p className="mt-2 text-2xl tabular-nums text-neutral-950">
        {score != null ? score : "—"}
      </p>
      <p className="mt-1 text-sm text-neutral-600">{label}</p>
      {detail ? (
        <p className="mt-2 line-clamp-2 text-xs text-neutral-500">{detail}</p>
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

function severityLabel(s: string): string {
  switch (s) {
    case "critical":
      return "Crítico";
    case "high":
      return "Alto";
    case "moderate":
      return "Moderado";
    case "low":
      return "Bajo";
    case "attention":
      return "Atención";
    default:
      return s;
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
