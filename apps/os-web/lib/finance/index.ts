export {
  authorizeFinanceOperationalWrite,
  financeOperationalRecordScope,
  financePermissionCopy,
  resolveFinancePageAccess,
  type FinanceActorSession,
  type FinanceDeskDenial,
  type FinancePageAccess,
} from './desk';
export { FINANCE_DESK_COPY, FINANCE_FORBIDDEN_COPY } from './copy';
export {
  PAYMENT_DESK_COPY,
  PAYMENT_ERROR_COPY,
  PAYMENT_FORM_PROBLEM_COPY,
  buildPaymentReportRequest,
  formatBs,
  parseBsToCentavos,
  paymentErrorCopy,
  tenderSumDifference,
  type PaymentFormDraft,
  type PaymentFormProblem,
  type TenderDraft,
} from './payments';
/** Server-only loaders (cookies / next/headers) — import from `./load-subject-options` in RSC pages, not this barrel. */
