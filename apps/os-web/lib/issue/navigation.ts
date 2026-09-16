/**
 * Issue navigation helpers.
 */

export function issueHref(issueId: string): string {
  return `/incidencias/${encodeURIComponent(issueId)}`;
}

export function issueListHref(view?: 'open' | 'assigned' | 'reported' | 'resolved'): string {
  if (!view || view === 'open') return '/incidencias';
  return `/incidencias?view=${view}`;
}

export function reportIssueHref(context?: {
  referenceType?: string;
  referenceId?: string;
  referenceLabel?: string;
}): string {
  if (!context?.referenceType || !context?.referenceId) {
    return '/incidencias/reportar';
  }
  const params = new URLSearchParams();
  params.set('issueRefType', context.referenceType);
  params.set('issueRefId', context.referenceId);
  if (context.referenceLabel) {
    params.set('issueRefLabel', context.referenceLabel);
  }
  return `/incidencias/reportar?${params.toString()}`;
}
