/**
 * T07 / A1 §6 — reported payments and human verification.
 *
 * Operational reporting only: no bank integration, no tax invoice, no ledger. A report extends the
 * existing reported-operational-fact `payment` row; each tender is verified on its own by a person
 * holding payments.confirm. Nothing here confirms funds from an upload, OCR or a customer's word.
 * Authority comes from the session; the tenant never comes from the body.
 */
import { Body, Controller, Get, HttpStatus, Inject, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { createId } from '@isalwa/ts-utils';
import {
  PAYMENT_EVIDENCE_MAX_BYTES,
  PAYMENT_REPORT_COPY,
  PaymentAllocationInputSchema,
  PaymentAllocationReleaseSchema,
  PaymentCashRecipientResolutionSchema,
  PaymentReportInputSchema,
  PaymentTenderDecisionSchema,
  PaymentTenderReversalSchema,
  allocationProblem,
  buildReportedOperationalFactRow,
  canReportPayment,
  canVerifyReportedPayment,
  derivePaymentReportTotals,
  normalizePaymentReference,
  paidOnProblem,
  reversalLeavesOverAllocation,
  safeEvidenceFileName,
  sniffPaymentEvidenceType,
  tenderConfirmProblem,
  tenderRejectProblem,
  tenderReverseProblem,
  type PaymentReportParsed,
  type PaymentReportView,
  type PaymentTenderMethod,
  type PaymentTenderVerification,
} from '@isalwa/os-contracts';
import { getOsPrisma } from '@isalwa/os-database';
import {
  REPLAY_REVIEW_REQUIRED,
  REPLAY_REVIEW_REQUIRED_MESSAGE,
  isIdempotencyConflict,
  openReplay,
  replayBinding,
  sealReplay,
} from '@isalwa/os-events';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  buildQueryContext,
  canReadCustomer,
  coveredAccountOwner,
  resolveCustomerReadScope,
  type CustomerVisibilityLookup,
  type DirectReportLookup,
} from '@isalwa/os-query';
import { resolveSession, type OsSession } from './os-session';
import { OS_CUSTOMER_VISIBILITY, OS_MEMBER_QUERY_STORE, OS_STORE } from './os-store.module';
import {
  activeMemberLabel,
  admitPaymentNotices,
  currentVerifierMemberIds,
  httpError,
  memberLabel,
  paymentHttpError,
  readRawBody,
  resolvePaymentToVerifyNotices,
  sha256Hex,
  validationError,
  type OsPrisma,
  type OsTx,
} from './payments-support';

const REPORT_COMMAND = 'RecordPaymentReport';
const ALLOCATE_COMMAND = 'AllocatePayment';

type StoredJson = NonNullable<
  Parameters<OsPrisma['osIdempotencyKey']['create']>[0]
>['data']['resultJson'];

const factInclude = {
  tenders: { orderBy: { seq: 'asc' as const } },
  evidence: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, tenderId: true, fileName: true, contentType: true, sizeBytes: true, createdAt: true },
  },
  allocations: { orderBy: { allocatedAt: 'asc' as const } },
  customerParty: { select: { displayName: true } },
  intendedOrder: { select: { orderNumber: true } },
};

type FactRow = NonNullable<Awaited<ReturnType<typeof loadFactRow>>>;

async function loadFactRow(prisma: OsPrisma | OsTx, organizationId: string, id: string) {
  return prisma.osReportedOperationalFact.findFirst({
    where: { id, organizationId, kind: 'payment' },
    include: factInclude,
  });
}

function laPazToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(now);
}

function isoDate(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : '';
}

function requestFingerprint(actorMemberId: string, input: PaymentReportParsed): string {
  return sha256Hex(
    JSON.stringify([
      actorMemberId,
      input.customerId,
      input.orderId,
      input.totalCentavos,
      input.paidOn,
      input.note,
      input.tenders.map((t) => [
        t.method,
        t.amountCentavos,
        t.reference,
        t.cashRecipientMemberId,
        t.cashRecipientUnresolvedReason,
      ]),
    ]),
  );
}

