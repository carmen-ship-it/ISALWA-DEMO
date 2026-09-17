/**
 * Server helpers for Demo / Datos reales filtering.
 * Cookie keeps mode across nav when ?datos= is absent.
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

/** Prefer explicit ?datos=demo, else cookie set by the owner Demo toggle. */
export async function resolveDemoDataMode(
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>,
): Promise<DemoDataMode> {
  const params = searchParams ? await searchParams : {};
  if (paramOne(params.datos) === 'demo') return 'demo';
  try {
    const jar = await cookies();
    return parseDemoDataMode(jar.get(DEMO_DATA_MODE_COOKIE)?.value);
  } catch {
    return 'real';
  }
}
