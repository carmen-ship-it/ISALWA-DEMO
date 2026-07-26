"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Compass, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";
import { understandingLevel } from "@/lib/presentation";

export function WelcomeBanner({
  displayName,
  understanding,
  focusHint,
  todayRecommendation,
  estimatedMinutes,
  continueHref,
  continueLabel,
  onExplore,
  brandMessage,
}: {
  displayName: string;
  understanding: number;
  focusHint: string;
  /** Today's recommendation — the single most useful next insight, in plain Spanish. */
  todayRecommendation?: string | null;
  estimatedMinutes: number | null;
  continueHref: string;
  continueLabel: string;
  onExplore: () => void;
  /** White Label Company Experience — consultant-configured homepage message. Replaces the auto-composed description when present. */
  brandMessage?: string | null;
}) {
  const level = understandingLevel(understanding);
  const pct = Math.max(0, Math.min(100, Math.round(understanding)));

  return (
    <SectionShell
      tone="executive"
      icon={Compass}
      kicker="Bienvenida"
      title={`Bienvenido de nuevo, ${displayName}.`}
      description={
        brandMessage ??
        `Hoy entendemos aproximadamente el ${pct}% de su negocio (${level.toLowerCase()}). ${focusHint}`
      }
    >
      <div className="mb-4 h-1.5 max-w-sm overflow-hidden rounded-full bg-white/70">
        <div
          className="h-full rounded-full bg-sky-500/80 transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(4, pct)}%` }}
          aria-hidden
        />
      </div>

      {todayRecommendation ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl bg-white/85 px-4 py-3.5 ring-1 ring-sky-100">
          <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-neutral-800">
            <span className="font-medium text-neutral-950">
              Recomendación de hoy:{" "}
            </span>
            {todayRecommendation}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-600">
        {estimatedMinutes ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-sky-100">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Tiempo estimado: {estimatedMinutes} minutos
          </span>
        ) : null}
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href={continueHref}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onExplore}>
          Ver resumen ejecutivo
        </Button>
      </div>
    </SectionShell>
  );
}
