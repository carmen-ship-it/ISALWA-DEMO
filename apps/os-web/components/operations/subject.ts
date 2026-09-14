import type { ReportedFactSubjectType } from '@/lib/operations/reported-fact';

export type ManualOperationSubject = {
  organizationId: string;
  subjectType: ReportedFactSubjectType;
  subjectId: string;
  reportedByLabel: string;
  /** Display only. Never used as a coordinate or a confirmed name. */
  subjectLabel?: string;
};

export const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function subjectLine(subject: ManualOperationSubject): string {
  const kind =
    subject.subjectType === 'party'
      ? 'cliente'
      : subject.subjectType === 'quote'
        ? 'cotización'
        : subject.subjectType === 'order'
          ? 'pedido'
          : 'ítem';
  const label = subject.subjectLabel?.trim();
  return label ? `Sobre ${kind}: ${label}` : `Sobre este ${kind}`;
}
