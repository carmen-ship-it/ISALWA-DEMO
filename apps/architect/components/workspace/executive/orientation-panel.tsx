"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
} from "@/components/workspace/section-shell";
import type { OrientationPanelReport } from "@/lib/consulting-intelligence";
import { cn } from "@/lib/utils";

/**
 * Five-second consultant briefing — Know / Still learning / Next.
 * Feels like a senior consultant, not a dashboard meter strip.
 */
export function OrientationPanel({
  report,
  href,
  onClick,
}: {
  report: OrientationPanelReport;
  href?: string;
  onClick?: () => void;
}) {
  const factsLine =
    report.factsLearned === 1
      ? "1 hecho aprendido"
      : `${report.factsLearned} hechos aprendidos`;
  const meetingsLine =
    report.meetingsAnalyzed === 1
      ? "1 reunión analizada"
      : `${report.meetingsAnalyzed} reuniones analizadas`;

  return (
    <section
      aria-label="Orientación de Architect"
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-5 sm:px-6 sm:py-6",
        SECTION_TONE_SURFACE.health,
      )}
    >
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <Compass className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Esto es lo que Architect entiende de tu empresa
            </p>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--isalwa-kiln)]">
            <li>✓ {factsLine}</li>
            <li>✓ {meetingsLine}</li>
            <li>
              ✓ {report.understandingLabel}: {report.understandingPercent}%
            </li>
          </ul>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <BookOpen className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Esto es lo que todavía quiere aprender
            </p>
          </div>
          {report.learningGaps.length > 0 ? (
            <ul className="mt-3 space-y-1.5 text-sm text-[var(--isalwa-kiln)]">
              {report.learningGaps.map((gap) => (
                <li key={gap}>• {gap}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
              Por ahora no hay vacíos priorizados — cada documento o respuesta nueva sigue
              afinando el conocimiento.
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <Target className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Lo siguiente que más ayudará
            </p>
          </div>
          <p className="mt-3 text-sm font-medium text-[var(--isalwa-kiln)]">
            {report.nextActionLabel}
          </p>
          {report.nextActionMinutesHint ? (
            <p className="mt-1 text-xs text-[var(--isalwa-slate)]">
              ⏱ {report.nextActionMinutesHint}
            </p>
          ) : null}
          <div className="mt-3">
            {onClick ? (
              <Button type="button" size="sm" onClick={onClick}>
                {report.nextActionLabel}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
              </Button>
            ) : href ? (
              <Button asChild size="sm">
                <Link href={href}>
                  {report.nextActionLabel}
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
