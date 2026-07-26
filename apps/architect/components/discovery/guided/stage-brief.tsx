"use client";

import {
  Building2,
  Clock3,
  Compass,
  DollarSign,
  ListChecks,
  PartyPopper,
  Server,
  ShoppingCart,
  SkipForward,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BackLink } from "@/components/nav/back-link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SectionShell } from "@/components/workspace/section-shell";
import { stagePosition, type GuidedStageDefinition } from "@/lib/discovery/stages";

const STAGE_ICON: Record<GuidedStageDefinition["id"], LucideIcon> = {
  welcome: Compass,
  company: Building2,
  commercial: ShoppingCart,
  operations: Workflow,
  finance: DollarSign,
  technology: Server,
  people: Users,
  review: ListChecks,
  finish: PartyPopper,
};

export function StageBrief({
  stage,
  overallScore,
  estimatedMinutes,
  pauseHref,
  onSkipQuestion,
  onSkipStage,
}: {
  stage: GuidedStageDefinition;
  overallScore: number;
  estimatedMinutes: number;
  pauseHref: string;
  onSkipQuestion?: () => void;
  onSkipStage?: () => void;
}) {
  const { index, total } = stagePosition(stage.id);

  return (
    <SectionShell
      tone="executive"
      icon={STAGE_ICON[stage.id]}
      kicker={`Paso ${index + 1} de ${total} · Por qué preguntamos esto`}
      title={stage.title}
      description={stage.rationale}
      className="sm:px-6 sm:py-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-[160px] flex-1">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Comprensión del negocio</span>
            <span>{overallScore}%</span>
          </div>
          <Progress value={overallScore} className="mt-1.5" />
        </div>

        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-neutral-600 ring-1 ring-sky-100">
          <Clock3 className="h-3.5 w-3.5" aria-hidden />
          ~{estimatedMinutes} min restantes
        </span>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <BackLink
          href={pauseHref}
          label="Pausar y volver al espacio de trabajo"
          className="rounded-full bg-white/70 px-3.5 py-2 text-sm ring-1 ring-neutral-200 hover:bg-white"
        />
        {onSkipQuestion ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSkipQuestion}>
            <SkipForward className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Saltar esta pregunta
          </Button>
        ) : null}
        {onSkipStage ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSkipStage}>
            <SkipForward className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Saltar esta etapa
          </Button>
        ) : null}
      </div>
    </SectionShell>
  );
}
