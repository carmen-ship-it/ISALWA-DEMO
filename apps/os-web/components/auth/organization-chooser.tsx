'use client';

import { useState, useTransition } from 'react';
import { Button, EmptyState, StatusPill } from '@isalwa/ui';
import { selectOrganizationAction } from '@/lib/auth/actions';
import {
  clearTenantScopedBrowserState,
  type SessionOrganization,
} from '@/lib/auth/organization-selection';

export function OrganizationChooser({
  organizations,
  currentOrganizationId,
  staleSelection = false,
}: {
  organizations: SessionOrganization[];
  currentOrganizationId?: string | null;
  staleSelection?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(organizationId: string) {
    setError(null);
    startTransition(async () => {
      const form = new FormData();
      form.set('organizationId', organizationId);
      const result = await selectOrganizationAction(form);
      if (result.error || !result.redirectTo) {
        setError(result.error ?? 'No se pudo cambiar de empresa. Intente de nuevo.');
        return;
      }
      // Full document navigation drops in-memory state, router cache and subscriptions.
      clearTenantScopedBrowserState(window);
      window.location.assign(result.redirectTo);
    });
  }

  return (
    <div role="region" aria-label="Elegir empresa" className="w-full max-w-lg" data-surface-state="organization-chooser">
      <EmptyState
        title="Elija la empresa"
        description={
          staleSelection
            ? 'La empresa elegida antes ya no está disponible para su cuenta. Elija con cuál trabajar.'
            : 'Su cuenta tiene acceso a varias empresas. Elija con cuál trabajar; puede cambiarla luego desde su cuenta.'
        }
        action={
          <div className="flex w-full flex-col items-start gap-3">
            <StatusPill tone="info">{`${organizations.length} empresas`}</StatusPill>
            <ul className="flex w-full flex-col gap-2">
              {organizations.map((org) => {
                const current = org.organizationId === currentOrganizationId;
                return (
                  <li key={org.organizationId}>
                    <Button
                      type="button"
                      variant={current ? 'secondary' : 'primary'}
                      disabled={pending || current}
                      aria-current={current ? 'true' : undefined}
                      onClick={() => choose(org.organizationId)}
                    >
                      {current ? `${org.legalName} · actual` : org.legalName}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {error ? (
              <p className="text-sm text-[var(--isalwa-danger)]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}
