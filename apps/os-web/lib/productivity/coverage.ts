export type CountLane =
  | { status: 'available'; count: number; truncated: boolean }
  | { status: 'unavailable' }
  | { status: 'not_authorized' }
  | { status: 'not_implemented' };

export type CoverageSubject = 'self' | 'member';

export type CoverageRecord = {
  title?: string | null;
  status?: string | null;
  ownerMemberId?: string | null;
  subjectType?: string | null;
  subjectId?: string | null;
  approverMemberId?: string | null;
  requestedByMemberId?: string | null;
};

export type CoveragePage = {
  items: readonly CoverageRecord[];
  truncated: boolean;
};

export type CoverageInputPage = CoveragePage | 'denied' | 'unavailable' | null;

export type CoverageSummary = {
  subject: CoverageSubject;
  memberId: string;
  memberLabel: string;
  openWork: CountLane;
  overdueWork: CountLane;
  openFollowUps: CountLane;
  customersWithOpenWork: CountLane;
  openOpportunities: CountLane;
  submittedQuotes: CountLane;
  pendingApprovals: CountLane;
  commitments: CountLane;
  reassignment: 'not_available';
  links: {
    openWork?: string;
    overdueWork?: string;
    opportunities?: string;
    quotes?: string;
    approvals?: string;
  };
};

function laneFromPage(
  page: CoverageInputPage,
  allowed: (item: CoverageRecord) => boolean,
): CountLane {
  if (page === 'denied') return { status: 'not_authorized' };
  if (!page || page === 'unavailable') return { status: 'unavailable' };
  const count = page.items.filter(allowed).length;
  return { status: 'available', count, truncated: page.truncated };
}

export function summarizeCoverage(input: {
  subject: CoverageSubject;
  memberId: string;
  memberLabel: string;
  openWork: CoverageInputPage;
  overdueWork: CoverageInputPage;
  openFollowUps: CoverageInputPage;
  openOpportunities: CoverageInputPage;
  submittedQuotes: CoverageInputPage;
  pendingApprovals: CoverageInputPage;
}): CoverageSummary {
  const usable = (item: CoverageRecord) => Boolean(item.title?.trim() || item.subjectId || item.status);
  const openWork = laneFromPage(input.openWork, usable);
  const customers =
    input.openWork === 'denied'
      ? { status: 'not_authorized' as const }
      : !input.openWork || input.openWork === 'unavailable'
        ? { status: 'unavailable' as const }
        : customersFromOpenWork(input.openWork);
  return {
    subject: input.subject,
    memberId: input.memberId,
    memberLabel: input.memberLabel.trim() || 'Cobertura autorizada',
    openWork,
    overdueWork: laneFromPage(input.overdueWork, usable),
    openFollowUps: laneFromPage(input.openFollowUps, usable),
    customersWithOpenWork: customers,
    openOpportunities: laneFromPage(input.openOpportunities, usable),
    submittedQuotes: laneFromPage(input.submittedQuotes, usable),
    pendingApprovals: laneFromPage(input.pendingApprovals, (item) => {
      if (item.status && item.status !== 'pending') return false;
      if (input.subject === 'self') return usable(item);
      return item.approverMemberId === input.memberId || item.requestedByMemberId === input.memberId;
    }),
    commitments: { status: 'not_implemented' },
    reassignment: 'not_available',
    links:
      input.subject === 'self'
        ? {
            openWork: '/trabajo',
            overdueWork: '/trabajo?view=overdue',
            opportunities: '/oportunidades?status=open',
            quotes: '/cotizaciones?status=submitted',
            approvals: '/aprobaciones',
          }
        : {},
  };
}

function customersFromOpenWork(page: CoveragePage): CountLane {
  const ids = new Set<string>();
  for (const item of page.items) {
    if (item.subjectType === 'party' && item.subjectId?.trim()) ids.add(item.subjectId.trim());
  }
  return { status: 'available', count: ids.size, truncated: page.truncated };
}

export function countLabel(lane: CountLane): string {
  if (lane.status === 'not_implemented') return 'No implementado';
  if (lane.status === 'not_authorized') return 'Sin permiso';
  if (lane.status === 'unavailable') return 'No se pudo consultar';
  if (lane.truncated) return `Al menos ${lane.count}`;
  return String(lane.count);
}
