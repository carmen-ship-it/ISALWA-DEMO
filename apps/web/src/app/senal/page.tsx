import Link from 'next/link';
import { Panel, StatusPill } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { apiGet } from '@/lib/api';

type List = {
  items: Array<{
    id: string;
    accountName: string;
    channel: string;
    purpose: string;
    slaStatus: string | null;
    preview: string;
    lastMessageAt: string;
    href: string;
    accountId: string | null;
  }>;
};

type Detail = {
  id: string;
  accountName: string | null;
  channel: string;
  messages: Array<{ id: string; direction: string; body: string; sentAt: string }>;
};

export default async function SenalPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const sp = await searchParams;
  let list: List = { items: [] };
  let detail: Detail | null = null;
  try {
    list = await apiGet<List>('/conversations?take=30');
    const id = sp.c ?? list.items[0]?.id;
    if (id) detail = await apiGet<Detail>(`/conversations/${id}`);
  } catch {
    list = { items: [] };
  }

  return (
    <AppShell active="/senal">
      <main className="px-5 py-8 md:px-8">
        <header className="mb-6">
          <p className="text-[var(--isalwa-text-sm)] font-medium tracking-[0.12em] text-[var(--isalwa-glaze)] uppercase">
            Señal
          </p>
          <h1 className="mt-2 text-[var(--isalwa-text-2xl)] font-semibold">WhatsApp como instrumento</h1>
        </header>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Panel className="max-h-[70vh] overflow-auto p-2">
            {list.items.map((c) => (
              <Link
                key={c.id}
                href={`/senal?c=${c.id}`}
                className="block rounded-[var(--isalwa-radius-control)] px-3 py-3 hover:bg-[var(--isalwa-porcelain)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{c.accountName}</p>
                  <StatusPill tone={c.slaStatus === 'breached' ? 'danger' : 'success'}>
                    {c.purpose}
                  </StatusPill>
                </div>
                <p className="mt-1 line-clamp-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{c.preview}</p>
              </Link>
            ))}
          </Panel>

          <Panel className="flex min-h-[70vh] flex-col p-4">
            {detail ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-semibold">{detail.accountName ?? 'Conversación'}</h2>
                  <StatusPill tone="info">{detail.channel}</StatusPill>
                </div>
                <div className="flex-1 space-y-3 overflow-auto">
                  {detail.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[80%] rounded-[var(--isalwa-radius-panel)] px-3 py-2 text-[var(--isalwa-text-md)] ${
                        m.direction === 'out'
                          ? 'ml-auto bg-[var(--isalwa-glaze)] text-white'
                          : 'bg-[var(--isalwa-porcelain)] text-[var(--isalwa-kiln)]'
                      }`}
                    >
                      {m.body}
                      <div className="mt-1 text-[10px] opacity-70">
                        {new Date(m.sentAt).toLocaleString('es-BO')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[var(--isalwa-slate)]">Seleccione una conversación.</p>
            )}
          </Panel>
        </div>
      </main>
    </AppShell>
  );
}
