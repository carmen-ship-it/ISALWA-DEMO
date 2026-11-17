/**
 * Tenant-scoped list of company-entered OsCustomerConversation rows.
 * Not the legacy messaging GET /conversations shape (apps/api).
 * Recording WhatsApp as a channel label does not connect a provider.
 */
import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CUSTOMER_CONVERSATION_CHANNELS,
  CUSTOMER_CONVERSATION_PROVENANCE,
  CUSTOMER_CONVERSATION_SOURCE,
  AddInternalNoteSchema,
  ConversationNextStepSchema,
  INTERNAL_NOTE_VISIBILITY,
  TransitionAttentionStateSchema,
  assertInternalNoteShape,
  attentionStateAfterTake,
  checkAttentionTransition,
  humanActionPausesAutomation,
  isAttentionState,
  type AttentionState,
  type ConversationInternalNote,
  WHATSAPP_NUMBER_PENDING,
  recordManualCustomerConversation,
  type CustomerConversationAdmission,
  type ManualCustomerConversation,
  type CustomerConversationChannel,
  type ConversationNextStep,
  type RecordCustomerConversationInput,
} from '@isalwa/os-contracts';
import type { CommitmentCommandService } from '@isalwa/os-commitment';
import { getOsPrisma } from '@isalwa/os-database';
import {
  REPLAY_REVIEW_REQUIRED,
  REPLAY_REVIEW_REQUIRED_MESSAGE,
  isIdempotencyConflict,
  openReplay,
  replayBinding,
  sealReplay,
  type ReplayBinding,
} from '@isalwa/os-events';
import type { OsWorkforceStore } from '@isalwa/os-workforce';
import {
  buildQueryContext,
  canReadCustomer,
  resolveCustomerReadScope,
  type CustomerVisibilityLookup,
  type DirectReportLookup,
} from '@isalwa/os-query';
import { resolveSession } from './os-session';
import { createHash } from 'node:crypto';
import { createId } from '@isalwa/ts-utils';
import {
  OS_COMMITMENT_COMMAND_SERVICE,
  OS_CUSTOMER_VISIBILITY,
  OS_MEMBER_QUERY_STORE,
  OS_STORE,
} from './os-store.module';

const RECORD_CONVERSATION_COMMAND = 'RecordCustomerConversation';
const NEXT_STEP_KEY_PREFIX = 'conv-next-step:';

/** Result of saving the next step next to the conversation. Never silent. */
export type NextStepOutcome =
  | { status: 'created'; commitmentId: string }
  | { status: 'failed'; code: string };

/** Codes the commitment command can return that the person can act on. Anything else is generic. */
const NEXT_STEP_ERROR_CODES = new Set([
  'VALIDATION_FAILED',
  'NOT_FOUND',
  'PERMISSION_DENIED',
  'TENANT_FORBIDDEN',
  'ACCESS_REVOKED',
  'AUTH_REQUIRED',
  'CONFLICT',
  'DATABASE_UNAVAILABLE',
]);

/** Noon in La Paz on the chosen day, as an instant. The commitment shows that calendar day. */
export function nextStepDueAt(dueDate: string): string {
  return new Date(`${dueDate}T12:00:00-04:00`).toISOString();
}

type StoredJson = NonNullable<
  Parameters<NonNullable<ReturnType<typeof getOsPrisma>>['osIdempotencyKey']['create']>[0]
>['data']['resultJson'];

/** S11 replay for this controller. Status 409 is the code this route already used for CONFLICT. */
function openReplayOrHttp<T>(stored: unknown, binding: ReplayBinding): T {
  try {
    return openReplay<T>(stored, binding);
  } catch (err) {
    const code = err instanceof Error ? err.message : 'CONFLICT';
    if (code === REPLAY_REVIEW_REQUIRED) {
      throw new HttpException(
        { code: REPLAY_REVIEW_REQUIRED, message: REPLAY_REVIEW_REQUIRED_MESSAGE },
        HttpStatus.CONFLICT,
      );
    }
    throw new HttpException('CONFLICT', HttpStatus.CONFLICT);
  }
}

