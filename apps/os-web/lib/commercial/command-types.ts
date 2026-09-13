import type { CommercialCommandName } from '@isalwa/os-contracts';

export type CommercialCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/** Commands wired in UI-5A — CreateOrder intentionally excluded (G-02). */
export const UI_5A_COMMERCIAL_COMMANDS = [
  'CreateOpportunity',
  'UpdateOpportunity',
  'ChangeOpportunityStage',
  'CloseOpportunity',
  'AssignOpportunityOwner',
  'CreateQuote',
  'AddQuoteLine',
  'UpdateQuoteLine',
  'RemoveQuoteLine',
  'UpdateQuote',
  'SubmitQuote',
  'CancelQuote',
] as const satisfies readonly CommercialCommandName[];

export type Ui5aCommercialCommand = (typeof UI_5A_COMMERCIAL_COMMANDS)[number];

export const COMMERCIAL_COMMANDS_NOT_EXPOSED = ['CreateOrder', 'CancelOrder'] as const;

export type CommandActionResult =
  | { ok: true; data?: Record<string, unknown> }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type CreateRedirectResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
