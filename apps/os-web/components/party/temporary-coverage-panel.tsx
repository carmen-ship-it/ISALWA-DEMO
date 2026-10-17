'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import {
  grantCustomerCoverageAction,
  revokeCustomerCoverageAction,
} from '@/lib/commercial/actions';
import { coverageActionChoices, formatCoverageActions } from '@/lib/commercial/coverage-actions';

export type ActiveCoverageDisplay = {
  grantId: string;
  actingAdvisorMemberId: string;
  actingAdvisorLabel: string;
  assignedByLabel: string | null;
  startsAtLabel: string;
  note: string | null;
  coveredActions?: string[];
};

type TemporaryCoveragePanelProps = {
  partyId: string;
  commercialAccountId: string;
  canonicalOwnerLabel: string;
  canonicalOwnerMemberId: string;
  canManageCoverage: boolean;
  activeCoverage: ActiveCoverageDisplay | null;
  /** From the server; without it only "continuar oportunidades y cotizaciones" is offered. */
  grantableActions?: string[];
};

export function TemporaryCoveragePanel({
  partyId,
  commercialAccountId,
  canonicalOwnerLabel,
  canonicalOwnerMemberId,
  canManageCoverage,
  activeCoverage,
  grantableActions,
}: TemporaryCoveragePanelProps) {
  const choices = coverageActionChoices(grantableActions);
  const router = useRouter();
  const [grantState, grantAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await grantCustomerCoverageAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Apoyo temporal asignado. El responsable canónico no cambia.' };
      }
      return { error: result.error };
    },
    null,
  );
  const [revokeState, revokeAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await revokeCustomerCoverageAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Apoyo temporal retirado.' };
      }
      return { error: result.error };
    },
    null,
  );

  if (!canManageCoverage && !activeCoverage) return null;

  return (
    <section className="mt-4 space-y-3 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[var(--isalwa-slate)]">
        Apoyo temporal
      </h3>
      <p className="text-sm text-[var(--isalwa-slate)]">
        Responsable canónico: <span className="text-[var(--isalwa-kiln)]">{canonicalOwnerLabel}</span>
      </p>
      <p className="text-xs text-[var(--isalwa-slate)]">
        El apoyo no cambia el responsable. Solo cubre las acciones elegidas, y quien apoya necesita
        además su propio permiso para cada una.
      </p>

      {activeCoverage ? (
        <div className="space-y-2 text-sm text-[var(--isalwa-kiln)]">
          <p>
            Apoyo activo: <strong>{activeCoverage.actingAdvisorLabel}</strong>
          </p>
          <p className="text-[var(--isalwa-slate)]">
            Asignado{activeCoverage.assignedByLabel ? ` por ${activeCoverage.assignedByLabel}` : ''} ·{' '}
            {activeCoverage.startsAtLabel}
          </p>
          <p className="text-[var(--isalwa-slate)]" data-coverage-actions="active">
            Cubre: {formatCoverageActions(activeCoverage.coveredActions)}
          </p>
          {activeCoverage.note ? (
            <p className="text-[var(--isalwa-slate)]">Nota: {activeCoverage.note}</p>
          ) : null}
          {canManageCoverage ? (
            <form action={revokeAction} className="space-y-2">
              <input type="hidden" name="partyId" value={partyId} />
              <input type="hidden" name="grantId" value={activeCoverage.grantId} />
              <FormFeedback error={revokeState?.error} success={revokeState?.success} />
              <CommandSubmitButton label="Quitar apoyo temporal" variant="secondary" />
            </form>
          ) : null}
        </div>
      ) : canManageCoverage ? (
        <form action={grantAction} className="space-y-3">
          <input type="hidden" name="partyId" value={partyId} />
          <input type="hidden" name="commercialAccountId" value={commercialAccountId} />
          <div>
            <label htmlFor="coverage-helper" className="block text-sm text-[var(--isalwa-slate)]">
              Quién apoya temporalmente
            </label>
            <ServerMemberTypeahead
              id="coverage-helper"
              name="actingAdvisorMemberId"
              required
              excludeMemberId={canonicalOwnerMemberId}
              placeholder="Buscar miembro activo de la empresa"
            />
          </div>
          <fieldset>
            <legend className="block text-sm text-[var(--isalwa-slate)]">Qué cubre el apoyo</legend>
            <div className="mt-1 space-y-2">
              {choices.map((choice) => (
                <label key={choice.action} className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
                  <input
                    type="checkbox"
                    name="coveredActions"
                    value={choice.action}
                    defaultChecked={choice.action === 'commercial.work'}
                    className="mt-1"
                  />
                  <span>
                    {choice.label}
                    <span className="block text-xs text-[var(--isalwa-slate)]">{choice.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="coverage-note" className="block text-sm text-[var(--isalwa-slate)]">
              Motivo (opcional)
            </label>
            <textarea
              id="coverage-note"
              name="note"
              rows={2}
              maxLength={2000}
              className="mt-1 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)]"
            />
          </div>
          <FormFeedback error={grantState?.error} success={grantState?.success} />
          <CommandSubmitButton label="Asignar apoyo temporal" variant="secondary" />
        </form>
      ) : null}
    </section>
  );
}
