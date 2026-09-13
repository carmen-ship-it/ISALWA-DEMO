'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { PageSection } from '@isalwa/ui';
import { createOpportunityAction } from '@/lib/commercial/actions';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';

type MemberOption = { memberId: string; label: string };

type OpportunityCreateFormProps = {
  partyId: string;
  memberOptions: MemberOption[];
};

export function OpportunityCreateForm({ partyId, memberOptions }: OpportunityCreateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createOpportunityAction(formData);
      if (result.ok) {
        router.push(result.redirectTo);
        router.refresh();
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <PageSection card className="p-6">
      <FormFeedback error={state?.error} />
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="partyId" value={partyId} />

        <div>
          <label htmlFor="opp-title" className="isalwa-section-label">
            Nombre de la oportunidad
          </label>
          <input
            id="opp-title"
            name="title"
            required
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            placeholder="Ej. Ampliación planta 2026"
          />
        </div>

        <div>
          <label htmlFor="opp-stage" className="isalwa-section-label">
            Etapa
          </label>
          <input
            id="opp-stage"
            name="stage"
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            placeholder="Opcional"
          />
        </div>

        <div>
          <label htmlFor="opp-amount" className="isalwa-section-label">
            Monto estimado (Bs.)
          </label>
          <input
            id="opp-amount"
            name="expectedValue"
            inputMode="decimal"
            className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            placeholder="Opcional — ej. 125000,00"
          />
        </div>

        {memberOptions.length > 0 ? (
          <div>
            <label htmlFor="opp-owner" className="isalwa-section-label">
              Responsable
            </label>
            <select
              id="opp-owner"
              name="ownerMemberId"
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              defaultValue=""
            >
              <option value="">Asignarme a mí</option>
              {memberOptions.map((option) => (
                <option key={option.memberId} value={option.memberId}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <CommandSubmitButton label="Crear oportunidad" />
      </form>
    </PageSection>
  );
}
