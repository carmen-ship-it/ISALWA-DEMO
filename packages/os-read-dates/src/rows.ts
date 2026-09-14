/** Order-scoped date subject. Production targets are not a ProductionRun. */
export const ORDER_DATE_SUBJECT_TYPE = 'order' as const;

export type OrderDateSubjectType = typeof ORDER_DATE_SUBJECT_TYPE;

export type CustomerCommittedDateRow = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  partyId: string | null;
  commercialOwnerMemberId: string;
  committedOn: Date | string;
  originalCommittedOn: Date | string;
  originalReason: string;
  source: string;
  setByMemberId: string;
  setAt: Date | string;
};

export type CustomerCommittedDateRevisionRow = {
  id: string;
  committedDateId: string;
  organizationId: string;
  previousCommittedOn: Date | string;
  nextCommittedOn: Date | string;
  reason: string;
  actorMemberId: string;
  source: string;
  revisedAt: Date | string;
};

export type ProductionInternalTargetDateRow = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  maintainedByMemberId: string;
  targetOn: Date | string;
  originalTargetOn: Date | string;
  originalReason: string;
  source: string;
  setByMemberId: string;
  setAt: Date | string;
};

export type ProductionInternalTargetRevisionRow = {
  id: string;
  targetDateId: string;
  organizationId: string;
  previousTargetOn: Date | string;
  nextTargetOn: Date | string;
  reason: string;
  actorMemberId: string;
  source: string;
  revisedAt: Date | string;
};

export type ProductionDateIssueRow = {
  id: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  mayAffectProductionCalendar: boolean;
  mayAffectCustomerDate: boolean;
  source: string;
  note: string | null;
  recordedByMemberId: string;
  recordedAt: Date | string;
};

export type CustomerDateInformedRecordRow = {
  id: string;
  issueId: string;
  organizationId: string;
  subjectType: string;
  subjectId: string;
  note: string;
  recordedByMemberId: string;
  recordedAt: Date | string;
  notified: boolean;
};

export type CustomerCommittedDateFact = {
  id: string;
  organizationId: string;
  subjectType: OrderDateSubjectType;
  subjectId: string;
  partyId: string | null;
  commercialOwnerMemberId: string;
  committedOn: string;
  originalCommittedOn: string;
  originalReason: string;
  source: string;
  setByMemberId: string;
  setAt: string;
};

export type CustomerCommittedDateRevisionFact = {
  id: string;
  committedDateId: string;
  organizationId: string;
  previousCommittedOn: string;
  nextCommittedOn: string;
  reason: string;
  actorMemberId: string;
  source: string;
  revisedAt: string;
};

export type ProductionInternalTargetDateFact = {
  id: string;
  organizationId: string;
  subjectType: OrderDateSubjectType;
  subjectId: string;
  maintainedByMemberId: string;
  targetOn: string;
  originalTargetOn: string;
  originalReason: string;
  source: string;
  setByMemberId: string;
  setAt: string;
};

export type ProductionInternalTargetRevisionFact = {
  id: string;
  targetDateId: string;
  organizationId: string;
  previousTargetOn: string;
  nextTargetOn: string;
  reason: string;
  actorMemberId: string;
  source: string;
  revisedAt: string;
};

/** Explicit stored issue. Not a prediction and not a computed delay. */
export type ProductionDateIssueFact = {
  id: string;
  organizationId: string;
  subjectType: OrderDateSubjectType;
  subjectId: string;
  mayAffectProductionCalendar: boolean;
  mayAffectCustomerDate: boolean;
  source: string;
  note: string | null;
  recordedByMemberId: string;
  recordedAt: string;
};

export type CustomerDateInformedFact = {
  id: string;
  issueId: string;
  organizationId: string;
  subjectType: OrderDateSubjectType;
  subjectId: string;
  note: string;
  recordedByMemberId: string;
  recordedAt: string;
  notified: boolean;
};

export type RecordedDateDivergenceFact = {
  customerCommittedOn: string;
  productionInternalTargetOn: string;
  diverges: boolean;
  visibleBecause: 'both_dates_recorded';
};

export function calendarDate(value: Date | string): string {
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return trimmed.slice(0, 10);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return calendarDate(parsed);
}

export function instant(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

export function sameOrganization<T extends { organizationId: string }>(
  row: T,
  organizationId: string,
): boolean {
  return row.organizationId === organizationId;
}
