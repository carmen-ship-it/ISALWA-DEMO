/**
 * AI Document Processing Pipeline — stage 3, chunking.
 *
 * Fully real, no API key required: splitting a document into retrievable
 * slices is deterministic work. The chunks produced here are what gets
 * embedded (stage 4) and stored (stage 5); when no embeddings provider is
 * configured the chunks are still persisted with their offsets, so the day a
 * key is added the vectors can be backfilled without re-reading anything.
 *
 * Strategy: paragraph-first, sentence-fallback, with a fixed character
 * overlap so a statement that straddles a boundary is not lost. Same input
 * always yields the same chunks — chunk ids are derived from the asset id
 * and the index, never from a timestamp or a random seed.
 */

export const CHUNK_TARGET_CHARS = 1_200;
export const CHUNK_OVERLAP_CHARS = 150;
/** Guardrail so one large upload cannot write an unbounded number of records. */
export const MAX_CHUNKS_PER_DOCUMENT = 200;

export interface DocumentChunk {
  index: number;
  text: string;
  charCount: number;
  startOffset: number;
  endOffset: number;
}

export interface ChunkingOptions {
  targetChars?: number;
  overlapChars?: number;
  maxChunks?: number;
}

interface Block {
  text: string;
  start: number;
}

/**
 * Split into paragraphs, keeping each one's offset into the original text so
 * a chunk can always be traced back to where it came from.
 */
function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const pattern = /\n\s*\n/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const block = text.slice(cursor, match.index);
    if (block.trim()) blocks.push({ text: block, start: cursor });
    cursor = match.index + match[0].length;
  }
  const tail = text.slice(cursor);
  if (tail.trim()) blocks.push({ text: tail, start: cursor });

  return blocks;
}

/** A paragraph longer than the target is split on sentence boundaries. */
function splitOversizedBlock(block: Block, targetChars: number): Block[] {
  if (block.text.length <= targetChars) return [block];

  const pieces: Block[] = [];
  const pattern = /(?<=[.!?;])\s+/g;
  let cursor = 0;
  let buffer = "";
  let bufferStart = 0;
  let match: RegExpExecArray | null;

  const flush = () => {
    if (buffer.trim()) {
      pieces.push({ text: buffer, start: block.start + bufferStart });
    }
    buffer = "";
  };

  while ((match = pattern.exec(block.text)) !== null) {
    const sentence = block.text.slice(cursor, match.index + match[0].length);
    if (buffer.length + sentence.length > targetChars && buffer.length > 0) {
      flush();
      bufferStart = cursor;
    }
    if (!buffer) bufferStart = cursor;
    buffer += sentence;
    cursor = match.index + match[0].length;
  }

  const remainder = block.text.slice(cursor);
  if (remainder) {
    if (buffer.length + remainder.length > targetChars && buffer.length > 0) {
      flush();
      bufferStart = cursor;
    }
    if (!buffer) bufferStart = cursor;
    buffer += remainder;
  }
  flush();

  // A single sentence longer than the target (minified text, a CSV row with
  // no punctuation) still has to be cut somewhere — a hard character split is
  // the honest last resort.
  return pieces.flatMap((piece) => {
    if (piece.text.length <= targetChars) return [piece];
    const hardCuts: Block[] = [];
    for (let offset = 0; offset < piece.text.length; offset += targetChars) {
      hardCuts.push({
        text: piece.text.slice(offset, offset + targetChars),
        start: piece.start + offset,
      });
    }
    return hardCuts;
  });
}

export function chunkDocumentText(
  text: string,
  options: ChunkingOptions = {},
): DocumentChunk[] {
  const targetChars = options.targetChars ?? CHUNK_TARGET_CHARS;
  const overlapChars = Math.min(
    options.overlapChars ?? CHUNK_OVERLAP_CHARS,
    Math.floor(targetChars / 2),
  );
  const maxChunks = options.maxChunks ?? MAX_CHUNKS_PER_DOCUMENT;

  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.trim()) return [];

  const blocks = toBlocks(normalized).flatMap((block) =>
    splitOversizedBlock(block, targetChars),
  );

  const chunks: DocumentChunk[] = [];
  let buffer = "";
  let bufferStart = 0;

  const push = () => {
    const trimmed = buffer.trim();
    if (!trimmed) return;
    const leading = buffer.length - buffer.trimStart().length;
    const startOffset = bufferStart + leading;
    chunks.push({
      index: chunks.length,
      text: trimmed,
      charCount: trimmed.length,
      startOffset,
      endOffset: startOffset + trimmed.length,
    });
  };

  for (const block of blocks) {
    if (chunks.length >= maxChunks) break;

    if (!buffer) {
      buffer = block.text;
      bufferStart = block.start;
      continue;
    }

    if (buffer.length + block.text.length + 2 <= targetChars) {
      buffer = `${buffer}\n\n${block.text}`;
      continue;
    }

    push();
    if (chunks.length >= maxChunks) return chunks;

    // Carry the tail of the previous chunk forward so a statement split
    // across the boundary still appears whole in one of the two chunks.
    const overlap =
      overlapChars > 0 ? buffer.slice(Math.max(0, buffer.length - overlapChars)) : "";
    buffer = overlap ? `${overlap}\n\n${block.text}` : block.text;
    bufferStart = Math.max(0, block.start - overlap.length);
  }

  if (chunks.length < maxChunks) push();

  return chunks;
}

/**
 * Rough token estimate for cost/limit reporting only. Never presented to a
 * client and never used to make a business claim — 4 characters per token is
 * the common approximation for Latin-script text.
 */
export function estimateTokens(charCount: number): number {
  return Math.ceil(charCount / 4);
}
