'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { reassignCommercialAccountOwnerAction } from '@/lib/commercial/actions';
import type { ActiveMemberOption } from '@/lib/commercial/types';

type ReassignOwnerFormProps = {
  partyId: string;
  commercialAccountId: string;
  currentOwnerLabel: string;
  members: ActiveMemberOption[];
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function ReassignOwnerForm({
  partyId,
  commercialAccountId,
  currentOwnerLabel,
  members,
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
      <p className="text-sm text-[var(--isalwa-slate)]">Responsable actual: {currentOwnerLabel}</p>
      <label className="block text-sm text-[var(--isalwa-slate)]">
        Nuevo responsable
        <select className={fieldClass} name="ownerMemberId" required defaultValue="">
          <option value="" disabled>
            Seleccione un miembro activo
          </option>
          {members.map((member) => (
            <option key={member.memberId} value={member.memberId}>
              {member.displayName}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
        <input type="checkbox" name="confirmed" value="yes" required className="mt-1" />
        Confirmo el cambio de responsable
      </label>
      <FormFeedback error={state?.error} success={state?.success} />
      <CommandSubmitButton label="Cambiar responsable" variant="secondary" />
    </form>
  );
}