function toManual(row: {
  id: string;
  organizationId: string;
  customerId: string;
  customerLabel: string;
  contactLabel: string | null;
  channel: string;
  occurredAt: Date;
  enteredByMemberId: string | null;
  enteredByLabel: string;
  summary: string;
  pastedEvidence: string | null;
  reason: string | null;
  assignedMemberId: string | null;
  assignedLabel: string | null;
  assignedAt: Date | null;
  nextStepCommitmentId: string | null;
  attentionState: string;
  attentionStateChangedAt: Date | null;
  automationPausedAt: Date | null;
  opportunityId: string | null;
  quoteId: string | null;
  orderId: string | null;
  customerQuestion: string | null;
  commitmentCandidate: string | null;
  possibleRequestedDate: Date | null;
  nextAction: string | null;
}): ManualCustomerConversation | null {
  const channel = (CUSTOMER_CONVERSATION_CHANNELS as readonly string[]).includes(row.channel)
    ? (row.channel as CustomerConversationChannel)
    : null;
  if (!channel) return null;
  const admitted = recordManualCustomerConversation({
    id: row.id,
    organizationId: row.organizationId,
    customerId: row.customerId,
    customerLabel: row.customerLabel,
    contactLabel: row.contactLabel,
    channel,
    occurredAt: row.occurredAt.toISOString(),
    enteredByMemberId: row.enteredByMemberId,
    enteredByLabel: row.enteredByLabel,
    summary: row.summary,
    pastedEvidence: row.pastedEvidence,
    reason: row.reason,
    opportunityId: row.opportunityId,
    quoteId: row.quoteId,
    orderId: row.orderId,
    customerQuestion: row.customerQuestion,
    commitmentCandidate: row.commitmentCandidate,
    possibleRequestedDate: row.possibleRequestedDate
      ? row.possibleRequestedDate.toISOString().slice(0, 10)
      : null,
    nextAction: row.nextAction,
  });
  if (!admitted.ok) return null;
  // Admission never assigns. Assignment and the commitment link come from stored columns only.
  return {
    ...admitted.record,
    assignedMemberId: row.assignedMemberId,
    assignedLabel: row.assignedLabel,
    assignedAt: row.assignedAt ? row.assignedAt.toISOString() : null,
    nextStepCommitmentId: row.nextStepCommitmentId,
    attentionState: isAttentionState(row.attentionState) ? row.attentionState : 'new',
    attentionStateChangedAt: row.attentionStateChangedAt
      ? row.attentionStateChangedAt.toISOString()
      : null,
    automationPausedAt: row.automationPausedAt ? row.automationPausedAt.toISOString() : null,
  };
}

function toNote(row: {
  id: string;
  organizationId: string;
  conversationId: string;
  authorMemberId: string;
  authorLabel: string;
  body: string;
  visibility: string;
  createdAt: Date;
}): ConversationInternalNote {
  assertInternalNoteShape({ visibility: row.visibility });
  return {
    id: row.id,
    organizationId: row.organizationId,
    conversationId: row.conversationId,
    authorMemberId: row.authorMemberId,
    authorLabel: row.authorLabel,
    body: row.body,
    visibility: INTERNAL_NOTE_VISIBILITY,
    createdAt: row.createdAt.toISOString(),
  };
}

function prismaCreateFromManual(record: ManualCustomerConversation, createdAtIso: string) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId,
    customerLabel: record.customerLabel,
    contactLabel: record.contactLabel,
    channel: record.channel,
    occurredAt: new Date(record.occurredAt),
    enteredByMemberId: record.enteredByMemberId,
    enteredByLabel: record.enteredByLabel,
    summary: record.summary,
    pastedEvidence: record.pastedEvidence,
    reason: record.reason,
    opportunityId: record.opportunityId,
    quoteId: record.quoteId,
    orderId: record.orderId,
    customerQuestion: record.customerQuestion,
    commitmentCandidate: record.commitmentCandidate,
    possibleRequestedDate: record.possibleRequestedDate
      ? new Date(`${record.possibleRequestedDate}T00:00:00.000Z`)
      : null,
    nextAction: record.nextAction,
    source: record.source ?? CUSTOMER_CONVERSATION_SOURCE,
    provenance: record.provenance ?? CUSTOMER_CONVERSATION_PROVENANCE,
    advisorNumberStatus: record.advisorNumberStatus ?? WHATSAPP_NUMBER_PENDING,
    createdAt: new Date(createdAtIso),
  };
}

