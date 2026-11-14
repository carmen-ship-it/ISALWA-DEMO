'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import type { CustomerArchivePreview } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { deactivatePartyAction, reactivatePartyAction } from '@/lib/party/actions';
import {
  PARTY_ARCHIVE_REASON_LABELS,
  PAYMENTS_UNVERIFIED_LABEL,
  archiveObligationLines,
} from '@/lib/party/customer-self-service';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function CustomerArchivePanel({
  preview,
  canArchive,
  canReactivate,
}: {
  preview: CustomerArchivePreview | null;
  canArchive: boolean;
  canReactivate: boolean;
}) {
  if (!preview || (!canArchive && !canReactivate)) return null;
  const lines = archiveObligationLines(preview.obligations);
  return (
    <section className="mt-4 space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">Archivo</h3>
      <ul className="m-0 list-none p-0 text-sm text-[var(--isalwa-slate)]">
        {lines.map((line) => (
          <li key={line.kind}>
            {line.kind}: {line.count}
          </li>
        ))}
      </ul>
      <p className="text-sm text-[var(--isalwa-kiln)]">{PAYMENTS_UNVERIFIED_LABEL}</p>
      <p className="text-xs text-[var(--isalwa-slate)]">
        Archivar no borra el cliente, no cambia al responsable y no cancela cotizaciones ni oportunidades.
      </p>
      {preview.status === 'active' && canArchive ? (
        <ArchiveForm partyId={preview.partyId} expectedVersion={preview.version} blocked={preview.blocked} />
      ) : null}
      {preview.status !== 'active' && canReactivate ? (
        <ReactivateForm partyId={preview.partyId} expectedVersion={preview.version} />
      ) : null}
    </section>
  );
}

function ArchiveForm({ partyId, expectedVersion, blocked }: { partyId: string; expectedVersion: number; blocked: boolean }) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
    const result = await deactivatePartyAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Cliente archivado.' };
  }, null);
  return (
    <form action={action} className="space-y-2">
      {blocked ? <p className="text-sm text-[var(--isalwa-kiln)]">Hay obligaciones abiertas. Resuélvalas antes de archivar.</p> : null}
      <FormFeedback error={state?.error} success={state?.success} />
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <label htmlFor="archive-reason" className="isalwa-section-label">
        Motivo
      </label>
      <select id="archive-reason" name="reason" required defaultValue="" disabled={blocked} className={fieldClass}>
        <option value="" disabled>
          Elija el motivo
        </option>
        {Object.entries(PARTY_ARCHIVE_REASON_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label htmlFor="archive-note" className="isalwa-section-label">
        Detalle
      </label>
      <input id="archive-note" name="reasonNote" maxLength={500} disabled={blocked} placeholder="Obligatorio si elige Otro" className={fieldClass} />
      <CommandSubmitButton label="Archivar cliente" variant="secondary" disabled={blocked} />
    </form>
  );
}

function ReactivateForm({ partyId, expectedVersion }: { partyId: string; expectedVersion: number }) {
  const router = useRouter();
  const [state, action] = useActionState(async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
    const result = await reactivatePartyAction(formData);
    if (!result.ok) return { error: result.error };
    router.refresh();
    return { success: 'Cliente reactivado. No se restauran coberturas, precios ni consentimientos.' };
  }, null);
  return (
    <form action={action} className="space-y-2">
      <p className="text-xs text-[var(--isalwa-slate)]">
        Reactivar deja las coberturas, los precios y las preferencias de seguimiento como están.
      </p>
      <FormFeedback error={state?.error} success={state?.success} />
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="expectedVersion" value={String(expectedVersion)} />
      <label htmlFor="reactivate-note" className="isalwa-section-label">
        Motivo
      </label>
      <textarea id="reactivate-note" name="reasonNote" required minLength={10} maxLength={500} rows={2} className={fieldClass} />
      <CommandSubmitButton label="Reactivar cliente" variant="secondary" />
    </form>
  );
}
