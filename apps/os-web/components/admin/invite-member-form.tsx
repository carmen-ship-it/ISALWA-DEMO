'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { Button, PageSection } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { inviteMemberAction } from '@/lib/workforce/actions';
import type { SelectOption } from '@/lib/workforce/admin-options';
import {
  INVITE_FORM_FIELD_NAMES,
  INVITE_MANAGER_NOTICE,
  INVITE_NO_ROLES_NOTICE,
  INVITE_ROLE_NOTICE,
} from '@/lib/workforce/invite';
import { equipoHref } from '@/lib/workforce/navigation';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

type InviteMemberFormProps = {
  departments: SelectOption[];
  roles: SelectOption[];
};

const field = {
  email: INVITE_FORM_FIELD_NAMES[0],
  givenName: INVITE_FORM_FIELD_NAMES[1],
  familyName: INVITE_FORM_FIELD_NAMES[2],
  roleKey: INVITE_FORM_FIELD_NAMES[3],
  departmentId: INVITE_FORM_FIELD_NAMES[4],
} as const;

export function InviteMemberForm({ departments, roles }: InviteMemberFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await inviteMemberAction(formData);
      if (result.ok && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
        return null;
      }
      if (result.ok) {
        return { error: undefined };
      }
      return { error: result.error };
    },
    null,
  );

  const canInvite = roles.length > 0;

  return (
    <PageSection card className="p-8" data-tour={TOUR_TARGET.inviteEmployee}>
      <p className="isalwa-section-label">Siguiente paso</p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Al enviar, el proveedor de acceso envía un correo. La persona debe completar el acceso
        allí. La cuenta no queda activada hasta que el proveedor vincule la identidad. Esta
        pantalla no crea ni restablece una contraseña.
      </p>
      <p className="mt-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{INVITE_ROLE_NOTICE}</p>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{INVITE_MANAGER_NOTICE}</p>

      {!canInvite ? (
        <p className="mt-6 text-sm text-[var(--isalwa-kiln)]" role="status">
          {INVITE_NO_ROLES_NOTICE}
        </p>
      ) : (
        <form action={formAction} className="mt-8 space-y-6">
          <FormFeedback error={state?.error} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="invite-given-name" className="isalwa-section-label">
                Nombre
              </label>
              <input
                id="invite-given-name"
                name={field.givenName}
                required
                autoComplete="given-name"
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              />
            </div>
            <div>
              <label htmlFor="invite-family-name" className="isalwa-section-label">
                Apellido
              </label>
              <input
                id="invite-family-name"
                name={field.familyName}
                required
                autoComplete="family-name"
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="invite-email" className="isalwa-section-label">
              Correo
            </label>
            <input
              id="invite-email"
              name={field.email}
              type="email"
              required
              autoComplete="email"
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="isalwa-section-label">
              Rol
            </label>
            <select
              id="invite-role"
              name={field.roleKey}
              required
              defaultValue=""
              className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              <option value="" disabled>
                Seleccione un rol…
              </option>
              {roles.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="invite-department" className="isalwa-section-label">
              Departamento (opcional)
            </label>
            {departments.length > 0 ? (
              <select
                id="invite-department"
                name={field.departmentId}
                defaultValue=""
                className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
              >
                <option value="">Sin departamento</option>
                {departments.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <p id="invite-department" className="mt-2 text-sm text-[var(--isalwa-slate)]">
                No hay departamentos registrados. Puede asignarlo después, en la ficha, cuando existan.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <CommandSubmitButton label="Enviar invitación" />
            <Link href={equipoHref()} className="inline-flex">
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>
      )}
    </PageSection>
  );
}
