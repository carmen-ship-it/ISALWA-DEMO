"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { architectAgent } from "@/agents";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { BackLink } from "@/components/nav/back-link";
import { DiscoveryScoreCard } from "@/components/discovery/discovery-score-card";
import { LivingWhiteboard } from "@/components/discovery/living-whiteboard";
import { OpportunityList } from "@/components/discovery/opportunity-list";
import { AnsweringPanel } from "@/components/discovery/guided/answering-panel";
import { FinishPanel } from "@/components/discovery/guided/finish-panel";
import { ReviewPanel } from "@/components/discovery/guided/review-panel";
import { StageBrief } from "@/components/discovery/guided/stage-brief";
import { StageStepper } from "@/components/discovery/guided/stage-stepper";
import { ObservationCard } from "@/components/shared/observation-card";
import { TypingIndicator } from "@/components/shared/typing-indicator";
import { Card } from "@/components/ui/card";
import { applyInterviewToWorkspace } from "@/lib/memory";
import { createClientInterviewPersistence } from "@/lib/persistence";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import {
  emptyConsultingIntelligence,
  emptyConsultingWhiteboardFields,
} from "@/lib/consulting";
import { createEmptyMemory } from "@/lib/reasoning";
import { createWorkspaceInterview } from "@/lib/resume";
import { createId, nowIso } from "@/lib/utils";
import {
  buildAnsweredTopics,
  groupTopicsByStage,
  type AnsweredTopic,
} from "@/lib/discovery/answer-topics";
import {
  prepareAnswerEdit,
  skipCurrentQuestion,
  skipCurrentStage,
} from "@/lib/discovery/guided-actions";
import { estimateQuestionProgress } from "@/lib/discovery/question-progress";
import {
  GUIDED_STAGES,
  computeStageCompletion,
  resolveCurrentStage,
  type GuidedStageId,
} from "@/lib/discovery/stages";
import type { Answer, CompanyWorkspace, Interview, Question } from "@/types";

/** Defensive backfill for older persisted interviews — schema kept identical. */
function ensureMemory(interview: Interview): Interview {
  const baseMemory =
    interview.memory?.score && interview.memory.whiteboard
      ? interview.memory
      : createEmptyMemory();

  const whiteboard = {
    ...emptyConsultingWhiteboardFields(),
    ...baseMemory.whiteboard,
    currentSystems: baseMemory.whiteboard?.currentSystems ?? [],
    painPoints: baseMemory.whiteboard?.painPoints ?? [],
    potentialModules: baseMemory.whiteboard?.potentialModules ?? [],
    facts: baseMemory.whiteboard?.facts ?? [],
    hypotheses: baseMemory.whiteboard?.hypotheses ?? [],
    risks: baseMemory.whiteboard?.risks ?? [],
    unknowns: baseMemory.whiteboard?.unknowns ?? [],
    assumptions: baseMemory.whiteboard?.assumptions ?? [],
    contradictions: baseMemory.whiteboard?.contradictions ?? [],
    ideas: baseMemory.whiteboard?.ideas ?? [],
    opportunities: baseMemory.whiteboard?.opportunities ?? [],
  };

  const memory = {
    ...baseMemory,
    whiteboard,
    consulting: baseMemory.consulting ?? emptyConsultingIntelligence(),
  };

  return {
    ...interview,
    workspaceId: interview.workspaceId ?? null,
    memory,
    opportunities: interview.opportunities ?? [],
    insights: interview.insights ?? [],
    observations: (interview.observations ?? []).map((observation) => ({
      ...observation,
      evidence: observation.evidence ?? [],
    })),
    business: {
      ...interview.business,
      departments: interview.business.departments ?? [],
      revenueStage: interview.business.revenueStage ?? null,
      businessModel: interview.business.businessModel ?? null,
    },
  };
}

type ViewMode = "answering" | "reviewing";

