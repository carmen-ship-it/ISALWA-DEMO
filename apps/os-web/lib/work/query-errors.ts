import { OsApiError } from '@/lib/api/os-api-errors';

export type QuerySurfaceError =
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'unknown'; message: string };

export function classifyQueryError(err: unknown): QuerySurfaceError {
  if (err instanceof OsApiError) {
    if (err.kind === 'unauthorized') return { kind: 'unauthorized' };
    if (err.kind === 'forbidden') return { kind: 'forbidden' };
    if (err.kind === 'unavailable') return { kind: 'unavailable' };
    return { kind: 'unknown', message: err.message };
  }
  return { kind: 'unknown', message: 'Ocurrió un error al cargar la información.' };
}
