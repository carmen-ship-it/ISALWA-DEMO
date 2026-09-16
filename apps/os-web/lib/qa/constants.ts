/** Wave 2 SYNTH acceptance tenant — only valid Ver como target org. */
export const QA_SYNTH_ORGANIZATION_ID = '01M2JKF77TXMJNDTKNCYNHH9G5' as const;

/** REAL customer tenant — never a Ver como target. */
export const QA_REAL_ORGANIZATION_ID = '01M2DV9F0V5DXS4G89AKF4D5SR' as const;

export const QA_VIEW_COOKIE_NAME = 'os_qa_view' as const;

/** Default QA view session length (staging operator convenience). */
export const QA_VIEW_TTL_SECONDS = 60 * 60 * 4;

export const QA_WAVE2_RECEIPT_PATH =
  '~/.isalwa-secrets/isalwa-os-staging-wave2-role-fixtures.json' as const;

export const QA_WAVE_B_RECEIPT_PATH =
  '~/.isalwa-secrets/isalwa-os-staging-wave-b-issue-memory.json' as const;
