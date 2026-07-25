import { synthesizeReport } from "@/domain/report";
import { createInterview, submitAnswer } from "@/domain/interview-engine";
import { createId, nowIso } from "@/lib/utils";
import type {
  AgentContext,
  ArchitectAgent,
} from "@/types/agents";
import type {
  ArchitectTurnInput,
  ArchitectTurnResult,
  DiscoveryReport,
  Observation,
} from "@/types";

/**
 * Architect Agent — the only agent implemented in Mission 0.
 * Uses the deterministic interview engine today.
 * LLM provider can enhance phrasing later without changing the contract.
 */
export class IsalwaArchitectAgent implements ArchitectAgent {
  readonly id = "agent_architect";
  readonly role = "architect" as const;
  readonly name = "ISALWA Architect";
  readonly description =
    "Leads discovery interviews and produces the operating-system blueprint.";
  readonly status = "active" as const;
  readonly capabilities = [
    "guided_onboarding",
    "adaptive_interview",
    "working_memory",
    "discovery_score",
    "signal_detection",
    "observation_generation",
    "opportunity_engine",
    "discovery_report_synthesis",
  ] as const;

  async introduce(context: AgentContext): Promise<string> {
    const first = context.conversation.turns.find(
      (turn) => turn.role === "architect",
    );
    return first?.content ?? "Hello. I'm the ISALWA Architect.";
  }

  async nextQuestion(context: AgentContext): Promise<ArchitectTurnResult> {
    return {
      interview: context.interview,
      architectMessage:
        context.interview.conversation.currentQuestion?.prompt ??
        "Tell me more.",
      observations: context.interview.observations,
      report: context.interview.report,
    };
  }

  async observe(context: AgentContext): Promise<Observation[]> {
    return context.interview.observations;
  }

  async synthesize(context: AgentContext): Promise<DiscoveryReport> {
    return synthesizeReport(context.interview);
  }

  async handleTurn(input: ArchitectTurnInput): Promise<ArchitectTurnResult> {
    if (!input.latestAnswer) {
      return {
        interview: input.interview,
        architectMessage:
          input.interview.conversation.turns.at(-1)?.content ?? "",
        observations: input.interview.observations,
        report: input.interview.report,
      };
    }

    let interview = submitAnswer(input.interview, input.latestAnswer.value);

    if (interview.phase === "synthesizing") {
      const report = synthesizeReport(interview);
      interview = {
        ...interview,
        phase: "complete",
        report,
        estimatedMinutesRemaining: 0,
        updatedAt: nowIso(),
        conversation: {
          ...interview.conversation,
          turns: [
            ...interview.conversation.turns,
            {
              id: createId("turn"),
              role: "architect",
              content:
                "The discovery blueprint is ready. It is a working document — not a final architecture — and it should guide what we build next.",
              createdAt: nowIso(),
            },
          ],
        },
      };
    }

    const architectMessage =
      interview.conversation.turns
        .filter((turn) => turn.role === "architect")
        .at(-1)?.content ?? "";

    return {
      interview,
      architectMessage,
      observations: interview.observations,
      report: interview.report,
    };
  }
}

export function startInterview() {
  return createInterview();
}

export const architectAgent = new IsalwaArchitectAgent();
