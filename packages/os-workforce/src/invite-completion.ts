import type { RequestContext } from '@isalwa/os-contracts';
import { createId } from '@isalwa/ts-utils';
import { normalizeAuthEmail } from './auth-email';
import type { AuthIdentityRecord, MemberRecord } from './store-types';
import type { OsWorkforceStore } from './os-workforce-store';
import type { WorkforceCommandService } from './workforce-command-service';

/**
 * Outcome of binding a trusted provider session to an existing invited identity.
 * Browser-supplied member, organization, and subject are not inputs.
 */
export const INVITE_COMPLETION_CODES = [
  'activated',
  'already_completed',
  'not_invited',
  'wrong_account',
  'ambiguous',
  'suspended',
  'terminated',
  'rebind_denied',
  'unauthenticated',
] as const;

export type InviteCompletionCode = (typeof INVITE_COMPLETION_CODES)[number];

export type TrustedProviderIdentity = {
  provider: string;
  providerSubject: string;
  verifiedEmail: string;
};

function isTerminated(member: MemberRecord): boolean {
  return member.accessStatus === 'revoked' || member.employmentStatus === 'terminated';
}

function invitedMemberFor(members: MemberRecord[]): MemberRecord | InviteCompletionCode {
  if (members.some((member) => member.accessStatus === 'suspended')) return 'suspended';
  const invited = members.filter((member) => member.accessStatus === 'invited' && !isTerminated(member));
  if (invited.length === 1) return invited[0]!;
  if (members.some((member) => isTerminated(member))) return 'terminated';
  return 'ambiguous';
}

/**
 * Completes an invitation only from a provider identity the caller has already verified.
 * Uses ActivateMember (invitee self-activation). Does not insert Person, Member, or AuthIdentity.
 */
export async function completeInvitedAccess(
  store: OsWorkforceStore,
  commands: WorkforceCommandService,
  trusted: TrustedProviderIdentity,
  now: Date,
): Promise<{ code: InviteCompletionCode }> {
  const providerSubject = trusted.providerSubject.trim();
  const verifiedEmail = normalizeAuthEmail(trusted.verifiedEmail);
  if (!trusted.provider.trim() || !providerSubject || !verifiedEmail.includes('@')) {
    return { code: 'unauthenticated' };
  }

  const bySubject = await store.findAuthIdentityByProviderSubject(trusted.provider, providerSubject);
  if (bySubject && normalizeAuthEmail(bySubject.email) !== verifiedEmail) {
    return { code: 'wrong_account' };
  }

  const byEmail = await store.listAuthIdentitiesByProviderEmail(trusted.provider, verifiedEmail);
  const invited = byEmail.filter((identity) => identity.status === 'invited');
  if (invited.length > 1) return { code: 'ambiguous' };

  if (invited.length === 1) {
    return activateInvitedIdentity(store, commands, invited[0]!, bySubject, trusted.provider, providerSubject, now);
  }

  const active = byEmail.filter((identity) => identity.status === 'active');
  if (active.length === 1) {
    const identity = active[0]!;
    if (identity.providerSubject && identity.providerSubject !== providerSubject) {
      return { code: 'rebind_denied' };
    }
    const members = await store.listMembersForPerson(identity.personId);
    if (members.some((member) => member.accessStatus === 'suspended')) return { code: 'suspended' };
    const activeMembers = members.filter((member) => member.accessStatus === 'active');
    if (activeMembers.length === 1 && identity.providerSubject === providerSubject) {
      return { code: 'already_completed' };
    }
    if (activeMembers.length === 0 && members.some((member) => isTerminated(member))) {
      return { code: 'terminated' };
    }
  }

  if (byEmail.some((identity) => identity.status === 'revoked') && active.length === 0) {
    return { code: 'terminated' };
  }

  return { code: 'not_invited' };
}

async function activateInvitedIdentity(
  store: OsWorkforceStore,
  commands: WorkforceCommandService,
  identity: AuthIdentityRecord,
  boundSubject: AuthIdentityRecord | null,
  provider: string,
  providerSubject: string,
  now: Date,
): Promise<{ code: InviteCompletionCode }> {
  if (identity.providerSubject && identity.providerSubject !== providerSubject) {
    return { code: 'rebind_denied' };
  }
  if (boundSubject && boundSubject.id !== identity.id) {
    return { code: 'rebind_denied' };
  }

  const members = await store.listMembersForPerson(identity.personId);
  const selected = invitedMemberFor(members);
  if (typeof selected === 'string') return { code: selected };

  const ctx: RequestContext = {
    organizationId: selected.organizationId,
    actorMemberId: selected.id,
    personId: identity.personId,
    authIdentityId: identity.id,
    correlationId: createId(),
    effectiveAt: now,
  };

  await commands.execute(
    'ActivateMember',
    ctx,
    { memberId: selected.id, providerSubject },
    `invite-complete:${provider}:${providerSubject}`,
  );

  return { code: 'activated' };
}
