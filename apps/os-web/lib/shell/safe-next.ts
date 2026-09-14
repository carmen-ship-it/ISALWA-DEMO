/**
 * Post-login destination. Rejects protocol-relative and login loops.
 * Does not accept an organization or tenant override.
 */
export function safeInternalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.startsWith('/\\')) return null;
  if (trimmed.includes('\\') || trimmed.includes('\0') || trimmed.includes('://')) return null;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//') || decoded.includes('\\') || decoded.includes('://')) {
    return null;
  }
  if (decoded === '/login' || decoded.startsWith('/login/') || decoded.startsWith('/login?')) return null;
  return trimmed;
}
