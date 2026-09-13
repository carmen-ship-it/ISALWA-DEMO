import type { ImportInputRow } from '@isalwa/os-contracts';
import { normalizeEmailKey, normalizeNameKey, normalizeNitKey } from './normalize-name';
import { normalizeBoliviaPhone, phoneMatchKey } from './normalize-phone';
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
  const celularNorm = normalizeBoliviaPhone(row.celular);
  const telefonoNorm = normalizeBoliviaPhone(row.telefono);
  const whatsapp = celularNorm;
  const phone = telefonoNorm ?? celularNorm;
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
