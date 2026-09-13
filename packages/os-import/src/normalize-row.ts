import type { ImportInputRow } from '@isalwa/os-contracts';
import { normalizeEmailKey, normalizeNameKey, normalizeNitKey } from './normalize-name';
import { normalizeBoliviaPhones, phoneMatchKey } from './normalize-phone';
import { parseMapsUrl } from './parse-maps-url';
import type { NormalizedImportRow } from './types';

export function normalizeImportRow(row: ImportInputRow): NormalizedImportRow {
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
  const celularNumbers = normalizeBoliviaPhones(row.celular);
  const telefonoNumbers = normalizeBoliviaPhones(row.telefono);
  const whatsapp = celularNumbers[0] ?? null;
  const phone = telefonoNumbers[0] ?? celularNumbers[0] ?? null;
  const stored = new Set([phone, whatsapp].filter((value): value is string => Boolean(value)));
  const extraPhoneNotImported = [...celularNumbers, ...telefonoNumbers].filter(
    (value) => !stored.has(value),
  ).length;
  const phoneKeys = [phone, whatsapp, ...celularNumbers, ...telefonoNumbers]
    .map((value) => phoneMatchKey(value))
    .filter((value): value is string => Boolean(value))
    .filter((value, index, all) => all.indexOf(value) === index);
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
