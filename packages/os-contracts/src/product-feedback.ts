/**
 * Product feedback contracts — Wave B Issue Memory Implementation.
 *
 * Product feedback is distinct from an Issue.
 * - Feedback: suggestions, enhancement requests, or general input about the product.
 * - Issue: a reported problem requiring resolution.
 *
 * Feedback does not follow the Issue lifecycle. It is submitted and reviewed.
 * Feedback may inspire an Issue or a WorkItem, but the feedback itself is not actionable
 * in the same sense.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Feedback payload
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SubmitProductFeedback — submit product feedback.
 * Requires member_active (any active member may submit feedback).
 */
export const SubmitProductFeedbackPayloadSchema = z.object({
  content: z.string().min(1),
  category: z.string().min(1).optional(),
  productRef: z.string().min(1).optional(),
});

export type SubmitProductFeedbackPayload = z.infer<typeof SubmitProductFeedbackPayloadSchema>;

export const PRODUCT_FEEDBACK_COMMAND_NAMES = ['SubmitProductFeedback'] as const;

export type ProductFeedbackCommandName = (typeof PRODUCT_FEEDBACK_COMMAND_NAMES)[number];

export const PRODUCT_FEEDBACK_COMMAND_PAYLOAD_SCHEMAS: Record<
  ProductFeedbackCommandName,
  z.ZodTypeAny
> = {
  SubmitProductFeedback: SubmitProductFeedbackPayloadSchema,
};

// ─────────────────────────────────────────────────────────────────────────────
// Scopes
// ─────────────────────────────────────────────────────────────────────────────

// PRODUCT_FEEDBACK_REVIEW_SCOPE is exported from operations-scopes.ts to avoid duplication.
// Provisional scope for reviewing product feedback. Not yet wired into command auth.

// ─────────────────────────────────────────────────────────────────────────────
// Truth distinction: Feedback ≠ Issue
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Product feedback is NOT an issue.
 * Feedback is enhancement-oriented; Issues are problem-oriented.
 * This assertion documents the distinction at the contract level.
 */
export function feedbackIsNotIssue(): true {
  return true;
}
