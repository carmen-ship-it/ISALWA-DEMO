import { partyHref } from '@/lib/party/navigation';
import { customerPaletteItem, type PaletteItem } from '@/lib/shell/command-palette';
import { phoneIncludes, textIncludes } from './phone-match';

export type SearchPartyHit = {
  partyId: string;
  displayName: string;
  legalName: string | null;
  status: string;
  primaryPhone: string | null;
};

export type SearchContactHit = {
  id: string;
  givenName: string;
  familyName: string;
  email: string | null;
  phone: string | null;
  status: string;
};

const ID_LIKE = /^[a-z0-9_-]{8,}$/i;

export function partyNameMatches(party: SearchPartyHit, query: string): boolean {
  return textIncludes(party.displayName, query) || textIncludes(party.legalName, query);
}

export function contactVisibleName(contact: SearchContactHit): string {
  return [contact.givenName, contact.familyName].map((part) => part.trim()).filter(Boolean).join(' ');
}

export function contactMatches(contact: SearchContactHit, query: string): boolean {
  if (contact.status !== 'active') return false;
  return (
    textIncludes(contactVisibleName(contact), query) ||
    textIncludes(contact.email, query) ||
    phoneIncludes(contact.phone, query)
  );
}

export function matchingContacts(
  contacts: readonly SearchContactHit[],
  query: string,
): SearchContactHit[] {
  return contacts.filter((contact) => contactMatches(contact, query));
}

function usableLabel(label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed || ID_LIKE.test(trimmed)) return false;
  return true;
}

export function annotateCustomerHit(party: SearchPartyHit, query: string): PaletteItem | null {
  if (!usableLabel(party.displayName) && !usableLabel(party.legalName ?? '')) return null;
  const item = customerPaletteItem({
    partyId: party.partyId,
    displayName: party.displayName,
    legalName: party.legalName,
    status: party.status,
  });
  const phone = party.primaryPhone?.trim() || null;
  if (phone && phoneIncludes(phone, query) && !partyNameMatches(party, query)) {
    return { ...item, detail: item.detail ? `${item.detail} · Teléfono ${phone}` : `Teléfono ${phone}` };
  }
  if (phone && phoneIncludes(phone, query)) {
    return { ...item, detail: item.detail ? `${item.detail} · Teléfono ${phone}` : `Teléfono ${phone}` };
  }
  return item;
}

export function contactPaletteItem(
  party: SearchPartyHit,
  contact: SearchContactHit,
): PaletteItem | null {
  const name = contactVisibleName(contact);
  if (!usableLabel(name)) return null;
  const partyName = party.displayName.trim() || 'Cliente';
  if (foldEqual(name, partyName)) return null;
  const phone = contact.phone?.trim() || null;
  return {
    key: `customer:${party.partyId}:contact:${contact.id}`,
    kind: 'customer',
    label: name,
    detail: phone ? `Contacto de ${partyName} · ${phone}` : `Contacto de ${partyName}`,
    href: partyHref(party.partyId),
    partyId: party.partyId,
  };
}

function foldEqual(left: string, right: string): boolean {
  return left.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es') ===
    right.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

export function extensionItemsForParty(
  party: SearchPartyHit,
  contacts: readonly SearchContactHit[],
  query: string,
): PaletteItem[] {
  const customer = annotateCustomerHit(party, query);
  const contactsMatched = matchingContacts(contacts, query)
    .map((contact) => contactPaletteItem(party, contact))
    .filter((item): item is PaletteItem => item !== null);
  return [customer, ...contactsMatched].filter((item): item is PaletteItem => item !== null);
}

/** Keeps the primary search. Adds only items the extension actually received. */
export function mergePaletteSearch(
  base: readonly PaletteItem[],
  extras: readonly PaletteItem[],
): PaletteItem[] {
  const next = base.map((item) => ({ ...item }));
  const indexByKey = new Map(next.map((item, index) => [item.key, index]));
  for (const extra of extras) {
    if (!extra.label.trim() || !extra.href.startsWith('/') || extra.href.startsWith('//')) continue;
    const existing = indexByKey.get(extra.key);
    if (existing === undefined) {
      indexByKey.set(extra.key, next.length);
      next.push(extra);
      continue;
    }
    const current = next[existing];
    if (!current) continue;
    if (extra.detail && !current.detail?.includes(extra.detail)) {
      next[existing] = {
        ...current,
        detail: current.detail ? `${current.detail} · ${extra.detail}` : extra.detail,
      };
    }
  }
  return next;
}
