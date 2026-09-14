import type { WorkforceCommandName } from '@isalwa/os-contracts';

export type WorkforceCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/** Commands wired in UI-2B — Lane J approved admin mutations only. */
export const UI_2B_WORKFORCE_COMMANDS = [
  'ChangeDepartment',
  'ChangeRole',
  'GrantAdditionalRole',
  'EndAdditionalRole',
  'ChangeManager',
  'SuspendMember',
  'ActivateMember',
  'TerminateMember',
  'GrantDelegation',
  'RevokeDelegation',
  'RequestMemberEmailChange',
] as const satisfies readonly WorkforceCommandName[];

export type Ui2bWorkforceCommand = (typeof UI_2B_WORKFORCE_COMMANDS)[number];

/** People V1 — invite only. Does not add rehire, email completion, or provider retry. */
export const PEOPLE_V1_INVITE_COMMANDS = ['InviteMember'] as const satisfies readonly WorkforceCommandName[];

export type PeopleV1InviteCommand = (typeof PEOPLE_V1_INVITE_COMMANDS)[number];

export const WORKFORCE_COMMANDS_EXPOSED_IN_UI = [
  ...UI_2B_WORKFORCE_COMMANDS,
  ...PEOPLE_V1_INVITE_COMMANDS,
] as const satisfies readonly WorkforceCommandName[];

/** Must remain absent from employee/admin UI. InviteMember is people.admin only, not in this list. */
export const WORKFORCE_COMMANDS_BLOCKED_IN_UI = [
  'RehireMember',
  'ChangeMemberEmail',
  'RetryAuthProviderSync',
] as const satisfies readonly WorkforceCommandName[];

export type CommandActionResult =
  | { ok: true; data?: Record<string, unknown>; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
