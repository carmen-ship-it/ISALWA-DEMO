/**
 * T07 shared helpers for the payment report and payment instruction controllers:
 * stable HTTP errors, raw private upload reading, actor labels, and the internal notices.
 * No decision lives here; authority and outcomes stay in the controllers and the database.
 */
import { HttpException, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { createHash } from 'node:crypto';
import { createId } from '@isalwa/ts-utils';
import { PAYMENTS_CONFIRM_SCOPE } from '@isalwa/os-contracts';
import type { getOsPrisma } from '@isalwa/os-database';

export type OsPrisma = NonNullable<ReturnType<typeof getOsPrisma>>;
export type OsTx = Parameters<Parameters<OsPrisma['$transaction']>[0]>[0];

export function httpError(status: number, code: string, extra: Record<string, unknown> = {}): HttpException {
  return new HttpException({ code, ...extra }, status);
}

/** Stable codes only; never echoes an internal message. */
export function paymentHttpError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const raw = err instanceof Error ? err.message : '';
  if (raw === 'AUTH_REQUIRED') return httpError(HttpStatus.UNAUTHORIZED, 'AUTH_REQUIRED');
  if (raw === 'ACCESS_REVOKED' || raw === 'TENANT_FORBIDDEN' || raw === 'PERMISSION_DENIED') {
    return httpError(HttpStatus.FORBIDDEN, raw);
  }
  // Database guards (migration 20261022000000) surface as these exact tokens.
  const text = `${raw} ${(err as { meta?: { message?: string } } | null)?.meta?.message ?? ''}`;
  if (text.includes('PAYMENT_OVER_ALLOCATION')) return httpError(HttpStatus.CONFLICT, 'OVER_ALLOCATION');
  if (text.includes('PAYMENT_ALLOCATION_WRONG_CUSTOMER')) return httpError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
  if (text.includes('PAYMENT_')) return httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
  return httpError(HttpStatus.INTERNAL_SERVER_ERROR, 'INTERNAL_ERROR');
}

export function validationError(issues: ReadonlyArray<{ message: string }>): HttpException {
  return httpError(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', {
    issues: [...new Set(issues.map((issue) => issue.message))].slice(0, 8),
  });
}

/**
 * Private upload body. Nest's JSON parser ignores image/PDF content types, so the stream is
 * still unread here. Stops at `max` bytes so an oversized file never fills memory.
 */
export function readRawBody(req: Request, max: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const declared = Number(req.header('content-length') ?? 0);
    if (Number.isFinite(declared) && declared > max) {
      reject(httpError(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE'));
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > max) {
        done = true;
        reject(httpError(HttpStatus.PAYLOAD_TOO_LARGE, 'FILE_TOO_LARGE'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!done) resolve(Buffer.concat(chunks));
    });
    req.on('error', () => {
      if (!done) reject(httpError(HttpStatus.BAD_REQUEST, 'UPLOAD_FAILED'));
    });
  });
}

export function sha256Hex(bytes: Buffer | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export async function memberLabel(prisma: OsPrisma | OsTx, organizationId: string, memberId: string): Promise<string | null> {
  const member = await prisma.osOrganizationMember.findFirst({
    where: { id: memberId, organizationId },
    select: { person: { select: { givenName: true, familyName: true } } },
  });
  if (!member) return null;
  return [member.person.givenName, member.person.familyName].filter(Boolean).join(' ').trim() || 'Miembro del equipo';
}

/** An active member of this tenant (cash receiver, notice recipient). */
export async function activeMemberLabel(
  prisma: OsPrisma | OsTx,
  organizationId: string,
  memberId: string,
): Promise<string | null> {
  const member = await prisma.osOrganizationMember.findFirst({
    where: { id: memberId, organizationId, accessStatus: 'active' },
    select: { person: { select: { givenName: true, familyName: true } } },
  });
  if (!member) return null;
  return [member.person.givenName, member.person.familyName].filter(Boolean).join(' ').trim() || 'Miembro del equipo';
}

/** Members who currently hold payments.confirm through an active role assignment. */
export async function currentVerifierMemberIds(prisma: OsPrisma | OsTx, organizationId: string, now: Date): Promise<string[]> {
  const rows = await prisma.osRoleAssignment.findMany({
    where: {
      organizationId,
      roleKey: PAYMENTS_CONFIRM_SCOPE,
      effectiveAt: { lte: now },
      OR: [{ endedAt: null }, { endedAt: { gt: now } }],
      member: { accessStatus: 'active', organizationId },
    },
    select: { memberId: true },
  });
  return [...new Set(rows.map((row) => row.memberId))];
}

export async function admitPaymentNotices(
  tx: OsTx,
  input: {
    organizationId: string;
    recipientMemberIds: readonly string[];
    kind: 'payment_to_verify' | 'payment_outcome';
    title: string;
    body: string | null;
    factId: string;
    partyId: string | null;
    dedupSuffix: string;
  },
): Promise<void> {
  const recipients = [...new Set(input.recipientMemberIds.filter((id) => id.trim().length > 0))];
  if (recipients.length === 0) return;
  await tx.osInternalNotification.createMany({
    data: recipients.map((recipientMemberId) => ({
      id: createId(),
      organizationId: input.organizationId,
      recipientMemberId,
      kind: input.kind,
      dedupKey: `${input.kind}:payment_report:${input.factId}:${input.dedupSuffix}`,
      title: input.title,
      body: input.body,
      sourceRecordType: 'payment_report',
      sourceRecordId: input.factId,
      partyId: input.partyId,
      channel: 'internal',
    })),
    skipDuplicates: true,
  });
}

/** Verifiers' "Pago por verificar" notices end when no tender of the report is pending. */
export async function resolvePaymentToVerifyNotices(tx: OsTx, organizationId: string, factId: string): Promise<void> {
  const pending = await tx.osPaymentTender.count({ where: { organizationId, factId, verification: 'pending' } });
  if (pending > 0) return;
  await tx.osInternalNotification.updateMany({
    where: {
      organizationId,
      kind: 'payment_to_verify',
      sourceRecordType: 'payment_report',
      sourceRecordId: factId,
      resolvedAt: null,
    },
    data: { resolvedAt: new Date(), resolvedBecause: 'source_condition_gone' },
  });
}
