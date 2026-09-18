import type { QuoteDetailReadModel, QuoteLineReadModel } from '@isalwa/os-contracts';

/**
 * Display overlay for a quote command that already succeeded while the
 * projection the page re-reads is still behind. Does not change commands.
 */

function knownLineId(quoteLineId: string | null | undefined): string | null {
  if (!quoteLineId) return null;
  const id = quoteLineId.trim();
  if (!id || id.startsWith('local:')) return null;
  return id;
}

/** Same line: quoteLineId when both are known, otherwise description + quantity + unit price. */
export function quoteLinesMatch(left: QuoteLineReadModel, right: QuoteLineReadModel): boolean {
  const leftId = knownLineId(left.quoteLineId);
  const rightId = knownLineId(right.quoteLineId);
  if (leftId && rightId) return leftId === rightId;
  return (
    left.description === right.description &&
    left.quantity === right.quantity &&
    left.unitPriceCentavos === right.unitPriceCentavos
  );
}

export function applyAddedLine(
  current: QuoteDetailReadModel,
  line: QuoteLineReadModel,
): QuoteDetailReadModel {
  if (current.lines.some((existing) => quoteLinesMatch(existing, line))) return current;
  return { ...current, lines: [...current.lines, line] };
}

/** Status only. Does not invent submittedAt or any other field. */
export function applySubmitted(current: QuoteDetailReadModel): QuoteDetailReadModel {
  if (current.status === 'submitted') return current;
  return { ...current, status: 'submitted' };
}

function projectionBehind(local: QuoteDetailReadModel, server: QuoteDetailReadModel): boolean {
  const fewerLines = server.lines.length < local.lines.length;
  const missingLine = local.lines.some(
    (line) => !server.lines.some((serverLine) => quoteLinesMatch(serverLine, line)),
  );
  const statusBehind = local.status === 'submitted' && server.status === 'draft';
  return fewerLines || missingLine || statusBehind;
}

/**
 * Fresher server payload replaces the overlay. A projection that is still
 * behind (fewer lines, or still draft while the overlay is submitted) is ignored.
 */
export function mergeServerQuote(
  local: QuoteDetailReadModel,
  server: QuoteDetailReadModel,
): QuoteDetailReadModel {
  if (projectionBehind(local, server)) return local;
  return server;
}
