import type { PartyTimelineEntryReadModel } from '@isalwa/os-contracts';
import {
  QUOTE_MANUAL_SEND_COPY,
  quoteManualSendHistoryLabel,
} from '@/lib/commercial/quote-manual-send';

export type QuoteSendRecord = {
  channel: string;
  occurredAt: string;
  actorMemberId: string | null;
  note: string | null;
};

export function findLatestQuoteSendRecord(
  entries: readonly PartyTimelineEntryReadModel[],
  quoteId: string,
): QuoteSendRecord | null {
  const target = quoteId.trim();
  if (!target) return null;

  let latest: QuoteSendRecord | null = null;
  for (const entry of entries) {
    if (entry.eventType !== 'quote.send_recorded') continue;
    const entryQuoteId =
      typeof entry.facts.quoteId === 'string' ? entry.facts.quoteId.trim() : '';
    if (entryQuoteId !== target) continue;
    const channel = typeof entry.facts.channel === 'string' ? entry.facts.channel : '';
    const note =
      typeof entry.facts.note === 'string' && entry.facts.note.trim()
        ? entry.facts.note.trim()
        : null;
    const candidate: QuoteSendRecord = {
      channel,
      occurredAt: entry.occurredAt,
      actorMemberId: entry.actorMemberId,
      note,
    };
    if (!latest || candidate.occurredAt > latest.occurredAt) {
      latest = candidate;
    }
  }
  return latest;
}

export function quoteSendStatusLabel(record: QuoteSendRecord | null): string {
  if (!record) return QUOTE_MANUAL_SEND_COPY.statusUnregistered;
  if (record.channel === 'whatsapp') return QUOTE_MANUAL_SEND_COPY.statusWhatsapp;
  if (record.channel === 'email') return QUOTE_MANUAL_SEND_COPY.statusEmail;
  if (record.channel === 'otro') return QUOTE_MANUAL_SEND_COPY.statusOther;
  return quoteManualSendHistoryLabel(record.channel);
}