@Controller('payment-reports')
export class PaymentReportsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: DirectReportLookup,
  ) {}

  private prisma(): OsPrisma {
    const prisma = getOsPrisma();
    if (!prisma) throw httpError(HttpStatus.SERVICE_UNAVAILABLE, 'DATABASE_UNAVAILABLE');
    return prisma;
  }

  /** Reporter, current verifier, or someone who may read the customer. Anyone else: not found. */
  private async mayRead(session: OsSession, fact: Pick<FactRow, 'reportedByMemberId' | 'customerPartyId'>): Promise<boolean> {
    if (canVerifyReportedPayment(session.grantedScopes)) return true;
    if (fact.reportedByMemberId && fact.reportedByMemberId === session.actorMemberId) return true;
    if (!fact.customerPartyId) return false;
    const ctx = await buildQueryContext(session, this.workforceStore);
    return canReadCustomer({
      ctx,
      partyId: fact.customerPartyId,
      lookup: this.customerVisibility,
      directReports: this.directReports,
    });
  }

  /** Account owner, an active commercial.work coverage, or a verifier recording a receipt. */
  private async mayReportFor(session: OsSession, customerId: string): Promise<boolean> {
    const facts = await this.customerVisibility.getCustomerFacts(session.organizationId, customerId, session.effectiveAt);
    if (!facts || facts.organizationId !== session.organizationId) return false;
    if (canVerifyReportedPayment(session.grantedScopes)) return true;
    if (facts.accountOwnerMemberId && facts.accountOwnerMemberId === session.actorMemberId) return true;
    const ctx = await buildQueryContext(session, this.workforceStore);
    return (
      (await coveredAccountOwner({
        ctx,
        partyId: customerId,
        lookup: this.customerVisibility,
        coverageActions: ['commercial.work'],
      })) !== null
    );
  }

  private async duplicateFactIds(prisma: OsPrisma, organizationId: string, facts: readonly FactRow[]): Promise<Set<string>> {
    const flagged = new Set<string>();
    if (facts.length === 0) return flagged;
    const byId = new Map(facts.map((fact) => [fact.id, fact]));
    const refs = [...new Set(facts.flatMap((fact) => fact.tenders.map((t) => t.referenceNormalized)).filter((r): r is string => !!r))];
    const hashes = await prisma.osPaymentEvidence.findMany({
      where: { organizationId, factId: { in: [...byId.keys()] } },
      select: { factId: true, sha256: true },
    });
    const shaList = [...new Set(hashes.map((h) => h.sha256))];
    const [sameRef, sameSha] = await Promise.all([
      refs.length
        ? prisma.osPaymentTender.findMany({
            where: { organizationId, referenceNormalized: { in: refs } },
            select: { factId: true, referenceNormalized: true, fact: { select: { correctsFactId: true } } },
          })
        : Promise.resolve([]),
      shaList.length
        ? prisma.osPaymentEvidence.findMany({
            where: { organizationId, sha256: { in: shaList } },
            select: { factId: true, sha256: true, fact: { select: { correctsFactId: true } } },
          })
        : Promise.resolve([]),
    ]);
    const related = (a: string, aCorrects: string | null, b: string, bCorrects: string | null) =>
      a !== b && aCorrects !== b && bCorrects !== a;
    for (const fact of facts) {
      for (const tender of fact.tenders) {
        if (!tender.referenceNormalized) continue;
        if (
          sameRef.some(
            (other) =>
              other.referenceNormalized === tender.referenceNormalized &&
              related(fact.id, fact.correctsFactId, other.factId, other.fact.correctsFactId),
          )
        ) {
          flagged.add(fact.id);
        }
      }
      for (const mine of hashes.filter((h) => h.factId === fact.id)) {
        if (
          sameSha.some(
            (other) =>
              other.sha256 === mine.sha256 &&
              related(fact.id, fact.correctsFactId, other.factId, other.fact.correctsFactId),
          )
        ) {
          flagged.add(fact.id);
        }
      }
    }
    return flagged;
  }

  private async toViews(
    prisma: OsPrisma,
    session: OsSession,
    facts: readonly FactRow[],
  ): Promise<PaymentReportView[]> {
    if (facts.length === 0) return [];
    const organizationId = session.organizationId;
    const tenderIds = facts.flatMap((fact) => fact.tenders.map((t) => t.id));
    const events = tenderIds.length
      ? await prisma.osPaymentTenderEvent.findMany({
          where: { organizationId, tenderId: { in: tenderIds } },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const orderIds = [...new Set(facts.flatMap((fact) => fact.allocations.map((a) => a.orderId)))];
    const orders = orderIds.length
      ? await prisma.osOrder.findMany({
          where: { organizationId, id: { in: orderIds } },
          select: { id: true, orderNumber: true },
        })
      : [];
    const orderNumber = new Map(orders.map((order) => [order.id, order.orderNumber]));
    const duplicates = await this.duplicateFactIds(prisma, organizationId, facts);
    const verify = canVerifyReportedPayment(session.grantedScopes);

    return facts.map((fact): PaymentReportView => {
      const activeAllocated = fact.allocations
        .filter((a) => a.status === 'active')
        .reduce((sum, a) => sum + a.amountCentavos, 0n);
      const tenders = fact.tenders.map((tender) => ({
        id: tender.id,
        seq: tender.seq,
        method: tender.method as PaymentTenderMethod,
        amountCentavos: tender.amountCentavos.toString(),
        reference: tender.reference,
        verification: tender.verification as PaymentTenderVerification,
        cashRecipientMemberId: tender.cashRecipientMemberId,
        cashRecipientLabel: tender.cashRecipientLabel,
        cashRecipientUnresolvedReason: tender.cashRecipientUnresolvedReason,
        replacesTenderId: tender.replacesTenderId,
        outcomes: events
          .filter((event) => event.tenderId === tender.id && event.action !== 'recipient_resolved')
          .map((event) => ({
            action: event.action as 'confirmed' | 'rejected' | 'reversed',
            reason: event.reason,
            actorMemberId: event.actorMemberId,
            actorLabel: event.actorLabel,
            at: event.createdAt.toISOString(),
          })),
      }));
      return {
        id: fact.id,
        customerId: fact.customerPartyId ?? '',
        customerLabel: fact.customerParty?.displayName ?? '',
        orderId: fact.intendedOrderId,
        orderNumber: fact.intendedOrder?.orderNumber ?? null,
        currency: 'BOB',
        paidOn: isoDate(fact.paidOn),
        reportedAt: fact.reportedAt.toISOString(),
        reportedByMemberId: fact.reportedByMemberId,
        reportedByLabel: fact.reportedByLabel,
        note: fact.note,
        tenders,
        totals: derivePaymentReportTotals(tenders, activeAllocated),
        evidence: fact.evidence.map((item) => ({
          id: item.id,
          tenderId: item.tenderId,
          fileName: item.fileName,
          contentType: item.contentType as 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf',
          sizeBytes: item.sizeBytes,
          uploadedAt: item.createdAt.toISOString(),
        })),
        allocations: fact.allocations.map((a) => ({
          id: a.id,
          orderId: a.orderId,
          orderNumber: orderNumber.get(a.orderId) ?? null,
          amountCentavos: a.amountCentavos.toString(),
          status: a.status as 'active' | 'released',
          allocatedByLabel: a.allocatedByLabel,
          allocatedAt: a.allocatedAt.toISOString(),
          releasedReason: a.releasedReason,
        })),
        correctsReportId: fact.correctsFactId,
        possibleDuplicate: duplicates.has(fact.id),
        can: {
          verify,
          allocate: verify,
          addEvidence: verify || fact.reportedByMemberId === session.actorMemberId,
        },
      };
    });
  }

  private async readableFact(session: OsSession, reportId: string) {
    const prisma = this.prisma();
    const fact = await loadFactRow(prisma, session.organizationId, reportId);
    // Missing, another tenant's, or unreadable: the same answer.
    if (!fact || !(await this.mayRead(session, fact))) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return { prisma, fact };
  }

  private requireVerifier(session: OsSession): void {
    if (!canVerifyReportedPayment(session.grantedScopes)) throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
  }

  private async view(prisma: OsPrisma, session: OsSession, factId: string): Promise<PaymentReportView> {
    const fresh = await loadFactRow(prisma, session.organizationId, factId);
    if (!fresh) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const [view] = await this.toViews(prisma, session, [fresh]);
    return view!;
  }

  // ---------------------------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------------------------

  /**
   * `queue`: reports with a tender still to verify (verifiers). `all`: every report (verifiers).
   * `visible` (default for everyone else): own reports plus those of customers the actor may read.
   */
  @Get()
  async list(
    @Query('view') viewParam: string | undefined,
    @Query('partyId') partyId: string | undefined,
    @Query('orderId') orderId: string | undefined,
    @Query('limit') limitParam: string | undefined,
    @Req() req: Request,
  ): Promise<{ items: PaymentReportView[]; queueCount: number | null; view: string }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = this.prisma();
      const verifier = canVerifyReportedPayment(session.grantedScopes);
      const limit = Math.min(Math.max(Number.parseInt(limitParam ?? '', 10) || 50, 1), 100);
      const view = viewParam === 'queue' || viewParam === 'all' || viewParam === 'visible' ? viewParam : verifier ? 'queue' : 'visible';
      if ((view === 'queue' || view === 'all') && !verifier) throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
      const customer = partyId?.trim() || undefined;
      const order = orderId?.trim() || undefined;

      const where: Record<string, unknown> = { organizationId: session.organizationId, kind: 'payment' };
      if (view === 'queue') where.tenders = { some: { verification: 'pending' } };
      if (customer) where.customerPartyId = customer;
      if (order) {
        where.OR = [{ intendedOrderId: order }, { allocations: { some: { orderId: order } } }];
      }
      if (view === 'visible') {
        const ctx = await buildQueryContext(session, this.workforceStore);
        const scope = await resolveCustomerReadScope({
          ctx,
          lookup: this.customerVisibility,
          directReports: this.directReports,
        });
        if (scope.kind === 'parties') {
          const visible = [{ reportedByMemberId: session.actorMemberId }, { customerPartyId: { in: scope.partyIds } }];
          where.AND = [{ OR: visible }];
        }
      }
      const rows = await prisma.osReportedOperationalFact.findMany({
        where: where as never,
        include: factInclude,
        orderBy: { reportedAt: view === 'queue' ? 'asc' : 'desc' },
        take: limit,
      });
      const queueCount = verifier
        ? await prisma.osReportedOperationalFact.count({
            where: { organizationId: session.organizationId, kind: 'payment', tenders: { some: { verification: 'pending' } } },
          })
        : null;
      return { items: await this.toViews(prisma, session, rows), queueCount, view };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /**
   * Open orders of one customer, for the optional "pedido previsto" and for allocations.
   * Reporters see them for customers they may report on; verifiers for any customer of the tenant.
   * Missing, foreign and unauthorized customers answer the same.
   */
  @Get('customers/:customerId/orders')
  async customerOrders(
    @Param('customerId') customerId: string,
    @Req() req: Request,
  ): Promise<{ items: Array<{ id: string; orderNumber: string; status: string; totalCentavos: string }> }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const verifier = canVerifyReportedPayment(session.grantedScopes);
      if (!verifier && !canReportPayment(session.grantedScopes)) throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
      const prisma = this.prisma();
      const customer = await prisma.osParty.findFirst({
        where: { id: customerId, organizationId: session.organizationId },
        select: { id: true },
      });
      if (!customer || !(await this.mayReportFor(session, customerId))) throw httpError(HttpStatus.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
      const orders = await prisma.osOrder.findMany({
        where: { organizationId: session.organizationId, partyId: customerId, status: { not: 'cancelled' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, orderNumber: true, status: true, totalCentavos: true },
      });
      return {
        items: orders.map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          totalCentavos: order.totalCentavos.toString(),
        })),
      };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  @Get(':reportId')
  async detail(@Param('reportId') reportId: string, @Req() req: Request): Promise<{ report: PaymentReportView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const [report] = await this.toViews(prisma, session, [fact]);
      return { report: report! };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  @Get(':reportId/evidence/:evidenceId')
  async downloadEvidence(
    @Param('reportId') reportId: string,
    @Param('evidenceId') evidenceId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const evidence = await prisma.osPaymentEvidence.findFirst({
        where: { id: evidenceId, factId: fact.id, organizationId: session.organizationId },
      });
      if (!evidence) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      res
        .status(200)
        .set({
          'Content-Type': evidence.contentType,
          'Content-Length': String(evidence.content.length),
          'Content-Disposition': `inline; filename="${evidence.fileName.replace(/"/g, '')}"`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "default-src 'none'; sandbox",
        })
        .send(Buffer.from(evidence.content));
    } catch (err) {
      const error = paymentHttpError(err);
      res.status(error.getStatus()).json(error.getResponse());
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Record a report
  // ---------------------------------------------------------------------------------------------

  @Post()
  async record(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ report: PaymentReportView; replayed: boolean; verifierConfigured: boolean; copy: string }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      if (!canReportPayment(session.grantedScopes)) throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
      const prisma = this.prisma();
      const parsed = PaymentReportInputSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const input = parsed.data;
      const now = new Date();
      if (paidOnProblem(input.paidOn, now)) throw validationError([{ message: 'paid_on_in_future' }]);

      // Missing, foreign and unauthorized customers answer the same.
      const customer = await prisma.osParty.findFirst({
        where: { id: input.customerId, organizationId: session.organizationId },
        select: { id: true, displayName: true },
      });
      if (!customer || !(await this.mayReportFor(session, input.customerId))) {
        throw httpError(HttpStatus.NOT_FOUND, 'CUSTOMER_NOT_FOUND');
      }
      let intendedOrder: { id: string; orderNumber: string } | null = null;
      if (input.orderId) {
        intendedOrder = await prisma.osOrder.findFirst({
          where: { id: input.orderId, organizationId: session.organizationId, partyId: input.customerId },
          select: { id: true, orderNumber: true },
        });
        if (!intendedOrder) throw httpError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');
      }
      const recipientLabels = new Map<string, string>();
      for (const tender of input.tenders) {
        if (tender.method !== 'cash' || !tender.cashRecipientMemberId) continue;
        const label = await activeMemberLabel(prisma, session.organizationId, tender.cashRecipientMemberId);
        if (!label) throw httpError(HttpStatus.BAD_REQUEST, 'RECIPIENT_INVALID');
        recipientLabels.set(tender.cashRecipientMemberId, label);
      }

      const reporterLabel = (await memberLabel(prisma, session.organizationId, session.actorMemberId)) ?? 'Miembro del equipo';
      const headerKey = req.header('idempotency-key')?.trim();
      const idempotencyKey = headerKey ? `payment-report:${headerKey}` : null;
      const fingerprint = requestFingerprint(session.actorMemberId, input);

      const replay = async (): Promise<PaymentReportView | null> => {
        if (!idempotencyKey) return null;
        const prior = await prisma.osReportedOperationalFact.findFirst({
          where: { organizationId: session.organizationId, idempotencyKey },
          select: { id: true, payloadJson: true, reportedByMemberId: true },
        });
        if (!prior) return null;
        const stored = (prior.payloadJson as { requestFingerprint?: string } | null)?.requestFingerprint;
        if (stored !== fingerprint || prior.reportedByMemberId !== session.actorMemberId) {
          throw httpError(HttpStatus.CONFLICT, 'IDEMPOTENCY_CONFLICT');
        }
        return this.view(prisma, session, prior.id);
      };
      const earlier = await replay();
      const verifiers = await currentVerifierMemberIds(prisma, session.organizationId, now);
      if (earlier) {
        return { report: earlier, replayed: true, verifierConfigured: verifiers.length > 0, copy: PAYMENT_REPORT_COPY.recorded };
      }

      const factId = createId();
      const reportedAt = now.toISOString();
      const row = buildReportedOperationalFactRow(
        {
          id: factId,
          organizationId: session.organizationId,
          kind: 'payment',
          subjectType: intendedOrder ? 'order' : 'party',
          subjectId: intendedOrder ? intendedOrder.id : input.customerId,
          reportedAt,
          reportedByLabel: reporterLabel,
          reportedByMemberId: session.actorMemberId,
          note: input.note,
          idempotencyKey,
          payload: {
            amountCentavos: input.totalCentavos,
            currency: input.currency,
            tenders: input.tenders.map((t) => ({ method: t.method, amountCentavos: t.amountCentavos })),
          },
        },
        reportedAt,
      );

      try {
        await prisma.$transaction(async (tx) => {
          await tx.osReportedOperationalFact.create({
            data: {
              id: row.id,
              organizationId: row.organization_id,
              kind: row.kind,
              subjectType: row.subject_type,
              subjectId: row.subject_id,
              reportedAt: new Date(row.reported_at),
              reportedByMemberId: row.reported_by_member_id,
              reportedByLabel: row.reported_by_label,
              source: row.source,
              confirmation: 'pending',
              activity: 'active',
              sourceReference: null,
              note: row.note,
              payloadJson: { ...row.payload_json, requestFingerprint: fingerprint } as never,
              correctsFactId: null,
              idempotencyKey: row.idempotency_key,
              createdAt: new Date(row.created_at),
              customerPartyId: input.customerId,
              intendedOrderId: intendedOrder?.id ?? null,
              paidOn: new Date(`${input.paidOn}T00:00:00.000Z`),
            },
          });
          await tx.osPaymentTender.createMany({
            data: input.tenders.map((tender, index) => ({
              id: createId(),
              organizationId: session.organizationId,
              factId,
              seq: index + 1,
              method: tender.method,
              amountCentavos: BigInt(tender.amountCentavos),
              reference: tender.reference,
              referenceNormalized: normalizePaymentReference(tender.reference),
              cashRecipientMemberId: tender.method === 'cash' ? tender.cashRecipientMemberId : null,
              cashRecipientLabel:
                tender.method === 'cash' && tender.cashRecipientMemberId
                  ? (recipientLabels.get(tender.cashRecipientMemberId) ?? null)
                  : null,
              cashRecipientUnresolvedReason: tender.method === 'cash' ? tender.cashRecipientUnresolvedReason : null,
              verification: 'pending',
            })),
          });
          await admitPaymentNotices(tx, {
            organizationId: session.organizationId,
            recipientMemberIds: verifiers.filter((id) => id !== session.actorMemberId),
            kind: 'payment_to_verify',
            title: 'Pago por verificar',
            body: `${customer.displayName}: pago reportado por ${reporterLabel}.`,
            factId,
            partyId: input.customerId,
            dedupSuffix: 'report',
          });
        });
      } catch (err) {
        if (!idempotencyKey || !isIdempotencyConflict(err)) throw err;
        const winner = await replay();
        if (winner) {
          return { report: winner, replayed: true, verifierConfigured: verifiers.length > 0, copy: PAYMENT_REPORT_COPY.recorded };
        }
        throw err;
      }
      return {
        report: await this.view(prisma, session, factId),
        replayed: false,
        verifierConfigured: verifiers.length > 0,
        copy: PAYMENT_REPORT_COPY.recorded,
      };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Private evidence
  // ---------------------------------------------------------------------------------------------

  /** Raw bytes (image or PDF). The file's own signature decides the type, never the header. */
  @Post(':reportId/evidence')
  async addEvidence(
    @Param('reportId') reportId: string,
    @Query('fileName') fileName: string | undefined,
    @Query('tenderId') tenderId: string | undefined,
    @Req() req: Request,
  ): Promise<{ report: PaymentReportView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const reporter = fact.reportedByMemberId === session.actorMemberId;
      if (!reporter && !canVerifyReportedPayment(session.grantedScopes)) {
        throw httpError(HttpStatus.FORBIDDEN, 'PERMISSION_DENIED');
      }
      const bytes = await readRawBody(req, PAYMENT_EVIDENCE_MAX_BYTES);
      if (bytes.length === 0) throw httpError(HttpStatus.BAD_REQUEST, 'FILE_EMPTY');
      const type = sniffPaymentEvidenceType(bytes);
      if (!type) throw httpError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, 'FILE_TYPE_NOT_ALLOWED');
      const tender = tenderId?.trim() || null;
      if (tender && !fact.tenders.some((t) => t.id === tender)) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      const sha256 = sha256Hex(bytes);
      const existing = await prisma.osPaymentEvidence.findFirst({
        where: { organizationId: session.organizationId, factId: fact.id, sha256, tenderId: tender },
        select: { id: true },
      });
      if (!existing) {
        await prisma.osPaymentEvidence.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            factId: fact.id,
            tenderId: tender,
            fileName: safeEvidenceFileName(fileName),
            contentType: type,
            sizeBytes: bytes.length,
            sha256,
            content: new Uint8Array(bytes),
            uploadedByMemberId: session.actorMemberId,
          },
        });
      }
      return { report: await this.view(prisma, session, fact.id) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Per-tender verification (payments.confirm only)
  // ---------------------------------------------------------------------------------------------

  private async decide(
    session: OsSession,
    reportId: string,
    tenderId: string,
    action: 'confirmed' | 'rejected',
    body: unknown,
  ): Promise<{ report: PaymentReportView; replayed: boolean }> {
    this.requireVerifier(session);
    const parsed = PaymentTenderDecisionSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues);
    const { prisma, fact } = await this.readableFact(session, reportId);
    const tender = fact.tenders.find((t) => t.id === tenderId);
    if (!tender) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const label = (await memberLabel(prisma, session.organizationId, session.actorMemberId)) ?? 'Miembro del equipo';

    const current = {
      verification: tender.verification as PaymentTenderVerification,
      method: tender.method as PaymentTenderMethod,
      cashRecipientMemberId: tender.cashRecipientMemberId,
    };
    // The same human repeating the same decision is a retry, not a second outcome.
    if (current.verification === action) {
      const last = await prisma.osPaymentTenderEvent.findFirst({
        where: { tenderId: tender.id, action },
        orderBy: { createdAt: 'desc' },
      });
      if (last && last.actorMemberId === session.actorMemberId && last.reason === parsed.data.reason) {
        return { report: await this.view(prisma, session, fact.id), replayed: true };
      }
    }
    const problem = action === 'confirmed' ? tenderConfirmProblem(current) : tenderRejectProblem(current);
    if (problem === 'recipient_unresolved') throw httpError(HttpStatus.CONFLICT, 'RECIPIENT_UNRESOLVED');
    if (problem) throw httpError(HttpStatus.CONFLICT, 'TENDER_ALREADY_DECIDED', { verification: current.verification });

    try {
      await prisma.$transaction(async (tx) => {
        // Only one simultaneous verifier wins: the update matches a still-pending tender.
        const won = await tx.osPaymentTender.updateMany({
          where: {
            id: tender.id,
            organizationId: session.organizationId,
            verification: 'pending',
            ...(action === 'confirmed' && tender.method === 'cash' ? { cashRecipientMemberId: { not: null } } : {}),
          },
          data: { verification: action },
        });
        if (won.count !== 1) throw httpError(HttpStatus.CONFLICT, 'TENDER_ALREADY_DECIDED');
        await tx.osPaymentTenderEvent.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            tenderId: tender.id,
            action,
            reason: parsed.data.reason,
            actorMemberId: session.actorMemberId,
            actorLabel: label,
          },
        });
        await this.noticeOutcome(tx, session, fact, tender.method, action, tender.amountCentavos, tender.id);
        await resolvePaymentToVerifyNotices(tx, session.organizationId, fact.id);
      });
    } catch (err) {
      const mapped = paymentHttpError(err);
      if (mapped.getStatus() === HttpStatus.CONFLICT) {
        const fresh = await prisma.osPaymentTender.findFirst({ where: { id: tender.id }, select: { verification: true } });
        throw httpError(HttpStatus.CONFLICT, (mapped.getResponse() as { code?: string }).code ?? 'TENDER_ALREADY_DECIDED', {
          verification: fresh?.verification ?? null,
        });
      }
      throw mapped;
    }
    return { report: await this.view(prisma, session, fact.id), replayed: false };
  }

  /** Reporter and account owner learn the outcome. The actor does not notify themself. */
  private async noticeOutcome(
    tx: OsTx,
    session: OsSession,
    fact: FactRow,
    method: string,
    action: 'confirmed' | 'rejected' | 'reversed',
    amount: bigint,
    tenderId: string,
  ): Promise<void> {
    const owner = fact.customerPartyId
      ? await tx.osCommercialAccount.findFirst({
          where: { organizationId: session.organizationId, partyId: fact.customerPartyId },
          select: { ownerMemberId: true },
        })
      : null;
    const recipients = [fact.reportedByMemberId, owner?.ownerMemberId ?? null].filter(
      (id): id is string => !!id && id !== session.actorMemberId,
    );
    const verb = action === 'confirmed' ? 'confirmó la recepción de' : action === 'rejected' ? 'rechazó' : 'revirtió';
    const bs = `${amount / 100n}.${String(amount % 100n).padStart(2, '0')}`;
    await admitPaymentNotices(tx, {
      organizationId: session.organizationId,
      recipientMemberIds: recipients,
      kind: 'payment_outcome',
      title: 'Resultado de pago',
      body: `Contabilidad ${verb} ${method === 'qr' ? 'QR' : method === 'cash' ? 'efectivo' : method === 'transfer' ? 'transferencia' : 'otro medio'} por Bs ${bs} (${fact.customerParty?.displayName ?? 'cliente'}).`,
      factId: fact.id,
      partyId: fact.customerPartyId,
      dedupSuffix: `${tenderId}:${action}`,
    });
  }

  @Post(':reportId/tenders/:tenderId/confirm')
  async confirm(
    @Param('reportId') reportId: string,
    @Param('tenderId') tenderId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      return await this.decide(session, reportId, tenderId, 'confirmed', body);
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  @Post(':reportId/tenders/:tenderId/reject')
  async reject(
    @Param('reportId') reportId: string,
    @Param('tenderId') tenderId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    try {
      const session = await resolveSession(req, this.workforceStore);
      return await this.decide(session, reportId, tenderId, 'rejected', body);
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /** Known cash receiver for a tender that was reported with "Receptor por confirmar". */
  @Post(':reportId/tenders/:tenderId/resolve-recipient')
  async resolveRecipient(
    @Param('reportId') reportId: string,
    @Param('tenderId') tenderId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ report: PaymentReportView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requireVerifier(session);
      const parsed = PaymentCashRecipientResolutionSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const tender = fact.tenders.find((t) => t.id === tenderId);
      if (!tender) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (tender.method !== 'cash' || tender.verification !== 'pending' || tender.cashRecipientMemberId) {
        throw httpError(HttpStatus.CONFLICT, 'RECIPIENT_NOT_UNRESOLVED');
      }
      const recipientLabel = await activeMemberLabel(prisma, session.organizationId, parsed.data.recipientMemberId);
      if (!recipientLabel) throw httpError(HttpStatus.BAD_REQUEST, 'RECIPIENT_INVALID');
      const actorLabel = (await memberLabel(prisma, session.organizationId, session.actorMemberId)) ?? 'Miembro del equipo';
      await prisma.$transaction(async (tx) => {
        const won = await tx.osPaymentTender.updateMany({
          where: { id: tender.id, organizationId: session.organizationId, verification: 'pending', cashRecipientMemberId: null },
          data: {
            cashRecipientMemberId: parsed.data.recipientMemberId,
            cashRecipientLabel: recipientLabel,
            cashRecipientUnresolvedReason: null,
          },
        });
        if (won.count !== 1) throw httpError(HttpStatus.CONFLICT, 'RECIPIENT_NOT_UNRESOLVED');
        await tx.osPaymentTenderEvent.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            tenderId: tender.id,
            action: 'recipient_resolved',
            reason: `Receptor: ${recipientLabel}. Antes: ${tender.cashRecipientUnresolvedReason ?? 'sin motivo'}${parsed.data.reason ? `. ${parsed.data.reason}` : ''}`,
            actorMemberId: session.actorMemberId,
            actorLabel,
          },
        });
      });
      return { report: await this.view(prisma, session, fact.id) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  /**
   * Correction of confirmed funds: an authorized reversal that keeps the original amount and
   * history, optionally with a linked replacement report (a new, pending report that points back).
   */
  @Post(':reportId/tenders/:tenderId/reverse')
  async reverse(
    @Param('reportId') reportId: string,
    @Param('tenderId') tenderId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ report: PaymentReportView; replacement: PaymentReportView | null }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requireVerifier(session);
      const parsed = PaymentTenderReversalSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const tender = fact.tenders.find((t) => t.id === tenderId);
      if (!tender) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (tenderReverseProblem({ verification: tender.verification as PaymentTenderVerification })) {
        throw httpError(HttpStatus.CONFLICT, 'TENDER_NOT_CONFIRMED', { verification: tender.verification });
      }
      const confirmed = fact.tenders.filter((t) => t.verification === 'confirmed').reduce((s, t) => s + t.amountCentavos, 0n);
      const allocated = fact.allocations.filter((a) => a.status === 'active').reduce((s, a) => s + a.amountCentavos, 0n);
      if (reversalLeavesOverAllocation({ confirmedCentavos: confirmed, activeAllocatedCentavos: allocated, reversedCentavos: tender.amountCentavos })) {
        throw httpError(HttpStatus.CONFLICT, 'RELEASE_ALLOCATIONS_FIRST');
      }
      const replacement = parsed.data.replacement;
      const recipientLabels = new Map<string, string>();
      for (const item of replacement?.tenders ?? []) {
        if (item.method !== 'cash' || !item.cashRecipientMemberId) continue;
        const label = await activeMemberLabel(prisma, session.organizationId, item.cashRecipientMemberId);
        if (!label) throw httpError(HttpStatus.BAD_REQUEST, 'RECIPIENT_INVALID');
        recipientLabels.set(item.cashRecipientMemberId, label);
      }
      if (replacement && paidOnProblem(replacement.paidOn, new Date())) {
        throw validationError([{ message: 'paid_on_in_future' }]);
      }
      const actorLabel = (await memberLabel(prisma, session.organizationId, session.actorMemberId)) ?? 'Miembro del equipo';
      const replacementId = replacement ? createId() : null;
      const verifiers = await currentVerifierMemberIds(prisma, session.organizationId, new Date());

      try {
        await prisma.$transaction(async (tx) => {
          const won = await tx.osPaymentTender.updateMany({
            where: { id: tender.id, organizationId: session.organizationId, verification: 'confirmed' },
            data: { verification: 'reversed' },
          });
          if (won.count !== 1) throw httpError(HttpStatus.CONFLICT, 'TENDER_NOT_CONFIRMED');
          await tx.osPaymentTenderEvent.create({
            data: {
              id: createId(),
              organizationId: session.organizationId,
              tenderId: tender.id,
              action: 'reversed',
              reason: parsed.data.reason,
              actorMemberId: session.actorMemberId,
              actorLabel,
            },
          });
          if (replacement && replacementId) {
            const total = replacement.tenders.reduce((sum, t) => sum + BigInt(t.amountCentavos), 0n);
            const reportedAt = new Date();
            await tx.osReportedOperationalFact.create({
              data: {
                id: replacementId,
                organizationId: session.organizationId,
                kind: 'payment',
                subjectType: fact.subjectType,
                subjectId: fact.subjectId,
                reportedAt,
                reportedByMemberId: session.actorMemberId,
                reportedByLabel: actorLabel,
                source: 'manual',
                confirmation: 'pending',
                activity: 'active',
                note: replacement.note,
                payloadJson: {
                  amountCentavos: total.toString(),
                  currency: 'BOB',
                  method: null,
                  tenders: replacement.tenders.map((t) => ({ method: t.method, amountCentavos: t.amountCentavos })),
                },
                correctsFactId: fact.id,
                customerPartyId: fact.customerPartyId,
                intendedOrderId: fact.intendedOrderId,
                paidOn: new Date(`${replacement.paidOn}T00:00:00.000Z`),
              },
            });
            await tx.osPaymentTender.createMany({
              data: replacement.tenders.map((t, index) => ({
                id: createId(),
                organizationId: session.organizationId,
                factId: replacementId,
                seq: index + 1,
                method: t.method,
                amountCentavos: BigInt(t.amountCentavos),
                reference: t.reference,
                referenceNormalized: normalizePaymentReference(t.reference),
                cashRecipientMemberId: t.method === 'cash' ? t.cashRecipientMemberId : null,
                cashRecipientLabel:
                  t.method === 'cash' && t.cashRecipientMemberId ? (recipientLabels.get(t.cashRecipientMemberId) ?? null) : null,
                cashRecipientUnresolvedReason: t.method === 'cash' ? t.cashRecipientUnresolvedReason : null,
                verification: 'pending',
                replacesTenderId: index === 0 ? tender.id : null,
              })),
            });
            await admitPaymentNotices(tx, {
              organizationId: session.organizationId,
              recipientMemberIds: verifiers.filter((id) => id !== session.actorMemberId),
              kind: 'payment_to_verify',
              title: 'Pago por verificar',
              body: `Reemplazo de un pago revertido (${fact.customerParty?.displayName ?? 'cliente'}).`,
              factId: replacementId,
              partyId: fact.customerPartyId,
              dedupSuffix: 'report',
            });
          }
          await this.noticeOutcome(tx, session, fact, tender.method, 'reversed', tender.amountCentavos, tender.id);
        });
      } catch (err) {
        const mapped = paymentHttpError(err);
        if (mapped.getStatus() === HttpStatus.CONFLICT && (mapped.getResponse() as { code?: string }).code === 'OVER_ALLOCATION') {
          throw httpError(HttpStatus.CONFLICT, 'RELEASE_ALLOCATIONS_FIRST');
        }
        throw mapped;
      }
      return {
        report: await this.view(prisma, session, fact.id),
        replacement: replacementId ? await this.view(prisma, session, replacementId) : null,
      };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  // ---------------------------------------------------------------------------------------------
  // Allocation of confirmed funds to orders (payments.confirm only)
  // ---------------------------------------------------------------------------------------------

  /** Explicit only: nothing is ever assigned to the most recent order. */
  @Post(':reportId/allocations')
  async allocate(
    @Param('reportId') reportId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ report: PaymentReportView; replayed: boolean }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requireVerifier(session);
      const parsed = PaymentAllocationInputSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const { prisma, fact } = await this.readableFact(session, reportId);
      if (!fact.customerPartyId) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      // The order must be this customer's, in this tenant. Missing and foreign answer the same.
      const order = await prisma.osOrder.findFirst({
        where: { id: parsed.data.orderId, organizationId: session.organizationId, partyId: fact.customerPartyId },
        select: { id: true, status: true },
      });
      if (!order || order.status === 'cancelled') throw httpError(HttpStatus.NOT_FOUND, 'ORDER_NOT_FOUND');

      const idempotencyKey = req.header('idempotency-key')?.trim();
      const binding = replayBinding(session.actorMemberId, ALLOCATE_COMMAND, { reportId, ...parsed.data });
      const stored = async (): Promise<boolean> => {
        if (!idempotencyKey) return false;
        const prior = await prisma.osIdempotencyKey.findUnique({
          where: { organizationId_key: { organizationId: session.organizationId, key: idempotencyKey } },
        });
        if (!prior) return false;
        try {
          openReplay<{ allocationId: string }>(prior.resultJson, binding);
        } catch (err) {
          const code = err instanceof Error ? err.message : '';
          if (code === REPLAY_REVIEW_REQUIRED) {
            throw httpError(HttpStatus.CONFLICT, REPLAY_REVIEW_REQUIRED, { message: REPLAY_REVIEW_REQUIRED_MESSAGE });
          }
          throw httpError(HttpStatus.CONFLICT, 'IDEMPOTENCY_CONFLICT');
        }
        return true;
      };
      if (await stored()) return { report: await this.view(prisma, session, fact.id), replayed: true };

      const confirmed = fact.tenders.filter((t) => t.verification === 'confirmed').reduce((s, t) => s + t.amountCentavos, 0n);
      const allocated = fact.allocations.filter((a) => a.status === 'active').reduce((s, a) => s + a.amountCentavos, 0n);
      const problem = allocationProblem({
        confirmedCentavos: confirmed,
        activeAllocatedCentavos: allocated,
        requestedCentavos: parsed.data.amountCentavos,
      });
      if (problem === 'exceeds_confirmed') {
        throw httpError(HttpStatus.CONFLICT, 'OVER_ALLOCATION', { unassignedCentavos: (confirmed - allocated).toString() });
      }
      const actorLabel = (await memberLabel(prisma, session.organizationId, session.actorMemberId)) ?? 'Miembro del equipo';
      const allocationId = createId();
      try {
        await prisma.$transaction(async (tx) => {
          await tx.osPaymentAllocation.create({
            data: {
              id: allocationId,
              organizationId: session.organizationId,
              factId: fact.id,
              orderId: order.id,
              amountCentavos: BigInt(parsed.data.amountCentavos),
              status: 'active',
              allocatedByMemberId: session.actorMemberId,
              allocatedByLabel: actorLabel,
            },
          });
          if (idempotencyKey) {
            await tx.osIdempotencyKey.create({
              data: {
                id: createId(),
                organizationId: session.organizationId,
                key: idempotencyKey,
                commandName: ALLOCATE_COMMAND,
                resultJson: sealReplay({ allocationId }, binding) as StoredJson,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          }
        });
      } catch (err) {
        if (idempotencyKey && isIdempotencyConflict(err) && (await stored())) {
          return { report: await this.view(prisma, session, fact.id), replayed: true };
        }
        throw err;
      }
      return { report: await this.view(prisma, session, fact.id), replayed: false };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }

  @Post(':reportId/allocations/:allocationId/release')
  async releaseAllocation(
    @Param('reportId') reportId: string,
    @Param('allocationId') allocationId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ report: PaymentReportView }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      this.requireVerifier(session);
      const parsed = PaymentAllocationReleaseSchema.safeParse(body);
      if (!parsed.success) throw validationError(parsed.error.issues);
      const { prisma, fact } = await this.readableFact(session, reportId);
      const allocation = fact.allocations.find((a) => a.id === allocationId);
      if (!allocation) throw httpError(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      const released = await prisma.osPaymentAllocation.updateMany({
        where: { id: allocation.id, organizationId: session.organizationId, status: 'active' },
        data: {
          status: 'released',
          releasedAt: new Date(),
          releasedByMemberId: session.actorMemberId,
          releasedReason: parsed.data.reason,
        },
      });
      if (released.count !== 1 && allocation.status !== 'released') throw httpError(HttpStatus.CONFLICT, 'STATE_CONFLICT');
      return { report: await this.view(prisma, session, fact.id) };
    } catch (err) {
      throw paymentHttpError(err);
    }
  }
}
