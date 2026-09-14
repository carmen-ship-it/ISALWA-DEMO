export function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function storedText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  return value;
}

/** A row whose organization does not match the session looks like it was never returned. */
export function sameTenant<T extends { organizationId: string }>(
  organizationId: string,
  rows: readonly T[],
): T[] {
  return rows.filter((row) => row.organizationId === organizationId);
}