/**
 * Admits a conversation using only what the server knows. The client chooses the
 * customer, channel, time and content. The record id, tenant, the member who
 * entered it and that member's label come from the session / server and are never
 * read from the request body.
 */
export function admitSessionConversation(input: {
  body: unknown;
  session: { organizationId: string; actorMemberId?: string | null };
  /** Display label of the authenticated member, resolved server-side. */
  enteredByLabel: string;
  /** Canonical customer label from the Party record in this tenant. */
  customerLabel: string;
  id: string;
}): CustomerConversationAdmission {
  const actorMemberId = input.session.actorMemberId?.trim();
  if (!actorMemberId) return { ok: false, reason: 'missing_entered_by' };

  const draft =
    input.body && typeof input.body === 'object' && !Array.isArray(input.body)
      ? (input.body as RecordCustomerConversationInput)
      : ({} as RecordCustomerConversationInput);

  return recordManualCustomerConversation({
    ...draft,
    id: input.id,
    organizationId: input.session.organizationId,
    customerLabel: input.customerLabel,
    enteredByMemberId: actorMemberId,
    enteredByLabel: input.enteredByLabel,
  });
}

/**
 * Whether a linked commercial record (opportunity, quote, order) is readable through
 * its owner: an organization reader, the owner, or a team lead of that owner.
 * Having entered a conversation is not authority (T02 decision).
 */
export function memberCanSeeConversation(input: {
  actorMemberId: string;
  grantedScopes: readonly string[];
  accountOwnerMemberId: string | null;
  directReportMemberIds: readonly string[];
}): boolean {
  // people.admin administers assignments; it is not commercial read (V2 §6).
  if (input.grantedScopes.includes('commercial.org.read')) return true;
  if (input.accountOwnerMemberId && input.accountOwnerMemberId === input.actorMemberId) return true;
  return (
    input.grantedScopes.includes('commercial.team.read') &&
    !!input.accountOwnerMemberId &&
    input.directReportMemberIds.includes(input.accountOwnerMemberId)
  );
}

/** Stable codes only. Never echo an internal message. */
function conversationHttpError(err: unknown): HttpException {
  if (err instanceof HttpException) return err;
  const code = err instanceof Error ? err.message : '';
  if (code === 'AUTH_REQUIRED') return new HttpException({ code }, HttpStatus.UNAUTHORIZED);
  if (code === 'ACCESS_REVOKED' || code === 'TENANT_FORBIDDEN' || code === 'PERMISSION_DENIED') {
    return new HttpException({ code }, HttpStatus.FORBIDDEN);
  }
  return new HttpException({ code: 'INTERNAL_ERROR' }, HttpStatus.INTERNAL_SERVER_ERROR);
}

/**
 * A supplied opportunity, quote, or order must exist in this company, belong to
 * the same customer, and be readable by this actor. A missing record and a
 * record in another company are the same denial, so the response does not
 * reveal which one it was.
 */
export function commercialLinkDenial(input: {
  record: { organizationId: string; partyId: string; ownerMemberId: string | null } | null;
  sessionOrganizationId: string;
  customerId: string;
  actorMemberId: string;
  grantedScopes: readonly string[];
  directReportMemberIds: readonly string[];
}): 'not_found' | 'wrong_customer' | 'not_allowed' | null {
  if (!input.record || input.record.organizationId !== input.sessionOrganizationId) return 'not_found';
  if (input.record.partyId !== input.customerId) return 'wrong_customer';
  const allowed = memberCanSeeConversation({
    actorMemberId: input.actorMemberId,
    grantedScopes: input.grantedScopes,
    accountOwnerMemberId: input.record.ownerMemberId,
    directReportMemberIds: input.directReportMemberIds,
  });
  return allowed ? null : 'not_allowed';
}

@Controller('customer-conversations')
export class CustomerConversationsController {
  constructor(
    @Inject(OS_STORE) private readonly workforceStore: OsWorkforceStore,
    @Inject(OS_CUSTOMER_VISIBILITY) private readonly customerVisibility: CustomerVisibilityLookup,
    @Inject(OS_MEMBER_QUERY_STORE) private readonly directReports: DirectReportLookup,
    @Inject(OS_COMMITMENT_COMMAND_SERVICE) private readonly commitmentCommands: CommitmentCommandService,
  ) {}

