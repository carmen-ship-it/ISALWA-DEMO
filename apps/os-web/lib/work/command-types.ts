import type { WorkCommandName } from '@isalwa/os-contracts';

export type WorkCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/** Commands this follow-up slice may call. Existing work commands only. */
export const FOLLOW_UP_UI_COMMANDS = ['CreateWorkItem', 'CompleteWork'] as const satisfies readonly WorkCommandName[];

export type FollowUpUiCommand = (typeof FOLLOW_UP_UI_COMMANDS)[number];

export function followUpCommandPath(command: FollowUpUiCommand): string {
  return `/commands/${command}`;
}
