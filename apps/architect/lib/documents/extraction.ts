/**
 * AI Document Processing Pipeline — stage 2, text extraction.
 *
 * Reads the bytes the browser already holds and turns them into plain text
 * the detectors can scan. This runs entirely client-side, next to
 * `lib/documents/storage.ts`, so no file is uploaded twice.
 *
 * What is real today, with no dependencies and no API key:
 *   .txt .md .markdown  → read verbatim (Markdown syntax stripped to prose)
 *   .csv                → flattened to one readable sentence per row
 *   text/* MIME types   → read verbatim
 *
 * What honestly cannot be read here:
 *   .pdf .doc .docx .xls .xlsx .ppt .pptx → these are binary/zip container
 *     formats. Reading them requires a parser dependency (pdfjs, mammoth,
 *     sheetjs) that this app deliberately does not carry yet, so the
 *     pipeline reports `unsupported_format` and the document keeps the
 *     filename/type classification it always got. It is never described as
 *     "read".
 *   images → routed to OCR (`lib/documents/ocr.ts`), which needs a vision
 *     API key. Without one the pipeline says so instead of guessing.
 *
 * See `AI_DOCUMENT_PROCESSING_PIPELINE.md` for the upgrade path for each.
 */

export type TextExtractionStatus =
  | "extracted"
  | "requires_ocr"
  | "unsupported_format"
  | "empty";

export type TextExtractionMethod =
  | "plain_text"
  | "markdown"
  | "csv_flatten"
  | "ocr"
  | "none";

export interface TextExtractionResult {
  status: TextExtractionStatus;
  method: TextExtractionMethod;
  text: string;
  charCount: number;
  /** Developer-facing explanation when no text was produced. Null on success. */
  reason: string | null;
}

/** Guardrail: a single document contributes at most this much text downstream. */
export const MAX_EXTRACTED_CHARS = 400_000;

const PLAIN_TEXT_EXTENSIONS = new Set(["txt", "text", "log"]);
const MARKDOWN_EXTENSIONS = new Set(["md", "markdown", "mdx"]);
const CSV_EXTENSIONS = new Set(["csv", "tsv"]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif", "heic", "bmp", "tiff"]);
const BINARY_DOCUMENT_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
]);

export function extensionOf(fileName: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return match ? match[1]!.toLowerCase() : "";
}

export function isImageDocument(fileName: string, mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") || IMAGE_EXTENSIONS.has(extensionOf(fileName))
  );
}

/**
 * Markdown is read as prose: the syntax carries no business meaning for the
 * detectors, and leaving `##` or `|---|` in place would create sentences
 * that are punctuation rather than statements.
 */
function markdownToProse(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s*\|?[-:\s|]+\|\s*$/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^\s*[-*_]{3,}\s*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitDelimited(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/**
 * A CSV is data, not prose — but the detectors reason over sentences. Each
 * row becomes one sentence of `Header: value` pairs so a column named
 * "Proveedor" or "Aprobado por" is actually visible to them. Headers are
 * repeated per row on purpose: that is what carries the meaning.
 */
function csvToProse(raw: string): string {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";

  const delimiter = raw.includes("\t") && !raw.includes(",") ? "\t" : ",";
  const headers = splitDelimited(lines[0]!, delimiter).map((header) =>
    header.replace(/^"|"$/g, "").trim(),
  );

  const headerSentence = `Columnas del archivo: ${headers.filter(Boolean).join(", ")}.`;

  const MAX_ROWS = 300;
  const rows = lines.slice(1, 1 + MAX_ROWS).map((line, rowIndex) => {
    const cells = splitDelimited(line, delimiter);
    const pairs = headers
      .map((header, cellIndex) => {
        const value = (cells[cellIndex] ?? "").replace(/^"|"$/g, "").trim();
        if (!header || !value) return null;
        return `${header}: ${value}`;
      })
      .filter(Boolean);
    if (pairs.length === 0) return "";
    return `Fila ${rowIndex + 1} — ${pairs.join("; ")}.`;
  });

  const omitted = Math.max(0, lines.length - 1 - MAX_ROWS);
  const footer =
    omitted > 0
      ? `\nSe analizaron las primeras ${MAX_ROWS} filas de ${lines.length - 1}; ${omitted} filas adicionales no se revisaron en esta pasada.`
      : "";

  return [headerSentence, ...rows.filter(Boolean)].join("\n") + footer;
}

function truncate(text: string): string {
  return text.length > MAX_EXTRACTED_CHARS
    ? text.slice(0, MAX_EXTRACTED_CHARS)
    : text;
}

function empty(
  status: TextExtractionStatus,
  reason: string,
  method: TextExtractionMethod = "none",
): TextExtractionResult {
  return { status, method, text: "", charCount: 0, reason };
}

/**
 * Extract text from an uploaded file. Never throws for an unreadable format
 * — an unreadable format is a normal, reportable outcome of this stage, not
 * an error, and the pipeline continues to the stages that do not need text.
 */
export async function extractDocumentText(
  file: File,
): Promise<TextExtractionResult> {
  const extension = extensionOf(file.name);
  const mimeType = file.type ?? "";

  if (isImageDocument(file.name, mimeType)) {
    return empty(
      "requires_ocr",
      "Image formats carry no text layer — optical character recognition is required.",
    );
  }

  if (BINARY_DOCUMENT_EXTENSIONS.has(extension)) {
    return empty(
      "unsupported_format",
      `".${extension}" is a binary/container format; a parser dependency is required to read it. Classification from filename/type still applies.`,
    );
  }

  const isCsv = CSV_EXTENSIONS.has(extension) || mimeType === "text/csv";
  const isMarkdown = MARKDOWN_EXTENSIONS.has(extension) || mimeType === "text/markdown";
  const isPlainText =
    PLAIN_TEXT_EXTENSIONS.has(extension) ||
    mimeType.startsWith("text/") ||
    mimeType === "application/json";

  if (!isCsv && !isMarkdown && !isPlainText) {
    return empty(
      "unsupported_format",
      `No text reader is registered for ".${extension || "unknown"}" (${mimeType || "unknown MIME type"}).`,
    );
  }

  let raw: string;
  try {
    raw = await file.text();
  } catch (error) {
    return empty(
      "unsupported_format",
      `Reading the file as text failed: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }

  const method: TextExtractionMethod = isCsv
    ? "csv_flatten"
    : isMarkdown
      ? "markdown"
      : "plain_text";

  const text = truncate(
    isCsv ? csvToProse(raw) : isMarkdown ? markdownToProse(raw) : raw.replace(/[ \t]+/g, " ").trim(),
  );

  if (!text.trim()) {
    return empty("empty", "The file was read successfully but contains no text.", method);
  }

  return { status: "extracted", method, text, charCount: text.length, reason: null };
}

/** Wrap OCR output in the same result shape so callers have one code path. */
export function extractionFromOcr(text: string): TextExtractionResult {
  const trimmed = truncate(text.trim());
  if (!trimmed) {
    return empty("empty", "Optical character recognition returned no text.", "ocr");
  }
  return {
    status: "extracted",
    method: "ocr",
    text: trimmed,
    charCount: trimmed.length,
    reason: null,
  };
}
