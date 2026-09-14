import {
  TYPEAHEAD_MIN_QUERY,
  TYPEAHEAD_RESULT_LIMIT,
  boundedTypeaheadOptions,
  type TypeaheadOption,
} from '@/lib/operating/typeahead';

export const TYPEAHEAD_KINDS = ['customer', 'member', 'approver', 'contact', 'location'] as const;
export type TypeaheadKind = (typeof TYPEAHEAD_KINDS)[number];

export type TypeaheadLookupMode =
  | 'authorized_query'
  | 'admin_query'
  | 'held_records_only'
  | 'party_scoped_held_records';

export type TypeaheadLookupPolicy = {
  kind: TypeaheadKind;
  mode: TypeaheadLookupMode;
  minQuery: number;
  limit: number;
  note: string;
};

export const TYPEAHEAD_LOOKUP_POLICY: readonly TypeaheadLookupPolicy[] = [
  {
    kind: 'customer',
    mode: 'authorized_query',
    minQuery: TYPEAHEAD_MIN_QUERY,
    limit: TYPEAHEAD_RESULT_LIMIT,
    note: 'SearchParties con límite. No descarga el directorio.',
  },
  {
    kind: 'member',
    mode: 'admin_query',
    minQuery: TYPEAHEAD_MIN_QUERY,
    limit: TYPEAHEAD_RESULT_LIMIT,
    note: 'ListMembers con consulta y límite, solo administración. No usa active-options.',
  },
  {
    kind: 'approver',
    mode: 'admin_query',
    minQuery: TYPEAHEAD_MIN_QUERY,
    limit: TYPEAHEAD_RESULT_LIMIT,
    note: 'Un aprobador es un miembro. Misma búsqueda acotada. No hay directorio de aprobadores.',
  },
  {
    kind: 'contact',
    mode: 'held_records_only',
    minQuery: TYPEAHEAD_MIN_QUERY,
    limit: TYPEAHEAD_RESULT_LIMIT,
    note: 'Sin índice global. Solo contactos ya traídos del cliente.',
  },
  {
    kind: 'location',
    mode: 'party_scoped_held_records',
    minQuery: TYPEAHEAD_MIN_QUERY,
    limit: TYPEAHEAD_RESULT_LIMIT,
    note: 'Sin búsqueda global ni mapa. Solo ubicaciones del cliente ya consultado.',
  },
];

export type HeldContact = {
  id: string;
  givenName: string;
  familyName: string;
  phone: string | null;
  status: string;
};

export type HeldLocation = {
  id: string;
  label: string;
  addressText: string | null;
  status: string;
  hasCoordinates: boolean;
};

function contactLabel(contact: HeldContact): string {
  const name = [contact.givenName, contact.familyName].map((part) => part.trim()).filter(Boolean).join(' ');
  const phone = contact.phone?.trim();
  return phone ? `${name} · ${phone}` : name;
}

export function contactsToTypeahead(contacts: readonly HeldContact[]): TypeaheadOption[] {
  return contacts
    .filter((contact) => contact.status === 'active')
    .map((contact) => ({ value: contact.id, label: contactLabel(contact) }))
    .filter((option) => option.label.trim().length > 0);
}

export function locationsToTypeahead(locations: readonly HeldLocation[]): TypeaheadOption[] {
  return locations
    .filter((location) => location.status === 'active')
    .map((location) => {
      const address = location.addressText?.trim();
      const label = address ? `${location.label.trim()} · ${address}` : location.label.trim();
      return { value: location.id, label };
    })
    .filter((option) => option.label.trim().length > 0);
}

export function filterHeldTypeahead(
  options: readonly TypeaheadOption[],
  query: string,
  limit = TYPEAHEAD_RESULT_LIMIT,
): TypeaheadOption[] {
  return boundedTypeaheadOptions(options, query, limit);
}
