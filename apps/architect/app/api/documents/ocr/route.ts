import { NextResponse } from "next/server";
import { ai, AI_CONFIG } from "@/lib/ai";
import { PROMPTS } from "@/lib/ai/prompts";

/**
 * AI Document Processing Pipeline — optical character recognition endpoint.
 *
 * Same contract as the embeddings route: the key never leaves the server,
 * and "no key configured" is a normal 200 response (`available: false`) that
 * the pipeline reports honestly, not an error it hides.
 *
 * Recognition uses a vision chat completion routed through `lib/ai` — the
 * central provider abstraction that speaks OpenAI-compatible, Gemini and
 * Anthropic without this route knowing which one answered. The prompt asks
 * for transcription only — no summarizing, no interpreting — so the text
 * that reaches the detectors is what the document actually says.
 */

export const runtime = "nodejs";

/** Base64 inflates by ~4/3; keep in step with `MAX_OCR_BYTES` client-side. */
const MAX_BASE64_CHARS = 9 * 1024 * 1024;

interface OcrRequestBody {
  fileName?: string;
  mimeType?: string;
  base64?: string;
}

function resolveApiKey(): string | undefined {
  return (
    process.env.ARCHITECT_OCR_API_KEY ??
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

  const model = process.env.ARCHITECT_OCR_MODEL ?? AI_CONFIG.model;
  const apiKey = resolveApiKey();

  if (!apiKey) {
    return NextResponse.json({
      available: false,
      model,
      reason:
        "No optical character recognition key is configured (ARCHITECT_OCR_API_KEY / ARCHITECT_LLM_API_KEY / OPENAI_API_KEY). Images are stored and classified, but their content is not read.",
    });
  }

  const body = (await request.json()) as OcrRequestBody;
  const base64 = body.base64?.trim();
  if (!base64) {
    return NextResponse.json({ error: "base64 is required" }, { status: 400 });
  }
  if (base64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "image is too large" }, { status: 413 });
  }

  const mimeType = body.mimeType?.startsWith("image/") ? body.mimeType : "image/png";
  const baseUrl = process.env.ARCHITECT_OCR_BASE_URL ?? process.env.ARCHITECT_LLM_BASE_URL;

  try {
    const result = await ai.chat(
      [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPTS.documentTranscription },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64}` },
            },
          ],
        },
      ],
      { model, apiKey, baseUrl, temperature: 0, maxTokens: 4_000 },
    );

    return NextResponse.json({
      available: true,
      model: result.model,
      text: result.text.trim(),
    });
  } catch (error) {
    console.error("OCR request failed:", error);
    return NextResponse.json({
      available: false,
      model,
      reason:
        error instanceof Error
          ? `The optical character recognition provider could not process the image: ${error.message}`
          : "The optical character recognition provider could not be reached.",
    });
  }
}

/** Capability probe — lets the UI describe the pipeline without sending an image. */
export async function GET() {
  return NextResponse.json({
    service: "architect-document-ocr",
    available: Boolean(resolveApiKey()),
    model: process.env.ARCHITECT_OCR_MODEL ?? AI_CONFIG.model,
  });
}
