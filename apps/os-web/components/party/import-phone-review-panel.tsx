'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import type { ImportPhoneReviewList } from '@isalwa/os-contracts';
import { Button, EmptyPanel, SectionHeader } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { executeClientImportAction, resolveImportPhoneAction } from '@/lib/party/actions';
import {
  IMPORT_PHONE_REVIEW_PARAM,
  importPhoneActionLabel,
  importPhoneCommandMessage,
  importPhoneReviewSummary,
  importPhoneStatusLabel,
} from '@/components/party/import-phone-review';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type FormState = { error?: string; success?: string } | null;

export function ImportPhoneReviewPanel({
  review,
  error,
  batchId,
}: {
  review: ImportPhoneReviewList | null;
  error: string | null;
  batchId: string;
}) {
  const summary = review ? importPhoneReviewSummary({ ...review.summary, country: review.country, countrySource: review.countrySource }) : null;

  return (
    <section className="mt-6 space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4" aria-label="Revisión de teléfonos de importación">
      <SectionHeader kicker="Importación" title="Revisar teléfonos del lote" />
      <p className="text-xs text-[var(--isalwa-slate)]">
        Los números originales se muestran solo aquí. Una omisión queda importada sin este número.
      </p>
      <form method="get" action="/clientes" className="flex flex-wrap items-end gap-2">
        <label htmlFor="import-batch" className="isalwa-section-label">
          Lote
        </label>
        <input id="import-batch" name={IMPORT_PHONE_REVIEW_PARAM} defaultValue={batchId} required className={fieldClass} />
        <Button type="submit" variant="secondary" size="sm">
          Abrir revisión
        </Button>
      </form>
      {error ? <EmptyPanel compact title="No se pudo abrir la revisión" description={error} /> : null}
      {summary ? (
        <div className="space-y-2 text-sm text-[var(--isalwa-kiln)]">
          <p>País: {summary.country}</p>
          <ul className="m-0 list-none p-0 text-[var(--isalwa-slate)]">
            {summary.counts.map(([label, count]) => (
              <li key={label}>
                {label}: {count}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {review
        ? review.rows.map((row) => (
            <div key={row.rowIndex} className="space-y-2 rounded-[var(--isalwa-radius-control)] bg-white p-3 text-sm">
              <p className="font-medium text-[var(--isalwa-kiln)]">
                Fila {row.rowIndex}
                {row.needsCorrection ? ' · necesita corrección' : ''}
              </p>
              {row.celularOriginal ? <p className="text-[var(--isalwa-slate)]">Celular original: {row.celularOriginal}</p> : null}
              {row.telefonoOriginal ? <p className="text-[var(--isalwa-slate)]">Teléfono original: {row.telefonoOriginal}</p> : null}
              <ul className="m-0 list-none space-y-3 p-0">
                {row.values.map((value) => (
                  <li key={value.valueId}>
                    <p className="text-[var(--isalwa-slate)]">
                      {value.field === 'celular' ? 'Celular' : 'Teléfono'} · {importPhoneStatusLabel(value.status)} ·{' '}
                      {importPhoneActionLabel(value.proposedAction)}
                    </p>
                    <p className="text-xs text-[var(--isalwa-slate)]">Original: {value.original}</p>
                    {value.proposedAction === 'correct_or_omit' || value.status === 'invalid' ? (
                      <ResolveValueForm
                        importBatchId={review.importBatchId}
                        rowIndex={row.rowIndex}
                        valueId={value.valueId}
                        expectedVersion={row.version}
                      />
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))
        : null}
      {review ? <ExecuteImportForm importBatchId={review.importBatchId} /> : null}
    </section>
  );
}

function ResolveValueForm({
  importBatchId,
  rowIndex,
  valueId,
  expectedVersion,
}: {
  importBatchId: string;
  rowIndex: number;
  valueId: string;
  expectedVersion: number;
}) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: FormState, formData: FormData) => {
    const result = await resolveImportPhoneAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    const duplicate = importPhoneCommandMessage(null, String(result.data?.errorCode ?? ''));
    if (formData.get('decision') === 'omit') return { success: 'Importado sin este número.' };
    if (result.data?.errorCode === 'CORRECTED_PHONE_MATCH') return { success: duplicate };
    return { success: 'Decisión registrada.' };
  }, null);
  const prefix = `import-${rowIndex}-${valueId}`;

  return (
    <form action={action} className="mt-2 space-y-2">
      <FormFeedback error={state?.error} success={state?.success} />
      <input type="hidden" name="importBatchId" value={importBatchId} />
      <input type="hidden" name="rowIndex" value={String(rowIndex)} />
      <input type="hidden" name="valueId" value={valueId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <label htmlFor={`${prefix}-decision`} className="isalwa-section-label">
        Decisión
      </label>
      <select id={`${prefix}-decision`} name="decision" required defaultValue="" className={fieldClass}>
        <option value="" disabled>
          Elija
        </option>
        <option value="correct">Corregir</option>
        <option value="omit">Omitir este número</option>
      </select>
      <label htmlFor={`${prefix}-number`} className="isalwa-section-label">
        Número corregido
      </label>
      <input id={`${prefix}-number`} name="correctedNumber" className={fieldClass} />
      <label htmlFor={`${prefix}-reason`} className="isalwa-section-label">
        Motivo
      </label>
      <textarea id={`${prefix}-reason`} name="reason" required minLength={10} maxLength={500} rows={2} className={fieldClass} />
      <CommandSubmitButton label="Guardar decisión" variant="secondary" />
    </form>
  );
}

function ExecuteImportForm({ importBatchId }: { importBatchId: string }) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: FormState, formData: FormData) => {
    const result = await executeClientImportAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Importación ejecutada.' };
  }, null);
  return (
    <form action={action} className="space-y-2">
      <FormFeedback error={state?.error} success={state?.success} />
      <input type="hidden" name="importBatchId" value={importBatchId} />
      <CommandSubmitButton label="Ejecutar importación" variant="secondary" />
    </form>
  );
}
