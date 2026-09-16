import { z } from 'zod';
import { COMMITMENT_SUBJECT_TYPES } from './commitments';

export const COMMITMENT_COMMAND_NAMES = [
  'CreateEmployeeCommitment',
  'CreateCustomerReportedCommitment',
  'FulfillCommitment',
  'CancelCommitment',
  'ReassignCommitmentOwner',
] as const;

export type CommitmentCommandName = (typeof COMMITMENT_COMMAND_NAMES)[number];

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
});

export const CancelCommitmentPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  reason: z.string().optional(),
});

export const ReassignCommitmentOwnerPayloadSchema = z.object({
  commitmentId: z.string().min(1),
  newOwnerMemberId: z.string().min(1),
});

export const COMMITMENT_COMMAND_PAYLOAD_SCHEMAS: Record<CommitmentCommandName, z.ZodTypeAny> = {
  CreateEmployeeCommitment: CreateEmployeeCommitmentPayloadSchema,
  CreateCustomerReportedCommitment: CreateCustomerReportedCommitmentPayloadSchema,
  FulfillCommitment: FulfillCommitmentPayloadSchema,
  CancelCommitment: CancelCommitmentPayloadSchema,
  ReassignCommitmentOwner: ReassignCommitmentOwnerPayloadSchema,
};
