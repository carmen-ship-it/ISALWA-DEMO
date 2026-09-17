import type { CommercialCommandName } from '@isalwa/os-contracts';

export type CommercialCommandResult = {
  commandId: string;
  correlationId: string;
  data: Record<string, unknown>;
};

/** Opportunity and quote writes from UI-5A. CreateOrder is a separate provisional authority surface. */
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

export const COMMERCIAL_COMMANDS_NOT_EXPOSED = ['CancelOrder'] as const;

export type CommandActionResult =
  | { ok: true; data?: Record<string, unknown>; redirectTo?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export type CreateRedirectResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
