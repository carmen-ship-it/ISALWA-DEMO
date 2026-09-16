import type { IssueJournalType, IssueStatus } from '@isalwa/os-contracts';
import {
  MemoryEvidenceService,
  type IssueRecord as CommandIssueRecord,
  type IssueJournalEntryRecord as CommandJournalRecord,
} from '@isalwa/os-issue';
import type { AiAssistEvidenceRef } from '@isalwa/providers';

export type AssistEvidenceActor = {
  memberId: string;
  organizationId: string;
  grantedScopes: readonly string[];
};

export type AuthorizedAssistPacket = {
  facts: string[];
  evidenceRefs: AiAssistEvidenceRef[];
};

const evidenceService = new MemoryEvidenceService();

function issueFactLine(issue: CommandIssueRecord): string {
  const title = issue.title?.trim() || issue.description.trim().slice(0, 120);
  return `Incidencia ${issue.id} (${issue.status}): ${title}`;
}

function journalFactLine(entry: CommandJournalRecord): string {
  return `Diario ${entry.entryType} · ${entry.content.trim().slice(0, 160)}`;
}

export function buildAuthorizedAssistPacket(input: {
  actor: AssistEvidenceActor;
  subjectType: string;
  subjectId: string;
  issues: readonly CommandIssueRecord[];
  journalEntriesByIssue: ReadonlyMap<string, readonly CommandJournalRecord[]>;
}): AuthorizedAssistPacket | null {
  const filtered = evidenceService.retrieveIssueEvidence(
    input.actor,
    input.issues,
    input.journalEntriesByIssue,
  );

  if (input.subjectType === 'issue') {
    const match = filtered.find((item) => item.issue.id === input.subjectId);
    if (!match) {
      return null;
    }
    return packetFromIssueEvidence([match]);
  }

  if (input.subjectType === 'party') {
    if (filtered.length === 0) {
      return { facts: [`Cliente ${input.subjectId}: sin incidencias autorizadas visibles.`], evidenceRefs: [] };
    }
    return packetFromIssueEvidence(filtered);
  }

  return null;
}

function packetFromIssueEvidence(
  items: Array<{
    issue: CommandIssueRecord;
    journalEntries: readonly CommandJournalRecord[];
  }>,
): AuthorizedAssistPacket {
  const facts: string[] = [];
  const evidenceRefs: AiAssistEvidenceRef[] = [];

  for (const item of items) {
    facts.push(issueFactLine(item.issue));
    evidenceRefs.push({ type: 'issue', id: item.issue.id });
    for (const entry of item.journalEntries.slice(0, 8)) {
      facts.push(journalFactLine(entry));
      evidenceRefs.push({ type: 'journal_entry', id: entry.id });
    }
  }

  return { facts, evidenceRefs };
}

export function toCommandIssue(record: {
  id: string;
  organizationId: string;
  title: string | null;
  description: string;
  status: string;
  reportedByMemberId: string;
  currentOwnerMemberId: string | null;
  reportedAt: Date;
  version: number;
}): CommandIssueRecord {
  return {
    id: record.id,
    organizationId: record.organizationId,
    title: record.title,
    description: record.description,
    status: record.status as IssueStatus,
    reportedByMemberId: record.reportedByMemberId,
    ownerMemberId: record.currentOwnerMemberId,
    confirmedCause: null,
    resolution: null,
    outcome: null,
    reportedAt: record.reportedAt,
    triagedAt: null,
    progressStartedAt: null,
    resolvedAt: null,
    closedAt: null,
    reopenedAt: null,
    version: record.version,
  };
}

export function toCommandJournalEntries(
  organizationId: string,
  entries: Array<{
    id: string;
    organizationId: string;
    issueId: string;
    entryType: string;
    content: string;
    authorMemberId: string;
    recordedAt: Date;
  }>,
): CommandJournalRecord[] {
  return entries
    .filter((entry) => entry.organizationId === organizationId)
    .map((entry) => ({
      id: entry.id,
      organizationId: entry.organizationId,
      issueId: entry.issueId,
      entryType: entry.entryType as IssueJournalType,
      content: entry.content,
      createdByMemberId: entry.authorMemberId,
      createdAt: entry.recordedAt,
    }));
}
