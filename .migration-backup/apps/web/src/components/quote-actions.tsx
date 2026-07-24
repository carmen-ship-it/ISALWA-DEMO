'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@isalwa/ui';
import { API_BASE } from '@/lib/api';

export function QuoteActions({
  quoteId,
  status,
  invoiceId,
  invoiceNumber,
}: {
  quoteId: string;
  status: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/quotes/${quoteId}/send`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/quotes/${quoteId}/accept`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { invoiceId?: string };
      router.refresh();
      if (json.invoiceId) router.push(`/cierre/facturas/${json.invoiceId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' ? (
        <Button disabled={busy} onClick={() => void send()}>
          Enviar cotización
        </Button>
      ) : null}
      {status === 'sent' || status === 'draft' ? (
        <Button variant="secondary" disabled={busy} onClick={() => void accept()}>
          Aceptar → factura
        </Button>
      ) : null}
      {invoiceId ? (
        <Link
          href={`/cierre/facturas/${invoiceId}`}
          className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-4 py-2"
        >
          Ver factura {invoiceNumber}
        </Link>
      ) : null}
      {error ? (
        <p className="w-full text-[var(--isalwa-text-sm)] text-[var(--isalwa-copper)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
