/**
 * Issue authority matrix — structured data for acceptance doc generation.
 *
 * This file exports authority matrix rows describing which scope is required
 * for each Issue command. Used by acceptance tests and documentation generators.
 */

import { type IssueCommandName, ISSUE_COMMAND_NAMES } from './issue';
import { ISSUE_MANAGE_SCOPE } from './operations-scopes';
import type { AdminScopeKey } from './scopes';

// ─────────────────────────────────────────────────────────────────────────────
// Authority matrix row type
// ─────────────────────────────────────────────────────────────────────────────

export type IssueAuthorityMatrixRow = {
  command: IssueCommandName;
  requiredScope: typeof ISSUE_MANAGE_SCOPE | AdminScopeKey | 'member_active';
  description: string;
  ownershipRequired: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Authority matrix
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authority matrix for Issue commands.
 *
 * - ReportIssue: member_active (any active member may report)
 * - AddIssueJournalEntry: member_active (contributors may add notes)
 * - LinkIssueWork: member_active (contributors may link work)
 * - RecordIssueOutcome: member_active (contributors may record outcome)
 * - TriageIssue: issue.manage (requires authority)
 * - AssignIssueOwner: issue.manage (requires authority)
 * - StartIssueProgress: owner or issue.manage
 * - ConfirmIssueCause: issue.manage (requires authority)
 * - ResolveIssue: owner or issue.manage
 * - CloseIssue: issue.manage (requires authority)
 * - ReopenIssue: issue.manage (requires authority)
 * - RelateIssues: issue.manage (requires authority)
 */
export const ISSUE_AUTHORITY_MATRIX: readonly IssueAuthorityMatrixRow[] = [
  {
    command: 'ReportIssue',
    requiredScope: 'member_active',
    description: 'Any active member may report an issue',
    ownershipRequired: false,
  },
  {
    command: 'TriageIssue',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Triage requires issue.manage scope',
    ownershipRequired: false,
  },
  {
    command: 'AssignIssueOwner',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Assigning owner requires issue.manage scope',
    ownershipRequired: false,
  },
  {
    command: 'StartIssueProgress',
    requiredScope: 'member_active',
    description: 'Owner or issue.manage may start progress',
    ownershipRequired: true,
  },
  {
    command: 'AddIssueJournalEntry',
    requiredScope: 'member_active',
    description: 'Any active member may add journal entries',
    ownershipRequired: false,
  },
  {
    command: 'ConfirmIssueCause',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Confirming cause requires issue.manage scope',
    ownershipRequired: false,
  },
  {
    command: 'LinkIssueWork',
    requiredScope: 'member_active',
    description: 'Any active member may link work items',
    ownershipRequired: false,
  },
  {
    command: 'ResolveIssue',
    requiredScope: 'member_active',
    description: 'Owner or issue.manage may resolve',
    ownershipRequired: true,
  },
  {
    command: 'RecordIssueOutcome',
    requiredScope: 'member_active',
    description: 'Any active member may record outcome',
    ownershipRequired: false,
  },
  {
    command: 'CloseIssue',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Closing requires issue.manage scope',
    ownershipRequired: false,
  },
  {
    command: 'ReopenIssue',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Reopening requires issue.manage scope',
    ownershipRequired: false,
  },
  {
    command: 'RelateIssues',
    requiredScope: ISSUE_MANAGE_SCOPE,
    description: 'Relating issues requires issue.manage scope',
    ownershipRequired: false,
  },
] as const;

/**
 * Verify all commands are covered in the authority matrix.
 * This is a compile-time assertion.
 */
const _matrixCommands = new Set(ISSUE_AUTHORITY_MATRIX.map((row) => row.command));
const _allCommands = new Set(ISSUE_COMMAND_NAMES);
if (_matrixCommands.size !== _allCommands.size) {
  throw new Error('ISSUE_AUTHORITY_MATRIX does not cover all ISSUE_COMMAND_NAMES');
}

/**
 * Lookup authority requirement for a command.
 */
export function getIssueCommandAuthority(
  command: IssueCommandName,
): IssueAuthorityMatrixRow | undefined {
  return ISSUE_AUTHORITY_MATRIX.find((row) => row.command === command);
}
