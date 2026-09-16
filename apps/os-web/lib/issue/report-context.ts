import type { IssueReferenceType, ReportIssueContext } from './types';
import { buildIssueContext } from './types';

/** Parse Reportar incidencia context from URL search params (not a Server Action). */
export function parseReportIssueContext(
  searchParams: Record<string, string | string[] | undefined>,
): ReportIssueContext | null {
  return buildIssueContext(searchParams);
}

export function reportIssueContextFromParty(
  partyId: string,
  partyLabel: string,
): ReportIssueContext {
  return {
    referenceType: 'party' satisfies IssueReferenceType,
    referenceId: partyId,
    referenceLabel: partyLabel,
  };
}

export function reportIssueContextFromOrder(
  orderId: string,
  orderLabel: string,
  partyId?: string,
): ReportIssueContext {
  return {
    referenceType: 'order' satisfies IssueReferenceType,
    referenceId: orderId,
    referenceLabel: orderLabel,
    partyId,
  };
}
