'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { reassignCommercialAccountOwnerAction } from '@/lib/commercial/actions';
import { guidanceForReassignOwner } from '@/lib/guidance/select';

type ReassignOwnerFormProps = {
  partyId: string;
  commercialAccountId: string;
  currentOwnerLabel: string;
  currentOwnerMemberId?: string;
};

export function ReassignOwnerForm({
  partyId,
  commercialAccountId,
  currentOwnerLabel,
  currentOwnerMemberId,
}: ReassignOwnerFormProps) {
  const router = useRouter();
  const [state, action] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await reassignCommercialAccountOwnerAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Responsable actualizado. Hay un solo responsable canónico.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="commercialAccountId" value={commercialAccountId} />
      <GuidanceNotes notes={guidanceForReassignOwner({ currentOwnerLabel })} />
      <p className="text-sm text-[var(--isalwa-slate)]">Responsable actual: {currentOwnerLabel}</p>
      <div>
        <label htmlFor="reassign-owner" className="block text-sm text-[var(--isalwa-slate)]">
          Nuevo responsable
        </label>
        <ServerMemberTypeahead
          id="reassign-owner"
          name="ownerMemberId"
          required
          excludeMemberId={currentOwnerMemberId}
          placeholder="Buscar un miembro activo"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
        <input type="checkbox" name="confirmed" value="yes" required className="mt-1" />
        Confirmo el cambio de responsable
      </label>
      <FormFeedback error={state?.error} success={state?.success} />
      <CommandSubmitButton label="Cambiar responsable" variant="secondary" />
    </form>
  );
}
