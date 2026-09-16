'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useMemo, useState } from 'react';
import { PageSection } from '@isalwa/ui';
import type { WorkSummaryReadModel } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import { formatDueDate, formatWorkStatus } from '@/lib/work/labels';
import { workItemHref } from '@/lib/work/navigation';
import { reassignWorkAction } from '@/lib/work/reassign-work-action';

export type ReassignWorkPanelItem = Pick<
  WorkSummaryReadModel,
  'workItemId' | 'title' | 'status' | 'dueAt' | 'priority'
>;

type ReassignWorkPanelProps = {
  fromMemberId: string;
  fromMemberName: string;
  items: readonly ReassignWorkPanelItem[];
};

const initial = { error: null as string | null, success: null as string | null };

export function ReassignWorkPanel({ fromMemberId, fromMemberName, items }: ReassignWorkPanelProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.workItemId, true])),
  );
  const [confirm, setConfirm] = useState(false);

  const selectedIds = useMemo(
    () => items.filter((item) => selected[item.workItemId]).map((item) => item.workItemId),
    [items, selected],
  );
  const selectedCount = selectedIds.length;

  const [state, formAction] = useActionState(async (_prev: typeof initial, formData: FormData) => {
    const result = await reassignWorkAction(formData);
    if (result.ok) {
      setConfirm(false);
      router.refresh();
      const n = result.reassignedCount;
      return {
        error: null,
        success:
          n === 1
            ? 'Se reasignó 1 trabajo. El historial se conservó.'
            : `Se reasignaron ${n} trabajos. El historial se conservó.`,
      };
    }
    return { error: result.error, success: null };
  }, initial);

  return (
    <PageSection card className="p-8" id="trabajo-activo">
      <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Trabajo activo</h2>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Trabajo abierto a nombre de {fromMemberName}. Reasígnelo antes de finalizar la relación. El
        historial de cada trabajo se conserva.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--isalwa-slate)]">
          No hay trabajo abierto a nombre de esta persona.
        </p>
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {items.map((item) => {
              const checked = Boolean(selected[item.workItemId]);
              return (
                <li
                  key={item.workItemId}
                  className="flex flex-col gap-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
                >
                  <label className="flex min-w-0 flex-1 items-start gap-3 text-sm text-[var(--isalwa-kiln)]">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={(event) => {
                        setSelected((prev) => ({
                          ...prev,
                          [item.workItemId]: event.target.checked,
                        }));
                        setConfirm(false);
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{item.title}</span>
                      <span className="mt-0.5 block text-[var(--isalwa-slate)]">
                        {formatWorkStatus(item.status)} · Vence {formatDueDate(item.dueAt)}
                      </span>
                    </span>
                  </label>
                  <Link
                    href={workItemHref(item.workItemId)}
                    className="shrink-0 text-sm font-medium text-[var(--isalwa-glaze)] hover:underline"
                  >
                    Ver detalle
                  </Link>
                </li>
              );
            })}
          </ul>

          <form action={formAction} className="mt-6 space-y-4">
            <input type="hidden" name="fromMemberId" value={fromMemberId} />
            {selectedIds.map((id) => (
              <input key={id} type="hidden" name="workItemId" value={id} />
            ))}

            <div>
              <label htmlFor="reassign-work-target" className="isalwa-section-label">
                Nueva persona responsable
              </label>
              <ServerMemberTypeahead
                id="reassign-work-target"
                name="newOwnerMemberId"
                required
                mode="admin"
                excludeMemberId={fromMemberId}
                placeholder="Buscar a quién reasignar"
              />
            </div>

            <div>
              <label htmlFor="reassign-work-reason" className="isalwa-section-label">
                Motivo (opcional)
              </label>
              <input
                id="reassign-work-reason"
                name="reason"
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
              />
            </div>

            <p className="text-sm text-[var(--isalwa-slate)]">
              {selectedCount === 0
                ? 'Seleccione al menos un trabajo.'
                : selectedCount === 1
                  ? `Se reasignará 1 trabajo de ${fromMemberName} a la persona seleccionada. El historial se conserva.`
                  : `Se reasignarán ${selectedCount} trabajos de ${fromMemberName} a la persona seleccionada. El historial se conserva.`}
            </p>

            <label className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
              <input
                type="checkbox"
                name="confirmed"
                value="yes"
                checked={confirm}
                onChange={(event) => setConfirm(event.target.checked)}
                className="mt-1"
                required
              />
              Confirmo la reasignación
            </label>

            <FormFeedback error={state.error} success={state.success} />
            <CommandSubmitButton
              label="Reasignar trabajo"
              variant="secondary"
              disabled={selectedCount === 0 || !confirm}
            />
          </form>
        </>
      )}
    </PageSection>
  );
}