export function GuidedAssessment() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [interview, setInterview] = useState<Interview | null>(null);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [persistedComplete, setPersistedComplete] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("answering");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const persistence = useMemo(
    () => createClientInterviewPersistence(workspaceId),
    [workspaceId],
  );

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!workspaceId) {
        router.replace("/");
        return;
      }

      const ws = await store.workspaces.get(workspaceId);
      if (!ws) {
        router.replace("/");
        return;
      }
      if (cancelled) return;
      setWorkspace(ws);

      const existing = await persistence.load();
      if (
        existing &&
        existing.phase !== "complete" &&
        existing.workspaceId === workspaceId
      ) {
        setInterview(ensureMemory(existing));
        return;
      }

      const mode =
        ws.meetings.length > 0 || (ws.conversationMemory?.knownFacts.length ?? 0) > 0
          ? "continue"
          : "begin";
      const fresh = createWorkspaceInterview(ws, mode);
      setInterview(fresh);
      await persistence.save(fresh);

      await store.workspaces.save({
        ...ws,
        activeInterviewId: fresh.id,
        updatedAt: nowIso(),
      });
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [persistence, router, store, workspaceId]);

  // Pause = simply stop here. Every state change autosaves, so returning to
  // the workspace never loses an answer (existing persistence, unchanged).
  useEffect(() => {
    if (!interview || interview.phase === "complete") return;
    void persistence.save(interview);
  }, [interview, persistence]);

  useEffect(() => {
    if (!interview || !workspace || persistedComplete) return;
    if (interview.phase !== "complete" || !interview.report) return;

    const completedInterview = interview;
    const workspaceRef = workspace;
    let cancelled = false;

    async function persistCompletion() {
      const latest = await store.workspaces.get(workspaceRef.id);
      if (!latest || cancelled) return;

      const { workspace: next, conversation } = applyInterviewToWorkspace(
        latest,
        completedInterview,
      );
      await store.workspaces.save(next);
      await store.conversations.save(conversation);
      await persistence.clear();
      setPersistedComplete(true);
      setWorkspace(next);
      // Business Understanding is now updated in the workspace — navigation
      // back is a deliberate user action (Finish stage), not automatic.
    }

    void persistCompletion();
    return () => {
      cancelled = true;
    };
  }, [interview, persistence, persistedComplete, router, store, workspace]);

  async function respond(value: string, base?: Interview) {
    const source = base ?? interview;
    if (!source || thinking) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    setThinking(true);
    setDraft("");

    const answer: Answer = {
      id: createId("answer"),
      questionId: source.conversation.currentQuestion?.id ?? "unknown",
      value: trimmed,
      answeredAt: nowIso(),
    };

    await new Promise((resolve) => setTimeout(resolve, 700));

    startTransition(() => {
      void architectAgent
        .handleTurn({ interview: source, latestAnswer: answer })
        .then((result) => {
          setInterview(result.interview);
          setThinking(false);
        });
    });
  }

  function handleSkipQuestion() {
    if (!interview) return;
    setInterview(skipCurrentQuestion(interview));
  }

  function handleSkipStage(stageId: GuidedStageId) {
    if (!interview) return;
    const dimensions = new Set<string>(GUIDED_STAGES[stageId].dimensions);
    setInterview(skipCurrentStage(interview, dimensions));
  }

  function handleStartEdit(topic: AnsweredTopic) {
    setEditingKey(topic.key);
    setEditingDraft(topic.statement);
  }

  function handleCancelEdit() {
    setEditingKey(null);
    setEditingDraft("");
  }

  async function handleSaveEdit(topic: AnsweredTopic) {
    if (!interview || !editingDraft.trim()) return;
    const reconstructed: Question = {
      id: createId(`q_${topic.key}`),
      prompt: topic.prompt ?? `Actualizar respuesta — ${GUIDED_STAGES[topic.stage].title}`,
      kind: topic.kind,
      questionKey: topic.key,
      dimension: topic.dimension,
      placeholder: topic.placeholder,
    };
    const prepared = prepareAnswerEdit(interview, reconstructed);
    const value = editingDraft;
    setEditingKey(null);
    setEditingDraft("");
    await respond(value, prepared);
  }

  function handleUpdateIdentity(
    field: "name" | "companyName" | "role",
    value: string,
  ) {
    if (!interview) return;
    setInterview({
      ...interview,
      updatedAt: nowIso(),
      participant: {
        ...interview.participant,
        ...(field === "name" ? { name: value } : null),
        ...(field === "companyName" ? { companyName: value } : null),
        ...(field === "role"
          ? { role: value as Interview["participant"]["role"] }
          : null),
      },
      business:
        field === "companyName"
          ? { ...interview.business, companyName: value }
          : interview.business,
    });
  }

  if (!interview || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TypingIndicator />
      </div>
    );
  }

  const isComplete = interview.phase === "complete";
  const displayStage: GuidedStageId = isComplete
    ? "finish"
    : viewMode === "reviewing"
      ? "review"
      : resolveCurrentStage(interview);
  const stageDef = GUIDED_STAGES[displayStage];
  const completion = computeStageCompletion(interview);
  const topics = buildAnsweredTopics(interview);
  const topicsByStage = groupTopicsByStage(topics);

  function handleSelectStage(stageId: GuidedStageId) {
    if (isComplete) return;
    if (stageId === "finish") return;
    if (stageId === "review") {
      setViewMode("reviewing");
      return;
    }
    // The live question is chosen adaptively by the engine (Mission 10 —
    // senior consultant question selection). We cannot force it to a
    // different dimension on demand, so any other stage tab opens the
    // read-only Review, where that stage's collected answers already live.
    setViewMode("reviewing");
  }

  const canSkipQuestion =
    !isComplete && interview.phase === "interview" && Boolean(interview.conversation.currentQuestion);
  const canSkipStage =
    !isComplete &&
    interview.phase === "interview" &&
    stageDef.dimensions.length > 0 &&
    Boolean(interview.conversation.currentQuestion);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10">
      <BackLink
        href={`/workspace/${workspace.id}`}
        label="Volver al espacio de trabajo"
        className="mb-6"
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[var(--isalwa-slate)]/80">
            Evaluación guiada · {workspace.companyName}
          </p>
        </div>
        <ArchitectNav
          workspaceHref={`/workspace/${workspace.id}`}
          interviewHref={`/discovery?workspaceId=${workspace.id}`}
        />
      </header>

      {!isComplete ? (
        <div className="mt-6">
          <StageStepper
            currentStageId={displayStage}
            completion={completion}
            onSelect={handleSelectStage}
          />
        </div>
      ) : null}

      {isComplete ? (
        <div className="mx-auto mt-10 w-full max-w-2xl">
          <FinishPanel
            interview={interview}
            workspace={workspace}
            saving={!persistedComplete}
            onContinue={() => router.push(`/workspace/${workspace.id}?completed=1`)}
          />
        </div>
      ) : (
        <div className="mt-6 grid flex-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <section className="flex flex-col">
            {viewMode === "reviewing" ? (
              <ReviewPanel
                interview={interview}
                topicsByStage={topicsByStage}
                editingKey={editingKey}
                editingDraft={editingDraft}
                onStartEdit={handleStartEdit}
                onChangeDraft={setEditingDraft}
                onSaveEdit={(topic) => void handleSaveEdit(topic)}
                onCancelEdit={handleCancelEdit}
                onUpdateIdentity={handleUpdateIdentity}
                onBackToQuestion={() => setViewMode("answering")}
              />
            ) : (
              <>
                <StageBrief
                  stage={stageDef}
                  overallScore={interview.memory.score.overall}
                  estimatedMinutes={interview.estimatedMinutesRemaining}
                  questionProgress={estimateQuestionProgress(interview)}
                  pauseHref={`/workspace/${workspace.id}`}
                  onSkipQuestion={canSkipQuestion ? handleSkipQuestion : undefined}
                  onSkipStage={
                    canSkipStage ? () => handleSkipStage(stageDef.id) : undefined
                  }
                />
                <div className="mt-6">
                  <AnsweringPanel
                    interview={interview}
                    draft={draft}
                    onDraftChange={setDraft}
                    thinking={thinking}
                    isPending={isPending}
                    onRespond={(value) => void respond(value)}
                  />
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <DiscoveryScoreCard score={interview.memory.score} />
            <LivingWhiteboard board={interview.memory.whiteboard} />

            <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]/80 bg-white/70 px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
                Hallazgos del consultor
              </p>
              <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">
                Aparecen cuando hay evidencia suficiente.
              </p>
            </div>

            <div className="space-y-3">
              {interview.observations.length === 0 ? (
                <Card className="px-5 py-6 text-sm text-[var(--isalwa-slate)]/80">
                  Aún no hay hallazgos — el Arquitecto no inventa conclusiones.
                </Card>
              ) : (
                interview.observations.map((observation, index) => (
                  <ObservationCard
                    key={observation.id}
                    observation={observation}
                    index={index}
                  />
                ))
              )}
            </div>

            <div className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]/80 bg-white/70 px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-slate)]/80">
                Oportunidades
              </p>
            </div>
            <OpportunityList opportunities={interview.opportunities} />
          </aside>
        </div>
      )}
    </div>
  );
}
