/**
 * Durable elapsed-time notices. Channel is internal only.
 * No business-hours calendar is approved: windows are wall-clock elapsed.
 */
import {
  COMMITMENT_DUE_SOON_MS,
  CONVERSATION_UNCLAIMED_MS,
  FOLLOW_UP_ELAPSED_LABEL,
  FOLLOW_UP_ELAPSED_MS,
  commitmentIsDueSoon,
  deriveCommitmentState,
  elapsedAtLeast,
  type CommitmentState,
} from '@isalwa/os-contracts';

export type ElapsedNoticeRow = {
  organizationId: string;
  recipientMemberId: string;
  kind: 'commitment_due' | 'commitment_overdue' | 'commitment_due_soon' | 'follow_up_elapsed' | 'conversation_unclaimed';
  dedupKey: string;
  title: string;
  body: string;
  sourceRecordType: 'commitment' | 'conversation';
  sourceRecordId: string;
  partyId: string | null;
};

export type OpenCommitmentRow = {
  id: string;
  organizationId: string;
  ownerMemberId: string;
  partyId: string | null;
  text: string;
  lifecycle: string;
  dueAt: Date | null;
};

export type WaitingConversationRow = {
  id: string;
  organizationId: string;
  customerId: string;
  assignedMemberId: string | null;
  attentionState: string;
  attentionStateChangedAt: Date | null;
  nextStepCommitmentId: string | null;
  summary: string;
};

export type ElapsedNoticeStore = {
  listOpenCommitments(): Promise<OpenCommitmentRow[]>;
  listWaitingCustomerConversations(): Promise<WaitingConversationRow[]>;
  listUnclaimedConversations(): Promise<WaitingConversationRow[]>;
  listManagerMemberId(organizationId: string, memberId: string, asOf: Date): Promise<string | null>;
  insertNotices(rows: ElapsedNoticeRow[]): Promise<number>;
};

export type ElapsedNoticeClockResult = {
  scannedCommitments: number;
  scannedConversations: number;
  inserted: number;
};

function excerpt(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= 180 ? trimmed : `${trimmed.slice(0, 177)}…`;
}

function dueState(row: OpenCommitmentRow, asOf: Date): CommitmentState | null {
  if (row.lifecycle !== 'open') return null;
  return deriveCommitmentState(
    {
      lifecycle: 'open',
      dueAt: row.dueAt ? row.dueAt.toISOString() : null,
    },
    asOf,
  );
}

export function noticesForOpenCommitment(row: OpenCommitmentRow, asOf: Date): ElapsedNoticeRow[] {
  if (row.lifecycle !== 'open') return [];
  const out: ElapsedNoticeRow[] = [];
  const state = dueState(row, asOf);
  if (state === 'due_today' || state === 'overdue') {
    const kind = state === 'overdue' ? 'commitment_overdue' : 'commitment_due';
    out.push({
      organizationId: row.organizationId,
      recipientMemberId: row.ownerMemberId,
      kind,
      dedupKey: `${kind}:commitment:${row.id}`,
      title: state === 'overdue' ? 'Compromiso vencido' : 'Compromiso para hoy',
      body: excerpt(row.text),
      sourceRecordType: 'commitment',
      sourceRecordId: row.id,
      partyId: row.partyId,
    });
  }
  if (row.dueAt && commitmentIsDueSoon(row.dueAt, asOf, COMMITMENT_DUE_SOON_MS)) {
    out.push({
      organizationId: row.organizationId,
      recipientMemberId: row.ownerMemberId,
      kind: 'commitment_due_soon',
      dedupKey: `commitment_due_soon:commitment:${row.id}`,
      title: 'Compromiso en 60 minutos',
      body: excerpt(row.text),
      sourceRecordType: 'commitment',
      sourceRecordId: row.id,
      partyId: row.partyId,
    });
  }
  return out;
}

export function noticeForWaitingConversation(row: WaitingConversationRow, asOf: Date): ElapsedNoticeRow | null {
  if (row.attentionState !== 'waiting_customer') return null;
  if (row.nextStepCommitmentId) return null;
  const changed = row.attentionStateChangedAt;
  if (!changed || !elapsedAtLeast(changed, asOf, FOLLOW_UP_ELAPSED_MS)) return null;
  const recipient = row.assignedMemberId;
  if (!recipient) return null;
  return {
    organizationId: row.organizationId,
    recipientMemberId: recipient,
    kind: 'follow_up_elapsed',
    dedupKey: `follow_up_elapsed:conversation:${row.id}`,
    title: FOLLOW_UP_ELAPSED_LABEL,
    body: excerpt(row.summary),
    sourceRecordType: 'conversation',
    sourceRecordId: row.id,
    partyId: row.customerId,
  };
}

/**
 * 15-minute unclaimed escalation goes to the assigned manager. A conversation
 * still in `new` with no owner cannot invent a recipient.
 */
export function unclaimedRecipient(managerMemberId: string | null): string | null {
  const trimmed = managerMemberId?.trim() ?? '';
  return trimmed || null;
}

export type ElapsedNoticeClockConfig = {
  pollIntervalMs?: number;
};

export class ElapsedNoticeClock {
  private timer: ReturnType<typeof setInterval> | null = null;
  private inFlight: Promise<void> | null = null;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly store: ElapsedNoticeStore,
    config: ElapsedNoticeClockConfig = {},
  ) {
    const requested = config.pollIntervalMs ?? 60_000;
    this.pollIntervalMs = Number.isFinite(requested) && requested >= 1_000 ? requested : 60_000;
  }

  start(): void {
    if (this.timer) return;
    void this.runOnce().catch(() => undefined);
    this.timer = setInterval(() => {
      if (this.inFlight) return;
      this.inFlight = this.runOnce()
        .catch(() => undefined)
        .then(() => {
          this.inFlight = null;
        });
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.inFlight) await this.inFlight;
  }

  async runOnce(asOf = new Date()): Promise<ElapsedNoticeClockResult> {
    const commitments = await this.store.listOpenCommitments();
    const waiting = await this.store.listWaitingCustomerConversations();
    const unclaimed = await this.store.listUnclaimedConversations();
    const rows: ElapsedNoticeRow[] = [];
    for (const commitment of commitments) {
      rows.push(...noticesForOpenCommitment(commitment, asOf));
    }
    for (const conversation of waiting) {
      const notice = noticeForWaitingConversation(conversation, asOf);
      if (notice) rows.push(notice);
    }
    for (const conversation of unclaimed) {
      if (conversation.attentionState !== 'new' || conversation.assignedMemberId) continue;
      const changed = conversation.attentionStateChangedAt;
      if (!changed || !elapsedAtLeast(changed, asOf, CONVERSATION_UNCLAIMED_MS)) continue;
      const managerId = unclaimedRecipient(
        await this.store.listManagerMemberId(conversation.organizationId, '', asOf),
      );
      if (!managerId) continue;
      rows.push({
        organizationId: conversation.organizationId,
        recipientMemberId: managerId,
        kind: 'conversation_unclaimed',
        dedupKey: `conversation_unclaimed:conversation:${conversation.id}`,
        title: 'Conversación sin tomar',
        body: excerpt(conversation.summary),
        sourceRecordType: 'conversation',
        sourceRecordId: conversation.id,
        partyId: conversation.customerId,
      });
    }
    const inserted = rows.length === 0 ? 0 : await this.store.insertNotices(rows);
    return {
      scannedCommitments: commitments.length,
      scannedConversations: waiting.length + unclaimed.length,
      inserted,
    };
  }
}
