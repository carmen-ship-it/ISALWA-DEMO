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
import { ReadinessStateDot } from "@/components/workspace/executive/readiness-panel";
import type { QuestionProgress } from "@/lib/discovery/question-progress";
import { stagePosition, type GuidedStageDefinition } from "@/lib/discovery/stages";
import { understandingLevel } from "@/lib/presentation";
import type { TopicReadiness } from "@/lib/readiness";

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
  questionProgress,
  readiness,
  pauseHref,
  onSkipQuestion,
  onSkipStage,
}: {
  stage: GuidedStageDefinition;
  overallScore: number;
  estimatedMinutes: number;
  questionProgress?: QuestionProgress | null;
  /**
   * Where this stage stands according to the Consultant Readiness Engine.
   * The engine already keeps the interview from re-asking what the evidence
   * answers; this line simply tells the client why a stage feels short.
   */
  readiness?: TopicReadiness | null;
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
          <div className="flex items-center justify-between text-xs text-[var(--isalwa-slate)]/80">
            <span>Comprensión del negocio</span>
            <span>
              {overallScore}% · {understandingLevel(overallScore).toLowerCase()}
            </span>
          </div>
          <Progress value={overallScore} className="mt-1.5" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {questionProgress ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-tint-blue-border)]">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              Pregunta {questionProgress.current} de hasta {questionProgress.max}
            </span>
          ) : null}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-[var(--isalwa-slate)] ring-1 ring-[var(--isalwa-tint-blue-border)]">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            ~{estimatedMinutes} min restantes
          </span>
        </div>
      </div>

      {readiness ? (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-white/70 px-4 py-3 ring-1 ring-[var(--isalwa-mist)]/80">
          <ReadinessStateDot state={readiness.state} className="mt-1.5" />
          <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
            {readiness.headline}
          </p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <BackLink
          href={pauseHref}
          label="Pausar y volver al espacio de trabajo"
          className="rounded-full bg-white/70 px-3.5 py-2 text-sm ring-1 ring-[var(--isalwa-mist)] hover:bg-white"
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
