import { NextResponse } from "next/server";
import { ai, AI_CONFIG } from "@/lib/ai";

/**
 * AI Document Processing Pipeline — embeddings endpoint.
 *
 * The API key stays server-side. Two honest responses, never a third:
 *  - 200 `{ available: false, reason }` when no key is configured. The
 *    pipeline stores the chunks with `embeddingStatus: "pending"` and says
 *    so in the run log. This is the default in local/dev.
 *  - 200 `{ vectors }` when a key is configured and the provider answered.
 *
 * Routed through `lib/ai` — works with any OpenAI-compatible `/embeddings`
 * endpoint (OpenAI, Azure, Together, Ollama) as well as Gemini, with no
 * vendor lock and no hardcoded model here.
 */

export const runtime = "nodejs";

const DEFAULT_MODEL = AI_CONFIG.embeddingModel;
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

  const baseUrl = process.env.ARCHITECT_EMBEDDINGS_BASE_URL ?? process.env.ARCHITECT_LLM_BASE_URL;

  try {
    const result = await ai.embed(
      inputs.map((text) => text.slice(0, MAX_INPUT_CHARS)),
      { model, apiKey, baseUrl },
    );

    if (result.vectors.length !== inputs.length) {
      return NextResponse.json({
        available: false,
        model: result.model,
        dimensions: DEFAULT_DIMENSIONS,
        reason: "The embeddings provider returned an unexpected number of vectors.",
      });
    }

    return NextResponse.json({
      available: true,
      model: result.model,
      dimensions: result.dimensions || DEFAULT_DIMENSIONS,
      vectors: result.vectors,
    });
  } catch (error) {
    console.error("Embeddings request failed:", error);
    return NextResponse.json({
      available: false,
      model,
      dimensions: DEFAULT_DIMENSIONS,
      reason:
        error instanceof Error
          ? `The embeddings provider could not be reached: ${error.message}`
          : "The embeddings provider could not be reached.",
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
