'use client';

import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { createCustomerAction } from '@/lib/party/actions';
import { hrefWithClientDataMode } from '@/lib/demo/preserve-data-mode';
import { CommandSubmitButton } from '@/components/commercial/command-submit-button';
import { FormFeedback } from '@/components/commercial/form-feedback';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForCreateCustomer } from '@/lib/guidance/select';

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

type CustomerCreateFormProps = {
  searchedQuery: string;
  hasMoreMatches: boolean;
  matchCount: number;
};

export function CustomerCreateForm({
  searchedQuery,
  hasMoreMatches,
  matchCount,
}: CustomerCreateFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await createCustomerAction(formData);
      if (result.ok) {
        router.push(hrefWithClientDataMode(result.redirectTo));
        router.refresh();
        return null;
      }
      return { error: result.error };
    },
    null,
  );

  if (hasMoreMatches) {
    return <GuidanceNotes notes={guidanceForCreateCustomer({ matchCount, hasMoreMatches: true })} />;
  }

  return (
    <form action={formAction} className="space-y-4">
      <GuidanceNotes notes={guidanceForCreateCustomer({ matchCount, hasMoreMatches: false })} />
      <FormFeedback error={state?.error} />
      <input type="hidden" name="searchedQuery" value={searchedQuery} />
      <input type="hidden" name="hasMoreMatches" value="false" />

      <div>
        <label htmlFor="customer-kind" className="isalwa-section-label">
          Tipo
        </label>
        <select
          id="customer-kind"
          name="partyKind"
          required
          defaultValue="organization"
          className={fieldClass}
        >
          <option value="organization">Empresa</option>
          <option value="person">Persona</option>
        </select>
      </div>

      <div>
        <label htmlFor="customer-name" className="isalwa-section-label">
          Nombre
        </label>
        <input
          id="customer-name"
          name="displayName"
          required
          className={fieldClass}
          placeholder="Nombre con el que se busca este cliente"
        />
      </div>

      <div>
        <label htmlFor="customer-legal" className="isalwa-section-label">
          Razón social
        </label>
        <input id="customer-legal" name="legalName" className={fieldClass} placeholder="Opcional" />
        <p className="mt-1 text-sm text-[var(--isalwa-slate)]">No es el NIT ni la razón social tributaria.</p>
      </div>

      <label className="flex items-start gap-3 text-sm text-[var(--isalwa-kiln)]">
        <input type="checkbox" name="confirmDistinct" required className="mt-1" />
        <span>
          {matchCount > 0
            ? 'Ninguno de estos registros es el mismo cliente. Crear uno nuevo sin fusionar.'
            : 'Busqué y no existe este cliente. Crear uno nuevo sin fusionar.'}
        </span>
      </label>

      <CommandSubmitButton label="Crear cliente" />
    </form>
  );
}
