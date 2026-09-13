import type { NormalizedImportRow } from './types';

export type ValidationIssue = {
  code: string;
  /** Safe message — never includes raw phone/email/GPS. */
  message: string;
};

export function validateNormalizedRow(row: NormalizedImportRow): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (row.section === 'A') {
    if (!row.givenName || !row.familyName) {
      issues.push({ code: 'MISSING_NAME', message: 'Staff row missing name fields' });
    }
    if (!row.displayNameKey) {
      issues.push({ code: 'INVALID_NAME_KEY', message: 'Staff name key empty after normalize' });
    }
    return issues;
  }

  if (!row.commercialNameKey) {
    issues.push({ code: 'MISSING_COMMERCIAL_NAME', message: 'Customer commercial name required' });
  }
  if (!row.givenName || !row.familyName) {
    issues.push({ code: 'MISSING_CONTACT_NAME', message: 'Customer contact name required' });
  }
  // Phone optional but if raw was present and failed normalize, we already dropped it.
  // Invalid GPS is skipped (not a reject) — customer can still be valid.
  return issues;
}
