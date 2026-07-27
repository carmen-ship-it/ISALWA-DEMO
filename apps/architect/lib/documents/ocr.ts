/**
 * AI Document Processing Pipeline — stage 1, optical character recognition.
 *
 * OCR needs a vision model, which needs an API key, which must never reach
 * the browser. So the client sends the image to `/api/documents/ocr` and the
 * server decides: with a key it performs real recognition; without one it
 * answers `available: false` and a reason. There is no fake OCR path — a
 * document that could not be read is reported as not read.
 *
 * Configure with `ARCHITECT_OCR_API_KEY` (or the shared
 * `ARCHITECT_LLM_API_KEY` / `OPENAI_API_KEY`), optionally
 * `ARCHITECT_OCR_MODEL` and `ARCHITECT_LLM_BASE_URL`.
 */

export type OcrStatus = "completed" | "unavailable" | "failed" | "not_applicable";

export interface OcrOutcome {
  status: OcrStatus;
  text: string;
  /** Model id that produced the text, when one did. */
  provider: string | null;
  /** Developer-facing explanation whenever `status !== "completed"`. */
  reason: string | null;
}

/**
 * Images are sent inline as base64, so they have to stay small. Bigger files
 * are reported as not processed rather than silently downscaled — resizing a
 * scan changes what the model can read, and we would not be able to say how.
 */
export const MAX_OCR_BYTES = 6 * 1024 * 1024;

interface OcrApiResponse {
  available?: boolean;
  text?: string;
  model?: string;
  reason?: string;
}

async function toBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const CHUNK = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }
  return btoa(binary);
}

export async function runDocumentOcr(file: File): Promise<OcrOutcome> {
  if (file.size > MAX_OCR_BYTES) {
    return {
      status: "unavailable",
      text: "",
      provider: null,
      reason: `Image is ${Math.round(file.size / (1024 * 1024))}MB; optical character recognition is limited to ${Math.round(MAX_OCR_BYTES / (1024 * 1024))}MB per file.`,
    };
  }

  try {
    const base64 = await toBase64(file);
    const response = await fetch("/api/documents/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type || "image/png",
        base64,
      }),
    });

    if (!response.ok) {
      return {
        status: "failed",
        text: "",
        provider: null,
        reason: `OCR endpoint returned ${response.status}.`,
      };
    }

    const payload = (await response.json()) as OcrApiResponse;
    if (payload.available === false) {
      return {
        status: "unavailable",
        text: "",
        provider: null,
        reason: payload.reason ?? "No optical character recognition provider is configured.",
      };
    }

    const text = (payload.text ?? "").trim();
    if (!text) {
      return {
        status: "failed",
        text: "",
        provider: payload.model ?? null,
        reason: "The provider returned no text for this image.",
      };
    }

    return { status: "completed", text, provider: payload.model ?? null, reason: null };
  } catch (error) {
    return {
      status: "failed",
      text: "",
      provider: null,
      reason: error instanceof Error ? error.message : "Unknown OCR error.",
    };
  }
}
