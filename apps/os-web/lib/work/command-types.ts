import type { WorkCommandName } from '@isalwa/os-contracts';

export type WorkCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/** Commands this follow-up slice may call. Existing work commands only. */
export const FOLLOW_UP_UI_COMMANDS = ['CreateWorkItem', 'CompleteWork'] as const satisfies readonly WorkCommandName[];

export type FollowUpUiCommand = (typeof FOLLOW_UP_UI_COMMANDS)[number];

/**
 * people.admin member-detail surface only. Not exposed on /trabajo or follow-up forms.
 * Reuses the existing ReassignWork command — do not invent a second command.
 */
export const ADMIN_REASSIGN_WORK_COMMAND = 'ReassignWork' as const satisfies WorkCommandName;

export const ADMIN_REASSIGN_WORK_COMMANDS = [ADMIN_REASSIGN_WORK_COMMAND] as const satisfies readonly WorkCommandName[];

export function followUpCommandPath(command: FollowUpUiCommand): string {
  return `/commands/${command}`;
}
