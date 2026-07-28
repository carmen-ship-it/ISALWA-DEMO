"use client";

import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionShell } from "@/components/workspace/section-shell";
import { TriadBriefing } from "@/components/workspace/executive/triad-briefing";
import { understandingLevel } from "@/lib/presentation";

/**
 * P0 Pilot UX — Make Continuous Discovery Obvious.
 *
 * Álvaro finished a first session and came back expecting a "second
 * questionnaire". Continuous discovery on the same `/discovery` route was
 * already correct (`createWorkspaceInterview(..., "continue")` in
 * `lib/resume/engine.ts`), but the confirmation question that opens that
 * mode ("¿Listo para continuar?") rendered exactly like every other
 * interview question — same card, same plain text — so nothing on screen
 * told him this was the *same* conversation picking back up.
 *
 * This component replaces that plain confirmation card, once, at the exact
 * moment a returning client reopens `/discovery`. It invents nothing: the
 * percentage is the live interview's own Discovery Score
 * (`interview.memory.score.overall`), the ETA is the same
 * `estimatedMinutesRemaining` the engine already computed, and the triad
 * below reuses the exact `TriadBriefing` component the Dashboard already
 * shows — composed from the Capability Digital Twin and Missing Information
 * Engine headlines the caller already has on hand, never recomputed here.
 */
export function ContinuationHero({
  companyName,
  understanding,
  estimatedMinutes,
  whatWeKnow,
  tryingToLearn,
  whyItMatters,
  onContinue,
  onNotNow,
  continuing,
}: {
  companyName: string;
  understanding: number;
  estimatedMinutes: number | null;
  /** Composed from the Capability Digital Twin's own headline — never recomputed here. */
  whatWeKnow: string;
  /** Composed from the Missing Information Engine's own headline. */
  tryingToLearn: string;
  /** A topic's business-stakes sentence or the Discovery ceremony's continuity note. */
  whyItMatters: string;
  onContinue: () => void;
  onNotNow: () => void;
  continuing: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(understanding)));

  return (
    <div className="space-y-6">
      <SectionShell
        tone="executive"
        size="hero"
        icon={Sparkles}
        kicker="Descubrimiento continuo"
        title={`Continuemos aprendiendo sobre ${companyName}…`}
        description="Esta es la misma conversación de siempre, no un cuestionario nuevo. Architect se vuelve más inteligente cada vez que su empresa comparte conocimiento — y ahora mismo retoma justo donde la dejamos."
      >
        <div className="isalwa-risk-bar mb-4 max-w-sm !h-1.5 bg-white/70">
          <span
            className="!rounded-full bg-[var(--isalwa-info)] transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(4, pct)}%` }}
            aria-hidden
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--isalwa-slate)]/85">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
            Comprensión del negocio: {pct}% · {understandingLevel(pct).toLowerCase()}
          </span>
          {estimatedMinutes ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 ring-1 ring-[var(--isalwa-tint-blue-border)]">
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              ~{estimatedMinutes} min para seguir aprendiendo
            </span>
          ) : null}
        </div>

        <p className="mt-6 mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--isalwa-glaze-deep)]">
          ¿Qué hacemos ahora?
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="lg" onClick={onContinue} disabled={continuing}>
            Continuar descubriendo
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
          <Button type="button" variant="ghost" onClick={onNotNow} disabled={continuing}>
            Ahora no
          </Button>
        </div>
      </SectionShell>

      <TriadBriefing
        whatWeKnow={whatWeKnow}
        tryingToLearn={tryingToLearn}
        whyItMatters={whyItMatters}
      />
    </div>
  );
}
