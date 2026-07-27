import { NextResponse } from "next/server";

/**
 * AI Document Processing Pipeline — embeddings endpoint.
 *
 * The API key stays server-side. Two honest responses, never a third:
 *  - 200 `{ available: false, reason }` when no key is configured. The
 *    pipeline stores the chunks with `embeddingStatus: "pending"` and says
 *    so in the run log. This is the default in local/dev.
 *  - 200 `{ vectors }` when a key is configured and the provider answered.
 *
 * Works with any OpenAI-compatible `/v1/embeddings` endpoint (OpenAI, Azure,
 * Together, a local Ollama), matching `lib/llm/provider.ts` — no vendor lock.
 */

export const runtime = "nodejs";

const DEFAULT_MODEL = "text-embedding-3-small";
const DEFAULT_DIMENSIONS = 1536;
/** Matches `EMBEDDING_BATCH_SIZE` in `lib/documents/embeddings.ts`. */
const MAX_INPUTS = 32;
const MAX_INPUT_CHARS = 8_000;

interface EmbeddingsRequestBody {
  inputs?: unknown;
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ARCHITECT_EMBEDDINGS_API_KEY ??
    process.env.ARCHITECT_LLM_API_KEY ??
    process.env.OPENAI_API_KEY
  );
}

export async function POST(request: Request) {
  const { getServerSession } = await import("@/lib/auth");
  const session = await getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const model = process.env.ARCHITECT_EMBEDDINGS_MODEL ?? DEFAULT_MODEL;
  const apiKey = resolveApiKey();

  if (!apiKey) {
    return NextResponse.json({
      available: false,
      model,
      dimensions: DEFAULT_DIMENSIONS,
      reason:
        "No embeddings API key is configured (ARCHITECT_EMBEDDINGS_API_KEY / ARCHITECT_LLM_API_KEY / OPENAI_API_KEY). Chunks are stored without vectors.",
    });
  }

  const body = (await request.json()) as EmbeddingsRequestBody;
  const inputs = Array.isArray(body.inputs)
    ? body.inputs.filter((value): value is string => typeof value === "string")
    : [];

  if (inputs.length === 0) {
    return NextResponse.json({ error: "inputs is required" }, { status: 400 });
  }
  if (inputs.length > MAX_INPUTS) {
    return NextResponse.json(
      { error: `inputs is limited to ${MAX_INPUTS} chunks per request` },
      { status: 400 },
    );
  }

  const baseUrl = (
    process.env.ARCHITECT_EMBEDDINGS_BASE_URL ??
    process.env.ARCHITECT_LLM_BASE_URL ??
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: inputs.map((text) => text.slice(0, MAX_INPUT_CHARS)),
      }),
    });

    if (!response.ok) {
      // The upstream body can contain account details — log it, return a
      // generic reason. The client renders translated copy either way.
      console.error(
        "Embeddings provider error:",
        response.status,
        await response.text(),
      );
      return NextResponse.json({
        available: false,
        model,
        dimensions: DEFAULT_DIMENSIONS,
        reason: `The embeddings provider rejected the request (${response.status}).`,
      });
    }

    const payload = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };

    const ordered = [...(payload.data ?? [])].sort(
      (a, b) => (a.index ?? 0) - (b.index ?? 0),
    );
    const vectors = ordered
      .map((item) => item.embedding)
      .filter((vector): vector is number[] => Array.isArray(vector));

    if (vectors.length !== inputs.length) {
      return NextResponse.json({
        available: false,
        model,
        dimensions: DEFAULT_DIMENSIONS,
        reason: "The embeddings provider returned an unexpected number of vectors.",
      });
    }

    return NextResponse.json({
      available: true,
      model,
      dimensions: vectors[0]?.length ?? DEFAULT_DIMENSIONS,
      vectors,
    });
  } catch (error) {
    console.error("Embeddings request failed:", error);
    return NextResponse.json({
      available: false,
      model,
      dimensions: DEFAULT_DIMENSIONS,
      reason: "The embeddings provider could not be reached.",
    });
  }
}

/** Capability probe — lets the UI describe the pipeline without sending data. */
export async function GET() {
  return NextResponse.json({
    service: "architect-document-embeddings",
    available: Boolean(resolveApiKey()),
    model: process.env.ARCHITECT_EMBEDDINGS_MODEL ?? DEFAULT_MODEL,
    dimensions: DEFAULT_DIMENSIONS,
  });
}