  /**
   * Turns the saved next step into a commitment through the existing command (own
   * transaction, event and audit). The key binds the conversation and the exact payload,
   * so a retry of the same step is the same commitment and an edited step is a new one.
   * A failure never throws: the conversation is already saved, so the caller reports a
   * recoverable partial outcome instead of a success that lost the step.
   */
  private async createNextStepCommitment(
    session: Awaited<ReturnType<typeof resolveSession>>,
    conversation: { id: string; customerId: string },
    step: ConversationNextStep,
  ): Promise<NextStepOutcome> {
    const prisma = getOsPrisma();
    if (!prisma) return { status: 'failed', code: 'DATABASE_UNAVAILABLE' };
    const fingerprint = createHash('sha256')
      .update(JSON.stringify([step.description, step.ownerMemberId, step.dueDate]))
      .digest('hex')
      .slice(0, 16);
    try {
      const result = await this.commitmentCommands.execute(
        'CreateEmployeeCommitment',
        session,
        {
          text: step.description,
          ownerMemberId: step.ownerMemberId,
          partyId: conversation.customerId,
          dueAt: nextStepDueAt(step.dueDate),
        },
        `${NEXT_STEP_KEY_PREFIX}${conversation.id}:${fingerprint}`,
      );
      const commitmentId = String(result.data?.commitmentId ?? '');
      if (!commitmentId) return { status: 'failed', code: 'NEXT_STEP_FAILED' };
      await prisma.osCustomerConversation.updateMany({
        where: {
          id: conversation.id,
          organizationId: session.organizationId,
          nextStepCommitmentId: null,
        },
        data: { nextStepCommitmentId: commitmentId },
      });
      return { status: 'created', commitmentId };
    } catch (err) {
      const raw =
        err instanceof HttpException
          ? ((err.getResponse() as { code?: unknown })?.code ?? '')
          : err instanceof Error
            ? err.message
            : '';
      const code = typeof raw === 'string' && NEXT_STEP_ERROR_CODES.has(raw) ? raw : 'NEXT_STEP_FAILED';
      return { status: 'failed', code };
    }
  }

