"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Compass, FileText, MessageSquare, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SECTION_TONE_INK,
  SECTION_TONE_SURFACE,
} from "@/components/workspace/section-shell";
import type { OrientationPanelReport } from "@/lib/consulting-intelligence";
import { cn } from "@/lib/utils";

/**
 * Mission 31 — Five-second consultant briefing.
 * Know / Still learning / Why it matters (implicit) / Next.
 * Metrics from OrientationPanelReport (PilotTruthMetrics only).
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
  const knowLines: string[] = [];
  if (report.discoveryConversations > 0) {
    knowLines.push(
      report.discoveryConversations === 1
        ? "1 conversación de descubrimiento"
        : `${report.discoveryConversations} conversaciones de descubrimiento`,
    );
  }
  if (report.factsLearned > 0) {
    knowLines.push(
      report.factsLearned === 1
        ? "1 hecho aprendido"
        : `${report.factsLearned} hechos aprendidos`,
    );
  }
  if (report.documentsUploaded > 0) {
    knowLines.push(
      report.documentsUploaded === 1
        ? "1 documento cargado"
        : `${report.documentsUploaded} documentos cargados`,
    );
  }
  if (report.discoverySessions > 0) {
    knowLines.push(
      report.discoverySessions === 1
        ? "1 sesión de descubrimiento"
        : `${report.discoverySessions} sesiones de descubrimiento`,
    );
  }
  knowLines.push(
    `${report.understandingLabel}: ${report.understandingPercent}%`,
  );

  return (
    <section
      aria-label="Orientación de Architect"
      className={cn(
        "rounded-[var(--isalwa-radius-panel)] border px-5 py-5 sm:px-6 sm:py-6",
        SECTION_TONE_SURFACE.health,
      )}
    >
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <Compass className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Qué entiende Architect de tu empresa
            </p>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-[var(--isalwa-kiln)]">
            {knowLines.map((line) => (
              <li key={line} className="flex items-start gap-2">
                <span className="mt-0.5 text-[var(--isalwa-glaze)]" aria-hidden>
                  ✓
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl bg-white/70 px-4 py-4 ring-1 ring-[var(--isalwa-mist)]/80">
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <BookOpen className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Qué todavía quiere aprender
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
              Por ahora no hay vacíos priorizados — cada documento o respuesta nueva
              sigue afinando el conocimiento.
            </p>
          )}
          <p className="mt-3 text-xs leading-relaxed text-[var(--isalwa-slate)]/80">
            Por qué importa: cada vacío cerrado hace más sólido el sistema operativo
            de tu empresa — menos conocimiento tribal, mejores decisiones.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className={cn("isalwa-icon-chip", SECTION_TONE_INK.health)}>
              <Target className="h-4 w-4" aria-hidden />
            </span>
            <p className={cn("isalwa-kicker", SECTION_TONE_INK.health)}>
              Qué hacer ahora
            </p>
          </div>
          <div className="mt-3">
            {onClick ? (
              <Button type="button" size="lg" onClick={onClick} className="gap-2">
                {report.nextActionKind === "upload_document" ? (
                  <FileText className="h-4 w-4" aria-hidden />
                ) : (
                  <MessageSquare className="h-4 w-4" aria-hidden />
                )}
                {report.nextActionLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Button>
            ) : href ? (
              <Button asChild size="lg" className="gap-2">
                <Link href={href}>
                  {report.nextActionKind === "upload_document" ? (
                    <FileText className="h-4 w-4" aria-hidden />
                  ) : (
                    <MessageSquare className="h-4 w-4" aria-hidden />
                  )}
                  {report.nextActionLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            ) : (
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                {report.nextActionLabel}
              </p>
            )}
          </div>
          {report.nextActionMinutesHint ? (
            <p className="mt-2 text-xs text-[var(--isalwa-slate)]">
              ⏱ {report.nextActionMinutesHint}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
