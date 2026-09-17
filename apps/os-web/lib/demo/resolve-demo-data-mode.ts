/**
 * Server helpers for Demo / Datos reales filtering.
 *
 * Precedence (deterministic):
 * 1. Explicit ?datos=demo  → SYNTH (demo)
 * 2. Explicit ?datos=real  → REAL
 * 3. Else cookie from owner Demo toggle (default real)
 *
 * When an explicit supported datos= is present, callers should also sync the
 * cookie (middleware / OwnerDemoProvider) so sidebar nav keeps the chosen mode.
 */

import { cookies } from 'next/headers';
import {
  DEMO_DATA_MODE_COOKIE,
  parseDemoDataMode,
  type DemoDataMode,
} from '@/lib/demo/owner-demo-identity';

function paramOne(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Resolve effective data mode from search params + cookie. */
export async function resolveDemoDataMode(
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>,
): Promise<DemoDataMode> {
  const params = searchParams ? await searchParams : {};
  const datos = paramOne(params.datos)?.trim().toLowerCase();
  if (datos === 'demo') return 'demo';
  if (datos === 'real') return 'real';
  try {
    const jar = await cookies();
    return parseDemoDataMode(jar.get(DEMO_DATA_MODE_COOKIE)?.value);
  } catch {
    return 'real';
  }
}

/** Pure helper for tests — same precedence without Next cookies(). */
export function resolveDemoDataModeFromParts(input: {
  datos?: string | null;
  cookie?: string | null;
}): DemoDataMode {
  const datos = input.datos?.trim().toLowerCase();
  if (datos === 'demo') return 'demo';
  if (datos === 'real') return 'real';
  return parseDemoDataMode(input.cookie);
}
