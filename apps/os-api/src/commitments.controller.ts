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
import { deriveCommitmentState, type CommitmentRecord, type CommitmentState } from '@isalwa/os-contracts';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import type { OsCommitmentStore } from '@isalwa/os-commitment';
import { resolveSession } from './os-session';
import { OS_STORE, OS_COMMITMENT_STORE } from './os-store.module';

type CommitmentSummary = {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: string | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  state: CommitmentState;
  createdByMemberId: string;
  createdAt: string;
  fulfilledAt: string | null;
  cancelledAt: string | null;
};

function toSummary(record: CommitmentRecord, asOf: Date): CommitmentSummary {
  return {
    id: record.id,
    organizationId: record.organizationId,
    partyId: record.partyId,
    ownerMemberId: record.ownerMemberId,
    text: record.text,
    dueAt: record.dueAt,
    origin: record.origin,
    relatedSubjectType: record.relatedSubjectType,
    relatedSubjectId: record.relatedSubjectId,
    lifecycle: record.lifecycle,
    state: deriveCommitmentState(record, asOf),
    createdByMemberId: record.createdByMemberId,
    createdAt: record.createdAt,
    fulfilledAt: record.fulfilledAt,
    cancelledAt: record.cancelledAt,
  };
}

function dbToContract(db: {
  id: string;
  organizationId: string;
  partyId: string | null;
  ownerMemberId: string;
  text: string;
  dueAt: Date | null;
  origin: string;
  relatedSubjectType: string | null;
  relatedSubjectId: string | null;
  lifecycle: string;
  createdByMemberId: string;
  createdAt: Date;
  fulfilledAt: Date | null;
  cancelledAt: Date | null;
  provenanceSuggestionId: string | null;
}): CommitmentRecord {
  return {
    id: db.id,
    organizationId: db.organizationId,
    partyId: db.partyId,
    ownerMemberId: db.ownerMemberId,
    text: db.text,
    dueAt: db.dueAt ? db.dueAt.toISOString() : null,
    origin: db.origin as CommitmentRecord['origin'],
    relatedSubjectType: db.relatedSubjectType as CommitmentRecord['relatedSubjectType'],
    relatedSubjectId: db.relatedSubjectId,
    lifecycle: db.lifecycle as CommitmentRecord['lifecycle'],
    createdByMemberId: db.createdByMemberId,
    createdAt: db.createdAt.toISOString(),
    fulfilledAt: db.fulfilledAt ? db.fulfilledAt.toISOString() : null,
    cancelledAt: db.cancelledAt ? db.cancelledAt.toISOString() : null,
    provenanceSuggestionId: db.provenanceSuggestionId,
    canonical: true,
  };
}

@Controller('commitments')
export class CommitmentsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_COMMITMENT_STORE) private readonly commitmentStore: OsCommitmentStore,
  ) {}

  @Get()
  async listCommitments(
    @Query('partyId') partyId: string | undefined,
    @Query('ownerMemberId') ownerMemberId: string | undefined,
    @Query('lifecycle') lifecycle: 'open' | 'fulfilled' | 'cancelled' | undefined,
    @Req() req: Request,
  ): Promise<{ items: CommitmentSummary[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const asOf = new Date();
      
      let records;
      if (partyId) {
        records = await this.commitmentStore.listCommitmentsForParty(
          session.organizationId,
          partyId,
        );
      } else if (ownerMemberId) {
        records = await this.commitmentStore.listCommitmentsForOwner(
          session.organizationId,
          ownerMemberId,
          lifecycle,
        );
      } else {
        records = await this.commitmentStore.listCommitmentsInOrg(
          session.organizationId,
          lifecycle,
        );
      }

      // Filter by lifecycle if also filtering by partyId
      if (partyId && lifecycle) {
        records = records.filter((r) => r.lifecycle === lifecycle);
      }

      const items = records.map((r) => toSummary(dbToContract(r), asOf));
      return { items };
    } catch (err) {
      throw this.toHttp(err);
    }
  }

  @Get(':commitmentId')
  async getCommitment(
    @Param('commitmentId') commitmentId: string,
    @Req() req: Request,
  ): Promise<CommitmentSummary> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const record = await this.commitmentStore.getCommitmentInOrg(
        session.organizationId,
        commitmentId,
      );
      if (!record) {
        throw new Error('NOT_FOUND');
      }
      return toSummary(dbToContract(record), new Date());
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
