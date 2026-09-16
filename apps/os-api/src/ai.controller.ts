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
import type { OsIssueStore, PrismaOsCommitmentStore } from '@isalwa/os-database';
import type { AiProvider } from '@isalwa/providers';
import { createAiProviderFromEnv } from '@isalwa/providers';
import {
  computeEffectiveScopes,
  assertMemberActive,
  type MemberAccessSnapshot,
} from '@isalwa/os-domain';
import { buildAuditEntry, buildBusinessEvent, buildOutboxForEvent } from '@isalwa/os-events';
import { resolveSession } from './os-session';
import { OS_STORE, OS_ISSUE_STORE, OS_COMMITMENT_STORE } from './os-store.module';
import {
  buildAuthorizedAssistPacket,
  toCommandIssue,
  toCommandJournalEntries,
  toCommitmentEvidence,
} from './ai-evidence-packet';
import { resolveAiGovernanceConfig } from './ai/ai-governance-config';
import {
  AI_DENIED_MUTATION_FEATURES,
  assertFeatureSubject,
  normalizeAiFeature,
  type AiBoundedFeature,
} from './ai/ai-features';
import { AiRateLimiter } from './ai/ai-rate-limiter';
import { AiUsageLedger } from './ai/ai-usage-ledger';

type AssistBody = {
  feature?: string;
  subjectType?: string;
  subjectId?: string;
  /** Free-text question — never broadens retrieval. */
  question?: string;
  /** Rejected if present — models are server-configured only. */
  model?: string;
};

export type AiAssistResponse = {
  summary: string;
  suggestion: string;
  facts: string[];
  evidenceRefs: Array<{ type: 'issue' | 'journal_entry' | 'commitment'; id: string }>;
  modelCalled: boolean;
  truncated?: boolean;
};

const governance = resolveAiGovernanceConfig();
const rateLimiter = new AiRateLimiter(governance);
const usageLedger = new AiUsageLedger(governance);

