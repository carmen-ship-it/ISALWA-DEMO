/**
 * CT3-E owner-demo fixture guards — SYNTH only, fail-closed on REAL.
 * Pure helpers; safe to unit-test without a live database.
 */

export const OWNER_DEMO_SYNTH_ORG = '01M2JKF77TXMJNDTKNCYNHH9G5' as const;
export const OWNER_DEMO_REAL_ORG = '01M2DV9F0V5DXS4G89AKF4D5SR' as const;

/** Protected REAL seven — never mutate for demo setup. */
export const OWNER_DEMO_REAL_SEVEN = [
  'COMERCIAL ALVAREZ',
  'ASTRIX',
  'GARCIA',
  'MICRISTAL',
  'TORREZ',
  'VAINSA',
  'IMPORTAMEC',
] as const;

export const OWNER_DEMO_PREFIX = 'DEMO ' as const;
export const OWNER_DEMO_NOTES_TAG = '[is_demo]' as const;
export const OWNER_DEMO_FIXTURE_CONFIRM_VALUE = '1' as const;

export const OWNER_DEMO_QUOTE_NUMBER_PROYECTOS = 'Q-DEMO-001' as const;

export function assertOwnerDemoSynthOrg(organizationId: string): void {
  const id = organizationId.trim();
  if (id !== OWNER_DEMO_SYNTH_ORG) {
    throw new Error(`OWNER_DEMO_REFUSING_NON_SYNTH_ORG:${id}`);
  }
}

export function assertOwnerDemoNotRealOrg(organizationId: string): void {
  if (organizationId.trim() === OWNER_DEMO_REAL_ORG) {
    throw new Error('OWNER_DEMO_REFUSING_REAL_TENANT');
  }
}

export function assertOwnerDemoConfirm(envValue: string | undefined): void {
  if (envValue?.trim() !== OWNER_DEMO_FIXTURE_CONFIRM_VALUE) {
    throw new Error('STAGING_FIXTURE_CONFIRM=1 required for owner-demo seed');
  }
}

export function normalizePartyNameForCompare(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

export function isProtectedRealSevenName(name: string): boolean {
  const normalized = normalizePartyNameForCompare(name);
  return OWNER_DEMO_REAL_SEVEN.some((real) => normalizePartyNameForCompare(real) === normalized);
}

export function assertNotProtectedRealSevenName(name: string): void {
  if (isProtectedRealSevenName(name)) {
    throw new Error(`OWNER_DEMO_REFUSING_REAL_SEVEN_NAME:${name}`);
  }
}

export function isOwnerDemoDisplayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return false;
  return trimmed.toUpperCase().startsWith('DEMO ');
}

export function hasOwnerDemoNotesTag(notes: string | null | undefined): boolean {
  return (notes ?? '').includes(OWNER_DEMO_NOTES_TAG);
}

export function withOwnerDemoNotesTag(notes: string | null | undefined): string {
  const base = (notes ?? '').trim();
  if (hasOwnerDemoNotesTag(base)) return base || OWNER_DEMO_NOTES_TAG;
  return base ? `${OWNER_DEMO_NOTES_TAG} ${base}` : OWNER_DEMO_NOTES_TAG;
}

export type RealSevenMutationProof = {
  realOrgTouched: false;
  realSevenNamesTouched: false;
  targetOrganizationId: typeof OWNER_DEMO_SYNTH_ORG;
  approach: string;
};

export function realSevenMutationProof(): RealSevenMutationProof {
  return {
    realOrgTouched: false,
    realSevenNamesTouched: false,
    targetOrganizationId: OWNER_DEMO_SYNTH_ORG,
    approach:
      'Seed refuses OWNER_DEMO_REAL_ORG and any party name matching OWNER_DEMO_REAL_SEVEN before writes; all creates use DEMO-prefixed names in SYNTH only.',
  };
}
