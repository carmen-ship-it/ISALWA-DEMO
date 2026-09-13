import { z } from 'zod';
import { APPROVAL_SUBJECT_TYPES, WORK_PRIORITIES, WORK_SUBJECT_TYPES } from './work-events';

export const ApprovalRequestContextSchema = z
  .object({
    note: z.string().max(500).optional(),
  })
  .strict();

export const WORK_COMMAND_NAMES = [
  'CreateWorkItem',
  'ReassignWork',
  'CompleteWork',
  'CancelWorkItem',
  'RequestApproval',
  'Approve',
  'Reject',
] as const;

export type WorkCommandName = (typeof WORK_COMMAND_NAMES)[number];

export const CreateWorkItemPayloadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerMemberId: z.string().min(1),
  subjectType: z.enum(WORK_SUBJECT_TYPES).optional(),
  subjectId: z.string().optional(),
  priority: z.enum(WORK_PRIORITIES).optional(),
  dueAt: z.string().datetime().optional(),
});

export const ReassignWorkPayloadSchema = z.object({
  workItemId: z.string().min(1),
  newOwnerMemberId: z.string().min(1),
  reason: z.string().optional(),
});

export const CompleteWorkPayloadSchema = z.object({
  workItemId: z.string().min(1),
});

export const CancelWorkItemPayloadSchema = z.object({
  workItemId: z.string().min(1),
  reason: z.string().optional(),
});

export const RequestApprovalPayloadSchema = z.object({
  approverMemberId: z.string().min(1),
  workItemId: z.string().optional(),
  subjectType: z.enum(APPROVAL_SUBJECT_TYPES),
  subjectId: z.string().min(1),
  context: ApprovalRequestContextSchema.optional(),
});

export const ApprovePayloadSchema = z.object({
  approvalRequestId: z.string().min(1),
  reason: z.string().optional(),
});

export const RejectPayloadSchema = z.object({
  approvalRequestId: z.string().min(1),
  reason: z.string().min(1),
});

export const WORK_COMMAND_PAYLOAD_SCHEMAS: Record<WorkCommandName, z.ZodTypeAny> = {
  CreateWorkItem: CreateWorkItemPayloadSchema,
  ReassignWork: ReassignWorkPayloadSchema,
  CompleteWork: CompleteWorkPayloadSchema,
  CancelWorkItem: CancelWorkItemPayloadSchema,
  RequestApproval: RequestApprovalPayloadSchema,
  Approve: ApprovePayloadSchema,
  Reject: RejectPayloadSchema,
};
