"use client";

import Link from "next/link";
import { ArrowRight, Clock3, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";
import { understandingLevel } from "@/lib/presentation";

export function WelcomeBanner({
  displayName,
  understanding,
  focusHint,
  estimatedMinutes,
  continueHref,
  continueLabel,
  onExplore,
}: {
  displayName: string;
  understanding: number;
  focusHint: string;
  estimatedMinutes: number | null;
  continueHref: string;
  continueLabel: string;
  onExplore: () => void;
}) {
  const level = understandingLevel(understanding);
  const pct = Math.max(0, Math.min(100, Math.round(understanding)));

  return (
    <SectionShell
      tone="executive"
      icon={Compass}
      kicker="Bienvenida"
      title={`Bienvenido de nuevo, ${displayName}.`}
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
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href={continueHref}>
            {continueLabel}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Link>
        </Button>
        <Button type="button" variant="secondary" size="lg" onClick={onExplore}>
          Explorar hallazgos actuales
        </Button>
      </div>
    </SectionShell>
  );
}
