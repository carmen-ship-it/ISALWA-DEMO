import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { CheckInButton } from '@/components/check-in-button';
import { apiGet } from '@/lib/api';

type Dossier = {
  id: string;
  code: string;
  name: string;
  legalName: string;
  segment: string;
  creditStatus: string;
  relationshipScore: number;
  ownerName: string;
  territoryCode: string;
  aiSummary: string | null;
  aiSummaryEvidence: unknown;
  openBalance: { label: string };
  predictedNextOrder: { start: string | null; end: string | null; confidence: string | null };
  priceMemory: Array<{ productName: string; sku: string; unitPrice: { label: string }; observedAt: string }>;
  recentQuotes: Array<{ id: string; number: string; status: string; total: { label: string } }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    balance: { label: string };
    status: string;
    dueAt: string;
  }>;
  recentVisits: Array<{ id?: string; status: string; plannedAt: string; result: string | null }>;
  conversations: Array<{
    id?: string;
    channel: string;
    messages: Array<{ direction: string; body: string; sentAt: string }>;
  }>;
};

type Timeline = {
  items: Array<{ id: string; type: string; title: string; body: string | null; occurredAt: string }>;
};

export default async function DossierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let dossier: Dossier | null = null;
  let timeline: Timeline = { items: [] };
  try {
    dossier = await apiGet<Dossier>(`/accounts/${id}`);
    timeline = await apiGet<Timeline>(`/accounts/${id}/timeline`);
  } catch {
    notFound();
  }
  if (!dossier) notFound();

  const evidence = Array.isArray(dossier.aiSummaryEvidence)
    ? (dossier.aiSummaryEvidence as string[])
    : [];

  return (
    <AppShell active="/personas">
      <main className="px-5 py-6 md:px-8">
        <div className="sticky top-0 z-10 -mx-5 mb-6 border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_92%,white)] px-5 py-4 backdrop-blur md:-mx-8 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">{dossier.code}</p>
              <h1 className="text-[var(--isalwa-text-2xl)] font-semibold">{dossier.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusPill tone="info">Seg. {dossier.segment}</StatusPill>
                <StatusPill tone={dossier.creditStatus === 'ok' ? 'success' : 'danger'}>
                  Crédito {dossier.creditStatus}
                </StatusPill>
                <StatusPill tone="neutral">Score {dossier.relationshipScore}</StatusPill>
                <StatusPill tone="neutral">
                  {dossier.ownerName} · {dossier.territoryCode}
                </StatusPill>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/cierre?account=${dossier.id}`}
                className="rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-2 text-[var(--isalwa-text-md)] font-medium text-white hover:bg-[var(--isalwa-glaze-deep)]"
              >
                Cotizar
              </Link>
              <CheckInButton accountId={dossier.id} />
              <Link
                href="/senal"
                className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-4 py-2 text-[var(--isalwa-text-md)]"
              >
                WhatsApp
              </Link>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-[var(--isalwa-text-md)] text-[var(--isalwa-slate)]">{dossier.aiSummary}</p>
          {evidence.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {evidence.slice(0, 4).map((e) => (
                <StatusPill key={e} tone="neutral">
                  {e}
                </StatusPill>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Panel className="p-4 xl:col-span-2">
            <h2 className="font-semibold">Memoria</h2>
            <ul className="mt-3 space-y-3">
              {timeline.items.slice(0, 12).map((ev) => (
                <li key={ev.id} className="border-l-2 border-[var(--isalwa-glaze)] pl-3">
                  <p className="text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                    {new Date(ev.occurredAt).toLocaleString('es-BO')}
                  </p>
                  <p className="font-medium">{ev.title}</p>
                  {ev.body ? <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{ev.body}</p> : null}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="space-y-4">
            <Panel className="p-4">
              <h2 className="font-semibold">Dinero</h2>
              <p className="mt-2 text-[var(--isalwa-text-xl)]" style={{ fontFamily: 'var(--isalwa-font-mono)' }}>
                {dossier.openBalance.label}
              </p>
              <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">Saldo abierto</p>
              <ul className="mt-3 space-y-2 text-[var(--isalwa-text-sm)]">
                {dossier.recentInvoices.slice(0, 4).map((inv) => (
                  <li key={inv.id}>
                    <Link
                      href={`/cierre/facturas/${inv.id}`}
                      className="flex justify-between gap-2 hover:text-[var(--isalwa-glaze)]"
                    >
                      <span>{inv.number}</span>
                      <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>{inv.balance.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {dossier.recentQuotes[0] ? (
                <p className="mt-3 text-[var(--isalwa-text-sm)]">
                  Última cotización:{' '}
                  <Link
                    href={`/cierre/cotizaciones/${dossier.recentQuotes[0].id}`}
                    className="text-[var(--isalwa-glaze)] hover:underline"
                  >
                    {dossier.recentQuotes[0].number}
                  </Link>
                </p>
              ) : null}
            </Panel>

            <Panel className="p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold">Últimos precios</h2>
                <Link
                  href={`/cierre?account=${dossier.id}`}
                  className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)] hover:underline"
                >
                  Usar en cotización
                </Link>
              </div>
              <ul className="mt-3 space-y-2 text-[var(--isalwa-text-sm)]">
                {dossier.priceMemory.slice(0, 5).map((p) => (
                  <li key={`${p.sku}-${p.observedAt}`} className="flex justify-between gap-2">
                    <span>{p.productName}</span>
                    <span style={{ fontFamily: 'var(--isalwa-font-mono)' }}>{p.unitPrice.label}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Visitas</h2>
              <CheckInButton accountId={dossier.id} />
            </div>
            <ul className="mt-3 space-y-2 text-[var(--isalwa-text-sm)]">
              {dossier.recentVisits.slice(0, 6).map((v, idx) => (
                <li key={v.id ?? `${v.plannedAt}-${idx}`} className="flex justify-between">
                  <span>{new Date(v.plannedAt).toLocaleDateString('es-BO')}</span>
                  <span>
                    {v.status}
                    {v.result ? ` · ${v.result}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Señal reciente</h2>
              <Link href="/senal" className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)] hover:underline">
                Abrir Señal
              </Link>
            </div>
            {dossier.conversations[0] ? (
              <ul className="mt-3 space-y-2 text-[var(--isalwa-text-sm)]">
                {dossier.conversations[0].messages.slice(-4).map((m, idx) => (
                  <li key={`${m.sentAt}-${idx}`}>
                    <span className="text-[var(--isalwa-glaze)]">{m.direction === 'in' ? 'Cliente' : 'ISALWA'}: </span>
                    {m.body}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[var(--isalwa-slate)]">Sin hilos recientes.</p>
            )}
          </Panel>
        </div>
      </main>
    </AppShell>
  );
}
