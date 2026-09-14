import { ReassignOwnerForm } from '@/components/party/reassign-owner-form';
import type { ActiveMemberOption } from '@/lib/commercial/types';
import type { CommercialOwnerView } from '@/lib/party/customer-self-service';

type CommercialOwnerLineProps = {
  owner: CommercialOwnerView;
  partyId?: string;
  commercialAccountId?: string | null;
  members?: ActiveMemberOption[];
  /** Stored-owner note from the Cliente 360 composition. Not a guessed name. */
  note?: string | null;
};

export function CommercialOwnerLine({
  owner,
  partyId,
  commercialAccountId,
  members = [],
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
          members={members}
        />
      ) : null}
    </div>
  );
}
