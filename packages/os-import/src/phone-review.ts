import { maskContactNumber, type ContactPhoneCountry, type ImportRowOutcome } from '@isalwa/os-contracts';
import { phoneMatchKey } from './normalize-phone';
import type {
  ImportPhoneInput,
  ImportPhoneProposedAction,
  ImportPhoneValue,
  ImportReceipt,
} from './types';

export type PhoneSlots = {
  phone: string | null;
  whatsapp: string | null;
  phoneKeys: string[];
  extraPhoneNotImported: number;
};

function usable(value: ImportPhoneValue): string | null {
  return value.status === 'accepted' || value.status === 'corrected' ? value.normalized : null;
}

/** WhatsApp = first usable celular; phone = first usable teléfono, else first usable celular. */
export function derivePhoneSlots(values: ImportPhoneValue[]): PhoneSlots {
  const celular = values.filter((v) => v.field === 'celular').map(usable).filter(isString);
  const telefono = values.filter((v) => v.field === 'telefono').map(usable).filter(isString);
  const whatsapp = celular[0] ?? null;
  const phone = telefono[0] ?? celular[0] ?? null;
  const stored = new Set([phone, whatsapp].filter(isString));
  const extras = new Set([...celular, ...telefono].filter((value) => !stored.has(value)));
  const phoneKeys = [...new Set([phone, whatsapp, ...celular, ...telefono].map(phoneMatchKey).filter(isString))];
  return { phone, whatsapp, phoneKeys, extraPhoneNotImported: extras.size };
}

export function rowNeedsPhoneCorrection(input: ImportPhoneInput | undefined): boolean {
  return Boolean(input?.values.some((value) => value.status === 'invalid'));
}

export function proposedPhoneAction(value: ImportPhoneValue, slots: PhoneSlots): ImportPhoneProposedAction {
  if (value.status === 'invalid') return 'correct_or_omit';
  if (value.status === 'omitted') return 'import_without_number';
  const stored = value.normalized !== null && (value.normalized === slots.phone || value.normalized === slots.whatsapp);
  if (!stored) return 'keep_in_import_record_only';
  return value.status === 'corrected' ? 'import_corrected' : 'import';
}

function isString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function summarizePhoneReview(
  rows: Array<{ rowIndex: number; outcome: ImportRowOutcome; phoneInput: ImportPhoneInput | undefined }>,
  batchCountry: { country: ContactPhoneCountry; countrySource: 'default' | 'explicit' },
): ImportReceipt['phoneReview'] {
  let accepted = 0;
  let corrected = 0;
  let omitted = 0;
  let invalid = 0;
  let extraNotImported = 0;
  let rowsNeedingCorrection = 0;
  const items: ImportReceipt['phoneReview']['items'] = [];
  for (const row of rows) {
    if (!row.phoneInput) continue;
    const slots = derivePhoneSlots(row.phoneInput.values);
    extraNotImported += slots.extraPhoneNotImported;
    if (rowNeedsPhoneCorrection(row.phoneInput)) rowsNeedingCorrection += 1;
    for (const value of row.phoneInput.values) {
      if (value.status === 'accepted') accepted += 1;
      if (value.status === 'corrected') corrected += 1;
      if (value.status === 'omitted') omitted += 1;
      if (value.status === 'invalid') invalid += 1;
      const proposedAction = proposedPhoneAction(value, slots);
      if (proposedAction === 'import' && value.status === 'accepted') continue;
      items.push({
        rowIndex: row.rowIndex,
        valueId: value.valueId,
        field: value.field,
        maskedOriginal: maskContactNumber(value.original) ?? '•••',
        status: value.status,
        reason: value.reason,
        proposedAction,
      });
    }
  }
  return {
    ...batchCountry,
    accepted,
    corrected,
    omitted,
    invalid,
    extraNotImported,
    rowsNeedingCorrection,
    code: extraNotImported > 0 ? 'EXTRA_PHONE_NOT_IMPORTED' : null,
    correctionCode: invalid > 0 ? 'PHONE_CORRECTION_REQUIRED' : null,
    items,
  };
}
