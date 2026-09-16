import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { createId } from '@isalwa/ts-utils';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsIssueStore } from '@isalwa/os-database';
import type { AiProvider } from '@isalwa/providers';
import { createAiProviderFromEnv } from '@isalwa/providers';
import {
  computeEffectiveScopes,
  assertMemberActive,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import { resolveSession } from './os-session';
import { OS_STORE, OS_ISSUE_STORE } from './os-store.module';
import {
  buildAuthorizedAssistPacket,
  toCommandIssue,
  toCommandJournalEntries,
} from './ai-evidence-packet';

const ALLOWED_FEATURES = new Set(['summarize_customer', 'ask', 'draft_follow_up']);
const ALLOWED_SUBJECT_TYPES = new Set(['issue', 'party']);

type AssistBody = {
  feature?: string;
  subjectType?: string;
  subjectId?: string;
};

export type AiAssistResponse = {
  summary: string;
  suggestion: string;
  facts: string[];
  evidenceRefs: Array<{ type: 'issue' | 'journal_entry'; id: string }>;
  modelCalled: boolean;
};

function isAiEnabled(): boolean {
  return process.env.AI_ENABLED === 'true';
}

@Controller('ai')
export class AiController {
  private readonly aiProvider: AiProvider;

  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_ISSUE_STORE) private readonly issueStore: OsIssueStore,
    aiProvider?: AiProvider,
  ) {
    this.aiProvider = aiProvider ?? createAiProviderFromEnv();
  }

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
        })),
        asOf,
      ),
      delegatedScopes: [],
    };
  }

  @Post('assist')
  async assist(@Req() req: Request, @Body() body: AssistBody): Promise<AiAssistResponse> {
    if (!isAiEnabled()) {
      throw new HttpException({ code: 'AI_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    try {
      const session = await resolveSession(req, this.workforceStore);
      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const feature = body.feature?.trim() ?? '';
      const subjectType = body.subjectType?.trim() ?? '';
      const subjectId = body.subjectId?.trim() ?? '';

      if (!feature || !subjectType || !subjectId) {
        throw new Error('VALIDATION_FAILED');
      }
      if (!ALLOWED_FEATURES.has(feature)) {
        throw new Error('VALIDATION_FAILED');
      }
      if (!ALLOWED_SUBJECT_TYPES.has(subjectType)) {
        throw new Error('VALIDATION_FAILED');
      }

      const issues = await this.loadIssuesForSubject(session.organizationId, subjectType, subjectId);
      const commandIssues = issues.map(toCommandIssue);
      const journalsByIssue = new Map<string, ReturnType<typeof toCommandJournalEntries>>();
      for (const issue of commandIssues) {
        const entries = await this.issueStore.listJournalEntriesForIssue(issue.id);
        journalsByIssue.set(issue.id, toCommandJournalEntries(session.organizationId, entries));
      }

      const packet = buildAuthorizedAssistPacket({
        actor: {
          memberId: snap.memberId,
          organizationId: snap.organizationId,
          grantedScopes: snap.roleKeys,
        },
        subjectType,
        subjectId,
        issues: commandIssues,
        journalEntriesByIssue: journalsByIssue,
      });

      if (!packet) {
        throw new Error('NOT_FOUND');
      }

      const result = await this.aiProvider.assist({
        feature,
        subjectType,
        subjectId,
        facts: packet.facts,
        evidenceRefs: packet.evidenceRefs,
        maxOutputTokens: 800,
      });

      await this.recordAssistAudit(req, session.organizationId, session.actorMemberId, {
        feature,
        subjectType,
        subjectId,
        modelCalled: result.modelCalled,
        evidenceCount: result.evidenceRefs.length,
      });

      return {
        summary: result.summary,
        suggestion: result.suggestion,
        facts: result.facts,
        evidenceRefs: result.evidenceRefs,
        modelCalled: result.modelCalled,
      };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  private async loadIssuesForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ) {
    if (subjectType === 'issue') {
      const issue = await this.issueStore.getIssueInOrg(organizationId, subjectId);
      return issue ? [issue] : [];
    }
    return this.issueStore.findIssuesByReference(organizationId, 'party', subjectId);
  }

  private async recordAssistAudit(
    req: Request,
    organizationId: string,
    actorMemberId: string,
    meta: {
      feature: string;
      subjectType: string;
      subjectId: string;
      modelCalled: boolean;
      evidenceCount: number;
    },
  ): Promise<void> {
    const correlationId = req.header('x-correlation-id')?.trim() || createId();
    const event = buildBusinessEvent({
      organizationId,
      eventType: 'ai.assist.completed',
      occurredAt: new Date(),
      actorMemberId,
      primaryEntityType: meta.subjectType,
      primaryEntityId: meta.subjectId,
      payload: {
        feature: meta.feature,
        modelCalled: meta.modelCalled,
        evidenceCount: meta.evidenceCount,
      },
      correlationId,
      provenance: 'ai-assist',
    });
    const outbox = buildOutboxForEvent(event);
    const audit = buildAuditEntry(
      organizationId,
      actorMemberId,
      'ai.assist',
      meta.subjectType,
      meta.subjectId,
      correlationId,
      undefined,
      {
        feature: meta.feature,
        modelCalled: meta.modelCalled,
        evidenceCount: meta.evidenceCount,
      },
    );
    await this.workforceStore.appendEventAndAudit(event, outbox, audit);
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
