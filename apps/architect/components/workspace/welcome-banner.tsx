"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";
import { understandingLevel } from "@/lib/presentation";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export interface TodayProgressItem {
  label: string;
  complete: boolean;
}

export function WelcomeBanner({
  displayName,
  understanding,
  focusHint,
  estimatedMinutes,
  continueHref,
  continueLabel,
  progressItems = [],
  onExplore,
  exploreLabel = "Ver resumen ejecutivo",
}: {
  displayName: string;
  understanding: number;
  focusHint: string;
  estimatedMinutes: number | null;
  continueHref: string;
  continueLabel: string;
  /** "Today's Progress" checklist — derived from real journey/discovery state. */
  progressItems?: TodayProgressItem[];
  onExplore: () => void;
  exploreLabel?: string;
}) {
  const level = understandingLevel(understanding);
  const pct = Math.max(0, Math.min(100, Math.round(understanding)));

  return (
    <SectionShell
      tone="executive"
      icon={Compass}
      kicker={timeOfDayGreeting()}
      title={`${timeOfDayGreeting()}, ${displayName}.`}
      description={`Hoy entendemos aproximadamente el ${pct}% de su negocio (${level.toLowerCase()}). ${focusHint}`}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        {estimatedMinutes ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-sky-100">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Tiempo estimado: {estimatedMinutes} minutos
          </span>
        ) : null}
      </div>

      {progressItems.length > 0 ? (
        <div className="mt-6">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Avance de hoy
          </p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {progressItems.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-2.5 rounded-xl bg-white/70 px-3 py-2 text-sm"
              >
                <span
                  className={
                    item.complete
                      ? "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"
                      : "inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-neutral-300"
                  }
                  aria-hidden
                >
                  {item.complete ? <Check className="h-3 w-3" /> : null}
                </span>
                <span
                  className={
                    item.complete
                      ? "text-neutral-800"
                      : "text-neutral-500"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href={continueHref}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onExplore}>
          {exploreLabel}
        </Button>
      </div>
    </SectionShell>
  );
}
