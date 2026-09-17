import { partyHref } from '@/lib/party/navigation';
import { customerPaletteItem, type PaletteItem } from '@/lib/shell/command-palette';
import { phoneIncludes, textIncludes } from './phone-match';
import {
  conversationPaletteItems,
  registerConversationActionItem,
} from '@/lib/conversations/search';
import type { Conversation } from '@/lib/conversations/model';

export {
  conversationPaletteItems,
  registerConversationActionItem,
};
export type { Conversation };

export type SearchPartyHit = {
  partyId: string;
  displayName: string;
  legalName: string | null;
  status: string;
  primaryPhone: string | null;
};

/** Matches TENANT_SURFACE_REQUIRED_SCOPE.contact. Not a caller-supplied tenant. */
export const CONTACT_MATCH_SCOPE = 'commercial.team.read';

export type TrustedContactSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export type ContactMatchDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type ContactMatchRead = {
  items: SearchContactHit[];
  code: ContactMatchDenialCode | null;
  count: number;
  suggestions: SearchContactHit[];
  autocomplete: SearchContactHit[];
};

export type SearchContactHit = {
  id: string;
  givenName: string;
  familyName: string;
  email: string | null;
  phone: string | null;
  status: string;
  organizationId?: string | null;
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

function trustedContactOrganization(
  session: TrustedContactSession | null | undefined,
): string | null {
  if (!session || typeof session.organizationId !== 'string') return null;
  const trimmed = session.organizationId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function holdsContactScope(session: TrustedContactSession | null | undefined): boolean {
  return (session?.grantedScopes ?? []).some((scope) => scope.trim() === CONTACT_MATCH_SCOPE);
}

const NO_CONTACT_EVIDENCE: ContactMatchRead = {
  items: [],
  code: null,
  count: 0,
  suggestions: [],
  autocomplete: [],
};

/**
 * Name, email, and phone evidence is emitted only for contacts in the
 * authenticated session tenant. Another tenant contributes no name, mask,
 * count, score, or candidate existence.
 */
export function matchingContactsRead(
  contacts: readonly SearchContactHit[],
  query: string,
  session?: TrustedContactSession | null,
): ContactMatchRead {
  const organizationId = trustedContactOrganization(session);
  if (!organizationId) return { ...NO_CONTACT_EVIDENCE, code: 'AUTH_REQUIRED' };
  if (!holdsContactScope(session)) return { ...NO_CONTACT_EVIDENCE, code: 'ROLE_FORBIDDEN' };

  const items = contacts.filter(
    (contact) => contact.organizationId === organizationId && contactMatches(contact, query),
  );
  return {
    items,
    code: null,
    count: items.length,
    suggestions: items,
    autocomplete: items,
  };
}

export function matchingContacts(
  contacts: readonly SearchContactHit[],
  query: string,
  session?: TrustedContactSession | null,
): SearchContactHit[] {
  return matchingContactsRead(contacts, query, session).items;
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
  session?: TrustedContactSession | null,
): PaletteItem[] {
  const customer = annotateCustomerHit(party, query);
  const contactsMatched = matchingContacts(contacts, query, session)
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
