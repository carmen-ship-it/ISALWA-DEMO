/**
 * Browser state left behind by the removed sample-data mode. Nothing reads
 * these values; they are only expired so stale browsers carry no leftovers.
 */
export const RETIRED_DATA_MODE_COOKIES = [
  'isalwa-demo-data-mode',
  'isalwa-owner-effective-company',
] as const;

export const RETIRED_DATA_MODE_STORAGE_KEY = 'isalwa.os-web.demo-data-mode.v1' as const;

type CookieReader = { has(name: string): boolean };
type CookieWriter = { delete(name: string): unknown };

export function expireRetiredDataModeCookies(request: CookieReader, response: CookieWriter): void {
  for (const name of RETIRED_DATA_MODE_COOKIES) {
    if (request.has(name)) response.delete(name);
  }
}

export function clearRetiredDataModeStorage(storage: Pick<Storage, 'removeItem'> | null | undefined): void {
  try {
    storage?.removeItem(RETIRED_DATA_MODE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (private mode); nothing reads the key anyway.
  }
}
