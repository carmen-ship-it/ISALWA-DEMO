import { NextResponse } from "next/server";
import { architectAgent } from "@/agents";
import { createInterview } from "@/domain/interview-engine";
import { synthesizeReport } from "@/domain/report";
import type { Interview } from "@/types";

export const runtime = "nodejs";

interface InterviewRequestBody {
  interview?: Interview;
  answer?: string;
  action?: "start" | "answer" | "synthesize";
}

/**
 * Server endpoint for discovery turns.
 * Mission 0 uses the deterministic Architect engine.
 * LLM enhancement can plug in later without changing this contract.
 */
export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as InterviewRequestBody;
  const action = body.action ?? "answer";

  if (action === "start") {
    const interview = createInterview();
    return NextResponse.json({ interview });
  }

  if (!body.interview) {
    return NextResponse.json(
      { error: "interview is required" },
      { status: 400 },
    );
  }

  if (action === "synthesize") {
    const report = synthesizeReport(body.interview);
    const interview: Interview = {
      ...body.interview,
      phase: "complete",
      report,
      estimatedMinutesRemaining: 0,
    };
    return NextResponse.json({ interview, report });
  }

  if (!body.answer?.trim()) {
    return NextResponse.json({ error: "answer is required" }, { status: 400 });
  }

  const result = await architectAgent.handleTurn({
    interview: body.interview,
    latestAnswer: {
      id: "api_answer",
      questionId: body.interview.conversation.currentQuestion?.id ?? "unknown",
      value: body.answer,
      answeredAt: new Date().toISOString(),
    },
  });

  return NextResponse.json(result);
}

/** Kept for completeness — client currently uses the agent directly. */
export async function GET() {
  return NextResponse.json({
    service: "isalwa-architect",
    agent: architectAgent.name,
    status: "ready",
  });
}
