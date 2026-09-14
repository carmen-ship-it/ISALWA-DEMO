import { isEngineeringFixtureCopy, usableStaffTitle } from '@/lib/work/staff-subject';

export const APPROVAL_ROW_SUBJECT_FALLBACK = 'Solicitud de aprobación';

const RAW_SCOPE_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export type ApprovalRowSubjectInput = {
  subjectType?: string | null;
  quoteNumber?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
};

/**
 * Staff label for one approval row. Identifies a quote or order only when both
 * the document number and the customer name are present. Never emits a scope key.
 */
export function approvalRowSubject(input: ApprovalRowSubjectInput): string {
  const customer = usableIdentifier(input.customerName);
  if (!customer) return APPROVAL_ROW_SUBJECT_FALLBACK;

  if (input.subjectType === 'quote') {
    const number = usableIdentifier(input.quoteNumber);
    if (!number) return APPROVAL_ROW_SUBJECT_FALLBACK;
    return closedLabel(`Cotización ${number} · ${customer}`);
  }

  if (input.subjectType === 'order') {
    const number = usableIdentifier(input.orderNumber);
    if (!number) return APPROVAL_ROW_SUBJECT_FALLBACK;
    return closedLabel(`Pedido ${number} · ${customer}`);
  }

  return APPROVAL_ROW_SUBJECT_FALLBACK;
}

function usableIdentifier(value: string | null | undefined): string | null {
  const usable = usableStaffTitle(value);
  if (!usable || usable === 'Cliente') return null;
  if (isEngineeringFixtureCopy(usable) || hasRawScopeKey(usable)) return null;
  return usable;
}

function closedLabel(label: string): string {
  if (hasRawScopeKey(label) || isEngineeringFixtureCopy(label)) return APPROVAL_ROW_SUBJECT_FALLBACK;
  return label;
}

function hasRawScopeKey(value: string): boolean {
  return value.split(/[\s·,/]+/).some((part) => RAW_SCOPE_KEY.test(part));
}
