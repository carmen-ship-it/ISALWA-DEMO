import { isTechnicalStaffMessage, OsApiError } from '@/lib/api/os-api-errors';

export const UNKNOWN_LOAD_MESSAGE =
  'No se pudo cargar la información. Actualice la página e intente de nuevo.';

export type QuerySurfaceError =
  | { kind: 'unauthorized' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' }
  | { kind: 'unknown'; message: string };

export function staffUnknownLoadMessage(message: string): string {
  if (!message.trim() || isTechnicalStaffMessage(message)) return UNKNOWN_LOAD_MESSAGE;
  return message;
}

export function classifyQueryError(err: unknown): QuerySurfaceError {
  if (err instanceof OsApiError) {
    if (err.kind === 'unauthorized') return { kind: 'unauthorized' };
    if (err.kind === 'forbidden') return { kind: 'forbidden' };
    if (err.kind === 'unavailable') return { kind: 'unavailable' };
    return { kind: 'unknown', message: staffUnknownLoadMessage(err.message) };
  }
  return { kind: 'unknown', message: 'Ocurrió un error al cargar la información.' };
}
