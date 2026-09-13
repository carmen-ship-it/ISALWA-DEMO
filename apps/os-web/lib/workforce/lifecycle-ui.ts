import type { MemberSummaryReadModel } from '@isalwa/os-contracts';

export type MemberAdminVisibility = {
  organization: boolean;
  suspend: boolean;
  reactivate: boolean;
  terminate: boolean;
  delegation: boolean;
  requestEmailChange: boolean;
};

function isTerminated(summary: MemberSummaryReadModel): boolean {
  return summary.accessStatus === 'revoked' || summary.employmentStatus === 'terminated';
}

/** Which admin mutation surfaces to show — backend remains authority on execution. */
export function memberAdminVisibility(
  summary: MemberSummaryReadModel,
  actorMemberId: string | null,
): MemberAdminVisibility {
  const { accessStatus } = summary;
  const terminated = isTerminated(summary);
  const invited = accessStatus === 'invited';
  const suspended = accessStatus === 'suspended';
  const active = accessStatus === 'active' && !terminated;

  return {
    organization: !terminated && !invited,
    suspend: active,
    reactivate: suspended && summary.memberId !== actorMemberId,
    terminate: (active || suspended) && !terminated,
    delegation: active && !invited,
    requestEmailChange:
      Boolean(actorMemberId) &&
      summary.memberId === actorMemberId &&
      active,
  };
}
