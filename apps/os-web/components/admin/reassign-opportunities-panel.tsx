'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import type { OpportunitySummaryReadModel } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { opportunityHref } from '@/lib/commercial/navigation';
import { reassignOpportunitiesAction } from '@/lib/commercial/reassign-opportunities-action';

export type ReassignOpportunityItem = Pick<
  OpportunitySummaryReadModel,
  'opportunityId' | 'partyId' | 'title' | 'status'
>;

type ReassignOpportunitiesPanelProps = {
  fromMemberId: string;
  fromMemberName: string;
  items: readonly ReassignOpportunityItem[];
};

const initial = { error: null as string | null, success: null as string | null };

export function ReassignOpportunitiesPanel({
  fromMemberId,
  fromMemberName,
  items,
}: ReassignOpportunitiesPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.opportunityId, true])),
  );
  const [confirm, setConfirm] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => selected[item.opportunityId]),
    [items, selected],
  );
  const selectedCount = selectedItems.length;

  const [state, formAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await reassignOpportunitiesAction(formData);
    if (result.ok) {
      setConfirm(false);
      router.refresh();
      const n = result.reassignedCount;
      return {
        error: null,
        success:
          n === 1
            ? 'Se reasignó 1 oportunidad abierta.'
            : `Se reasignaron ${n} oportunidades abiertas.`,
      };
    }
    return { error: result.error, success: null };
  }, initial);

  if (items.length === 0) {
    return (
      <p className="mt-4 text-sm text-[var(--isalwa-slate)]">
        No hay oportunidades abiertas a nombre de esta persona.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Oportunidades abiertas</p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Reasigne las oportunidades abiertas de {fromMemberName} antes de finalizar la relación.
      </p>

      <ul className="mt-4 space-y-2">
        {items.map((item) => {
          const checked = Boolean(selected[item.opportunityId]);
          return (
            <li
              key={item.opportunityId}
              className="flex flex-col gap-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <label className="flex min-w-0 flex-1 items-start gap-3 text-sm text-[var(--isalwa-kiln)]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked}
                  onChange={() =>
                    setSelected((prev) => ({
                      ...prev,
                      [item.opportunityId]: !prev[item.opportunityId],
                    }))
                  }
                />
                <span className="min-w-0">
                  <span className="block font-medium">{item.title}</span>
                  <Link
                    href={opportunityHref(item.partyId, item.opportunityId)}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Ver oportunidad
                  </Link>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="fromMemberId" value={fromMemberId} />
        {selectedItems.map((item) => (
          <span key={item.opportunityId}>
            <input type="hidden" name="opportunityId" value={item.opportunityId} />
            <input type="hidden" name="partyId" value={item.partyId} />
          </span>
        ))}

        <div>
          <label htmlFor="reassign-opp-target" className="isalwa-section-label">
            Nuevo responsable
          </label>
          <ServerMemberTypeahead
            id="reassign-opp-target"
            name="ownerMemberId"
            required
            mode="admin"
            excludeMemberId={fromMemberId}
            placeholder="Buscar a quién reasignar"
          />
        </div>

        {selectedCount > 0 ? (
          <label className="flex items-start gap-2 text-sm text-[var(--isalwa-slate)]">
            <input
              type="checkbox"
              name="confirmed"
              value="yes"
              checked={confirm}
              onChange={() => setConfirm((v) => !v)}
            />
            <span>
              Confirmo reasignar {selectedCount === 1 ? '1 oportunidad' : `${selectedCount} oportunidades`}{' '}
              a la persona seleccionada. El historial se conserva.
            </span>
          </label>
        ) : (
          <p className="text-sm text-[var(--isalwa-slate)]">Seleccione al menos una oportunidad.</p>
        )}

        <FormFeedback error={state.error} success={state.success} />
        <CommandSubmitButton
          label="Reasignar oportunidades"
          disabled={selectedCount === 0 || !confirm}
        />
      </form>
    </div>
  );
}
