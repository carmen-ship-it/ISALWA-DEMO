import type { IssueStatus } from '@isalwa/os-contracts';
import type {
  IssueJournalEntryRecord,
  IssueRecord,
  IssueRelationRecord,
  IssueWorkLinkRecord,
} from '@isalwa/os-database';

export type IssueDetailBody = {
  issueId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reporterMemberId: string;
  ownerMemberId: string | null;
  confirmedCause: string | null;
  resolution: string | null;
  outcome: string | null;
  createdAt: string;
  updatedAt: string;
  triagedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  references: Array<{ referenceType: string; referenceId: string; label?: string | null }>;
  journal: Array<{
    entryId: string;
    entryType: string;
    content: string;
    createdAt: string;
    createdByMemberId: string;
  }>;
  linkedWorkItems: string[];
  relations: Array<{ relationType: string; relatedIssueId: string }>;
  version: number;
};

/**
 * GET /issues/:id body. Web detail reads `{ issue }` and then journal, version, and owner.
 * List stays a flat summary. Missing and unauthorized reads stay NOT_FOUND at the controller.
 */
export function toIssueDetailResponse(input: {
  record: IssueRecord;
  references: Array<{ referenceType: string; referenceId: string }>;
  journal: IssueJournalEntryRecord[];
  relations: IssueRelationRecord[];
  workLinks: IssueWorkLinkRecord[];
}): { issue: IssueDetailBody } {
  const { record } = input;
  return {
    issue: {
      issueId: record.id,
      title: record.title,
      description: record.description,
      status: record.status as IssueStatus,
      reporterMemberId: record.reportedByMemberId,
      ownerMemberId: record.currentOwnerMemberId,
      confirmedCause: record.confirmedCause,
      resolution: record.resolution,
      outcome: record.outcome,
      createdAt: record.reportedAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      triagedAt: null,
      resolvedAt: record.resolvedAt?.toISOString() ?? null,
      closedAt: null,
      references: input.references,
      journal: input.journal.map((entry) => ({
        entryId: entry.id,
        entryType: entry.entryType,
        content: entry.content,
        createdAt: entry.recordedAt.toISOString(),
        createdByMemberId: entry.authorMemberId,
      })),
      linkedWorkItems: input.workLinks.map((link) => link.workItemId),
      relations: input.relations.map((relation) => ({
        relationType: relation.relationType,
        relatedIssueId: relation.toIssueId,
      })),
      version: record.version,
    },
  };
}
