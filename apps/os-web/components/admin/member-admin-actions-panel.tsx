'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { PageSection } from '@isalwa/ui';
import type { MemberSummaryReadModel } from '@isalwa/os-contracts';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  activateMemberAction,
  changeDepartmentAction,
  changeManagerAction,
  changeRoleAction,
  endAdditionalRoleAction,
  grantAdditionalRoleAction,
  grantDelegationAction,
  requestMemberEmailChangeAction,
  revokeDelegationAction,
  suspendMemberAction,
  terminateMemberAction,
} from '@/lib/workforce/actions';
import { ServerMemberTypeahead } from '@/components/operating/server-member-typeahead';
import type { SelectOption } from '@/lib/workforce/admin-options';
import { DELEGATION_SCOPE_OPTIONS } from '@/lib/workforce/admin-options';
import type { MemberAdminVisibility } from '@/lib/workforce/lifecycle-ui';
import { OPEN_WORK_TERMINATE_MESSAGE } from '@/lib/workforce/command-errors';
import { ADDITIONAL_ASSIGNABLE_SCOPE_KEYS } from '@isalwa/os-contracts';
import { formatRoleKey, formatRoleKeys, isAdditionalAssignableScope, splitRoleKeys } from '@/lib/workforce/labels';

type MemberAdminActionsPanelProps = {
  summary: MemberSummaryReadModel;
  visibility: MemberAdminVisibility;
  departments: SelectOption[];
  roles: SelectOption[];
};

const initial = { error: null as string | null, success: null as string | null };

function defaultDelegationExpiry(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 16);
}

function wrapAction(
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>,
  successMessage: string,
) {
  return async (_prev: typeof initial, formData: FormData) => {
    const result = await action(formData);
    if (result.ok) {
      return {
        error: null,
        success: result.data?.delegationId
          ? `${successMessage} Guarde esta referencia para revocarla: ${String(result.data.delegationId)}`
          : successMessage,
      };
    }
    return { error: result.error ?? 'Ocurrió un error.', success: null };
  };
}

