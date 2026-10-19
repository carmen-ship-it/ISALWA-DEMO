import {
  checkContactNumber,
  contactCountryCallingCode,
  type ContactNumberInvalidReason,
  type ContactPhoneCountry,
} from '@isalwa/os-contracts';
import type { ImportPhoneField, ImportPhoneValue } from './types';

/** Used when a batch does not name its phone country; the receipt records it as a default. */
export const DEFAULT_IMPORT_PHONE_COUNTRY: ContactPhoneCountry = 'BO';

export const IMPORT_PHONE_ADJUSTMENTS = [
  'excel_decimal',
  'separators',
  'country_code_without_plus',
  'leading_zero',
] as const;
export type ImportPhoneAdjustment = (typeof IMPORT_PHONE_ADJUSTMENTS)[number];

export type ImportPhoneCheck = {
  /** Shared-rule E.164, or null with the reason. */
  e164: string | null;
  reason: ContactNumberInvalidReason | null;
  adjustments: ImportPhoneAdjustment[];
};

/**
 * Spreadsheet cleanup (Excel decimal, separators, the country code typed without "+", leading
 * zeros), then the shared contact number rule for the batch country. Never logs the raw value.
 */
export function checkImportPhone(raw: string, country: ContactPhoneCountry): ImportPhoneCheck {
  const adjustments: ImportPhoneAdjustment[] = [];
  let text = raw.trim();
  if (/^\d+\.0+$/.test(text)) {
    text = text.replace(/\.0+$/, '');
    adjustments.push('excel_decimal');
  }
  if (!text.startsWith('+') && /^[\d\s().-]+$/.test(text)) {
    let digits = text.replace(/\D/g, '');
    if (digits !== text) adjustments.push('separators');
    const callingCode = contactCountryCallingCode(country);
    if (callingCode && digits.startsWith(callingCode) && !digits.startsWith(`00${callingCode}`)) {
      const rest = digits.slice(callingCode.length);
      if (checkContactNumber({ country, number: rest }).ok) {
        digits = rest;
        adjustments.push('country_code_without_plus');
      }
    }
    if (/^0+[1-9]/.test(digits) && !digits.startsWith('00')) {
      digits = digits.replace(/^0+/, '');
      adjustments.push('leading_zero');
    }
    text = digits;
  }
  const check = checkContactNumber({ country, number: text });
  return check.ok
    ? { e164: check.e164, reason: null, adjustments }
    : { e164: null, reason: check.reason, adjustments };
}

/** Match key: digits of an E.164 number (no plus). */
export function phoneMatchKey(normalized: string | null | undefined): string | null {
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, '');
  return digits || null;
}

/**
 * Split a cell only on explicit separators. Never concatenates tokens,
 * and never invents a split inside a single formatted number.
 */
export function splitPhoneTokens(raw: string | number | null | undefined): string[] {
  if (raw === null || raw === undefined || raw === '') return [];
  if (typeof raw === 'number') return [cellText(raw)];
  const text = String(raw).trim();
  if (!text) return [];
  if (/[/|,;]/.test(text)) {
    return text
      .split(/[/|,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return [text];
}

/** Excel numbers as text. A fractional value is kept as written so it is flagged, not truncated. */
export function cellText(raw: string | number): string {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) ? raw.toFixed(0) : String(raw);
  }
  return String(raw).trim();
}

/** Every value in a cell, valid or not, with its original text. Nothing is dropped. */
export function readImportPhoneValues(
  field: ImportPhoneField,
  raw: string | number | null | undefined,
  country: ContactPhoneCountry,
): ImportPhoneValue[] {
  return splitPhoneTokens(raw).map((original, tokenIndex) => {
    const check = checkImportPhone(original, country);
    return {
      valueId: `${field}:${tokenIndex}`,
      field,
      tokenIndex,
      original,
      normalized: check.e164,
      status: check.e164 ? 'accepted' : 'invalid',
      reason: check.reason,
      adjustments: check.adjustments,
    };
  });
}
