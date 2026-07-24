'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@isalwa/ui';
import { API_BASE } from '@/lib/api';

export function CheckInButton({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/visits/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          result: 'quoted',
          notes: 'Check-in desde dossier — listo para cotizar',
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { nextHref?: string };
      setMsg('Visita registrada');
      router.refresh();
      if (json.nextHref) {
        setTimeout(() => router.push(json.nextHref!), 600);
      }
    } catch {
      setMsg('No se pudo registrar la visita');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1">
      <Button variant="secondary" disabled={busy} onClick={() => void run()}>
        Registrar visita
      </Button>
      {msg ? <span className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{msg}</span> : null}
    </div>
  );
}
