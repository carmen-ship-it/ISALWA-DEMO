import Link from 'next/link';
import { EmptyState, ExperienceHeader, Panel, StatusPill } from '@isalwa/ui';
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
  accountId?: string | null;
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

  const selectedId = sp.c ?? list.items[0]?.id;
  const breached = list.items.filter((c) => c.slaStatus === 'breached').length;

  return (
    <AppShell active="/senal">
      <main className="px-5 py-8 md:px-8">
        <ExperienceHeader
          kicker="Señal"
          title="WhatsApp como instrumento"
          subtitle={
            breached > 0
              ? `${breached} hilos fuera de SLA — la calma empieza por priorizar.`
              : 'Tres canales. Un ritmo. Conversaciones que se leen, no se sufren.'
          }
        />

        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Panel className="max-h-[72vh] overflow-auto p-2">
            {list.items.length === 0 ? (
              <EmptyState
                className="m-2 border-0 bg-transparent p-4 shadow-none"
                title="Sin conversaciones"
                description="Cuando el seed esté activo, Señal cobra vida."
              />
            ) : (
              list.items.map((c) => {
                const active = c.id === selectedId;
                return (
                  <Link
                    key={c.id}
                    href={`/senal?c=${c.id}`}
                    className={`block rounded-[var(--isalwa-radius-control)] px-3 py-3 transition-colors ${
                      active
                        ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,white)]'
                        : 'hover:bg-[var(--isalwa-porcelain)]'
                    }`}
                    aria-current={active ? 'true' : undefined}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.accountName}</p>
                      <StatusPill tone={c.slaStatus === 'breached' ? 'danger' : 'success'}>
                        {c.purpose}
                      </StatusPill>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">
                      {c.preview}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--isalwa-slate)]">
                      {new Date(c.lastMessageAt).toLocaleString('es-BO')}
                    </p>
                  </Link>
                );
              })
            )}
          </Panel>

          <Panel className="flex min-h-[72vh] flex-col overflow-hidden p-0">
            {detail ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--isalwa-mist)] px-5 py-4">
                  <div>
                    <h2 className="font-semibold">{detail.accountName ?? 'Conversación'}</h2>
                    <p className="text-[var(--isalwa-text-sm)] text-[var(--isalwa-slate)]">{detail.channel}</p>
                  </div>
                  <div className="flex gap-2">
                    <StatusPill tone="info">{detail.channel}</StatusPill>
                    {detail.accountId || list.items.find((i) => i.id === detail.id)?.accountId ? (
                      <Link
                        href={`/personas/${detail.accountId ?? list.items.find((i) => i.id === detail.id)?.accountId}`}
                        className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] px-3 py-1.5 text-[var(--isalwa-text-sm)] hover:border-[var(--isalwa-glaze)]"
                      >
                        Dossier
                      </Link>
                    ) : null}
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-auto bg-[color-mix(in_srgb,var(--isalwa-porcelain)_55%,white)] px-5 py-5">
                  {detail.messages.map((m, idx) => (
                    <div
                      key={m.id}
                      className={`isalwa-message-in max-w-[min(80%,28rem)] rounded-[18px] px-3.5 py-2.5 text-[var(--isalwa-text-md)] leading-relaxed shadow-sm ${
                        m.direction === 'out'
                          ? 'ml-auto rounded-br-md bg-[var(--isalwa-glaze)] text-white'
                          : 'rounded-bl-md bg-white text-[var(--isalwa-kiln)]'
                      }`}
                      style={{ animationDelay: `${Math.min(idx, 12) * 40}ms` }}
                    >
                      {m.body}
                      <div className="mt-1.5 text-[10px] opacity-70">
                        {new Date(m.sentAt).toLocaleString('es-BO')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-8">
                <EmptyState
                  title="Seleccione una conversación"
                  description="La bandeja a la izquierda es el ritmo. El hilo a la derecha es la calma."
                />
              </div>
            )}
          </Panel>
        </div>
      </main>
    </AppShell>
  );
}
