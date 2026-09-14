import { ReassignOwnerForm } from '@/components/party/reassign-owner-form';
import type { CommercialOwnerView } from '@/lib/party/customer-self-service';

type CommercialOwnerLineProps = {
  owner: CommercialOwnerView;
  partyId?: string;
  commercialAccountId?: string | null;
  currentOwnerMemberId?: string | null;
  /** Stored-owner note from the Cliente 360 composition. Not a guessed name. */
  note?: string | null;
};

export function CommercialOwnerLine({
  owner,
  partyId,
  commercialAccountId,
  currentOwnerMemberId = null,
  note = null,
}: CommercialOwnerLineProps) {
  return (
    <div className="mt-4">
      <p className="isalwa-section-label">Responsable comercial</p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{owner.label}</p>
      {note && note !== owner.label ? (
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{note}</p>
      ) : null}
      {owner.canReassign && partyId && commercialAccountId ? (
        <ReassignOwnerForm
          partyId={partyId}
          commercialAccountId={commercialAccountId}
          currentOwnerLabel={owner.label}
          currentOwnerMemberId={currentOwnerMemberId ?? undefined}
        />
      ) : null}
    </div>
  );
}
