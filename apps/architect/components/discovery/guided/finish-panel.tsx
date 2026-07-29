"use client";

import { useMemo } from "react";
import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DiscoveryCompletionCard } from "@/components/workspace/executive/discovery-completion-card";
import { assessDiscoveryCompletion } from "@/lib/consulting-intelligence";
import { assessReadiness } from "@/lib/readiness";
import { understandingLevel, understandingSentence } from "@/lib/presentation";
import type { CompanyWorkspace, Interview } from "@/types";

export function FinishPanel({
  interview,
  workspace,
  saving,
  onContinue,
}: {
  interview: Interview;
  workspace: CompanyWorkspace;
  saving: boolean;
  onContinue: () => void;
}) {
  const understanding = interview.memory.score.overall;
  const factsCount = interview.memory.knownFacts.length;

  /**
   * Mission E — the Discovery Complete/Incomplete ceremony, right where a
   * session naturally ends. Reads the just-updated `workspace` prop, so it
   * catches up automatically once `persistCompletion` lands (see `saving`).
   */
  const discoveryCompletion = useMemo(() => {
    const readiness = assessReadiness(workspace);
    return assessDiscoveryCompletion(workspace, readiness);
  }, [workspace]);

  return (
    <Card className="px-7 py-8 sm:px-10 sm:py-10">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--isalwa-tint-green)] text-[var(--isalwa-tint-green-ink)] ring-1 ring-[var(--isalwa-tint-green-border)]">
        <PartyPopper className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="architect-serif mt-5 text-3xl leading-tight text-[var(--isalwa-kiln)]">
        Sesión guardada, {interview.participant.name ?? "gracias"}.
      </h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--isalwa-slate)]">
        Lo que respondió ya está incorporado a la comprensión de{" "}
        {workspace.companyName}. El conocimiento sigue vivo — cada conversación
        futura se suma a esta misma memoria, nunca la reemplaza.
      </p>

      <div className="mt-6">
        <DiscoveryCompletionCard status={discoveryCompletion} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-[var(--isalwa-porcelain)] px-5 py-4 ring-1 ring-[var(--isalwa-mist)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
            Comprensión del negocio
          </p>
          <p className="architect-serif mt-1 text-3xl text-[var(--isalwa-kiln)]">
            {understanding}%
          </p>
          <p className="mt-1 text-xs text-[var(--isalwa-slate)]/70">
            {understandingLevel(understanding)}
          </p>
        </div>
        <div className="rounded-2xl bg-[var(--isalwa-porcelain)] px-5 py-4 ring-1 ring-[var(--isalwa-mist)]">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--isalwa-slate)]/80">
            Hechos registrados
          </p>
          <p className="architect-serif mt-1 text-3xl text-[var(--isalwa-kiln)]">
            {factsCount}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]/80">
        {understandingSentence(understanding)}
      </p>

      {interview.report?.executiveSummary ? (
        <p className="prose-architect mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {interview.report.executiveSummary}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="mt-8"
        disabled={saving}
        onClick={onContinue}
      >
        {saving ? "Guardando…" : "Ir al espacio de trabajo ejecutivo"}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </Card>
  );
}
