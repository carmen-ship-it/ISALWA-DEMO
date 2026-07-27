import { NextResponse } from "next/server";

/**
 * AI Document Processing Pipeline — optical character recognition endpoint.
 *
 * Same contract as the embeddings route: the key never leaves the server,
 * and "no key configured" is a normal 200 response (`available: false`) that
 * the pipeline reports honestly, not an error it hides.
 *
 * Recognition uses an OpenAI-compatible vision chat completion, which is the
 * provider family this codebase already speaks (`lib/llm/provider.ts`). The
 * prompt asks for transcription only — no summarizing, no interpreting — so
 * the text that reaches the detectors is what the document actually says.
 */

export const runtime = "nodejs";

const DEFAULT_MODEL = "gpt-4o-mini";
/** Base64 inflates by ~4/3; keep in step with `MAX_OCR_BYTES` client-side. */
const MAX_BASE64_CHARS = 9 * 1024 * 1024;

const TRANSCRIPTION_PROMPT = [
  "Transcribe all readable text in this image exactly as it appears.",
  "Preserve line breaks, headings, table rows and labels.",
  "Do not summarize, translate, explain or add anything that is not written in the image.",
  "If the image contains no readable text, reply with an empty response.",
].join(" ");

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

  const model = process.env.ARCHITECT_OCR_MODEL ?? DEFAULT_MODEL;
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
  const baseUrl = (
    process.env.ARCHITECT_OCR_BASE_URL ??
    process.env.ARCHITECT_LLM_BASE_URL ??
    "https://api.openai.com/v1"
  ).replace(/\/$/, "");

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 4_000,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: TRANSCRIPTION_PROMPT },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64}` },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("OCR provider error:", response.status, await response.text());
      return NextResponse.json({
        available: false,
        model,
        reason: `The optical character recognition provider rejected the request (${response.status}).`,
      });
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return NextResponse.json({
      available: true,
      model,
      text: (payload.choices?.[0]?.message?.content ?? "").trim(),
    });
  } catch (error) {
    console.error("OCR request failed:", error);
    return NextResponse.json({
      available: false,
      model,
      reason: "The optical character recognition provider could not be reached.",
    });
  }
}

/** Capability probe — lets the UI describe the pipeline without sending an image. */
export async function GET() {
  return NextResponse.json({
    service: "architect-document-ocr",
    available: Boolean(resolveApiKey()),
    model: process.env.ARCHITECT_OCR_MODEL ?? DEFAULT_MODEL,
  });
}
