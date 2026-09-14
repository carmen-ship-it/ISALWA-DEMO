import {
  CUSTOMER_MESSAGE_IS_NOT_PAYMENT,
  REPORTED_PAYMENT_DOES_NOT_CONFIRM,
} from './catalog';
import type { GuidanceNoteModel } from './model';

/**
 * Place these notes before a reported-payment control.
 * Worker 5 owns that form. This lane does not edit reported-fact or Mapa.
 *
 * Import:
 *   import { reportedPaymentGuidance } from '@/lib/guidance/reported-payment';
 *
 * A customer message is not a confirmed payment.
 * Registering a reported payment does not confirm collection.
 */
export const reportedPaymentGuidance: readonly GuidanceNoteModel[] = [
  CUSTOMER_MESSAGE_IS_NOT_PAYMENT,
  REPORTED_PAYMENT_DOES_NOT_CONFIRM,
];
