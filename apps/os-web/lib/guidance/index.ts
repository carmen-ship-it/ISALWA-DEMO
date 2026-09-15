export {
  EXISTING_STATUS_PILL_TONES,
  GUIDANCE_KIND_LABEL,
  GUIDANCE_KIND_TONE,
  GUIDANCE_KINDS,
  guidanceRole,
  isGuidanceKind,
} from './kinds';
export type { GuidanceKind, GuidanceRole, GuidanceTone } from './kinds';
export { claimsCargoAuthority, guidanceNote, guidanceNoteView, guidanceText, guidanceViolations } from './model';
export type { GuidanceNoteModel, GuidanceNoteView } from './model';
export { reportedPaymentGuidance } from './reported-payment';
export {
  // Ayuda page catalog entries (export for core to compose)
  ACCESS_EXPLANATION,
  AI_FUTURE_UNWIRED,
  EMPLOYEE_ADMIN_HELP,
  EMPTY_NEXT_ACTION,
  GLOSSARY_SHORT,
  LEARNING_MODE_LABELS,
  WHATSAPP_UNWIRED,
} from './catalog';
export {
  ayudaSections,
  employeeAdminHelpSection,
  guidanceForConvertQuote,
  guidanceForCreateCustomer,
  guidanceForCreateQuote,
  guidanceForReassignOwner,
  guidanceForSearchCustomer,
  guidanceForSendQuote,
} from './select';
export type {
  ConvertQuoteSituation,
  CreateCustomerSituation,
  GuidanceSection,
  ReassignOwnerSituation,
  SearchCustomerSituation,
  SendQuoteSituation,
} from './select';
