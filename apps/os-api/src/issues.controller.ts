import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsIssueStore, IssueRecord, IssueJournalEntryRecord } from '@isalwa/os-database';
import type {
  CorrectionCandidateEvent,
  CorrectionDecision,
  CorrectionField,
  CorrectionRequestView,
  CorrectionSource,
  IssueStatus,
} from '@isalwa/os-contracts';
import { correctionAccess, type CorrectionCustomerPort } from '@isalwa/os-issue';
import {
  computeEffectiveScopes,
  memberHasGrantedScope,
  assertMemberActive,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import {
  CORRECTION_APPLIED_EVENT_TYPES,
  ISSUE_MANAGE_SCOPE,
  correctionEventMatches,
} from '@isalwa/os-contracts';
import { toIssueDetailResponse } from './issue-detail-response';
import { resolveSession } from './os-session';
import { OS_STORE, OS_ISSUE_STORE, OS_CORRECTION_CUSTOMER_PORT } from './os-store.module';

type IssueSummary = {
  issueId: string;
  organizationId: string;
  title: string | null;
  description: string;
  status: IssueStatus;
  reporterMemberId: string;
  ownerMemberId: string | null;
  createdAt: string;
  reportedAt: string;
  resolvedAt: string | null;
  version: number;
  references: Array<{ referenceType: string; referenceId: string }>;
};

function toSummary(
  record: IssueRecord,
  references: Array<{ referenceType: string; referenceId: string }> = [],
): IssueSummary {
  return {
    issueId: record.id,
    organizationId: record.organizationId,
    title: record.title,
    description: record.description,
    status: record.status as IssueStatus,
    reporterMemberId: record.reportedByMemberId,
    ownerMemberId: record.currentOwnerMemberId,
    createdAt: record.reportedAt.toISOString(),
    reportedAt: record.reportedAt.toISOString(),
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    version: record.version,
    references,
  };
}

type IssueView = 'open' | 'assigned_to_me' | 'reported_by_me' | 'resolved' | 'all';

@Controller('issues')
export class IssuesController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_ISSUE_STORE) private readonly issueStore: OsIssueStore,
    @Inject(OS_CORRECTION_CUSTOMER_PORT) private readonly correctionCustomers: CorrectionCustomerPort,
  ) {}

  private async getAccessSnapshot(
    organizationId: string,
    memberId: string,
    asOf: Date,
  ): Promise<MemberAccessSnapshot | null> {
    const member = await this.workforceStore.getMemberInOrg(organizationId, memberId);
    if (!member) return null;
    const roles = await this.workforceStore.listRoleAssignmentsForMember(memberId, organizationId);
    const delegations = await this.workforceStore.listDelegationsForDelegate(memberId, organizationId);
    return {
      memberId: member.id,
      organizationId: member.organizationId,
      accessStatus: member.accessStatus,
      roleKeys: computeEffectiveScopes(
        roles.map((r) => ({ roleKey: r.roleKey, effectiveAt: r.effectiveAt, endedAt: r.endedAt })),
        delegations.map((d) => ({
          scopes: d.scopes,
          startsAt: d.startsAt,
          expiresAt: d.expiresAt,
          revokedAt: d.revokedAt,
          delegatorMemberId: d.delegatorMemberId,
          organizationId: d.organizationId,
          delegator: d.delegator,
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  private canReadIssue(
    snap: MemberAccessSnapshot,
    issue: IssueRecord,
  ): boolean {
    // Reporter always can read
    if (issue.reportedByMemberId === snap.memberId) return true;
    // Owner always can read
    if (issue.currentOwnerMemberId === snap.memberId) return true;
    // issue.manage scope can read all
    if (memberHasGrantedScope(snap, ISSUE_MANAGE_SCOPE)) return true;
    return false;
  }

  @Get()
  async listIssues(
    @Req() req: Request,
    @Query('view') viewParam?: string,
    @Query('partyId') partyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('cursor') cursor?: string,
    @Query('status') status?: string,
    @Query('assignedToMe') assignedToMe?: string,
    @Query('reportedByMe') reportedByMe?: string,
  ): Promise<{
    items: IssueSummary[];
    total: number;
    meta: { hasMore: boolean; nextCursor: string | null; limit: number };
  }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      // Web desk historically sent assignedToMe/reportedByMe/status; map to canonical view.
      let view: IssueView = 'open';
      if (assignedToMe === 'true' || assignedToMe === '1') view = 'assigned_to_me';
      else if (reportedByMe === 'true' || reportedByMe === '1') view = 'reported_by_me';
      else if (status === 'resolved') view = 'resolved';
      else if (status === 'open') view = 'open';
      else if (
        viewParam === 'open' ||
        viewParam === 'assigned_to_me' ||
        viewParam === 'reported_by_me' ||
        viewParam === 'resolved' ||
        viewParam === 'all'
      ) {
        view = viewParam;
      }

      let records: IssueRecord[] = [];
      const hasManageScope = memberHasGrantedScope(snap, ISSUE_MANAGE_SCOPE);

      switch (view) {
        case 'assigned_to_me':
          records = await this.issueStore.listIssuesByOwner(
            session.organizationId,
            session.actorMemberId,
          );
          break;
        case 'reported_by_me':
          records = await this.issueStore.listIssuesByReporter(
            session.organizationId,
            session.actorMemberId,
          );
          break;
        case 'resolved':
          if (!hasManageScope) {
            // Non-managers only see their own resolved issues
            const owned = await this.issueStore.listIssuesByOwner(
              session.organizationId,
              session.actorMemberId,
            );
            const reported = await this.issueStore.listIssuesByReporter(
              session.organizationId,
              session.actorMemberId,
            );
            const combined = new Map<string, IssueRecord>();
            [...owned, ...reported].forEach((i) => combined.set(i.id, i));
            records = Array.from(combined.values()).filter((i) => i.status === 'resolved');
          } else {
            records = await this.issueStore.listIssuesByStatus(session.organizationId, 'resolved');
          }
          break;
        case 'all':
          if (!hasManageScope) {
            // Non-managers see only their own issues
            const owned = await this.issueStore.listIssuesByOwner(
              session.organizationId,
              session.actorMemberId,
            );
            const reported = await this.issueStore.listIssuesByReporter(
              session.organizationId,
              session.actorMemberId,
            );
            const combined = new Map<string, IssueRecord>();
            [...owned, ...reported].forEach((i) => combined.set(i.id, i));
            records = Array.from(combined.values());
          } else {
            // Managers see all statuses
            const statuses = ['reported', 'triaged', 'in_progress', 'resolved', 'closed', 'reopened'];
            const allRecords: IssueRecord[] = [];
            for (const s of statuses) {
              const batch = await this.issueStore.listIssuesByStatus(session.organizationId, s);
              allRecords.push(...batch);
            }
            records = allRecords;
          }
          break;
        case 'open':
        default:
          // Open issues
          if (!hasManageScope) {
            // Non-managers see only their assigned or reported open issues
            const owned = await this.issueStore.listIssuesByOwner(
              session.organizationId,
              session.actorMemberId,
            );
            const reported = await this.issueStore.listIssuesByReporter(
              session.organizationId,
              session.actorMemberId,
            );
            const combined = new Map<string, IssueRecord>();
            [...owned, ...reported].forEach((i) => combined.set(i.id, i));
            records = Array.from(combined.values()).filter(
              (i) => i.status !== 'resolved' && i.status !== 'closed',
            );
          } else {
            const statuses = ['reported', 'triaged', 'in_progress', 'reopened'];
            const openRecords: IssueRecord[] = [];
            for (const s of statuses) {
              const batch = await this.issueStore.listIssuesByStatus(session.organizationId, s);
              openRecords.push(...batch);
            }
            records = openRecords;
          }
          break;
      }

      // Sort by reportedAt desc
      records.sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime());

      const withRefs = await Promise.all(
        records.map(async (record) => {
          const refs = await this.issueStore.listReferencesForIssue(
            session.organizationId,
            record.id,
          );
          return {
            record,
            references: refs.map((r) => ({
              referenceType: r.referenceType,
              referenceId: r.referenceId,
            })),
          };
        }),
      );

      const filtered = partyId
        ? withRefs.filter((row) =>
            row.references.some((r) => r.referenceType === 'party' && r.referenceId === partyId),
          )
        : withRefs;

      const total = filtered.length;
      const limitNum = Math.min(Math.max(limit ? parseInt(limit, 10) || 25 : 25, 1), 100);
      let offsetNum = 0;
      if (cursor && /^\d+$/.test(cursor)) offsetNum = parseInt(cursor, 10);
      else if (offset) offsetNum = parseInt(offset, 10) || 0;
      if (!Number.isFinite(offsetNum) || offsetNum < 0) offsetNum = 0;
      const paginated = filtered.slice(offsetNum, offsetNum + limitNum);
      const hasMore = offsetNum + paginated.length < total;
      const nextCursor = hasMore ? String(offsetNum + paginated.length) : null;

      return {
        items: paginated.map((row) => toSummary(row.record, row.references)),
        total,
        meta: { hasMore, nextCursor, limit: limitNum },
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get(':issueId')
  async getIssue(
    @Param('issueId') issueId: string,
    @Req() req: Request,
    @Query('journalLimit') journalLimit?: string,
    @Query('journalCursor') journalCursor?: string,
  ): Promise<{
    issue: ReturnType<typeof toIssueDetailResponse>['issue'];
    journalMeta: { hasMore: boolean; nextCursor: string | null; limit: number };
  }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const issue = await this.issueStore.getIssueInOrg(session.organizationId, issueId);
      if (!issue) throw new Error('NOT_FOUND');

      if (!this.canReadIssue(snap, issue)) {
        throw new Error('NOT_FOUND'); // Return 404 for unauthorized reads (don't leak existence)
      }

      const [refs, journal, relations, workLinks] = await Promise.all([
        this.issueStore.listReferencesForIssue(session.organizationId, issue.id),
        this.issueStore.listJournalEntriesForIssue(issue.id),
        this.issueStore.listRelationsFromIssue(session.organizationId, issue.id),
        this.issueStore.listWorkLinksForIssue(session.organizationId, issue.id),
      ]);

      // Newest-first chronology page — never dump unlimited journal into the detail DOM.
      const sorted = [...journal].sort(
        (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
      );
      const jLimit = Math.min(Math.max(journalLimit ? parseInt(journalLimit, 10) || 25 : 25, 1), 100);
      let jOffset = 0;
      if (journalCursor && /^\d+$/.test(journalCursor)) jOffset = parseInt(journalCursor, 10);
      if (!Number.isFinite(jOffset) || jOffset < 0) jOffset = 0;
      const page = sorted.slice(jOffset, jOffset + jLimit);
      const jHasMore = jOffset + page.length < sorted.length;
      const body = toIssueDetailResponse({
        record: issue,
        references: refs.map((row) => ({
          referenceType: row.referenceType,
          referenceId: row.referenceId,
        })),
        journal: page,
        relations,
        workLinks,
      });
      return {
        ...body,
        journalMeta: {
          hasMore: jHasMore,
          nextCursor: jHasMore ? String(jOffset + page.length) : null,
          limit: jLimit,
        },
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  /**
   * T03 L4: the correction request on an issue. Needs issue read access and customer
   * knowledge (else 404). The proposed value is shown to the reporter, to whoever may apply
   * the change, and to issue.manage; others get null.
   */
  @Get(':issueId/correction')
  async getIssueCorrection(
    @Param('issueId') issueId: string,
    @Req() req: Request,
  ): Promise<{ correction: CorrectionRequestView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const issue = await this.issueStore.getIssueInOrg(session.organizationId, issueId);
      if (!issue || !this.canReadIssue(snap, issue)) throw new Error('NOT_FOUND');
      const correction = await this.issueStore.getCorrectionRequest(session.organizationId, issueId);
      if (!correction) throw new Error('NOT_FOUND');

      const field = correction.field as CorrectionField;
      const facts = await this.correctionCustomers.customerFacts({
        organizationId: session.organizationId,
        partyId: correction.partyId,
        memberId: snap.memberId,
        asOf: session.effectiveAt,
      });
      const access = correctionAccess({
        snap,
        organizationId: session.organizationId,
        partyId: correction.partyId,
        field,
        asOf: session.effectiveAt,
        facts,
      });
      if (!access.known) throw new Error('NOT_FOUND');

      const manage = memberHasGrantedScope(snap, ISSUE_MANAGE_SCOPE);
      const isOwner = issue.currentOwnerMemberId === snap.memberId;
      const showValue = access.canApply || manage || issue.reportedByMemberId === snap.memberId;
      const finished = issue.status === 'resolved' || issue.status === 'closed';
      const decision = finished ? (correction.decision as CorrectionDecision | null) : null;
      return {
        correction: {
          issueId: issue.id,
          partyId: correction.partyId,
          contactId: correction.contactId,
          locationId: correction.locationId,
          field,
          source: correction.source as CorrectionSource,
          proposedValue: showValue ? correction.proposedValue : null,
          state: decision ?? (issue.status === 'in_progress' ? 'in_review' : 'pending'),
          decision,
          appliedEventId: decision ? correction.appliedEventId : null,
          decisionReason: decision ? correction.decisionReason : null,
          decidedByMemberId: decision ? correction.decidedByMemberId : null,
          decidedAt: decision ? (correction.decidedAt?.toISOString() ?? null) : null,
          canDecide: !finished && access.canApply && (isOwner || manage),
        },
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  /**
   * T03 L4: customer change events an "applied" decision may cite (same rule as ResolveIssue).
   * Only for someone who may apply the change: 404 without issue read or customer knowledge,
   * 403 when the customer is known but the change is not theirs to apply.
   */
  @Get(':issueId/correction/candidate-events')
  async getIssueCorrectionCandidates(
    @Param('issueId') issueId: string,
    @Req() req: Request,
  ): Promise<{ events: CorrectionCandidateEvent[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const issue = await this.issueStore.getIssueInOrg(session.organizationId, issueId);
      if (!issue || !this.canReadIssue(snap, issue)) throw new Error('NOT_FOUND');
      const correction = await this.issueStore.getCorrectionRequest(session.organizationId, issueId);
      if (!correction) throw new Error('NOT_FOUND');

      const field = correction.field as CorrectionField;
      const access = correctionAccess({
        snap,
        organizationId: session.organizationId,
        partyId: correction.partyId,
        field,
        asOf: session.effectiveAt,
        facts: await this.correctionCustomers.customerFacts({
          organizationId: session.organizationId,
          partyId: correction.partyId,
          memberId: snap.memberId,
          asOf: session.effectiveAt,
        }),
      });
      if (!access.known) throw new Error('NOT_FOUND');
      if (!access.canApply) throw new Error('PERMISSION_DENIED');

      const target = {
        partyId: correction.partyId,
        contactId: correction.contactId,
        locationId: correction.locationId,
        field,
        reportedAt: issue.reportedAt,
      };
      const rows = await this.issueStore.listBusinessEventsSince(
        session.organizationId,
        CORRECTION_APPLIED_EVENT_TYPES[field],
        issue.reportedAt,
        200,
      );
      const events = rows
        .filter((row) => correctionEventMatches(target, row))
        .slice(0, 20)
        .map((row) => ({
          eventId: row.id!,
          eventType: row.eventType,
          occurredAt: row.occurredAt.toISOString(),
          actorMemberId: row.actorMemberId ?? null,
        }));
      return { events };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get(':issueId/precedents')
  async getIssuePrecedents(
    @Param('issueId') issueId: string,
    @Req() req: Request,
  ): Promise<{ items: IssueSummary[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const issue = await this.issueStore.getIssueInOrg(session.organizationId, issueId);
      if (!issue) throw new Error('NOT_FOUND');

      if (!this.canReadIssue(snap, issue)) {
        throw new Error('NOT_FOUND');
      }

      // Get related issues (antecedentes)
      const fromRelations = await this.issueStore.listRelationsFromIssue(
        session.organizationId,
        issueId,
      );
      const toRelations = await this.issueStore.listRelationsToIssue(
        session.organizationId,
        issueId,
      );

      // Collect related issue IDs
      const relatedIds = new Set<string>();
      fromRelations.forEach((r) => relatedIds.add(r.toIssueId));
      toRelations.forEach((r) => relatedIds.add(r.fromIssueId));

      // Fetch related issues and filter by read permission
      const relatedIssues: IssueRecord[] = [];
      for (const relatedId of relatedIds) {
        const related = await this.issueStore.getIssueInOrg(session.organizationId, relatedId);
        if (related && this.canReadIssue(snap, related)) {
          relatedIssues.push(related);
        }
      }

      return { items: relatedIssues.map((related) => toSummary(related)) };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  private toHttp(err: unknown): HttpException {
    if (err instanceof HttpException) return err;
    const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const status =
      code === 'AUTH_REQUIRED'
        ? HttpStatus.UNAUTHORIZED
        : code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED' || code === 'ACCESS_REVOKED'
          ? HttpStatus.FORBIDDEN
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : code === 'VALIDATION_FAILED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException({ code }, status);
  }
}
