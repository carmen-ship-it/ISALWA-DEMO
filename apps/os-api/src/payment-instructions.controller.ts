/**
 * T07 / A1 §6 — approved payment instructions (QR or bank transfer), versioned public configuration.
 *
 * The destination is never a developer account and never read from an inbound image: it exists only
 * when a person with commercial.payment_instructions.publish drafted it and a DIFFERENT person with
 * that scope published it. Publishing replaces the previous version of the same method; retiring
 * ends it at once. A share preview checks the version again right before it is used.
 */
import { Controller, Get, HttpStatus, Inject, Param, Post, Query, Req, Res, Body } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createId } from '@isalwa/ts-utils';
import {
  PAYMENT_REPORT_COPY,
  PaymentInstructionDraftSchema,
  PaymentInstructionRetireSchema,
  buildPaymentInstructionShareText,
  canPublishPaymentInstructions,
  paymentInstructionIsCurrent,
  paymentInstructionPublishProblem,
  sniffPaymentEvidenceType,
  type PaymentInstructionPublic,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import { resolveSession, type OsSession } from './os-session';
import { OS_STORE } from './os-store.module';
import { httpError, paymentHttpError, readRawBody, sha256Hex, validationError, type OsPrisma } from './payments-support';

const QR_MAX_BYTES = 2 * 1024 * 1024;

type Row = NonNullable<Awaited<ReturnType<OsPrisma['osPaymentInstructionVersion']['findFirst']>>>;

function dateOnly(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function laPazToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
}

function toPublic(row: Row): PaymentInstructionPublic {
  return {
    id: row.id,
    version: row.version,
    method: row.method as 'qr' | 'transfer',
    holderLabel: row.holderLabel,
    bankName: row.bankName,
    accountReference: row.accountReference,
    currency: 'BOB',
    publicNote: row.publicNote,
    validFrom: dateOnly(row.validFrom),
    validUntil: dateOnly(row.validUntil),
    hasQr: !!row.qrContent,
    status: row.status as 'draft' | 'published' | 'retired',
  };
}

type AdminView = PaymentInstructionPublic & {
  createdByMemberId: string;
  createdAt: string;
  publishedByMemberId: string | null;
  publishedAt: string | null;
  retiredAt: string | null;
  retiredReason: string | null;
};

function toAdmin(row: Row): AdminView {
  return {
    ...toPublic(row),
    createdByMemberId: row.createdByMemberId,
    createdAt: row.createdAt.toISOString(),
    publishedByMemberId: row.publishedByMemberId,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    retiredAt: row.retiredAt ? row.retiredAt.toISOString() : null,
    retiredReason: row.retiredReason,
  };
}

@Controller('payment-instructions')
export class PaymentInstructionsController {
  constructor(@Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore) {}

  private prisma(): OsPrisma {
    const prisma = getOsPrisma();
    if (!prisma) throw httpError(HttpStatus.SERVICE_UNAVAILABLE, 'DATABASE_UNAVAILABLE');
    return prisma;
  }

  private requirePublisher(session: OsSession): void {
    if (!canPublishPaymentInstructions(session.grantedScopes)) throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
  }

  private async currentRows(prisma: OsPrisma, organizationId: string): Promise<Row[]> {
    const rows = await prisma.osPaymentInstructionVersion.findMany({
      where: { organizationId, status: 'published' },
      orderBy: { version: 'desc' },
    });
    const today = laPazToday();
    return rows.filter((row) => paymentInstructionIsCurrent(toPublic(row), today));
  }

  /**
   * Approved instructions that may be shared right now. Public data, so any active member reads it.
   * `absent` is the honest empty state: nothing is invented and no other account is offered.
   */
  @Get('current')
  async current(@Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const rows = await this.currentRows(this.prisma(), session.organizationId);
      const items = rows.map((row) => {
        const instruction = toPublic(row);
        return { instruction, shareText: buildPaymentInstructionShareText(instruction) };
      });
      return {
        items,
        absent: items.length === 0,
        absentCopy: items.length === 0 ? PAYMENT_REPORT_COPY.instructionsAbsent : null,
        canPublish: canPublishPaymentInstructions(session.grantedScopes),
      };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** Every version (drafts, published, retired) for the people who publish. */
  @Get()
  async list(@Req() req: Request): Promise<{ items: AdminView[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requirePublisher(session);
      const rows = await this.prisma().osPaymentInstructionVersion.findMany({
        where: { organizationId: session.organizationId },
        orderBy: { version: 'desc' },
        take: 100,
      });
      return { items: rows.map(toAdmin) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** Just before a share is used: 409 INSTRUCTIONS_CHANGED once the version is replaced or retired. */
  @Get(':instructionId/share-check')
  async shareCheck(@Param('instructionId') instructionId: string, @Req() req: Request) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const row = await this.prisma().osPaymentInstructionVersion.findFirst({
        where: { id: instructionId, organizationId: session.organizationId },
      });
      if (!row || !paymentInstructionIsCurrent(toPublic(row), laPazToday())) {
        throw httpError(HttpStatus.CONFLICT, 'INSTRUCTIONS_CHANGED', { message: PAYMENT_REPORT_COPY.instructionsChanged });
      }
      const instruction = toPublic(row);
      return { ok: true, instruction, shareText: buildPaymentInstructionShareText(instruction) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** The approved QR image. Members read published ones; publishers also read drafts. */
  @Get(':instructionId/qr')
  async qr(@Param('instructionId') instructionId: string, @Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const row = await this.prisma().osPaymentInstructionVersion.findFirst({
        where: { id: instructionId, organizationId: session.organizationId },
      });
      const allowed =
        !!row?.qrContent &&
        (paymentInstructionIsCurrent(toPublic(row), laPazToday()) || canPublishPaymentInstructions(session.grantedScopes));
      if (!row || !row.qrContent || !row.qrContentType || !allowed) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      res
        .status(200)
        .set({
          'Content-Type': row.qrContentType,
          'Content-Length': String(row.qrContent.length),
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        })
        .send(Buffer.from(row.qrContent));
    } catch (err) {
      const error = paymentHttpError(err);
      res.status(error.getStatus()).json(error.getResponse());
    }
  }

  @Post()
  async createDraft(@Req() req: Request, @Body() body: unknown): Promise<{ instruction: AdminView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requirePublisher(session);
      const parsed = PaymentInstructionDraftSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const prisma = this.prisma();
      const data = parsed.data;
      const row = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-instructions:${session.organizationId}`}))`;
        const last = await tx.osPaymentInstructionVersion.aggregate({
          where: { organizationId: session.organizationId },
          _max: { version: true },
        });
        return tx.osPaymentInstructionVersion.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            version: (last._max.version ?? 0) + 1,
            method: data.method,
            holderLabel: data.holderLabel,
            bankName: data.bankName,
            accountReference: data.accountReference,
            currency: 'BOB',
            publicNote: data.publicNote,
            validFrom: data.validFrom ? new Date(`${data.validFrom}T00:00:00.000Z`) : null,
            validUntil: data.validUntil ? new Date(`${data.validUntil}T00:00:00.000Z`) : null,
            status: 'draft',
            createdByMemberId: session.actorMemberId,
          },
        });
      });
      return { instruction: toAdmin(row) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** The approved QR file for a draft (static QR validated by a person; no dynamic QR). */
  @Post(':instructionId/qr')
  async uploadQr(
    @Param('instructionId') instructionId: string,
    @Query('replace') _replace: string | undefined,
    @Req() req: Request,
  ): Promise<{ instruction: AdminView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requirePublisher(session);
      const prisma = this.prisma();
      const row = await prisma.osPaymentInstructionVersion.findFirst({
        where: { id: instructionId, organizationId: session.organizationId },
      });
      if (!row) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (row.status !== 'draft' || row.method !== 'qr') throw httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
      const bytes = await readRawBody(req, QR_MAX_BYTES);
      const type = sniffPaymentEvidenceType(bytes);
      if (!type || type === 'application/pdf') throw httpError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'FILE_TYPE_NOT_ALLOWED');
      const updated = await prisma.osPaymentInstructionVersion.updateMany({
        where: { id: row.id, organizationId: session.organizationId, status: 'draft' },
        data: { qrContent: new Uint8Array(bytes), qrContentType: type, qrSha256: sha256Hex(bytes) },
      });
      if (updated.count !== 1) throw httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
      const fresh = await prisma.osPaymentInstructionVersion.findFirstOrThrow({ where: { id: row.id } });
      return { instruction: toAdmin(fresh) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** A different publisher approves. The drafter cannot publish their own destination. */
  @Post(':instructionId/publish')
  async publish(@Param('instructionId') instructionId: string, @Req() req: Request): Promise<{ instruction: AdminView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requirePublisher(session);
      const prisma = this.prisma();
      const row = await prisma.osPaymentInstructionVersion.findFirst({
        where: { id: instructionId, organizationId: session.organizationId },
      });
      if (!row) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (row.status !== 'draft') throw httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
      const problem = paymentInstructionPublishProblem({
        method: row.method as 'qr' | 'transfer',
        hasQr: !!row.qrContent,
        createdByMemberId: row.createdByMemberId,
        publisherMemberId: session.actorMemberId,
      });
      if (problem === 'same_person_cannot_publish') throw httpError(HttpStatus.FORBIDDEN, 'SAME_PERSON_CANNOT_PUBLISH');
      if (problem) throw httpError(HttpStatus.CONFLICT, 'QR_FILE_REQUIRED');
      const now = new Date();
      const published = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`payment-instructions:${session.organizationId}`}))`;
        await tx.osPaymentInstructionVersion.updateMany({
          where: { organizationId: session.organizationId, method: row.method, status: 'published' },
          data: {
            status: 'retired',
            retiredAt: now,
            retiredByMemberId: session.actorMemberId,
            retiredReason: `Reemplazada por la versión ${row.version}`,
          },
        });
        const won = await tx.osPaymentInstructionVersion.updateMany({
          where: { id: row.id, organizationId: session.organizationId, status: 'draft' },
          data: { status: 'published', publishedAt: now, publishedByMemberId: session.actorMemberId },
        });
        if (won.count !== 1) throw httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
        return tx.osPaymentInstructionVersion.findFirstOrThrow({ where: { id: row.id } });
      });
      return { instruction: toAdmin(published) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** Retiring is immediate. A discarded draft is retired without ever being published. */
  @Post(':instructionId/retire')
  async retire(
    @Param('instructionId') instructionId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ instruction: AdminView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requirePublisher(session);
      const parsed = PaymentInstructionRetireSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const prisma = this.prisma();
      const updated = await prisma.osPaymentInstructionVersion.updateMany({
        where: { id: instructionId, organizationId: session.organizationId, status: { in: ['draft', 'published'] } },
        data: {
          status: 'retired',
          retiredAt: new Date(),
          retiredByMemberId: session.actorMemberId,
          retiredReason: parsed.data.reason,
        },
      });
      if (updated.count !== 1) {
        const exists = await prisma.osPaymentInstructionVersion.findFirst({
          where: { id: instructionId, organizationId: session.organizationId },
          select: { id: true },
        });
        throw httpError(exists ? HttpStatus.CONFLICT : HttpStatus.NOT_FOUND, exists ? 'STATE_CONFLICT' : 'NOT_FOUND');
      }
      const fresh = await prisma.osPaymentInstructionVersion.findFirstOrThrow({ where: { id: instructionId } });
      return { instruction: toAdmin(fresh) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }
}