export function MemberAdminActionsPanel({
  summary,
  visibility,
  departments,
  roles,
}: MemberAdminActionsPanelProps) {
  const [terminateConfirm, setTerminateConfirm] = useState(false);
  const [suspendConfirm, setSuspendConfirm] = useState(false);
  const memberId = summary.memberId;

  const [deptState, deptAction] = useActionState(
    wrapAction(changeDepartmentAction, 'Departamento actualizado.'),
    initial,
  );
  const [roleState, roleAction] = useActionState(
    wrapAction(changeRoleAction, 'Rol principal actualizado.'),
    initial,
  );
  const [grantRoleState, grantRoleFormAction] = useActionState(
    wrapAction(grantAdditionalRoleAction, 'Permiso adicional asignado. El rol principal no cambió.'),
    initial,
  );
  const [endRoleState, endRoleFormAction] = useActionState(
    wrapAction(endAdditionalRoleAction, 'Permiso adicional retirado. El rol principal sigue activo.'),
    initial,
  );
  const [managerState, managerAction] = useActionState(
    wrapAction(changeManagerAction, 'Responsable actualizado.'),
    initial,
  );
  const [suspendState, suspendAction] = useActionState(
    wrapAction(suspendMemberAction, 'Acceso suspendido.'),
    initial,
  );
  const [reactivateState, reactivateAction] = useActionState(
    wrapAction(activateMemberAction, 'Acceso reactivado.'),
    initial,
  );
  const [terminateState, terminateAction] = useActionState(
    wrapAction(terminateMemberAction, 'Relación laboral finalizada.'),
    initial,
  );
  const [grantState, grantAction] = useActionState(
    wrapAction(grantDelegationAction, 'Delegación creada.'),
    initial,
  );
  const [revokeState, revokeAction] = useActionState(
    wrapAction(revokeDelegationAction, 'Delegación revocada.'),
    initial,
  );
  const [emailState, emailAction] = useActionState(
    wrapAction(
      requestMemberEmailChangeAction,
      'Solicitud registrada. El cambio de correo se completará cuando el proveedor lo confirme.',
    ),
    initial,
  );

  const showOpenWorkHint =
    terminateState.error === OPEN_WORK_TERMINATE_MESSAGE;
  const { primary, additional } = splitRoleKeys(summary.roleKeys);
  const primaryRoleOptions = roles.filter((option) => !isAdditionalAssignableScope(option.value));
  const additionalToAdd = ADDITIONAL_ASSIGNABLE_SCOPE_KEYS.filter(
    (key) => !summary.roleKeys.includes(key),
  );

  return (
    <div className="space-y-8">
      {visibility.organization ? (
        <PageSection card className="p-8">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Organización</h2>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Cambios de departamento, rol y responsable quedan registrados con fecha efectiva.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="isalwa-section-label">Cambiar departamento</h3>
              <FormFeedback error={deptState.error} success={deptState.success} />
              {departments.length > 0 ? (
                <form action={deptAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="memberId" value={memberId} />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="dept-select" className="isalwa-section-label">
                      Departamento
                    </label>
                    <select
                      id="dept-select"
                      name="departmentId"
                      required
                      defaultValue={summary.departmentId ?? ''}
                      className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
                    >
                      <option value="" disabled>
                        Seleccione…
                      </option>
                      {departments.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CommandSubmitButton label="Cambiar departamento" variant="secondary" />
                </form>
              ) : (
                <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
                  {summary.departmentName
                    ? `Departamento actual: ${summary.departmentName}. `
                    : null}
                  No hay departamentos registrados para elegir.
                </p>
              )}
            </div>

            <div>
              <h3 className="isalwa-section-label">Rol principal</h3>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                Sustituye el rol operativo. También finaliza los demás roles activos, incluidos los
                permisos adicionales. No lo use para agregar un permiso.
              </p>
              <FormFeedback error={roleState.error} success={roleState.success} />
              {primaryRoleOptions.length > 0 ? (
                <form action={roleAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="memberId" value={memberId} />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="role-select" className="isalwa-section-label">
                      Rol principal
                    </label>
                    <select
                      id="role-select"
                      name="roleKey"
                      required
                      defaultValue={primary[0] ?? ''}
                      className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
                    >
                      {primaryRoleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CommandSubmitButton label="Cambiar rol principal" variant="secondary" />
                </form>
              ) : (
                <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
                  No hay roles operativos registrados para elegir. El rol actual es{' '}
                  {formatRoleKeys(primary.length > 0 ? primary : summary.roleKeys)}.
                </p>
              )}
            </div>

            <div>
              <h3 className="isalwa-section-label">Permisos adicionales</h3>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                Se agregan al rol principal. No lo reemplazan y no se infieren del cargo.
              </p>
              <FormFeedback error={grantRoleState.error} success={grantRoleState.success} />
              <FormFeedback error={endRoleState.error} success={endRoleState.success} />
              {additional.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {additional.map((key) => (
                    <li
                      key={key}
                      className="flex flex-col gap-2 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-[var(--isalwa-kiln)]">{formatRoleKey(key)}</p>
                      </div>
                      <form action={endRoleFormAction}>
                        <input type="hidden" name="memberId" value={memberId} />
                        <input type="hidden" name="roleKey" value={key} />
                        <CommandSubmitButton label="Quitar permiso" variant="secondary" />
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--isalwa-slate)]">Sin permisos adicionales.</p>
              )}
              {additionalToAdd.length > 0 ? (
                <form action={grantRoleFormAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="memberId" value={memberId} />
                  <div className="min-w-0 flex-1">
                    <label htmlFor="additional-role-select" className="isalwa-section-label">
                      Agregar permiso
                    </label>
                    <select
                      id="additional-role-select"
                      name="roleKey"
                      required
                      defaultValue=""
                      className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
                    >
                      <option value="" disabled>
                        Seleccione…
                      </option>
                      {additionalToAdd.map((key) => (
                        <option key={key} value={key}>
                          {formatRoleKey(key)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <CommandSubmitButton label="Agregar permiso" variant="secondary" />
                </form>
              ) : null}
            </div>

            <div>
              <h3 className="isalwa-section-label">Cambiar responsable</h3>
              <FormFeedback error={managerState.error} success={managerState.success} />
              <form action={managerAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <input type="hidden" name="memberId" value={memberId} />
                <div className="min-w-0 flex-1">
                  <label htmlFor="manager-select" className="isalwa-section-label">
                    Responsable
                  </label>
                  <ServerMemberTypeahead
                    id="manager-select"
                    name="managerMemberId"
                    required
                    mode="admin"
                    excludeMemberId={memberId}
                    defaultMemberId={summary.managerMemberId ?? ''}
                    defaultLabel=""
                    placeholder="Buscar responsable"
                  />
                </div>
                <CommandSubmitButton label="Cambiar responsable" variant="secondary" />
              </form>
            </div>
          </div>
        </PageSection>
      ) : null}

      {visibility.suspend || visibility.reactivate || visibility.terminate ? (
        <PageSection card className="p-8">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Acceso</h2>

          {visibility.suspend ? (
            <div className="mt-4">
              <h3 className="isalwa-section-label">Suspender acceso</h3>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                El acceso al sistema se bloquea temporalmente. El trabajo asignado puede seguir a
                nombre de esta persona hasta que un administrador lo reasigne. La suspensión no
                finaliza la relación laboral.
              </p>
              <FormFeedback error={suspendState.error} success={suspendState.success} />
              <form action={suspendAction} className="mt-4 space-y-4">
                <input type="hidden" name="memberId" value={memberId} />
                <div>
                  <label htmlFor="suspend-reason" className="isalwa-section-label">
                    Motivo (opcional)
                  </label>
                  <input
                    id="suspend-reason"
                    name="reason"
                    className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
                  <input
                    type="checkbox"
                    checked={suspendConfirm}
                    onChange={(e) => setSuspendConfirm(e.target.checked)}
                    className="mt-1"
                  />
                  Confirmo que deseo suspender el acceso de esta persona.
                </label>
                <CommandSubmitButton
                  label="Suspender acceso"
                  variant="danger"
                  disabled={!suspendConfirm}
                />
              </form>
            </div>
          ) : null}

          {visibility.reactivate ? (
            <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
              <h3 className="isalwa-section-label">Reactivar acceso</h3>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                Restaura el acceso suspendido. Esto no es un recontrato.
              </p>
              <FormFeedback error={reactivateState.error} success={reactivateState.success} />
              <form action={reactivateAction} className="mt-4">
                <input type="hidden" name="memberId" value={memberId} />
                <CommandSubmitButton label="Reactivar acceso" variant="secondary" />
              </form>
            </div>
          ) : null}

          {visibility.terminate ? (
            <div className="mt-8 border-t border-[var(--isalwa-mist)] pt-6">
              <h3 className="isalwa-section-label">Finalizar relación</h3>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                Acción permanente: revoca el acceso y finaliza la relación laboral en el sistema.
              </p>
              <FormFeedback error={terminateState.error} success={terminateState.success} />
              {showOpenWorkHint ? (
                <p className="mt-3 text-sm text-[var(--isalwa-kiln)]">
                  <Link href="/trabajo" className="font-medium text-[var(--isalwa-glaze)] hover:underline">
                    Ver trabajo abierto
                  </Link>
                  {' '}para reasignar tareas antes de finalizar.
                </p>
              ) : null}
              <form action={terminateAction} className="mt-4 space-y-4">
                <input type="hidden" name="memberId" value={memberId} />
                <input type="hidden" name="confirmTerminate" value={terminateConfirm ? 'true' : 'false'} />
                <div>
                  <label htmlFor="terminate-reason" className="isalwa-section-label">
                    Motivo (opcional)
                  </label>
                  <input
                    id="terminate-reason"
                    name="reason"
                    className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-[var(--isalwa-kiln)]">
                  <input
                    type="checkbox"
                    checked={terminateConfirm}
                    onChange={(e) => setTerminateConfirm(e.target.checked)}
                    className="mt-1"
                  />
                  Confirmo que deseo finalizar la relación laboral de esta persona.
                </label>
                <CommandSubmitButton
                  label="Finalizar relación"
                  variant="danger"
                  disabled={!terminateConfirm}
                />
              </form>
            </div>
          ) : null}
        </PageSection>
      ) : null}

      {visibility.delegation ? (
        <PageSection card className="p-8">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Delegaciones</h2>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Delegaciones activas registradas: {summary.activeDelegationCount}. Las delegaciones
            vencidas o suspendidas no otorgan autoridad.
          </p>

          <div className="mt-6 space-y-6">
            <div>
              <h3 className="isalwa-section-label">Crear delegación</h3>
              <FormFeedback error={grantState.error} success={grantState.success} />
              <form action={grantAction} className="mt-3 space-y-4">
                <div>
                  <label htmlFor="delegate-select" className="isalwa-section-label">
                    Delegado
                  </label>
                  <ServerMemberTypeahead
                    id="delegate-select"
                    name="delegateMemberId"
                    required
                    mode="admin"
                    defaultMemberId={memberId}
                    defaultLabel=""
                    placeholder="Buscar delegado"
                  />
                </div>
                <div>
                  <label htmlFor="delegation-scope" className="isalwa-section-label">
                    Alcance
                  </label>
                  <select
                    id="delegation-scope"
                    name="scope"
                    required
                    className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
                  >
                    {DELEGATION_SCOPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="delegation-expires" className="isalwa-section-label">
                    Vence
                  </label>
                  <input
                    id="delegation-expires"
                    name="expiresAt"
                    type="datetime-local"
                    required
                    defaultValue={defaultDelegationExpiry()}
                    className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                  />
                </div>
                <CommandSubmitButton label="Crear delegación" variant="secondary" />
              </form>
            </div>

            <div>
              <h3 className="isalwa-section-label">Revocar delegación</h3>
              <FormFeedback error={revokeState.error} success={revokeState.success} />
              <form action={revokeAction} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label htmlFor="delegation-id" className="isalwa-section-label">
                    Referencia de la delegación
                  </label>
                  <input
                    id="delegation-id"
                    name="delegationId"
                    required
                    placeholder="Referencia anotada al crear la delegación"
                    className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
                  />
                </div>
                <CommandSubmitButton label="Revocar delegación" variant="danger" />
              </form>
            </div>
          </div>
        </PageSection>
      ) : null}

      {visibility.requestEmailChange ? (
        <PageSection card className="p-8">
          <h2 className="text-lg font-medium text-[var(--isalwa-kiln)]">Cuenta</h2>
          <h3 className="mt-4 isalwa-section-label">Solicitar cambio de correo</h3>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
            Registra una solicitud de cambio. El correo no se actualiza de inmediato; el proveedor de
            identidad debe confirmarlo.
          </p>
          <FormFeedback error={emailState.error} success={emailState.success} />
          <form action={emailAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="new-email" className="isalwa-section-label">
                Nuevo correo
              </label>
              <input
                id="new-email"
                name="newEmail"
                type="email"
                required
                autoComplete="email"
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
              />
            </div>
            <CommandSubmitButton label="Solicitar cambio de correo" variant="secondary" />
          </form>
        </PageSection>
      ) : null}
    </div>
  );
}
