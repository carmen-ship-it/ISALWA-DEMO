import type { PartySummaryReadModel } from '@isalwa/os-contracts';
import { PARTY_ROLE_KEYS } from '@isalwa/os-contracts';

const ROLE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  supplier: 'Proveedor',
  vendor: 'Proveedor',
  distributor: 'Distribuidor',
  partner: 'Socio',
  contractor: 'Contratista',
  logistics_provider: 'Logística',
  financial_counterparty: 'Contraparte financiera',
};

export function formatPartyRole(roleKey: string): string {
  return ROLE_LABELS[roleKey] ?? roleKey;
}

export function formatPartyRoles(roleKeys: string[]): string[] {
  return [...new Set(roleKeys.map(formatPartyRole))];
}

export function formatPartyStatus(status: string): string {
  switch (status) {
    case 'active':
      return 'Activo';
    case 'inactive':
    case 'deactivated':
      return 'Inactivo';
    case 'merged':
      return 'Fusionado';
    default:
      return status;
  }
}

export function partyStatusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
    case 'deactivated':
      return 'neutral';
    case 'merged':
      return 'warning';
    default:
      return 'info';
  }
}

export function formatDuplicateStatus(status: PartySummaryReadModel['duplicateStatus']): string | null {
  switch (status) {
    case 'suggested':
      return 'Posible duplicado';
    case 'pending_merge':
      return 'Fusión pendiente';
    case 'none':
      return null;
    default:
      return null;
  }
}

export function formatCommercialAccountStatus(status: string | null | undefined): string | null {
  if (!status) return null;
  switch (status) {
    case 'active':
      return 'Cuenta comercial activa';
    case 'inactive':
      return 'Cuenta comercial inactiva';
    default:
      return `Cuenta comercial: ${status}`;
  }
}

export function formatPartyKind(kind: string): string {
  return kind === 'person' ? 'Persona' : 'Empresa';
}

export function contactDisplayName(givenName: string, familyName: string): string {
  return [givenName, familyName].filter(Boolean).join(' ').trim() || 'Contacto';
}

export function contactSummary(contacts: Array<{ givenName: string; familyName: string; email: string | null }>): string | null {
  if (contacts.length === 0) return null;
  const first = contacts[0];
  const name = contactDisplayName(first.givenName, first.familyName);
  if (contacts.length === 1) {
    return first.email ? `${name} · ${first.email}` : name;
  }
  return `${name} y ${contacts.length - 1} más`;
}

export const FILTERABLE_ROLE_KEYS = PARTY_ROLE_KEYS.filter((key) =>
  ['customer', 'supplier', 'vendor', 'distributor', 'partner'].includes(key),
);

export function multiRoleHint(roleKeys: string[]): string | null {
  const labels = formatPartyRoles(roleKeys);
  if (labels.length <= 1) return null;
  const extras = labels.slice(1);
  return `Esta empresa también es ${extras.join(', ').toLowerCase()}.`;
}
