import { isEngineeringFixtureCopy, usableStaffTitle } from '@/lib/work/staff-subject';

export const APPROVAL_ROW_SUBJECT_FALLBACK = 'Solicitud de aprobación';

const RAW_SCOPE_KEY = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const RAW_ID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

const TYPE_LABEL = {
  quote: 'Cotización',
  order: 'Pedido',
} as const;

export type ApprovalRowSubjectInput = {
  subjectType?: string | null;
  subjectId?: string | null;
  quoteNumber?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
};

export type ApprovalRowItem = {
  approvalRequestId: string;
  subjectType: string;
  subjectId: string;
};

export type ApprovalSubjectDetail = {
  quoteNumber?: string | null;
  orderNumber?: string | null;
  customerName?: string | null;
};

/**
 * Staff label for one approval row.
 * An authorized document number is enough to tell rows apart. The customer is
 * appended only when that name is also authorized and usable. A denied or
 * missing subject read stays a type word — never a raw id or scope key.
 */
export function approvalRowSubject(input: ApprovalRowSubjectInput): string {
  const typeLabel = TYPE_LABEL[input.subjectType as keyof typeof TYPE_LABEL];
  if (!typeLabel) return APPROVAL_ROW_SUBJECT_FALLBACK;

  const number = usableIdentifier(
    input.subjectType === 'order' ? input.orderNumber : input.quoteNumber,
    input.subjectId,
  );
  const customer = usableIdentifier(input.customerName, input.subjectId);
  if (number && customer) return closedLabel(`${typeLabel} ${number} · ${customer}`, typeLabel);
  if (number) return closedLabel(`${typeLabel} ${number}`, typeLabel);
  return typeLabel;
}

/**
 * One denied or failed subject read must not blank the rest of the list.
 * A thrown reader is treated as unavailable for that row only.
 */
export async function approvalSubjectsForItems(
  items: ApprovalRowItem[],
  readSubject: (item: ApprovalRowItem) => Promise<ApprovalSubjectDetail | null>,
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  await Promise.all(
    items.map(async (item) => {
      let detail: ApprovalSubjectDetail | null = null;
      try {
        detail = await readSubject(item);
      } catch {
        detail = null;
      }
      labels.set(
        item.approvalRequestId,
        approvalRowSubject({
          subjectType: item.subjectType,
          subjectId: item.subjectId,
          quoteNumber: detail?.quoteNumber,
          orderNumber: detail?.orderNumber,
          customerName: detail?.customerName,
        }),
      );
    }),
  );
  return labels;
}

function usableIdentifier(value: string | null | undefined, subjectId?: string | null): string | null {
  const usable = usableStaffTitle(value);
  if (!usable || usable === 'Cliente') return null;
  if (isEngineeringFixtureCopy(usable) || hasRawScopeKey(usable) || isRawId(usable, subjectId)) return null;
  return usable;
}

function closedLabel(label: string, typeLabel: string): string {
  if (hasRawScopeKey(label) || isEngineeringFixtureCopy(label) || hasRawId(label)) return typeLabel;
  return label;
}

function isRawId(value: string, subjectId?: string | null): boolean {
  if (subjectId && value === subjectId) return true;
  return RAW_ID.test(value);
}

function hasRawId(value: string): boolean {
  return value.split(/[\s·,/]+/).some((part) => RAW_ID.test(part));
}

function hasRawScopeKey(value: string): boolean {
  return value.split(/[\s·,/]+/).some((part) => RAW_SCOPE_KEY.test(part));
}
