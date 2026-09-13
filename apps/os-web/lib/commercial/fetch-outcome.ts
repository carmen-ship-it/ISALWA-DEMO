import { OsApiError } from '@/lib/api/os-api-errors';

export type FetchOutcome<T> =
  | { status: 'ok'; data: T }
  | { status: 'unavailable' }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

export async function fetchCommercialSection<T>(fn: () => Promise<T>): Promise<FetchOutcome<T>> {
  try {
    return { status: 'ok', data: await fn() };
  } catch (err) {
    if (err instanceof OsApiError) {
      if (err.kind === 'unavailable') return { status: 'unavailable' };
      if (err.kind === 'forbidden' || err.kind === 'unauthorized') return { status: 'forbidden' };
      if (err.kind === 'not_found') return { status: 'error', message: 'No encontrado.' };
      return { status: 'error', message: err.message };
    }
    throw err;
  }
}
