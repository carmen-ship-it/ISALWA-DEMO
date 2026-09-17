import type { AuditLogItem } from '@/lib/audit/types';

export function formatAuditWhen(iso: string): string {
  return new Date(iso).toLocaleString('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function auditSnapshotHint(item: AuditLogItem): string | null {
  if (item.hasBefore && item.hasAfter) return 'Incluye estado anterior y posterior';
  if (item.hasAfter) return 'Incluye estado posterior';
  if (item.hasBefore) return 'Incluye estado anterior';
  return null;
}
