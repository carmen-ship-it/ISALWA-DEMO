"use client";

import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type RoadmapTimelineItem = {
  id: string;
  label: string;
  title: string;
  summary: string;
  detail?: string;
};

const DEFAULT_LANES = ["Hoy", "Siguiente", "30 días", "90 días", "Futuro"] as const;

export function RoadmapTimeline({
  items,
}: {
  items: RoadmapTimelineItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--isalwa-tint-violet-border)]/80 bg-white/70 px-5 py-6">
        <p className="text-base text-[var(--isalwa-slate)]">
          Aún no hay un plan de implementación. Primero necesitamos entender
          mejor cómo opera el negocio.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => {
        const lane =
          item.label ||
          DEFAULT_LANES[Math.min(index, DEFAULT_LANES.length - 1)] ||
          "Futuro";
        const last = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
            <div className="flex w-10 shrink-0 flex-col items-center">
              <span
                className={cn(
                  "isalwa-t-fast inline-flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[var(--isalwa-shadow-resting)] ring-1 ring-[var(--isalwa-tint-violet-border)]",
                  index === 0
                    ? "text-[var(--isalwa-tint-violet-ink)] ring-[var(--isalwa-violet)]"
                    : "text-[var(--isalwa-slate)]",
                )}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
              </span>
              {!last ? (
                <span className="mt-2 w-px flex-1 bg-gradient-to-b from-[var(--isalwa-tint-violet-border)] to-transparent" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-tint-violet-border)]/70 bg-white/80 px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/60">
                {lane}
              </p>
              <p className="mt-2 text-lg text-[var(--isalwa-kiln)]">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                {item.summary}
              </p>
              {item.detail ? (
                <p className="mt-2 text-xs text-[var(--isalwa-slate)]/80">{item.detail}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
