import { z } from 'zod';

export const OPERATIONS_COMMAND_NAMES = ['RetryDeadLetterDelivery'] as const;
export type OperationsCommandName = (typeof OPERATIONS_COMMAND_NAMES)[number];

export const RetryDeadLetterDeliveryPayloadSchema = z.object({
  outboxId: z.string().min(1),
  reason: z.string().min(3).max(2000),
});

export const OPERATIONS_COMMAND_PAYLOAD_SCHEMAS: Record<OperationsCommandName, z.ZodTypeAny> = {
  RetryDeadLetterDelivery: RetryDeadLetterDeliveryPayloadSchema,
};
