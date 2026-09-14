import { ReassignOwnerForm } from '@/components/party/reassign-owner-form';
import type { ActiveMemberOption } from '@/lib/commercial/types';
import type { CommercialOwnerView } from '@/lib/party/customer-self-service';

type CommercialOwnerLineProps = {
  owner: CommercialOwnerView;
  partyId?: string;
  commercialAccountId?: string | null;
  members?: ActiveMemberOption[];
};

export function CommercialOwnerLine({
  owner,
  partyId,
  commercialAccountId,
  members = [],
}: CommercialOwnerLineProps) {
  return (
    <div className="mt-4">
      <p className="isalwa-section-label">Responsable comercial</p>
      <p className="mt-1 text-[var(--isalwa-kiln)]">{owner.label}</p>
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
