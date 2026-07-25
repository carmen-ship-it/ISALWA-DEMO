"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { SectionShell } from "@/components/workspace/section-shell";
import {
  healthLabel,
  maturityLabel,
  recommendationStrength,
  riskLevelLabel,
  understandingLevel,
  understandingSentence,
} from "@/lib/presentation";
import type { ExecutiveDashboardModel } from "@/lib/executive";

export function ExecutiveDashboard({
  model,
}: {
  model: ExecutiveDashboardModel;
}) {
  const understanding = understandingLevel(model.businessUnderstanding);
  const nextStep =
    model.executiveRecommendation ??
    model.priorities[0] ??
    "Continuar el descubrimiento para afinar prioridades.";
  const impact =
    model.topOpportunities[0] ??
    model.quickWins[0] ??
    "El impacto se aclarará cuando las recomendaciones se consoliden.";
  const systems =
    model.investmentAreas.length > 0
      ? model.investmentAreas.slice(0, 4)
      : [];
  const riskHint = riskLevelLabel(model.riskLevel);

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
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Resumen en 30 segundos
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Claridad para decidir.
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {answers.map((item, i) => (
          <motion.div
            key={item.question}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i, duration: 0.35 }}
          >
            <SectionShell tone={item.tone} className="h-full px-5 py-4 sm:px-5 sm:py-4">
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

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricTile
          label="Madurez operativa"
          value={maturityLabel(model.maturity)}
        />
        <MetricTile
          label="Salud del negocio"
          value={healthLabel(model.health)}
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

      <div className="grid gap-5 lg:grid-cols-2">
        <DashList title="Prioridades" items={model.priorities} />
        <DashList title="Victorias rápidas" items={model.quickWins} />
        <DashList title="Enfoque de inversión" items={model.investmentAreas} />
        <DashList title="Fases de entrega" items={model.estimatedPhases} />
      </div>
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

function DashList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">
          Aparecerá a medida que crezca la evidencia…
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item} className="text-sm text-neutral-800">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
