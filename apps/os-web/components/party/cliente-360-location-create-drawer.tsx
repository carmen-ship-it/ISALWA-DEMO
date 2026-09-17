'use client';

import { useRouter } from 'next/navigation';
import { useActionState, useState } from 'react';
import { ContextDrawer } from '@isalwa/ui';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { createLocationAction } from '@/lib/party/actions';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type Cliente360LocationCreateDrawerProps = {
  open: boolean;
  partyId: string;
  onClose: () => void;
};

export function Cliente360LocationCreateDrawer({ open, partyId, onClose }: Cliente360LocationCreateDrawerProps) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, formAction] = useActionState(
    async (_prev: { error?: string; success?: string } | null, formData: FormData) => {
      const result = await createLocationAction(formData);
      if (result.ok) {
        setFormKey((key) => key + 1);
        router.refresh();
        onClose();
        return { success: 'Ubicación agregada.' };
      }
      return { error: result.error };
    },
    null,
  );

  return (
    <ContextDrawer open={open} title="Agregar ubicación" onClose={onClose}>
      <p className="text-sm text-[var(--isalwa-slate)]">Las coordenadas son opcionales.</p>
      <form key={formKey} action={formAction} className="mt-4 space-y-4">
        <FormFeedback error={state?.error} success={state?.success} />
        <input type="hidden" name="partyId" value={partyId} />
        <div>
          <label htmlFor="loc-label" className="isalwa-section-label">
            Nombre
          </label>
          <input id="loc-label" name="label" required className={fieldClass} />
        </div>
        <div>
          <label htmlFor="loc-address" className="isalwa-section-label">
            Dirección
          </label>
          <textarea id="loc-address" name="addressText" rows={2} className={fieldClass} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="loc-lat" className="isalwa-section-label">
              Latitud
            </label>
            <input id="loc-lat" name="latitude" inputMode="decimal" className={fieldClass} placeholder="Opcional" />
          </div>
          <div>
            <label htmlFor="loc-lng" className="isalwa-section-label">
              Longitud
            </label>
            <input id="loc-lng" name="longitude" inputMode="decimal" className={fieldClass} placeholder="Opcional" />
          </div>
        </div>
        <div>
          <label htmlFor="loc-prov" className="isalwa-section-label">
            Enlace de procedencia
          </label>
          <input id="loc-prov" name="provenanceUrl" type="url" className={fieldClass} placeholder="https://" />
        </div>
        <CommandSubmitButton label="Crear ubicación" />
      </form>
    </ContextDrawer>
  );
}
