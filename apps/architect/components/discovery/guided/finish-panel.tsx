"use client";

import { ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  return (
    <Card className="px-7 py-8 sm:px-10 sm:py-10">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
        <PartyPopper className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="architect-serif mt-5 text-3xl leading-tight text-neutral-950">
        Sesión guardada, {interview.participant.name ?? "gracias"}.
      </h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-neutral-600">
        Lo que respondió ya está incorporado a la comprensión de{" "}
        {workspace.companyName}. El diagnóstico sigue vivo — cada conversación
        futura se suma a esta misma memoria, nunca la reemplaza.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-neutral-50 px-5 py-4 ring-1 ring-neutral-100">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Comprensión del negocio
          </p>
          <p className="architect-serif mt-1 text-3xl text-neutral-950">
            {understanding}%
          </p>
        </div>
        <div className="rounded-2xl bg-neutral-50 px-5 py-4 ring-1 ring-neutral-100">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-neutral-500">
            Hechos registrados
          </p>
          <p className="architect-serif mt-1 text-3xl text-neutral-950">
            {factsCount}
          </p>
        </div>
      </div>

      {interview.report?.executiveSummary ? (
        <p className="prose-architect mt-6 text-sm leading-relaxed text-neutral-600">
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