@Controller('ai')
export class AiController {
  // Initialize at declaration so Nest emitDecoratorMetadata does not treat this
  // field as a third constructor dependency (hosted boot crash on 46b8537).
  private aiProvider: AiProvider = createAiProviderFromEnv();
  private readonly config = governance;

  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_ISSUE_STORE) private readonly issueStore: OsIssueStore,
    @Inject(OS_COMMITMENT_STORE) private readonly commitmentStore: PrismaOsCommitmentStore,
  ) {}

  /** Test seam — never call from product code. */
  replaceAiProviderForTest(provider: AiProvider): void {
    this.aiProvider = provider;
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
    // Re-read the flag per request so tests/staging toggles are not frozen at import.
    if (process.env.AI_ENABLED !== 'true') {
      throw new HttpException({ code: 'AI_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // Model names are never accepted from the client.
    if (body.model != null && String(body.model).trim() !== '') {
      throw new HttpException({ code: 'AI_MODEL_NOT_ALLOWED' }, HttpStatus.BAD_REQUEST);
    }

    const rawFeature = body.feature?.trim() ?? '';
    if ((AI_DENIED_MUTATION_FEATURES as readonly string[]).includes(rawFeature)) {
      throw new HttpException({ code: 'AI_INTENT_DENIED' }, HttpStatus.FORBIDDEN);
    }

    const feature = normalizeAiFeature(rawFeature);
    if (!feature) {
      throw new HttpException({ code: 'VALIDATION_FAILED' }, HttpStatus.BAD_REQUEST);
    }

    let acquired = false;
    let organizationId = '';
    let memberId = '';

    try {
      // 1) authenticated session → tenant
      const session = await resolveSession(req, this.workforceStore);
      organizationId = session.organizationId;
      memberId = session.actorMemberId;

      const snap = await this.getAccessSnapshot(
        session.organizationId,
        session.actorMemberId,
        session.effectiveAt,
      );
      if (!snap) throw new Error('AUTH_REQUIRED');
      assertMemberActive(snap);

      const subjectTypeRaw = body.subjectType?.trim() ?? '';
      const subjectId = body.subjectId?.trim() ?? '';
      if (!subjectTypeRaw || !subjectId) throw new Error('VALIDATION_FAILED');
      const subjectType = assertFeatureSubject(feature, subjectTypeRaw);

      // Soft budget circuit breaker (estimate) — not a hard USD guarantee.
      usageLedger.assertUnderBudget(session.organizationId);

      const denial = rateLimiter.tryAcquire(session.organizationId, session.actorMemberId);
      if (denial) {
        throw new Error(denial);
      }
      acquired = true;

      // 2) load candidates in tenant → 3) authorize via MemoryEvidenceService → 4) minimize
      // Free-text never changes which loaders/selectors run — only feature+subject do.
      const packet = await this.buildPacketForFeature({
        feature,
        actor: {
          memberId: snap.memberId,
          organizationId: snap.organizationId,
          grantedScopes: snap.roleKeys,
        },
        subjectType,
        subjectId,
      });

      if (!packet) {
        throw new Error('NOT_FOUND');
      }

      // Free-text question never broadens retrieval — appended as a labeled ask only.
      const facts = [...packet.facts];
      const question = body.question?.trim();
      if (question) {
        facts.push(`Pregunta del usuario (no amplía el alcance de evidencia): ${question.slice(0, 500)}`);
      }

      // 5) provider call — already-authorized minimized evidence only
      const result = await this.aiProvider.assist({
        feature,
        subjectType,
        subjectId,
        facts,
        evidenceRefs: packet.evidenceRefs,
        maxOutputTokens: this.config.maxOutputTokens,
      });

      usageLedger.record({
        organizationId: session.organizationId,
        memberId: session.actorMemberId,
        feature,
        model: this.config.defaultModel,
        provider: this.config.provider,
        success: true,
      });

      await this.recordAssistAudit(
        req,
        session.organizationId,
        session.auditActorMemberId ?? session.actorMemberId,
        {
          feature,
          subjectType,
          subjectId,
          modelCalled: result.modelCalled,
          evidenceCount: result.evidenceRefs.length,
          truncated: packet.truncated,
          model: this.config.defaultModel,
          provider: this.config.provider,
        },
      );

      return {
        summary: result.summary,
        suggestion: result.suggestion,
        facts: result.facts,
        evidenceRefs: result.evidenceRefs,
        modelCalled: result.modelCalled,
        truncated: packet.truncated,
      };
    } catch (err) {
      if (organizationId && memberId) {
        try {
          usageLedger.record({
            organizationId,
            memberId,
            feature: feature ?? rawFeature,
            model: this.config.defaultModel,
            provider: this.config.provider,
            success: false,
            estimatedCostUsd: 0,
          });
        } catch {
          /* ignore ledger errors on failure path */
        }
      }
      throw this.toHttp(err);
    } finally {
      if (acquired && organizationId && memberId) {
        rateLimiter.release(organizationId, memberId);
      }
    }
  }

  private async buildPacketForFeature(input: {
    feature: AiBoundedFeature;
    actor: {
      memberId: string;
      organizationId: string;
      grantedScopes: readonly string[];
    };
    subjectType: string;
    subjectId: string;
  }) {
    if (input.feature === 'summarizeCommitments') {
      const commitments = await this.loadCommitmentsForSubject(
        input.actor.organizationId,
        input.subjectType,
        input.subjectId,
      );
      return buildAuthorizedAssistPacket({
        actor: input.actor,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        issues: [],
        journalEntriesByIssue: new Map(),
        commitments: commitments.map(toCommitmentEvidence),
        evidenceMode: 'commitments',
        maxEvidenceItems: this.config.maxEvidenceItems,
      });
    }

    const issues = await this.loadIssuesForSubject(
      input.actor.organizationId,
      input.subjectType,
      input.subjectId,
    );
    const commandIssues = issues.map(toCommandIssue);
    const journalsByIssue = new Map<string, ReturnType<typeof toCommandJournalEntries>>();
    for (const issue of commandIssues) {
      const entries = await this.issueStore.listJournalEntriesForIssue(issue.id);
      journalsByIssue.set(issue.id, toCommandJournalEntries(input.actor.organizationId, entries));
    }

    return buildAuthorizedAssistPacket({
      actor: input.actor,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      issues: commandIssues,
      journalEntriesByIssue: journalsByIssue,
      maxEvidenceItems: this.config.maxEvidenceItems,
    });
  }

  private async loadCommitmentsForSubject(
    organizationId: string,
    subjectType: string,
    subjectId: string,
  ) {
    if (subjectType === 'party') {
      return this.commitmentStore.listCommitmentsByParty(organizationId, subjectId);
    }
    if (subjectType === 'commitment') {
      const one = await this.commitmentStore.getCommitmentInOrg(organizationId, subjectId);
      return one ? [one] : [];
    }
    return [];
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
    if (subjectType === 'party') {
      return this.issueStore.findIssuesByReference(organizationId, 'party', subjectId);
    }
    // commitment subject: no issue fan-out without explicit party/issue context
    return [];
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
      truncated: boolean;
      model: string;
      provider: string;
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
        truncated: meta.truncated,
        model: meta.model,
        provider: meta.provider,
        // No raw prompt/response; no chain-of-thought.
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
        truncated: meta.truncated,
        model: meta.model,
        provider: meta.provider,
      },
    );
    await this.workforceStore.appendEventAndAudit(event, outbox, audit);
  }

  private toHttp(err: unknown): HttpException {
    if (err instanceof HttpException) return err;
    const code = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    if (code === 'AI_BUDGET_EXCEEDED') {
      return new HttpException(
        {
          code,
          message: 'La ayuda con IA alcanzó el límite configurado para este período.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (
      code === 'AI_RATE_MEMBER_MINUTE' ||
      code === 'AI_RATE_MEMBER_HOUR' ||
      code === 'AI_RATE_ORG_DAY' ||
      code === 'AI_CONCURRENCY_MEMBER' ||
      code === 'AI_CONCURRENCY_ORG'
    ) {
      return new HttpException(
        { code, message: 'La ayuda con IA alcanzó el límite configurado para este período.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (
      code === 'AI_PROVIDER_TIMEOUT' ||
      code === 'AI_PROVIDER_TRANSIENT' ||
      code === 'AI_PROVIDER_ERROR' ||
      code === 'AI_PROVIDER_EMPTY' ||
      code === 'AI_UNAVAILABLE'
    ) {
      return new HttpException({ code: 'AI_UNAVAILABLE' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    const status =
      code === 'AUTH_REQUIRED'
        ? HttpStatus.UNAUTHORIZED
        : code === 'TENANT_FORBIDDEN' ||
            code === 'PERMISSION_DENIED' ||
            code === 'ACCESS_REVOKED' ||
            code === 'AI_INTENT_DENIED'
          ? HttpStatus.FORBIDDEN
          : code === 'NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : code === 'VALIDATION_FAILED' || code === 'AI_MODEL_NOT_ALLOWED'
              ? HttpStatus.BAD_REQUEST
              : HttpStatus.INTERNAL_SERVER_ERROR;
    return new HttpException({ code }, status);
  }
}

/** Test seams — do not use from product UI. */
export const __aiGovernanceTestSeams = {
  rateLimiter,
  usageLedger,
  config: governance,
};
