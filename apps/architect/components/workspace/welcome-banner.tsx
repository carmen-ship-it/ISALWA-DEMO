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
  onContinueClick,
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
  /** Guided Executive Navigation (Mission 12) — when the answer to "what should I do today" is to jump to another tab (e.g. review recommendations) rather than navigate away, use this instead of continueHref. */
  onContinueClick?: () => void;
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
      <div className="isalwa-risk-bar mb-4 max-w-sm !h-1.5 bg-white/70">
        <span
          className="!rounded-full bg-[var(--isalwa-info)] transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(4, pct)}%` }}
          aria-hidden
        />
      </div>

      {todayRecommendation ? (
        <div className="mb-6 flex items-start gap-3 rounded-[var(--isalwa-radius-panel)] bg-white/85 px-4 py-3.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
          <span className="isalwa-icon-chip isalwa-ink-blue !h-7 !w-7">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
          </span>
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            <span className="font-medium text-[var(--isalwa-kiln)]">
              Recomendación de hoy:{" "}
            </span>
            {todayRecommendation}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--isalwa-slate)]">
        {estimatedMinutes ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Tiempo estimado: {estimatedMinutes} minutos
          </span>
        ) : null}
      </div>
      <p className="mt-6 mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/70">
        ¿Qué debo hacer hoy?
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {onContinueClick ? (
          <Button type="button" size="lg" onClick={onContinueClick}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link href={continueHref}>
              {continueLabel}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onExplore}>
          Ver resumen ejecutivo
        </Button>
      </div>
    </SectionShell>
  );
}
