"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { architectAgent } from "@/agents";
import { ArchitectNav } from "@/components/nav/architect-nav";
import { BackLink } from "@/components/nav/back-link";
import { DiscoveryScoreCard } from "@/components/discovery/discovery-score-card";
import { LivingWhiteboard } from "@/components/discovery/living-whiteboard";
import { OpportunityList } from "@/components/discovery/opportunity-list";
import { ObservationCard } from "@/components/shared/observation-card";
import { TypingIndicator } from "@/components/shared/typing-indicator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyInterviewToWorkspace } from "@/lib/memory";
import { createLocalInterviewPersistence } from "@/lib/persistence";
import { getClientCompanyMemoryStore } from "@/lib/repositories";
import { emptyConsultingIntelligence, emptyConsultingWhiteboardFields } from "@/lib/consulting";
import { createEmptyMemory } from "@/lib/reasoning";
import { createWorkspaceInterview } from "@/lib/resume";
import { createId, nowIso } from "@/lib/utils";
import type { Answer, CompanyWorkspace, Interview } from "@/types";

function ensureMemory(interview: Interview): Interview {
  const baseMemory = interview.memory?.score && interview.memory.whiteboard
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

export function DiscoveryExperience() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspaceId");

  const [interview, setInterview] = useState<Interview | null>(null);
  const [workspace, setWorkspace] = useState<CompanyWorkspace | null>(null);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [persistedComplete, setPersistedComplete] = useState(false);

  const store = useMemo(() => getClientCompanyMemoryStore(), []);
  const persistence = useMemo(
    () =>
      createLocalInterviewPersistence(
        typeof window !== "undefined" ? window.localStorage : null,
        workspaceId,
      ),
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

      const existing = persistence.load();
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
      persistence.save(fresh);

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

  useEffect(() => {
    if (!interview || interview.phase === "complete") return;
    persistence.save(interview);
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
      persistence.clear();
      setPersistedComplete(true);
      setWorkspace(next);
      router.push(`/workspace/${next.id}?completed=1`);
    }

    void persistCompletion();
    return () => {
      cancelled = true;
    };
  }, [
    interview,
    persistence,
    persistedComplete,
    router,
    store,
    workspace,
  ]);

  async function respond(value: string) {
    if (!interview || thinking) return;
    const trimmed = value.trim();
    if (!trimmed) return;

    setThinking(true);
    setDraft("");

    const answer: Answer = {
      id: createId("answer"),
      questionId: interview.conversation.currentQuestion?.id ?? "unknown",
      value: trimmed,
      answeredAt: nowIso(),
    };

    await new Promise((resolve) => setTimeout(resolve, 700));

    startTransition(() => {
      void architectAgent
        .handleTurn({
          interview,
          latestAnswer: answer,
        })
        .then((result) => {
          setInterview(result.interview);
          setThinking(false);
        });
    });
  }

  if (!interview || !workspace) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <TypingIndicator />
      </div>
    );
  }

  const question = interview.conversation.currentQuestion;
  const latestArchitect = [...interview.conversation.turns]
    .reverse()
    .find((turn) => turn.role === "architect");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 sm:px-10">
      <BackLink
        href={`/workspace/${workspace.id}`}
        label="Volver al workspace"
        className="mb-6"
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-500">
            Interview · {workspace.companyName}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            ~{interview.estimatedMinutesRemaining} min remaining
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <ArchitectNav
            workspaceHref={`/workspace/${workspace.id}`}
            interviewHref={`/discovery?workspaceId=${workspace.id}`}
          />
          <p className="text-sm text-neutral-500">
            {interview.memory.summary.belief}
          </p>
        </div>
      </header>

      <div className="mt-10 grid flex-1 gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
        <section className="flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={latestArchitect?.id ?? "empty"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <Card className="px-7 py-8 sm:px-10 sm:py-10">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
                  Architect
                </p>
                <div className="prose-architect mt-5 text-lg leading-relaxed text-neutral-900 sm:text-xl">
                  {latestArchitect?.content}
                </div>
                {thinking || isPending || interview.phase === "synthesizing" ? (
                  <div className="mt-8 flex items-center gap-3 text-sm text-neutral-500">
                    <TypingIndicator />
                    <span>Updating working memory…</span>
                  </div>
                ) : null}
              </Card>
            </motion.div>
          </AnimatePresence>

          {!thinking && question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="mt-8"
            >
              {question.kind === "choice" || question.kind === "confirmation" ? (
                <div className="flex flex-wrap gap-3">
                  {question.choices?.map((choice) => (
                    <Button
                      key={choice.id}
                      variant={
                        choice.value === "yes" ? "default" : "secondary"
                      }
                      size="lg"
                      onClick={() => void respond(choice.value)}
                    >
                      {choice.label}
                    </Button>
                  ))}
                </div>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void respond(draft);
                  }}
                >
                  {question.kind === "long_text" ? (
                    <textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={question.placeholder ?? "Share what is true…"}
                      rows={5}
                      className="w-full resize-none rounded-3xl border border-neutral-200 bg-white px-5 py-4 text-base leading-relaxed text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-400"
                    />
                  ) : (
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      placeholder={question.placeholder ?? "Your answer"}
                      className="w-full rounded-full border border-neutral-200 bg-white px-5 py-4 text-base text-neutral-900 shadow-[0_8px_30px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-400"
                    />
                  )}
                  <Button type="submit" size="lg" disabled={!draft.trim()}>
                    Continue
                  </Button>
                </form>
              )}
            </motion.div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <DiscoveryScoreCard score={interview.memory.score} />
          <LivingWhiteboard board={interview.memory.whiteboard} />

          <div className="rounded-3xl border border-neutral-200/80 bg-white/70 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Consultant insights
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Appear when confidence and evidence support them.
            </p>
          </div>

          <div className="space-y-3">
            {interview.observations.length === 0 ? (
              <Card className="px-5 py-6 text-sm text-neutral-500">
                No observations yet — the Architect will not invent them.
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

          <div className="rounded-3xl border border-neutral-200/80 bg-white/70 px-5 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
              Opportunities
            </p>
          </div>
          <OpportunityList opportunities={interview.opportunities} />
        </aside>
      </div>
    </div>
  );
}
