type AuditCursorPayload = { t: string; id: string };

export function encodeAuditCursor(createdAt: Date, id: string): string {
  const payload: AuditCursorPayload = { t: createdAt.toISOString(), id };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeAuditCursor(raw: string | undefined): AuditCursorPayload | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw.trim(), 'base64url').toString('utf8')) as AuditCursorPayload;
    if (!parsed?.t || !parsed?.id) return null;
    const at = new Date(parsed.t);
    if (Number.isNaN(at.getTime())) return null;
    return parsed;
  } catch {
    return null;
  }
}
