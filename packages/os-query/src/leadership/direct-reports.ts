/**
 * Direct-report rule for the provisional leadership pilot.
 * One hop on an active manager assignment. Not a recursive org chart.
 */
export type ManagerAssignmentSlice = {
  organizationId: string;
  memberId: string;
  managerMemberId: string;
  effectiveAt: Date;
  endedAt: Date | null;
};

export function isActiveDirectReport(
  assignment: ManagerAssignmentSlice,
  organizationId: string,
  managerMemberId: string,
  asOf: Date,
): boolean {
  if (assignment.organizationId !== organizationId) return false;
  if (assignment.managerMemberId !== managerMemberId) return false;
  if (!assignment.memberId || assignment.memberId === managerMemberId) return false;
  if (assignment.effectiveAt > asOf) return false;
  if (assignment.endedAt !== null && assignment.endedAt <= asOf) return false;
  return true;
}

export function directReportMemberIds(
  assignments: readonly ManagerAssignmentSlice[],
  organizationId: string,
  managerMemberId: string,
  asOf: Date,
): string[] {
  const ids = new Set<string>();
  for (const assignment of assignments) {
    if (isActiveDirectReport(assignment, organizationId, managerMemberId, asOf)) {
      ids.add(assignment.memberId);
    }
  }
  return [...ids];
}

export interface DirectReportLookup {
  listDirectReportMemberIds(
    organizationId: string,
    managerMemberId: string,
    asOf: Date,
  ): Promise<string[]>;
}
