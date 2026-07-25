"use client";

import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import type { ExecutiveDashboardModel } from "@/lib/executive";

export function ExecutiveDashboard({
  model,
}: {
  model: ExecutiveDashboardModel;
}) {
  const tiles: Array<{ label: string; value: string; hint?: string }> = [
    {
      label: "Business maturity",
      value:
        model.maturity != null
          ? `${Math.round(model.maturity * 100)}%`
          : "—",
    },
    {
      label: "Business health",
      value:
        model.health != null ? `${Math.round(model.health * 100)}%` : "—",
    },
    {
      label: "Risk",
      value: model.topRisk ?? "Not yet scored",
      hint: model.riskLevel !== "unknown" ? model.riskLevel : undefined,
    },
    {
      label: "Consulting confidence",
      value:
        model.consultingConfidence != null
          ? `${Math.round(model.consultingConfidence * 100)}%`
          : "—",
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
          Executive Dashboard
        </p>
        <h3 className="architect-serif mt-3 text-3xl text-neutral-950">
          One screen. Immediate clarity.
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile, i) => (
          <motion.div
            key={tile.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
          >
            <Card className="px-5 py-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-neutral-400">
                {tile.label}
              </p>
              <p className="mt-2 text-lg leading-snug text-neutral-950">
                {tile.value}
              </p>
              {tile.hint ? (
                <p className="mt-1 text-xs capitalize text-neutral-400">
                  {tile.hint}
                </p>
              ) : null}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DashList title="Priorities" items={model.priorities} />
        <DashList title="Quick wins" items={model.quickWins} />
        <DashList title="Investment" items={model.investmentAreas} />
        <DashList title="Estimated phases" items={model.estimatedPhases} />
      </div>
    </div>
  );
}

function DashList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-400">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">Emerging with evidence…</p>
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
