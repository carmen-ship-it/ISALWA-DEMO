import type { ApprovalSummaryReadModel, AttentionItemReadModel } from '@isalwa/os-contracts';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { formatSubjectType } from '@/lib/work/labels';

/** Engineering fixture titles must never be the staff-facing subject. */
const ENGINEERING_TITLE = /^(?:CC\d|CC3ORD-|CC4-|ZZV1)/i;
const STAGING_MARKER = /\(staging\)/i;

const STATUS_ONLY = new Set([
  'Vencido',
  'Pendiente',
  'Trabajo pendiente',
  'Aprobación pendiente',
  'Reasignado a usted',
  'Sin fecha',
  'En curso',
]);

export function isEngineeringFixtureCopy(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return false;
  return (
    ENGINEERING_TITLE.test(trimmed) ||
    STAGING_MARKER.test(trimmed) ||
    /^Cliente Step17\b/i.test(trimmed) ||
    /^synthetic access line$/i.test(trimmed) ||
    /\bWB-/i.test(trimmed) ||
    /\bWave\s*B\b/i.test(trimmed) ||
    /\bStep17\b/i.test(trimmed) ||
    /\bprobe\b/i.test(trimmed) ||
    /\bClose Test\b/i.test(trimmed) ||
    /^FINALV1-/i.test(trimmed)
  );
}

export function usableStaffTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || isEngineeringFixtureCopy(trimmed) || STATUS_ONLY.has(trimmed)) return null;
  return presentHumanCopy(trimmed) || null;
}

export function staffFacingSubject(input: {
  title?: string | null;
  description?: string | null;
  subjectType?: string | null;
  customerName?: string | null;
  reference?: string | null;
}): string {
  const title = usableStaffTitle(input.title);
  const description = usableStaffTitle(input.description);
  const customer = usableStaffTitle(input.customerName);
  const reference = usableStaffTitle(input.reference);
  const subject = formatSubjectType(input.subjectType ?? null);

  if (title && customer && !includesFold(title, customer)) return `${title} · ${customer}`;
  if (title) return title;
  if (description && customer && !includesFold(description, customer)) {
    return `${description} · ${customer}`;
  }
  if (description) return description;

  const bits = [subject, reference, customer].filter((part): part is string => Boolean(part));
  if (bits.length > 0) return bits.join(' · ');
  return 'Trabajo';
}

export function approvalStaffSubject(input: {
  subjectType: string;
  quoteNumber?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
  workTitle?: string | null;
}): string {
  const customer = usableStaffTitle(input.customerName);
  if (input.subjectType === 'quote') {
    const number = usableStaffTitle(input.quoteNumber);
    if (number && customer) return `Cotización ${number} · ${customer}`;
    if (number) return `Cotización ${number}`;
    if (customer) return `Cotización · ${customer}`;
  }
  if (input.subjectType === 'order') {
    const number = usableStaffTitle(input.orderNumber);
    if (number && customer) return `Pedido ${number} · ${customer}`;
    if (number) return `Pedido ${number}`;
    if (customer) return `Pedido · ${customer}`;
  }
  return staffFacingSubject({
    title: input.workTitle,
    subjectType: input.subjectType,
    customerName: customer,
    reference: input.quoteNumber ?? input.orderNumber,
  });
}

export function attentionStaffSubject(
  item: AttentionItemReadModel,
  context?: {
    title?: string | null;
    description?: string | null;
    customerName?: string | null;
    reference?: string | null;
  },
): string {
  const storedTitle = typeof item.reasonDetail.title === 'string' ? item.reasonDetail.title : null;
  return staffFacingSubject({
    title: context?.title ?? storedTitle,
    description: context?.description,
    subjectType: item.subjectType,
    customerName: context?.customerName,
    reference: context?.reference,
  });
}

export function approvalSubjectFromTruth(
  approval: Pick<ApprovalSummaryReadModel, 'subjectType'>,
  truth?: {
    quoteNumber?: string | null;
    customerName?: string | null;
    orderNumber?: string | null;
    workTitle?: string | null;
  },
): string {
  return approvalStaffSubject({
    subjectType: approval.subjectType,
    quoteNumber: truth?.quoteNumber,
    customerName: truth?.customerName,
    orderNumber: truth?.orderNumber,
    workTitle: truth?.workTitle,
  });
}

function includesFold(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase('es').includes(needle.toLocaleLowerCase('es'));
}
