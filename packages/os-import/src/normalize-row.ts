import type { ContactPhoneCountry, ImportInputRow } from '@isalwa/os-contracts';
import { normalizeEmailKey, normalizeNameKey, normalizeNitKey } from './normalize-name';
import { cellText, DEFAULT_IMPORT_PHONE_COUNTRY, phoneMatchKey, readImportPhoneValues } from './normalize-phone';
import { derivePhoneSlots } from './phone-review';
import { parseMapsUrl } from './parse-maps-url';
import type { NormalizedImportRow } from './types';

export type ImportPhoneContext = {
  country: ContactPhoneCountry;
  countrySource: 'default' | 'explicit';
};

export const DEFAULT_IMPORT_PHONE_CONTEXT: ImportPhoneContext = {
  country: DEFAULT_IMPORT_PHONE_COUNTRY,
  countrySource: 'default',
};

export function normalizeImportRow(
  row: ImportInputRow,
  phoneContext: ImportPhoneContext = DEFAULT_IMPORT_PHONE_CONTEXT,
): NormalizedImportRow {
  if (row.section === 'A') {
    const givenName = row.givenName.trim();
    const familyName = row.familyName.trim();
    return {
      section: 'A',
      rowIndex: row.rowIndex,
      givenName,
      familyName,
      displayNameKey: normalizeNameKey(`${givenName} ${familyName}`),
      emailKey: normalizeEmailKey(row.email),
      cargo: row.cargo?.trim() || null,
    };
  }

  const commercialName = row.commercialName.trim();
  const givenName = row.givenName.trim();
  const familyName = row.familyName.trim();
  const values = [
    ...readImportPhoneValues('celular', row.celular, phoneContext.country),
    ...readImportPhoneValues('telefono', row.telefono, phoneContext.country),
  ];
  const { phone, whatsapp, phoneKeys, extraPhoneNotImported } = derivePhoneSlots(values);
  const parsed = parseMapsUrl(row.mapsUrl);

  return {
    section: 'B',
    rowIndex: row.rowIndex,
    commercialName,
    commercialNameKey: normalizeNameKey(commercialName),
    givenName,
    familyName,
    personNameKey: normalizeNameKey(`${givenName} ${familyName}`),
    phone,
    whatsapp,
    phoneKey: phoneMatchKey(phone),
    phoneKeys,
    extraPhoneNotImported,
    phoneInput: {
      ...phoneContext,
      celularOriginal: present(row.celular),
      telefonoOriginal: present(row.telefono),
      values,
      version: 0,
    },
    nitKey: normalizeNitKey(row.nit),
    location: {
      kind: parsed.kind,
      label: 'Ubicación GPS',
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      provenanceUrl: parsed.provenanceUrl,
    },
  };
}

function present(raw: string | number | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  const text = cellText(raw);
  return text ? text : null;
}
