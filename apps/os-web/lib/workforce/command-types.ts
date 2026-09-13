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
  'ChangeManager',
  'SuspendMember',
  'ActivateMember',
  'TerminateMember',
  'GrantDelegation',
  'RevokeDelegation',
  'RequestMemberEmailChange',
] as const satisfies readonly WorkforceCommandName[];

export type Ui2bWorkforceCommand = (typeof UI_2B_WORKFORCE_COMMANDS)[number];

/** Must remain absent from employee/admin UI (Step 14.7). */
export const WORKFORCE_COMMANDS_BLOCKED_IN_UI = [
  'InviteMember',
  'RehireMember',
  'ChangeMemberEmail',
  'RetryAuthProviderSync',
] as const satisfies readonly WorkforceCommandName[];

export type CommandActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
