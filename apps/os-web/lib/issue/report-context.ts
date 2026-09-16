import type { IssueReferenceType, ReportIssueContext } from './types';

/** Parse Reportar problema context from URL search params (not a Server Action). */
export function parseReportIssueContext(
  searchParams: Record<string, string | string[] | undefined>,
): ReportIssueContext | null {
  const referenceType =
    typeof searchParams.issueRefType === 'string' ? searchParams.issueRefType : undefined;
  const referenceId =
    typeof searchParams.issueRefId === 'string' ? searchParams.issueRefId : undefined;
  const referenceLabel =
    typeof searchParams.issueRefLabel === 'string' ? searchParams.issueRefLabel : undefined;

  if (!referenceType || !referenceId) return null;

  return {
    referenceType: referenceType as IssueReferenceType,
    referenceId,
    referenceLabel,
  };
}
