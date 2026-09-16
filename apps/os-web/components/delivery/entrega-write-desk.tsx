'use client';

import { useState, useTransition } from 'react';
import { Button, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import { SearchableSelect, type SearchableOption } from '@/components/experience/searchable-select';
import {
  createNotaDeEntregaAction,
  recordEntregaAction,
  recordSalidaAction,
} from '@/lib/delivery/actions';

export type EntregaWriteDeskProps = {
  orderOptions: readonly SearchableOption[];
};

/**
 * Minimal human write surface for Crear Nota / Salida / Entrega.
 * Pedido is selected — not typed as an opaque ID. No auto-delivery from order.
 * Provisional NE-PILOT refs are stamped by the API when no external print is given.
 */
export function EntregaWriteDesk({ orderOptions }: EntregaWriteDeskProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfNoteId, setPdfNoteId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(
    label: string,
    action: (formData: FormData) => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>,
    fields: Record<string, string>,
  ) {
    setNotice(null);
    setError(null);
    setPdfNoteId(null);
    if (!orderId) {
      setError('Seleccione un pedido.');
      return;
    }
    const formData = new FormData();
    formData.set('orderId', orderId);
    for (const [key, value] of Object.entries(fields)) {
      if (value.trim()) formData.set(key, value.trim());
    }
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error ?? 'No se pudo guardar.');
        return;
      }
      const noteId =
        typeof result.data?.deliveryNoteId === 'string' ? result.data.deliveryNoteId : null;
      if (noteId) setPdfNoteId(noteId);
      setNotice(label);
    });
  }

  if (orderOptions.length === 0) {
    return null;
  }

  return (
    <PageSection card className="mb-6 p-6 md:p-8" aria-label="Registrar entrega">
      <SectionHeader
        kicker="Registro"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Crear nota, salida y entrega
          </h2>
        }
      />
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Elija el pedido ya registrado. Las líneas se heredan del pedido. Un pedido no emite la nota
        solo. La referencia NE-PILOT es provisional; no es un número fiscal.
      </p>

      <div className="mt-6 max-w-lg">
        <SearchableSelect
          id="entrega-pedido"
          label="Pedido"
          options={orderOptions}
          value={orderId}
          onChange={setOrderId}
          placeholder="Buscar pedido"
          noMatchLabel="Ningún pedido coincide"
          clearLabel="Quitar pedido"
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <WriteCard
          title="Crear nota"
          description="Registra la nota de entrega interna con las líneas del pedido. Si no hay número impreso externo, se usa NE-PILOT."
          disabled={pending || !orderId}
          onSubmit={(fields) =>
            run('Nota de entrega registrada.', createNotaDeEntregaAction, fields)
          }
          fields={[
            { name: 'deliveredAt', label: 'Fecha de entrega', type: 'datetime-local' },
            { name: 'deliveredTo', label: 'Recibió (opcional)', type: 'text' },
            { name: 'externalDocumentNumber', label: 'Nº impreso externo (opcional)', type: 'text' },
            { name: 'notes', label: 'Notas', type: 'text' },
          ]}
          submitLabel="Crear nota"
        />
        <WriteCard
          title="Registrar salida"
          description="La mercadería salió del almacén. No es la nota de entrega al cliente."
          disabled={pending || !orderId}
          onSubmit={(fields) => run('Salida de almacén registrada.', recordSalidaAction, fields)}
          fields={[
            { name: 'exitedAt', label: 'Fecha de salida', type: 'datetime-local' },
            { name: 'notes', label: 'Notas', type: 'text' },
          ]}
          submitLabel="Registrar salida"
        />
        <WriteCard
          title="Registrar entrega"
          description="Confirma la llegada al cliente. Debe indicar quién recibió."
          disabled={pending || !orderId}
          onSubmit={(fields) => run('Entrega registrada.', recordEntregaAction, fields)}
          fields={[
            { name: 'deliveredAt', label: 'Fecha de entrega', type: 'datetime-local' },
            { name: 'deliveredTo', label: 'Recibió', type: 'text', required: true },
            { name: 'notes', label: 'Notas', type: 'text' },
          ]}
          submitLabel="Registrar entrega"
        />
      </div>

      {error ? (
        <p className="mt-6 text-sm text-[var(--isalwa-clay)]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusPill tone="success">{notice}</StatusPill>
          {pdfNoteId ? (
            <a
              className="text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-2 hover:underline"
              href={`/api/delivery-notes/${encodeURIComponent(pdfNoteId)}/pdf`}
            >
              Descargar PDF de la nota
            </a>
          ) : null}
        </div>
      ) : null}
    </PageSection>
  );
}

function WriteCard(props: {
  title: string;
  description: string;
  disabled: boolean;
  submitLabel: string;
  fields: Array<{ name: string; label: string; type: string; required?: boolean }>;
  onSubmit: (fields: Record<string, string>) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-4 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit(values);
      }}
    >
      <div>
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{props.title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{props.description}</p>
      </div>
      {props.fields.map((field) => (
        <label key={field.name} className="block text-sm text-[var(--isalwa-kiln)]">
          <span className="isalwa-section-label">{field.label}</span>
          <input
            className="mt-2 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
            name={field.name}
            type={field.type}
            required={field.required}
            value={values[field.name] ?? ''}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
            }
          />
        </label>
      ))}
      <Button type="submit" disabled={props.disabled}>
        {props.submitLabel}
      </Button>
    </form>
  );
}
