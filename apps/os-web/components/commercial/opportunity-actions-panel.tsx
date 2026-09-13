'use client';

import { useActionState } from 'react';
import { PageSection } from '@isalwa/ui';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import {
  assignOpportunityOwnerAction,
  changeOpportunityStageAction,
  closeOpportunityAction,
  updateOpportunityAction,
} from '@/lib/commercial/actions';
import { centavosToBobDisplay } from '@/lib/commercial/parse-money-input';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';

type MemberOption = { memberId: string; label: string };

type OpportunityActionsPanelProps = {
  partyId: string;
  opportunity: OpportunitySummaryReadModel;
  memberOptions: MemberOption[];
};

const initial = { error: null as string | null, success: null as string | null };

export function OpportunityActionsPanel({
  partyId,
  opportunity,
  memberOptions,
}: OpportunityActionsPanelProps) {
  const isOpen = opportunity.status === 'open';
  const currentAmount =
    opportunity.expectedValueCentavos != null
      ? centavosToBobDisplay(opportunity.expectedValueCentavos)
      : '';

  const [editState, editAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await updateOpportunityAction(formData);
    return result.ok
      ? { error: null, success: 'Oportunidad actualizada.' }
      : { error: result.error, success: null };
  }, initial);

  const [stageState, stageAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await changeOpportunityStageAction(formData);
    return result.ok
      ? { error: null, success: 'Etapa actualizada.' }
      : { error: result.error, success: null };
  }, initial);

  const [ownerState, ownerAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await assignOpportunityOwnerAction(formData);
    return result.ok
      ? { error: null, success: 'Responsable asignado.' }
      : { error: result.error, success: null };
  }, initial);

  const [closeState, closeAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await closeOpportunityAction(formData);
    return result.ok
      ? { error: null, success: 'Oportunidad cerrada.' }
      : { error: result.error, success: null };
  }, initial);

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Editar oportunidad</h2>
        <FormFeedback error={editState.error} success={editState.success} />
        <form action={editAction} className="mt-4 space-y-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="opportunityId" value={opportunity.opportunityId} />
          <div>
            <label htmlFor="edit-title" className="isalwa-section-label">
              Nombre
            </label>
            <input
              id="edit-title"
              name="title"
              required
              defaultValue={opportunity.title}
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="edit-amount" className="isalwa-section-label">
              Monto estimado (Bs.)
            </label>
            <input
              id="edit-amount"
              name="expectedValue"
              defaultValue={currentAmount}
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            />
          </div>
          <CommandSubmitButton label="Guardar cambios" variant="secondary" />
        </form>
      </PageSection>

      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Cambiar etapa</h2>
        <FormFeedback error={stageState.error} success={stageState.success} />
        <form action={stageAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="opportunityId" value={opportunity.opportunityId} />
          <div className="min-w-0 flex-1">
            <label htmlFor="stage-input" className="isalwa-section-label">
              Etapa
            </label>
            <input
              id="stage-input"
              name="stage"
              required
              defaultValue={opportunity.stage}
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
            />
          </div>
          <CommandSubmitButton label="Cambiar etapa" variant="secondary" />
        </form>
      </PageSection>

      {memberOptions.length > 0 ? (
        <PageSection card className="p-6">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Asignar responsable</h2>
          <FormFeedback error={ownerState.error} success={ownerState.success} />
          <form action={ownerAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="partyId" value={partyId} />
            <input type="hidden" name="opportunityId" value={opportunity.opportunityId} />
            <div className="min-w-0 flex-1">
              <label htmlFor="owner-select" className="isalwa-section-label">
                Responsable
              </label>
              <select
                id="owner-select"
                name="ownerMemberId"
                required
                defaultValue={opportunity.ownerMemberId}
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
              >
                {memberOptions.map((option) => (
                  <option key={option.memberId} value={option.memberId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <CommandSubmitButton label="Asignar responsable" variant="secondary" />
          </form>
        </PageSection>
      ) : null}

      <PageSection card className="p-6">
        <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Cerrar oportunidad</h2>
        <FormFeedback error={closeState.error} success={closeState.success} />
        <form action={closeAction} className="mt-4 space-y-4">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="opportunityId" value={opportunity.opportunityId} />
          <fieldset>
            <legend className="isalwa-section-label">Resultado</legend>
            <div className="mt-2 flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
                <input type="radio" name="outcome" value="won" required />
                Ganada
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
                <input type="radio" name="outcome" value="lost" required />
                Perdida
              </label>
            </div>
          </fieldset>
          <CommandSubmitButton label="Cerrar oportunidad" variant="danger" />
        </form>
      </PageSection>
    </div>
  );
}
