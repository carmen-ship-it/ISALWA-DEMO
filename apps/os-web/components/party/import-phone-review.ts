import type { ImportPhoneProposedAction, ImportPhoneReviewList, ImportPhoneValueStatus } from '@isalwa/os-contracts';
import { OsApiError } from '@/lib/api/os-api-errors';
import { mapCommandError } from '@/lib/commercial/command-errors';

export const IMPORT_PHONE_REVIEW_PARAM = 'lote';

const STATUS_LABELS: Record<ImportPhoneValueStatus, string> = {
  accepted: 'Aceptado',
  invalid: 'Inválido',
  corrected: 'Corregido',
  omitted: 'Omitido',
};

const ACTION_LABELS: Record<ImportPhoneProposedAction, string> = {
  import: 'Se importa',
  keep_in_import_record_only: 'Solo queda en el registro de importación',
  correct_or_omit: 'Corregir u omitir',
  import_corrected: 'Se importa corregido',
  import_without_number: 'Importado sin este número',
};

export function importPhoneStatusLabel(status: string): string {
  return STATUS_LABELS[status as ImportPhoneValueStatus] ?? status;
}

export function importPhoneActionLabel(action: string): string {
  if (action === 'import_without_number') return 'Importado sin este número';
  return ACTION_LABELS[action as ImportPhoneProposedAction] ?? action;
}

/** Every count, including zero. Country says "predeterminado" when the batch used the default. */
export function importPhoneReviewSummary(review: ImportPhoneReviewList['summary'] & { country: string; countrySource: string }) {
  const country =
    review.countrySource === 'default' ? `${review.country} · predeterminado` : review.country;
  return {
    country,
    counts: [
      ['Aceptados', review.accepted],
      ['Inválidos', review.invalid],
      ['Corregidos', review.corrected],
      ['Omitidos', review.omitted],
      ['Extra no importados', review.extraNotImported],
      ['Filas por corregir', review.rowsNeedingCorrection],
    ] as const,
  };
}

export function buildResolveImportPhonePayload(input: {
  importBatchId: string;
  rowIndex: number;
  valueId: string;
  expectedVersion: number;
  decision: string;
  correctedNumber?: string | null;
  reason: string;
}): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  const reason = input.reason.trim();
  if (reason.length < 10 || reason.length > 500) {
    return { ok: false, error: 'Escriba el motivo (entre 10 y 500 caracteres).' };
  }
  if (input.decision !== 'correct' && input.decision !== 'omit') {
    return { ok: false, error: 'Elija corregir u omitir.' };
  }
  const correctedNumber = input.correctedNumber?.trim() ?? '';
  if (input.decision === 'correct' && !correctedNumber) {
    return { ok: false, error: 'Escriba el número corregido.' };
  }
  if (!input.importBatchId || !input.valueId || !Number.isInteger(input.rowIndex) || input.rowIndex < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 0) {
    return { ok: false, error: 'No se pudo guardar. Actualice la página e intente de nuevo.' };
  }
  return {
    ok: true,
    payload: {
      importBatchId: input.importBatchId,
      rowIndex: input.rowIndex,
      valueId: input.valueId,
      expectedVersion: input.expectedVersion,
      decision: input.decision,
      reason,
      ...(input.decision === 'correct' ? { correctedNumber } : {}),
    },
  };
}

/** Resolution and execute refusals. A corrected number that matches another row is a duplicate to review. */
export function importPhoneCommandMessage(err: unknown, fallback?: string | null): string {
  if (fallback === 'CORRECTED_PHONE_MATCH') return 'Posible duplicado para revisar.';
  if (err instanceof OsApiError) {
    if (err.code === 'IMPORT_PHONE_REVIEW_REQUIRED') return 'Resuelva los números pendientes antes de importar.';
    if (err.code === 'IMPORT_DRY_RUN_OUTDATED') return 'El ensayo quedó desactualizado. Vuelva a ensayar la importación.';
    if (err.code === 'CONFLICT') return 'La fila cambió o el lote ya no está abierto. Actualice antes de intentar de nuevo.';
  }
  return mapCommandError(err);
}
