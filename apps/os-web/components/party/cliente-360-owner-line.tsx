import type { CommercialOwnerView } from '@/lib/party/customer-self-service';

type Cliente360OwnerLineProps = {
  owner: CommercialOwnerView;
  note?: string | null;
};

/** Read-only owner line for Cliente 360 resumen. Reassignment lives in the actions menu drawer. */
export function Cliente360OwnerLine({ owner, note = null }: Cliente360OwnerLineProps) {
  return (
    <div className="mt-4">
      <p className="isalwa-section-label">Responsable comercial</p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{owner.label}</p>
      {note && note !== owner.label ? (
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{note}</p>
      ) : null}
    </div>
  );
}
