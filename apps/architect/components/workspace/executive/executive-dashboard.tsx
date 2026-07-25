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
    "Continue discovery to sharpen priorities.";
  const impact =
    model.topOpportunities[0] ??
    model.quickWins[0] ??
    "Impact will clarify as recommendations firm up.";
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
      question: "How well do we understand the business?",
      answer: understanding,
      detail: understandingSentence(model.businessUnderstanding),
      tone: "executive",
    },
    {
      question: "Biggest risk?",
      answer: model.topRisk ?? "No critical risk surfaced yet",
      detail: riskHint || undefined,
      tone: "risks",
    },
    {
      question: "Top priorities?",
      answer:
        model.priorities.length > 0
          ? model.priorities.slice(0, 3).join(" · ")
          : "Priorities emerge as evidence accumulates",
      tone: "executive",
    },
    {
      question: "What should happen next?",
      answer: nextStep,
      tone: "health",
    },
    {
      question: "Recommended systems?",
      answer:
        systems.length > 0
          ? systems.join(" · ")
          : "System recommendations appear after architecture takes shape",
      tone: "blueprint",
    },
    {
      question: "Expected business impact?",
      answer: impact,
      tone: "health",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Thirty-second brief
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          Clarity for the decision room.
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
          label="Operating maturity"
          value={maturityLabel(model.maturity)}
        />
        <MetricTile
          label="Business health"
          value={healthLabel(model.health)}
        />
        <MetricTile
          label="Evidence quality"
          value={
            model.consultingConfidence != null
              ? recommendationStrength(model.consultingConfidence).replace(
                  "Recommendation strength: ",
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
        <DashList title="Priorities" items={model.priorities} />
        <DashList title="Quick wins" items={model.quickWins} />
        <DashList title="Investment focus" items={model.investmentAreas} />
        <DashList title="Delivery phases" items={model.estimatedPhases} />
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
          Emerging as evidence accumulates…
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