  /** Same denial for a missing conversation, another company's, or an unreadable customer. */
  private async readableConversation(
    session: Awaited<ReturnType<typeof resolveSession>>,
    conversationId: string,
  ) {
    const prisma = getOsPrisma();
    if (!prisma) throw new HttpException('Database unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    const row = await prisma.osCustomerConversation.findFirst({
      where: { id: conversationId, organizationId: session.organizationId },
    });
    if (!row) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    const ctx = await buildQueryContext(session, this.workforceStore);
    const readable = await canReadCustomer({
      ctx,
      partyId: row.customerId,
      lookup: this.customerVisibility,
      directReports: this.directReports,
    });
    if (!readable) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
    return { prisma, row };
  }

  /**
   * Tomar conversación. One winner: the claim only matches an unassigned row, so two
   * simultaneous takers cannot both succeed. Taking never changes the account owner and
   * never overrides someone else's assignment.
   */
  @Post(':conversationId/take')
  async takeConversation(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
  ): Promise<{ item: ManualCustomerConversation }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, row } = await this.readableConversation(session, conversationId);
      const present = async (): Promise<{ item: ManualCustomerConversation }> => {
        const fresh = await prisma.osCustomerConversation.findFirst({
          where: { id: row.id, organizationId: session.organizationId },
        });
        const item = fresh ? toManual(fresh) : null;
        if (!item) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
        return { item };
      };
      if (row.assignedMemberId === session.actorMemberId) return present();
      if (row.assignedMemberId) {
        throw new HttpException(
          { code: 'ALREADY_ASSIGNED', assignedLabel: row.assignedLabel },
          HttpStatus.CONFLICT,
        );
      }
      const person = await prisma.osPerson.findUnique({
        where: { id: session.personId },
        select: { givenName: true, familyName: true },
      });
      const assignedLabel =
        [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() ||
        'Miembro del equipo';
      const now = new Date();
      // One transaction: the claim, the state it starts, and the history row. The claim holds
      // the row lock, so the state read below cannot change before commit.
      const claimed = await prisma.$transaction(async (tx) => {
        const claim = await tx.osCustomerConversation.updateMany({
          where: { id: row.id, organizationId: session.organizationId, assignedMemberId: null },
          data: {
            assignedMemberId: session.actorMemberId,
            assignedLabel,
            assignedAt: now,
          },
        });
        if (claim.count !== 1) return claim;
        const current = await tx.osCustomerConversation.findFirst({
          where: { id: row.id, organizationId: session.organizationId },
          select: { attentionState: true, automationPausedAt: true },
        });
        const from: AttentionState = isAttentionState(current?.attentionState)
          ? current.attentionState
          : 'new';
        const to = attentionStateAfterTake(from);
        await tx.osCustomerConversation.update({
          where: { id: row.id },
          data: {
            ...(to !== from ? { attentionState: to, attentionStateChangedAt: now } : {}),
            ...(humanActionPausesAutomation('take') && !current?.automationPausedAt
              ? { automationPausedAt: now }
              : {}),
          },
        });
        if (to !== from) {
          await tx.osCustomerConversationStateChange.create({
            data: {
              id: createId(),
              organizationId: session.organizationId,
              conversationId: row.id,
              fromState: from,
              toState: to,
              cause: 'take',
              actorMemberId: session.actorMemberId,
              changedAt: now,
            },
          });
        }
        return claim;
      });
      if (claimed.count === 1) return present();
      const winner = await prisma.osCustomerConversation.findFirst({
        where: { id: row.id, organizationId: session.organizationId },
        select: { assignedMemberId: true, assignedLabel: true },
      });
      if (winner?.assignedMemberId === session.actorMemberId) return present();
      throw new HttpException(
        { code: 'ALREADY_ASSIGNED', assignedLabel: winner?.assignedLabel ?? null },
        HttpStatus.CONFLICT,
      );
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  /** Direct reports of the actor, for the team-lead rule. Empty without the team scope. */
  private async directReportIds(
    session: Awaited<ReturnType<typeof resolveSession>>,
  ): Promise<string[]> {
    if (!session.grantedScopes.includes('commercial.team.read')) return [];
    const reports = await this.workforceStore.listActiveDirectReportAssignments(
      session.organizationId,
      session.actorMemberId,
      new Date(),
    );
    return reports.map((report) => report.memberId);
  }

  /**
   * Change the attention state (Nueva / En atención / Esperando al cliente / Esperando al
   * equipo / Resuelta). Allowed for an unassigned conversation (the shared queue stays usable),
   * for the member holding it, and for a manager over the holder (same rule as commercial
   * visibility over an owner). "En atención" needs a holder. The write is a compare-and-set on
   * the state that was read, so two simultaneous changes have one winner. It never assigns,
   * never touches the account owner and never sends anything.
   */
  @Post(':conversationId/state')
  async transitionState(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ item: ManualCustomerConversation; changed: boolean }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, row } = await this.readableConversation(session, conversationId);
      const parsed = TransitionAttentionStateSchema.safeParse(body);
      if (!parsed.success) throw new HttpException('Invalid state', HttpStatus.BAD_REQUEST);

      const reload = async () => {
        const fresh = await prisma.osCustomerConversation.findFirst({
          where: { id: row.id, organizationId: session.organizationId },
        });
        const item = fresh ? toManual(fresh) : null;
        if (!item) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
        return item;
      };

      if (row.assignedMemberId && row.assignedMemberId !== session.actorMemberId) {
        const allowed = memberCanSeeConversation({
          actorMemberId: session.actorMemberId,
          grantedScopes: session.grantedScopes,
          // The holder plays the "owner" role of the visibility rule: managers of the holder.
          accountOwnerMemberId: row.assignedMemberId,
          directReportMemberIds: await this.directReportIds(session),
        });
        if (!allowed) {
          throw new HttpException(
            { code: 'NOT_HOLDER', assignedLabel: row.assignedLabel },
            HttpStatus.FORBIDDEN,
          );
        }
      }

      const from: AttentionState = isAttentionState(row.attentionState) ? row.attentionState : 'new';
      const to = parsed.data.to;
      if (from === to) return { item: await reload(), changed: false };
      const check = checkAttentionTransition({ from, to, held: Boolean(row.assignedMemberId) });
      if (!check.ok) {
        throw new HttpException(
          {
            code: check.reason === 'holder_required' ? 'HOLDER_REQUIRED' : 'TRANSITION_NOT_ALLOWED',
          },
          HttpStatus.CONFLICT,
        );
      }

      const now = new Date();
      const won = await prisma.$transaction(async (tx) => {
        const cas = await tx.osCustomerConversation.updateMany({
          where: {
            id: row.id,
            organizationId: session.organizationId,
            attentionState: from,
            assignedMemberId: row.assignedMemberId,
          },
          data: {
            attentionState: to,
            attentionStateChangedAt: now,
            ...(humanActionPausesAutomation('manual') && !row.automationPausedAt
              ? { automationPausedAt: now }
              : {}),
          },
        });
        if (cas.count !== 1) return false;
        await tx.osCustomerConversationStateChange.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            conversationId: row.id,
            fromState: from,
            toState: to,
            cause: 'manual',
            actorMemberId: session.actorMemberId,
            changedAt: now,
          },
        });
        return true;
      });
      if (!won) {
        const winner = await reload();
        if (winner.attentionState === to) return { item: winner, changed: false };
        throw new HttpException({ code: 'STATE_CHANGED' }, HttpStatus.CONFLICT);
      }
      return { item: await reload(), changed: true };
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  /** Team-only notes of a conversation. Same readability as the conversation itself. */
  @Get(':conversationId/notes')
  async listNotes(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
  ): Promise<{ items: ConversationInternalNote[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, row } = await this.readableConversation(session, conversationId);
      const notes = await prisma.osCustomerConversationNote.findMany({
        where: { organizationId: session.organizationId, conversationId: row.id },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      return { items: notes.map(toNote) };
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  /**
   * Nota interna ("Solo equipo"). Writes one append-only row and nothing else: it never
   * touches the state, the assignment, a provider, or the outbound path (there is none).
   * The request key makes a repeated save the same note.
   */
  @Post(':conversationId/notes')
  async addNote(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ item: ConversationInternalNote }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, row } = await this.readableConversation(session, conversationId);
      const parsed = AddInternalNoteSchema.safeParse(body);
      if (!parsed.success) throw new HttpException('Invalid note', HttpStatus.BAD_REQUEST);
      const { body: text, requestKey } = parsed.data;

      const keyed = {
        organizationId_conversationId_authorMemberId_requestKey: {
          organizationId: session.organizationId,
          conversationId: row.id,
          authorMemberId: session.actorMemberId,
          requestKey,
        },
      };
      const replay = async (): Promise<{ item: ConversationInternalNote } | null> => {
        const earlier = await prisma.osCustomerConversationNote.findUnique({ where: keyed });
        if (!earlier) return null;
        // The same key with other words is a different note: refuse instead of dropping it.
        if (earlier.body !== text) {
          throw new HttpException({ code: 'REQUEST_KEY_REUSED' }, HttpStatus.CONFLICT);
        }
        return { item: toNote(earlier) };
      };
      const earlier = await replay();
      if (earlier) return earlier;

      const person = await prisma.osPerson.findUnique({
        where: { id: session.personId },
        select: { givenName: true, familyName: true },
      });
      const authorLabel =
        [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() ||
        'Miembro del equipo';
      try {
        const created = await prisma.osCustomerConversationNote.create({
          data: {
            id: createId(),
            organizationId: session.organizationId,
            conversationId: row.id,
            authorMemberId: session.actorMemberId,
            authorLabel,
            body: text,
            visibility: INTERNAL_NOTE_VISIBILITY,
            requestKey,
          },
        });
        return { item: toNote(created) };
      } catch (err) {
        // A simultaneous identical save lost the unique race: answer with the winner.
        const winner = await replay();
        if (winner) return winner;
        throw err;
      }
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  /**
   * Retry or add the next step of a saved conversation. Idempotent: a conversation that
   * already has its commitment answers with that commitment and creates nothing.
   */
  @Post(':conversationId/next-step')
  async saveNextStep(
    @Param('conversationId') conversationId: string,
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ item: ManualCustomerConversation; nextStep: NextStepOutcome }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const { prisma, row } = await this.readableConversation(session, conversationId);
      const parsed = ConversationNextStepSchema.safeParse(body);
      if (!parsed.success) {
        throw new HttpException('Invalid next step', HttpStatus.BAD_REQUEST);
      }
      const reload = async () => {
        const fresh = await prisma.osCustomerConversation.findFirst({
          where: { id: row.id, organizationId: session.organizationId },
        });
        const item = fresh ? toManual(fresh) : null;
        if (!item) throw new HttpException({ code: 'NOT_FOUND' }, HttpStatus.NOT_FOUND);
        return item;
      };
      if (row.nextStepCommitmentId) {
        return {
          item: await reload(),
          nextStep: { status: 'created', commitmentId: row.nextStepCommitmentId },
        };
      }
      const nextStep = await this.createNextStepCommitment(session, row, parsed.data);
      return { item: await reload(), nextStep };
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  @Get()
  async listCustomerConversations(
    @Query('partyId') partyId: string | undefined,
    @Req() req: Request,
  ): Promise<{ items: ManualCustomerConversation[] }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException('Database unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const customerId = partyId?.trim() || undefined;
      // Current customer authority only. The author stays in the record, not in the filter.
      const ctx = await buildQueryContext(session, this.workforceStore);
      const scope = await resolveCustomerReadScope({
        ctx,
        lookup: this.customerVisibility,
        directReports: this.directReports,
      });
      const allowedCustomerIds =
        scope.kind === 'org'
          ? null
          : scope.partyIds.filter((id) => !customerId || id === customerId);
      if (allowedCustomerIds && allowedCustomerIds.length === 0) return { items: [] };
      const rows = await prisma.osCustomerConversation.findMany({
        where: {
          organizationId: session.organizationId,
          ...(allowedCustomerIds
            ? { customerId: { in: allowedCustomerIds } }
            : customerId
              ? { customerId }
              : {}),
        },
        orderBy: { occurredAt: 'desc' },
      });

      const items: ManualCustomerConversation[] = [];
      for (const row of rows) {
        const record = toManual(row);
        if (record) items.push(record);
      }
      return { items };
    } catch (err) {
      throw conversationHttpError(err);
    }
  }

  @Post()
  async createCustomerConversation(
    @Req() req: Request,
    @Body() body: unknown,
  ): Promise<{ item: ManualCustomerConversation; nextStep: NextStepOutcome | null }> {
    try {
      const session = await resolveSession(req, this.workforceStore);
      const prisma = getOsPrisma();
      if (!prisma) {
        throw new HttpException('Database unavailable', HttpStatus.SERVICE_UNAVAILABLE);
      }

      const customerId =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as { customerId?: unknown }).customerId
          : undefined;
      const requestedCustomerId = typeof customerId === 'string' ? customerId.trim() : '';
      if (!requestedCustomerId) {
        throw new HttpException('Invalid conversation: missing_customer', HttpStatus.BAD_REQUEST);
      }
      // The customer must be a Party of the session tenant. Label comes from that record.
      const party = await prisma.osParty.findFirst({
        where: { id: requestedCustomerId, organizationId: session.organizationId },
        select: { displayName: true },
      });
      // An unreadable customer is the same answer as a missing one: nothing is written.
      const ctx = await buildQueryContext(session, this.workforceStore);
      const readable =
        !!party &&
        (await canReadCustomer({
          ctx,
          partyId: requestedCustomerId,
          lookup: this.customerVisibility,
          directReports: this.directReports,
        }));
      if (!party || !readable) {
        throw new HttpException('Invalid conversation: unknown_customer', HttpStatus.BAD_REQUEST);
      }

      const reports = session.grantedScopes.includes('commercial.team.read')
        ? await this.workforceStore.listActiveDirectReportAssignments(
            session.organizationId,
            session.actorMemberId,
            new Date(),
          )
        : [];
      const directReportMemberIds = reports.map((report) => report.memberId);
      const draft =
        body && typeof body === 'object' && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {};
      const linkLookups: Array<['opportunityId' | 'quoteId' | 'orderId', Promise<{ organizationId: string; partyId: string; ownerMemberId: string | null } | null>]> = [];
      const opportunityId = typeof draft.opportunityId === 'string' ? draft.opportunityId.trim() : '';
      const quoteId = typeof draft.quoteId === 'string' ? draft.quoteId.trim() : '';
      const orderId = typeof draft.orderId === 'string' ? draft.orderId.trim() : '';
      if (opportunityId) {
        linkLookups.push(['opportunityId', prisma.osOpportunity.findFirst({ where: { id: opportunityId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      if (quoteId) {
        linkLookups.push(['quoteId', prisma.osQuote.findFirst({ where: { id: quoteId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      if (orderId) {
        linkLookups.push(['orderId', prisma.osOrder.findFirst({ where: { id: orderId }, select: { organizationId: true, partyId: true, ownerMemberId: true } })]);
      }
      for (const [, lookup] of linkLookups) {
        const denial = commercialLinkDenial({
          record: await lookup,
          sessionOrganizationId: session.organizationId,
          customerId: requestedCustomerId,
          actorMemberId: session.actorMemberId,
          grantedScopes: session.grantedScopes,
          directReportMemberIds,
        });
        if (denial) {
          throw new HttpException(`Invalid conversation: ${denial}`, HttpStatus.BAD_REQUEST);
        }
      }

      const idempotencyKey = req.header('idempotency-key')?.trim();
      const binding = replayBinding(session.actorMemberId, RECORD_CONVERSATION_COMMAND, draft);
      // Authorization above already ran for this actor and these links.
      const requestedNextStep = ConversationNextStepSchema.safeParse(draft.nextStep);
      // A replay answers with the stored conversation. A next step that never became a
      // commitment is attempted again (same key and payload = same commitment).
      const withNextStep = async (
        item: ManualCustomerConversation,
      ): Promise<{ item: ManualCustomerConversation; nextStep: NextStepOutcome | null }> => {
        if (item.nextStepCommitmentId) {
          return { item, nextStep: { status: 'created', commitmentId: item.nextStepCommitmentId } };
        }
        if (!requestedNextStep.success) return { item, nextStep: null };
        const nextStep = await this.createNextStepCommitment(session, item, requestedNextStep.data);
        return {
          item:
            nextStep.status === 'created'
              ? { ...item, nextStepCommitmentId: nextStep.commitmentId }
              : item,
          nextStep,
        };
      };
      const replayStored = async (): Promise<{ item: ManualCustomerConversation } | null> => {
        if (!idempotencyKey) return null;
        const prior = await prisma.osIdempotencyKey.findUnique({
          where: { organizationId_key: { organizationId: session.organizationId, key: idempotencyKey } },
        });
        if (!prior) return null;
        const stored = openReplayOrHttp<{ conversationId?: string }>(prior.resultJson, binding);
        const existing = stored.conversationId
          ? await prisma.osCustomerConversation.findFirst({
              where: { id: stored.conversationId, organizationId: session.organizationId },
            })
          : null;
        const replay = existing ? toManual(existing) : null;
        if (!replay) throw new HttpException({ code: REPLAY_REVIEW_REQUIRED, message: REPLAY_REVIEW_REQUIRED_MESSAGE }, HttpStatus.CONFLICT);
        return { item: replay };
      };
      const earlier = await replayStored();
      if (earlier) return withNextStep(earlier.item);

      const person = await prisma.osPerson.findUnique({
        where: { id: session.personId },
        select: { givenName: true, familyName: true },
      });
      const enteredByLabel =
        [person?.givenName, person?.familyName].filter(Boolean).join(' ').trim() ||
        'Miembro del equipo';

      const admitted = admitSessionConversation({
        body,
        session,
        enteredByLabel,
        customerLabel: party.displayName,
        id: createId(),
      });
      if (!admitted.ok) {
        throw new HttpException(`Invalid conversation: ${admitted.reason}`, HttpStatus.BAD_REQUEST);
      }
      if (admitted.record.organizationId !== session.organizationId) {
        throw new HttpException('Invalid tenant', HttpStatus.FORBIDDEN);
      }

      const data = prismaCreateFromManual(admitted.record, new Date().toISOString());
      try {
        await prisma.$transaction(async (tx) => {
          await tx.osCustomerConversation.create({ data });
          if (idempotencyKey) {
            await tx.osIdempotencyKey.create({
              data: {
                id: createId(),
                organizationId: session.organizationId,
                key: idempotencyKey,
                commandName: RECORD_CONVERSATION_COMMAND,
                resultJson: sealReplay(
                  { conversationId: admitted.record.id },
                  binding,
                ) as StoredJson,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              },
            });
          }
        });
      } catch (err) {
        if (!idempotencyKey || !isIdempotencyConflict(err)) throw err;
        const winner = await replayStored();
        if (winner) return withNextStep(winner.item);
        throw err;
      }
      return withNextStep(admitted.record);
    } catch (err) {
      throw conversationHttpError(err);
    }
  }
}
