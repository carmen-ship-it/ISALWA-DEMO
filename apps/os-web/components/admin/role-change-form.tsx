'use client';

import { useEffect, useState } from 'react';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { previewRoleChangeAction } from '@/lib/workforce/actions';
import type { SelectOption } from '@/lib/workforce/admin-options';
import { formatRoleKey, formatRoleKeys } from '@/lib/workforce/labels';
import type { RoleChangePreview } from '@/lib/workforce/role-change';

/**
 * ChangeRole with the effective permission changes shown before submitting.
 * Additional permissions stay unless explicitly marked for removal here.
 */
export function RoleChangeForm({
  memberId,
  currentPrimary,
  additional,
  options,
  action,
}: {
  memberId: string;
  currentPrimary: string | null;
  additional: string[];
  options: SelectOption[];
  action: (formData: FormData) => void;
}) {
  const [roleKey, setRoleKey] = useState(currentPrimary ?? options[0]?.value ?? '');
  const [revoke, setRevoke] = useState<string[]>([]);
  const [preview, setPreview] = useState<RoleChangePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestKey = `${roleKey}|${revoke.join(',')}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!roleKey) return;
    let cancelled = false;
    setError(null);
    void previewRoleChangeAction(memberId, roleKey, revoke).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPreview(result.preview);
        setLoadedKey(requestKey);
      } else {
        setPreview(null);
        setLoadedKey(null);
        setError(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [memberId, roleKey, revoke, requestKey]);

  const ready = preview !== null && loadedKey === requestKey;

  return (
    <form action={action} className="mt-3 space-y-4">
      <input type="hidden" name="memberId" value={memberId} />
      <div>
        <label htmlFor="role-select" className="isalwa-section-label">
          Rol principal
        </label>
        <select
          id="role-select"
          name="roleKey"
          required
          value={roleKey}
          onChange={(event) => setRoleKey(event.target.value)}
          className="mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {additional.length > 0 ? (
        <fieldset>
          <legend className="isalwa-section-label">Permisos adicionales</legend>
          <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Se mantienen salvo que marque su retiro.</p>
          <ul className="mt-2 space-y-1">
            {additional.map((key) => (
              <li key={key}>
                <label className="flex items-center gap-2 text-sm text-[var(--isalwa-kiln)]">
                  <input
                    type="checkbox"
                    name="revokeAdditionalRoleKeys"
                    value={key}
                    checked={revoke.includes(key)}
                    onChange={(event) =>
                      setRevoke((current) =>
                        event.target.checked ? [...current, key].sort() : current.filter((item) => item !== key),
                      )
                    }
                  />
                  Retirar también {formatRoleKey(key)}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div
        role="status"
        aria-live="polite"
        data-role-change-preview
        className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-3 text-sm"
      >
        <p className="isalwa-section-label">Cambios de permisos</p>
        {error ? <p className="mt-1 text-[var(--isalwa-danger)]">{error}</p> : null}
        {!error && !ready ? <p className="mt-1 text-[var(--isalwa-slate)]">Calculando cambios…</p> : null}
        {ready && preview ? (
          <dl className="mt-2 grid gap-1 text-[var(--isalwa-kiln)]">
            <div>
              <dt className="inline text-[var(--isalwa-slate)]">Rol que termina: </dt>
              <dd className="inline">{preview.endedPrimaryRoleKeys.length ? formatRoleKeys(preview.endedPrimaryRoleKeys) : 'Ninguno'}</dd>
            </div>
            <div>
              <dt className="inline text-[var(--isalwa-slate)]">Permisos adicionales que se mantienen: </dt>
              <dd className="inline">{preview.preservedAdditionalRoleKeys.length ? formatRoleKeys(preview.preservedAdditionalRoleKeys) : 'Ninguno'}</dd>
            </div>
            <div>
              <dt className="inline text-[var(--isalwa-slate)]">Permisos adicionales que se retiran: </dt>
              <dd className="inline">{preview.revokedAdditionalRoleKeys.length ? formatRoleKeys(preview.revokedAdditionalRoleKeys) : 'Ninguno'}</dd>
            </div>
            <div>
              <dt className="inline text-[var(--isalwa-slate)]">Permisos que gana: </dt>
              <dd className="inline">{preview.scopesGained.length ? formatRoleKeys(preview.scopesGained) : 'Ninguno'}</dd>
            </div>
            <div>
              <dt className="inline text-[var(--isalwa-slate)]">Permisos que pierde: </dt>
              <dd className="inline">{preview.scopesLost.length ? formatRoleKeys(preview.scopesLost) : 'Ninguno'}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <CommandSubmitButton label="Confirmar cambio de rol principal" variant="secondary" disabled={!ready} />
    </form>
  );
}
