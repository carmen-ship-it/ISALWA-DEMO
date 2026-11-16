'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { SectionHeader } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { validateClientImportTextAction } from '@/lib/party/actions';
import { submittedValues, usePreservedForm, type PreservedFormState } from '@/lib/commercial/use-preserved-form';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 font-mono text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type State = PreservedFormState;

/**
 * Steward-only: paste the documented customer-section rows, validate as a batch, then open phone review.
 * Not a binary spreadsheet parser; ?lote= alone is not presented as complete file import.
 */
export function ImportBatchPastePanel() {
  const router = useRouter();
  const [state, formAction] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await validateClientImportTextAction(formData);
    if (result.ok && result.redirectTo) {
      router.push(result.redirectTo);
      router.refresh();
      return { success: 'Lote validado. Revise los teléfonos antes de confirmar la importación.' };
    }
    return {
      error: result.ok ? 'No se pudo abrir el lote.' : result.error,
      values: submittedValues(formData),
    };
  }, null);
  const formRef = usePreservedForm(state);

  return (
    <details className="mt-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">
        Preparar lote de importación (texto)
      </summary>
      <div className="mt-3 space-y-3">
        <SectionHeader kicker="Importación" title="Validar filas de clientes" />
        <p className="text-sm text-[var(--isalwa-slate)]">
          Una fila por cliente: nombre comercial, nombre, apellido, celular opcional, teléfono opcional.
          Separadores: coma, punto y coma o tabulador. Después de validar se abre la revisión de
          teléfonos del lote; la ejecución sigue siendo un paso aparte.
        </p>
        <form ref={formRef} action={formAction} className="space-y-3">
          <FormFeedback error={state?.error} success={state?.success} />
          <label htmlFor="import-batch-text" className="isalwa-section-label">
            Filas
          </label>
          <textarea
            id="import-batch-text"
            name="batchText"
            rows={6}
            required
            className={fieldClass}
            placeholder={'commercialName,givenName,familyName,celular\nFerretería Centro,Ana,Pérez,70011001'}
            defaultValue={state?.values?.find(([name]) => name === 'batchText')?.[1]}
          />
          <CommandSubmitButton label="Validar lote" pendingLabel="Validando…" />
        </form>
      </div>
    </details>
  );
}
