'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@isalwa/ui';
import { API_BASE } from '@/lib/api';

export function PaymentForm({
  invoiceId,
  balanceCentavos,
}: {
  invoiceId: string;
  balanceCentavos: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(Math.round(balanceCentavos / 100));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/v1/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCentavos: Math.round(amount * 100),
          method: 'transfer',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al registrar pago');
    } finally {
      setBusy(false);
    }
  }

  if (balanceCentavos <= 0) {
    return (
      <p className="text-[var(--isalwa-text-md)] text-[var(--isalwa-glaze)]">
        Factura saldada. Siguiente paso: seguimiento en el dossier.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-[var(--isalwa-text-sm)]">
        Monto (Bs)
        <input
          type="number"
          min={1}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 block w-36 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-2"
        />
      </label>
      <Button disabled={busy} onClick={() => void submit()}>
        Registrar pago
      </Button>
      {error ? (
        <p className="w-full text-[var(--isalwa-text-sm)] text-[var(--isalwa-copper)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
