/** Pretty-print audit JSON snapshots for read-only drawer display. */

export function formatAuditSnapshot(value: unknown): string {
  if (value == null) return '—';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function snapshotSectionTitle(kind: 'before' | 'after'): string {
  return kind === 'before' ? 'Estado anterior' : 'Estado posterior';
}
