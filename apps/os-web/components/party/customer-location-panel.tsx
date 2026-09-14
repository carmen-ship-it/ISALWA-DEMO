'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { ListRow, StatusPill } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { createLocationAction, deactivateLocationAction, updateLocationAction } from '@/lib/party/actions';
import {
  formatCoordinates,
  provenanceHref,
  sortLocationsForDisplay,
} from '@/lib/party/customer-self-service';
import type { LocationView } from '@/lib/party/types';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CustomerLocationPanelProps = {
  partyId: string;
  locations: LocationView[];
  canMutate: boolean;
};

export function CustomerLocationPanel({ partyId, locations, canMutate }: CustomerLocationPanelProps) {
  const ordered = sortLocationsForDisplay(locations);

  return (
    <div className="space-y-4">
      {ordered.length === 0 ? (
        <p className="text-sm text-[var(--isalwa-slate)]">No hay ubicaciones registradas.</p>
      ) : (
        <ul className="divide-y divide-[var(--isalwa-mist)]">
          {ordered.map((location) => (
            <LocationRow key={location.id} partyId={partyId} location={location} canMutate={canMutate} />
          ))}
        </ul>
      )}
      {canMutate ? <CreateLocationForm partyId={partyId} /> : null}
    </div>
  );
}

function LocationFacts({ location }: { location: LocationView }) {
  const coordinates = formatCoordinates(location.latitude, location.longitude);
  const href = provenanceHref(location.provenanceUrl);

  return (
    <dl className="mt-2 grid gap-2 text-sm text-[var(--isalwa-slate)]">
      {location.addressText ? (
        <div>
          <dt className="isalwa-section-label">Dirección</dt>
          <dd className="mt-1 text-[var(--isalwa-kiln)]">{location.addressText}</dd>
        </div>
      ) : null}
      <div>
        <dt className="isalwa-section-label">Coordenadas</dt>
        <dd className="mt-1 text-[var(--isalwa-kiln)]">{coordinates ?? 'Sin coordenadas'}</dd>
      </div>
      <div>
        <dt className="isalwa-section-label">Procedencia</dt>
        <dd className="mt-1">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[var(--isalwa-glaze)] hover:underline"
            >
              {href}
            </a>
          ) : (
            <span className="text-[var(--isalwa-slate)]">Sin enlace de procedencia</span>
          )}
        </dd>
      </div>
    </dl>
  );
}

function LocationRow({
  partyId,
  location,
  canMutate,
}: {
  partyId: string;
  location: LocationView;
  canMutate: boolean;
}) {
  const active = location.status === 'active';
  return (
    <ListRow as="li" className="px-1 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[var(--isalwa-kiln)]">{location.label}</p>
          <LocationFacts location={location} />
        </div>
        <StatusPill tone={active ? 'success' : 'neutral'}>{active ? 'Activa' : 'Inactiva'}</StatusPill>
      </div>
      {canMutate && active ? (
        <div className="mt-4 space-y-3">
          <UpdateLocationForm partyId={partyId} location={location} />
          <DeactivateLocationForm partyId={partyId} locationId={location.id} />
        </div>
      ) : null}
    </ListRow>
  );
}

function CreateLocationForm({ partyId }: { partyId: string }) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await createLocationAction(formData);
      if (result.ok) {
        setFormKey((key) => key + 1);
        router.refresh();
        return { success: 'Ubicación agregada.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <details className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-porcelain)] p-4">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">Agregar ubicación</summary>
      <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
        Las coordenadas son opcionales. El enlace de procedencia no se resuelve ni se geocodifica.
      </p>
      <form key={formKey} action={formAction} className="mt-4 space-y-4">
        <FormFeedback error={state?.error} success={state?.success} />
        <input type="hidden" name="partyId" value={partyId} />
        <LocationFields idPrefix={`create-${partyId}`} />
        <CommandSubmitButton label="Crear ubicación" />
      </form>
    </details>
  );
}

function UpdateLocationForm({ partyId, location }: { partyId: string; location: LocationView }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await updateLocationAction(formData);
      if (result.ok) {
        router.refresh();
        return { success: 'Ubicación actualizada.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <details className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] p-3">
      <summary className="cursor-pointer text-sm font-medium text-[var(--isalwa-kiln)]">Editar ubicación</summary>
      <form action={formAction} className="mt-3 space-y-4">
        <FormFeedback error={state?.error} success={state?.success} />
        <input type="hidden" name="partyId" value={partyId} />
        <input type="hidden" name="locationId" value={location.id} />
        <input type="hidden" name="expectedVersion" value={location.version} />
        <LocationFields
          idPrefix={`edit-${location.id}`}
          label={location.label}
          addressText={location.addressText}
          latitude={location.latitude}
          longitude={location.longitude}
          provenanceUrl={location.provenanceUrl}
        />
        <CommandSubmitButton label="Guardar ubicación" variant="secondary" />
      </form>
    </details>
  );
}

function DeactivateLocationForm({ partyId, locationId }: { partyId: string; locationId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await deactivateLocationAction(formData);
      if (result.ok) {
        router.refresh();
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="partyId" value={partyId} />
      <input type="hidden" name="locationId" value={locationId} />
      <FormFeedback error={state?.error} />
      <CommandSubmitButton label="Desactivar" variant="danger" />
    </form>
  );
}

function LocationFields({
  idPrefix,
  label = '',
  addressText = '',
  latitude = null,
  longitude = null,
  provenanceUrl = '',
}: {
  idPrefix: string;
  label?: string;
  addressText?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  provenanceUrl?: string | null;
}) {
  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-label`} className="isalwa-section-label">
          Nombre
        </label>
        <input id={`${idPrefix}-label`} name="label" required defaultValue={label} className={fieldClass} />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-address`} className="isalwa-section-label">
          Dirección
        </label>
        <textarea
          id={`${idPrefix}-address`}
          name="addressText"
          rows={2}
          defaultValue={addressText ?? ''}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}-lat`} className="isalwa-section-label">
            Latitud
          </label>
          <input
            id={`${idPrefix}-lat`}
            name="latitude"
            inputMode="decimal"
            defaultValue={latitude ?? ''}
            className={fieldClass}
            placeholder="Opcional"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-lng`} className="isalwa-section-label">
            Longitud
          </label>
          <input
            id={`${idPrefix}-lng`}
            name="longitude"
            inputMode="decimal"
            defaultValue={longitude ?? ''}
            className={fieldClass}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-provenance`} className="isalwa-section-label">
          Enlace de procedencia
        </label>
        <input
          id={`${idPrefix}-provenance`}
          name="provenanceUrl"
          type="url"
          defaultValue={provenanceUrl ?? ''}
          className={fieldClass}
          placeholder="https://"
        />
      </div>
    </>
  );
}
