/**
 * CT3-E owner demo identity helpers — DEMO prefix / notes tag / list filtering.
 */

export const DEMO_FICTITIOUS_BADGE = 'DEMO · DATOS FICTICIOS' as const;
export const DEMO_DATA_MODE_STORAGE_KEY = 'isalwa.os-web.demo-data-mode.v1' as const;
/** Cookie keeps Demo mode across sidebar navigations (SSR-safe). */
export const DEMO_DATA_MODE_COOKIE = 'isalwa-demo-data-mode' as const;

export type DemoDataMode = 'real' | 'demo';

export const DEMO_CLIENT_DISPLAY_NAMES = [
  'DEMO MADERAS ORIENTE',
  'DEMO CONSTRUCTORA ANDINA',
  'DEMO PROYECTOS DEL SUR',
  'DEMO HOTEL CENTRAL',
  'DEMO FERRETERÍA NORTE',
] as const;

export function isDemoDisplayName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) return false;
  return trimmed.toUpperCase().startsWith('DEMO ');
}

export function isDemoNotesTagged(notes: string | null | undefined): boolean {
  return (notes ?? '').includes('[is_demo]');
}

export function isDemoRecord(input: {
  displayName?: string | null;
  title?: string | null;
  notes?: string | null;
  quoteNumber?: string | null;
}): boolean {
  if (isDemoDisplayName(input.displayName)) return true;
  if (isDemoDisplayName(input.title)) return true;
  if (isDemoNotesTagged(input.notes)) return true;
  if ((input.quoteNumber ?? '').toUpperCase().startsWith('Q-DEMO')) return true;
  return false;
}

export function parseDemoDataMode(raw: string | null | undefined): DemoDataMode {
  return raw === 'demo' ? 'demo' : 'real';
}

export function loadDemoDataMode(storage: Pick<Storage, 'getItem'> | null | undefined): DemoDataMode {
  if (!storage) return 'real';
  try {
    return parseDemoDataMode(storage.getItem(DEMO_DATA_MODE_STORAGE_KEY));
  } catch {
    return 'real';
  }
}

export function saveDemoDataMode(
  storage: Pick<Storage, 'setItem'>,
  mode: DemoDataMode,
): void {
  storage.setItem(DEMO_DATA_MODE_STORAGE_KEY, mode);
  if (typeof document !== 'undefined') {
    const maxAge = 60 * 60 * 24 * 30;
    document.cookie = `${DEMO_DATA_MODE_COOKIE}=${mode}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }
}

/** Keep real and demo counts separate — never mix. */
export function filterByDemoDataMode<T>(
  items: readonly T[],
  mode: DemoDataMode,
  isDemo: (item: T) => boolean,
): T[] {
  return items.filter((item) => (mode === 'demo' ? isDemo(item) : !isDemo(item)));
}
