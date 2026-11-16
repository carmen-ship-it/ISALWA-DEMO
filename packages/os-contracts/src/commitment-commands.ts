import { z } from 'zod';
import { COMMITMENT_SUBJECT_TYPES } from './commitments';

export const COMMITMENT_COMMAND_NAMES = [
  'CreateEmployeeCommitment',
  'CreateCustomerReportedCommitment',
  'FulfillCommitment',
  'CancelCommitment',
  'ReassignCommitmentOwner',
  'RescheduleCommitment',
] as const;

export type CommitmentCommandName = (typeof COMMITMENT_COMMAND_NAMES)[number];

/** Shortest reason a person must write to change, cancel or hand off a promise. */
export const COMMITMENT_REASON_MIN_LENGTH = 3;
export const COMMITMENT_REASON_MAX_LENGTH = 500;

const Reason = z
  .string()
  .trim()
  .min(COMMITMENT_REASON_MIN_LENGTH)
  .max(COMMITMENT_REASON_MAX_LENGTH);

export const CreateEmployeeCommitmentPayloadSchema = z.object({
  text: z.string().min(1),
  ownerMemberId: z.string().min(1).optional(),
  partyId: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  relatedSubjectType: z.enum(COMMITMENT_SUBJECT_TYPES).optional(),
  relatedSubjectId: z.string().min(1).optional(),
});

export const CreateCustomerReportedCommitmentPayloadSchema = z.object({
  text: z.string().min(1),
  ownerMemberId: z.string().min(1).optional(),
  partyId: z.string().min(1).optional(),
  dueAt: z.string().datetime().optional(),
  relatedSubjectType: z.enum(COMMITMENT_SUBJECT_TYPES).optional(),
  relatedSubjectId: z.string().min(1).optional(),
});

export const FulfillCommitmentPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  /** What was done. Optional: marking a promise kept does not need a justification. */
  note: z.string().trim().max(COMMITMENT_REASON_MAX_LENGTH).optional(),
});

export const CancelCommitmentPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  /** Required: a cancelled promise keeps why it was dropped. */
  reason: Reason,
});

export const ReassignCommitmentOwnerPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  newOwnerMemberId: z.string().min(1),
  reason: Reason,
});

export const RescheduleCommitmentPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  /** The new promised instant (UTC). The previous deadline stays in the change history. */
  dueAt: z.string().datetime(),
  reason: Reason,
});

export const COMMITMENT_COMMAND_PAYLOAD_SCHEMAS: Record<CommitmentCommandName, z.ZodTypeAny> = {
  CreateEmployeeCommitment: CreateEmployeeCommitmentPayloadSchema,
  CreateCustomerReportedCommitment: CreateCustomerReportedCommitmentPayloadSchema,
  FulfillCommitment: FulfillCommitmentPayloadSchema,
  CancelCommitment: CancelCommitmentPayloadSchema,
  ReassignCommitmentOwner: ReassignCommitmentOwnerPayloadSchema,
  RescheduleCommitment: RescheduleCommitmentPayloadSchema,
};

/** How a commitment may be handed over. `owner` is the current owner; the others are never implied by a title. */
export const COMMITMENT_REASSIGN_AUTHORITIES = ['owner', 'customer_manager', 'workforce_continuity'] as const;
export type CommitmentReassignAuthority = (typeof COMMITMENT_REASSIGN_AUTHORITIES)[number];

export const COMMITMENT_CHANGE_KINDS = ['rescheduled', 'reassigned', 'cancelled', 'fulfilled'] as const;
export type CommitmentChangeKind = (typeof COMMITMENT_CHANGE_KINDS)[number];

/** One append-only entry: what changed, who changed it, why, and the values it replaced. */
export type CommitmentChange = {
  id: string;
  commitmentId: string;
  kind: CommitmentChangeKind;
  actorMemberId: string;
  reason: string | null;
  previousDueAt: string | null;
  newDueAt: string | null;
  previousOwnerMemberId: string | null;
  newOwnerMemberId: string | null;
  changedAt: string;
};
