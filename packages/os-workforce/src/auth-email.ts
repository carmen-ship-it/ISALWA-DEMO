/** Canonical auth email key. Provider and OS must match the same value. */
export function normalizeAuthEmail(email: string): string {
  return email.trim().toLowerCase();
}
