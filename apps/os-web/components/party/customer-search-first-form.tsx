'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button, SearchField } from '@isalwa/ui';
import { GuidanceNotes } from '@/components/guidance/guidance-note';
import { guidanceForSearchCustomer } from '@/lib/guidance/select';
import { newCustomerHref } from '@/lib/party/navigation';

type CustomerSearchFirstFormProps = {
  initialQuery?: string;
};

export function CustomerSearchFirstForm({ initialQuery = '' }: CustomerSearchFirstFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (next.length < 2) return;
    router.push(newCustomerHref(next));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <GuidanceNotes notes={guidanceForSearchCustomer({ queryLength: query.trim().length })} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="new-customer-search"
            className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]"
          >
            Buscar antes de crear
          </label>
          <SearchField
            id="new-customer-search"
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o razón social"
            autoComplete="off"
            required
            minLength={2}
          />
        </div>
        <Button type="submit" variant="primary" className="shrink-0">
          Buscar
        </Button>
      </div>
    </form>
  );
}
