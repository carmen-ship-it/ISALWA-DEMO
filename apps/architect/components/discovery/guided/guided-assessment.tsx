"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { applyInterviewToWorkspace } from "@/lib/memory";
import { createClientInterviewPersistence } from "@/lib/persistence";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import {
  emptyConsultingIntelligence,
  emptyConsultingWhiteboardFields,
} from "@/lib/consulting";
import { assessMemoryReadiness, pickTopicReadiness } from "@/lib/readiness";
import { buildRetrievalPackSync, buildRetrievalQuery } from "@/lib/ai/retrieval";
import { buildAdaptiveFollowUp } from "@/lib/discovery/adaptive-followup";
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
  switchToStage,
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

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error desconocido";
}

/**
 * How long to wait after an answer before mirroring the live interview
 * memory into shared company memory (what the consultant's workspace
 * reads). Long enough to coalesce a burst of answers, short enough that
 * progress shows up while the session is still running.
 */
const SHARE_DEBOUNCE_MS = 1_500;

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
  /** Non-null whenever an answer failed to reach durable storage. */
  const [saveError, setSaveError] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("answering");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");
  /**
   * Free stage navigation (Guided Assessment UX) — when set, the next
   * question keeps coming from this stage's dimensions (see
   * `switchToStage`) instead of the engine's global top-ranked pick, until
   * the client switches stage again or the stage runs out of questions.
   */
  const [activeStageId, setActiveStageId] = useState<GuidedStageId | null>(null);

  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const persistence = useMemo(
    () => createClientInterviewPersistence(workspaceId),
    [workspaceId],
  );

  /**
   * Consultant Readiness Engine — the same assessment the planner uses to
   * decide which questions are still worth asking, reused here so the client
   * can see where the current stage stands.
   */
  const readiness = useMemo(
    () => (interview ? assessMemoryReadiness(interview.memory) : null),
    [interview],
  );

  /**
   * Mission C — the "Basado en…" evidence chips next to the active question.
   * Built client-side from what is already in memory (workspace knowledge +
   * live interview memory + the readiness gaps above), so this never adds a
   * network round trip while the client is typing. Document chunks rank by
   * keyword overlap (`buildRetrievalPackSync`) rather than real embeddings —
   * see `RETRIEVAL_PACK.md` for why and the upgrade path.
   */
  const retrievalPack = useMemo(() => {
    const question = interview?.conversation.currentQuestion;
    if (!interview || interview.phase !== "interview" || !question) return null;

    const latestAnswer = interview.conversation.answers.at(-1)?.value ?? null;
    const query = buildRetrievalQuery(question.prompt, question.topic, latestAnswer);
    if (!query.trim()) return null;

    return buildRetrievalPackSync({
      query,
      memory: interview.memory,
      knowledge: workspace?.knowledge ?? null,
      gaps: readiness?.stillLearning ?? [],
    });
  }, [interview, workspace, readiness]);

  /**
   * Mission D — one adaptive follow-up sentence, grounded in the same pack
   * above. Pure presentation: no new fetch, no new persisted state — see
   * `ADAPTIVE_FOLLOWUPS.md`.
   */
  const adaptiveFollowUp = useMemo(
    () =>
      buildAdaptiveFollowUp(
        retrievalPack,
        interview?.phase === "interview" ? interview.conversation.currentQuestion : null,
      ),
    [retrievalPack, interview],
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

      // A saved interview is always loaded from this workspace's own row
      // (Supabase keys on workspace_id, localStorage on the workspace key),
      // so an absent or stale `workspaceId` inside the payload just means it
      // predates that field — adopt it. Starting a fresh interview instead
      // would overwrite every answer already recorded here.
      const existing = await persistence.load();
      if (existing && existing.phase !== "complete") {
        if (cancelled) return;
        setInterview(ensureMemory({ ...existing, workspaceId }));
        return;
      }

      const mode =
        ws.meetings.length > 0 || (ws.conversationMemory?.knownFacts.length ?? 0) > 0
          ? "continue"
          : "begin";
      const fresh = createWorkspaceInterview(ws, mode);
      if (cancelled) return;
      setInterview(fresh);
      await persistence.save(fresh);

      await store.workspaces.save({
        ...ws,
        activeInterviewId: fresh.id,
        updatedAt: nowIso(),
      });
    }

    void boot().catch((error) => {
      if (cancelled) return;
      setBootError(describeError(error));
    });
    return () => {
      cancelled = true;
    };
  }, [persistence, router, store, workspaceId]);

  // Pause = simply stop here. Every state change autosaves, so returning to
  // the workspace never loses an answer.
  useEffect(() => {
    if (!interview || interview.phase === "complete") return;
    void persistence.save(interview);
  }, [interview, persistence]);

  // A write that never lands must be visible, not console-only.
  useEffect(() => {
    const unsubscribe = persistence.onStatusChange((failure) => {
      setSaveError(failure?.message ?? null);
    });
    return () => {
      unsubscribe();
      // Leaving the page cancels the debounce timer — push the buffered
      // answer out before it goes with it.
      void persistence.flush();
      persistence.dispose();
    };
  }, [persistence]);

  /**
   * Mirror the live interview memory into shared company memory so the
   * consultant sees the client's progress while the session is still open —
   * until now that only happened when the interview finished. Reuses the
   * existing workspace repository (Supabase row shared by both accounts);
   * the full meeting/blueprint/report pass still belongs to completion.
   */
  const shareProgress = useCallback(
    async (current: Interview) => {
      if (!workspaceId) return;
      const latest = await store.workspaces.get(workspaceId);
      if (!latest) return;
      const stamp = nowIso();
      await store.workspaces.save({
        ...latest,
        conversationMemory: current.memory,
        businessUnderstanding: current.memory.score.overall,
        activeInterviewId: current.id,
        updatedAt: stamp,
        lastActivityAt: stamp,
        lastActivityLabel: "Descubrimiento en curso",
      });
    },
    [store, workspaceId],
  );

  const pendingShareRef = useRef<Interview | null>(null);

  useEffect(() => {
    if (!interview || interview.phase === "complete") return;
    if (interview.memory.knownFacts.length === 0) return;
    pendingShareRef.current = interview;
    const timer = setTimeout(() => {
      const target = pendingShareRef.current;
      if (!target) return;
      pendingShareRef.current = null;
      void shareProgress(target).catch((error) => {
        setSaveError(describeError(error));
      });
    }, SHARE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [interview, shareProgress]);

  // Leaving mid-debounce must not drop the last shared update.
  useEffect(() => {
    return () => {
      const target = pendingShareRef.current;
      pendingShareRef.current = null;
      if (target) void shareProgress(target);
    };
  }, [shareProgress]);

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
      // Only drop the autosaved interview once company memory has it.
      await persistence.clear();
      setPersistedComplete(true);
      setSaveError(null);
      setWorkspace(next);
      // Business Understanding is now updated in the workspace — navigation
      // back is a deliberate user action (Finish stage), not automatic.
    }

    void persistCompletion().catch((error) => {
      if (cancelled) return;
      setSaveError(describeError(error));
    });
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
    setSaveError(null);

    const answer: Answer = {
      id: createId("answer"),
      questionId: source.conversation.currentQuestion?.id ?? "unknown",
      value: trimmed,
      answeredAt: nowIso(),
    };

    await new Promise((resolve) => setTimeout(resolve, 700));

    try {
      const result = await architectAgent.handleTurn({
        interview: source,
        latestAnswer: answer,
      });
      startTransition(() => {
        setInterview(applyActiveStageFilter(result.interview));
      });
    } catch (error) {
      // Give the answer back rather than clearing the field and leaving the
      // panel stuck on "Actualizando la comprensión…" forever.
      setDraft(trimmed);
      setSaveError(describeError(error));
    } finally {
      setThinking(false);
    }
  }

  /**
   * After the engine's own scoring/next-question pick (`think()`, unchanged),
   * re-narrow to the active stage's dimensions if the client is mid-stage —
   * see `switchToStage`. Releases the filter once that stage has nothing
   * left to ask, falling back to the engine's own (already coherent) pick.
   */
  function applyActiveStageFilter(candidate: Interview): Interview {
    if (!activeStageId || candidate.phase !== "interview") return candidate;
    const switched = switchToStage(candidate, GUIDED_STAGES[activeStageId]);
    if (switched.stageDone) {
      setActiveStageId(null);
      return candidate;
    }
    return switched.interview;
  }

  function handleSkipQuestion() {
    if (!interview) return;
    setInterview(applyActiveStageFilter(skipCurrentQuestion(interview)));
  }

  function handleSkipStage(stageId: GuidedStageId) {
    if (!interview) return;
    const dimensions = new Set<string>(GUIDED_STAGES[stageId].dimensions);
    setActiveStageId(null);
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

  if (bootError) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6">
        <Card className="px-7 py-8" role="alert">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-tint-red-ink)]">
            No se pudo abrir la evaluación
          </p>
          <p className="mt-3 text-base leading-relaxed text-[var(--isalwa-kiln)]">
            Sus respuestas guardadas siguen intactas — no se inició una sesión
            nueva. Vuelva a intentarlo en unos segundos.
          </p>
          <p className="mt-2 text-sm text-[var(--isalwa-slate)]/80">{bootError}</p>
          <div className="mt-6">
            <Button size="lg" onClick={() => window.location.reload()}>
              Reintentar
            </Button>
          </div>
        </Card>
      </div>
    );
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
    if (!interview || isComplete) return;
    if (stageId === "finish") return;

    const targetStage = GUIDED_STAGES[stageId];
    // Free navigation (any order): a stage with real discovery dimensions
    // (Comercial/Operaciones/Finanzas/Tecnología/Equipo) re-narrows the same
    // adaptive engine (see `switchToStage`) to that stage's questions instead
    // of forcing Review. Meta stages (Bienvenida/Empresa/Revisión) and the
    // brief identity onboarding before the adaptive engine starts still open
    // the read-only Review, where any stage's collected answers already live.
    if (
      stageId === "review" ||
      targetStage.dimensions.length === 0 ||
      interview.phase !== "interview"
    ) {
      setViewMode("reviewing");
      return;
    }

    const switched = switchToStage(interview, targetStage);
    setActiveStageId(stageId);
    setViewMode("answering");
    setInterview(switched.interview);
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

      {saveError ? (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-tint-red-border)] bg-[var(--isalwa-tint-red)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--isalwa-tint-red-ink)]">
              Sus respuestas no se han guardado
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--isalwa-kiln)]">
              No cierre esta página. Reintente el guardado — si vuelve a
              fallar, avise al consultor.
            </p>
            <p className="mt-1 text-sm text-[var(--isalwa-slate)]/80">
              {saveError}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void persistence.flush();
              if (interview) {
                void shareProgress(interview).catch((error) => {
                  setSaveError(describeError(error));
                });
              }
            }}
          >
            Reintentar guardado
          </Button>
        </div>
      ) : null}

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
                  readiness={
                    readiness
                      ? pickTopicReadiness(readiness, stageDef.dimensions)
                      : null
                  }
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
                    retrievalPack={retrievalPack}
                    adaptiveFollowUp={adaptiveFollowUp}
                  />
                </div>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <DiscoveryScoreCard score={interview.memory.score} />
            <LivingWhiteboard board={interview.memory.whiteboard} />

            <div>
              <p className="isalwa-kicker isalwa-ink-blue">Hallazgos del consultor</p>
              <div className="mt-3 space-y-3">
                {interview.observations.length === 0 ? (
                  <EmptyState
                    tone="executive"
                    icon={Search}
                    title="Aún no hay hallazgos — el Arquitecto no inventa conclusiones."
                    whyItMatters="Un hallazgo prematuro llevaría a recomendar antes de entender de verdad. Aparece en cuanto haya evidencia real que lo sostenga."
                  />
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
            </div>

            <div>
              <p className="isalwa-kicker isalwa-ink-green">Oportunidades</p>
              <div className="mt-3">
                <OpportunityList opportunities={interview.opportunities} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
