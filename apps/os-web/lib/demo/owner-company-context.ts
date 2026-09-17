/**
 * Owner Demo company context — selects REAL vs SYNTH among proven memberships.
 * Does not impersonate. Does not invent scopes. Distinct from role-preview.
 */

import { QA_REAL_ORGANIZATION_ID, QA_SYNTH_ORGANIZATION_ID } from '@/lib/qa/constants';
import type { DemoDataMode } from '@/lib/demo/owner-demo-identity';

/** Cookie: which company desks use when Demo / Datos reales is chosen. */
export const OWNER_EFFECTIVE_COMPANY_COOKIE = 'isalwa-owner-effective-company' as const;

export type OwnerEffectiveCompany = 'real' | 'synth';

export function parseOwnerEffectiveCompany(
  raw: string | null | undefined,
): OwnerEffectiveCompany | null {
  if (raw === 'synth') return 'synth';
  if (raw === 'real') return 'real';
  return null;
}

export function companyForDemoDataMode(mode: DemoDataMode): OwnerEffectiveCompany {
  return mode === 'demo' ? 'synth' : 'real';
}

export function organizationIdForCompany(company: OwnerEffectiveCompany): string {
  return company === 'synth' ? QA_SYNTH_ORGANIZATION_ID : QA_REAL_ORGANIZATION_ID;
}

export function saveOwnerEffectiveCompanyCookie(company: OwnerEffectiveCompany): void {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 24 * 30;
  document.cookie = `${OWNER_EFFECTIVE_COMPANY_COOKIE}=${company}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearOwnerEffectiveCompanyCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${OWNER_EFFECTIVE_COMPANY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
