import Link from 'next/link';
import { ExperienceHeader, StatGroup } from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { SignalConversation } from '@/components/signal-conversation';
import { apiGet } from '@/lib/api';

type ConvoItem = {
  id: string;
  accountId: string | null;
  accountName: string;
  channel: string;
  purpose: string;
  status: string;
  slaStatus: string | null;
  lastMessageAt: string;
  preview: string;
  href: string;
};

type List = { items: ConvoItem[] };

type Detail = {
  id: string;
  accountId: string | null;
  accountName: string | null;
  channel: string;
  purpose: string | null;
  slaStatus: string | null;
  messages: Array<{
    id: string;
    direction: string;
    body: string;
    sentAt: string;
    senderType: string | null;
  }>;
};

function elapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 d';
  return `${days} d`;
}

function priorityColor(c: ConvoItem): string {
  if (c.slaStatus === 'breached') return 'var(--isalwa-danger)';
  if (c.status === 'open') {
    const hrs = (Date.now() - new Date(c.lastMessageAt).getTime()) / 3_600_000;
    return hrs > 4 ? 'var(--isalwa-warning)' : 'var(--isalwa-glaze)';
  }
  return 'transparent';
}

const CH: Record<string, { bg: string; text: string; label: string }> = {
  ventas: { bg: 'var(--isalwa-glaze)', text: 'white', label: 'Ventas' },
  cobranzas: { bg: 'var(--isalwa-warning)', text: 'var(--isalwa-kiln)', label: 'Cobranzas' },
  soporte: { bg: 'var(--isalwa-info)', text: 'white', label: 'Soporte' },
};

export default async function SenalPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; channel?: string }>;
}) {
  const sp = await searchParams;

  let list: List = { items: [] };
  let detail: Detail | null = null;

  try {
    list = await apiGet<List>('/conversations?take=50');
    const id = sp.c ?? list.items[0]?.id;
    if (id) detail = await apiGet<Detail>(`/conversations/${id}`);
  } catch {
    list = { items: [] };
  }

  const activeChannel = sp.channel ?? null;
  const filteredItems = activeChannel
    ? list.items.filter((c) => c.purpose === activeChannel)
    : list.items;

  const selectedId = sp.c ?? filteredItems[0]?.id ?? list.items[0]?.id;
  const selectedItem = list.items.find((c) => c.id === selectedId) ?? null;
  const showThreadOnMobile = Boolean(sp.c);

  const totalOpen = list.items.filter((c) => c.status === 'open').length;
  const totalBreached = list.items.filter((c) => c.slaStatus === 'breached').length;
  const totalConvos = list.items.length;

  const channelCounts = list.items.reduce<Record<string, number>>((acc, c) => {
    acc[c.purpose] = (acc[c.purpose] ?? 0) + 1;
    return acc;
  }, {});
  const channelKeys = ['ventas', 'cobranzas', 'soporte'].filter((k) => (channelCounts[k] ?? 0) > 0);

  const listHref = activeChannel ? `/senal?channel=${activeChannel}` : '/senal';

  return (
    <AppShell active="/senal">
      <div className="senal-shell flex h-[calc(100dvh-57px)] flex-col overflow-hidden md:h-screen">
        <header className="shrink-0 px-4 pt-6 md:px-8 md:pt-8">
          <ExperienceHeader
            className="mb-4 md:mb-5"
            kicker="Señal"
            title={
              totalBreached > 0
                ? `${totalBreached} hilo${totalBreached !== 1 ? 's' : ''} fuera de SLA — priorizar primero`
                : 'WhatsApp como instrumento'
            }
            actions={
              <StatGroup
                items={[
                  {
                    label: 'Abiertas',
                    value: totalOpen,
                    tone: totalOpen > 0 ? 'var(--isalwa-kiln)' : 'var(--isalwa-slate)',
                  },
                  {
                    label: 'SLA vencido',
                    value: totalBreached,
                    tone: totalBreached > 0 ? 'var(--isalwa-danger)' : 'var(--isalwa-success)',
                  },
                  { label: 'Total hilos', value: totalConvos },
                ]}
              />
            }
          />

          {channelKeys.length > 0 ? (
            <div
              className="flex gap-0.5 overflow-x-auto border-b border-[var(--isalwa-mist)]"
              role="tablist"
              aria-label="Canales"
            >
              {[null, ...channelKeys].map((key) => {
                const isActive = activeChannel === key;
                const meta = key
                  ? (CH[key] ?? { label: key, bg: 'var(--isalwa-slate)', text: 'white' })
                  : null;
                const label = meta?.label ?? 'Todos';
                const count = key ? (channelCounts[key] ?? 0) : totalConvos;
                const href = key
                  ? `/senal?channel=${key}${selectedId ? `&c=${selectedId}` : ''}`
                  : `/senal${selectedId ? `?c=${selectedId}` : ''}`;

                return (
                  <Link
                    key={label}
                    href={href}
                    role="tab"
                    aria-selected={isActive}
                    {...(key === 'cobranzas' ? { 'data-tour': 'senal-cobranzas-tab' } : {})}
                    className="isalwa-t-fast flex shrink-0 items-center gap-1.5 px-4 pt-2 pb-2.5 text-[var(--isalwa-text-xs)] font-semibold tracking-[-0.01em]"
                    style={{
                      color: isActive ? 'var(--isalwa-kiln)' : 'var(--isalwa-slate)',
                      borderBottom: isActive
                        ? '2px solid var(--isalwa-glaze)'
                        : '2px solid transparent',
                      marginBottom: '-1px',
                    }}
                  >
                    {key ? (
                      <span
                        className="block h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: meta!.bg }}
                        aria-hidden
                      />
                    ) : null}
                    {label}
                    <span className="font-[var(--isalwa-font-mono)] text-[10px] opacity-60">{count}</span>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </header>

        <div className="senal-workspace mt-3 flex min-h-0 flex-1 gap-3 overflow-hidden px-4 pb-4 md:px-6 md:pb-6">
          <div
            data-tour="senal-list"
            className={`senal-list-pane flex w-full flex-col overflow-y-auto rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-soft)] md:w-[340px] md:shrink-0 ${showThreadOnMobile ? 'senal-pane-hidden-mobile' : ''}`}
          >
            {filteredItems.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8 text-center">
                <div className="max-w-xs">
                  <p className="mb-2 text-2xl opacity-20" aria-hidden>
                    ◎
                  </p>
                  <p
                    className="text-[var(--isalwa-kiln)]"
                    style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
                  >
                    Señal espera el primer hilo
                  </p>
                  <p className="mt-2 text-[var(--isalwa-text-sm)] leading-relaxed text-[var(--isalwa-slate)]">
                    Aquí viven las conversaciones de WhatsApp — ventas, cobranzas y soporte — con SLA a la vista.
                  </p>
                  <p className="mt-3 text-[var(--isalwa-text-xs)] text-[var(--isalwa-slate)]">
                    <span className="font-semibold text-[var(--isalwa-glaze)]">Ejemplo · </span>
                    Don Julio · Cobranzas · «¿Cuándo llega el pago?» · hace 12 min
                  </p>
                  <Link
                    href="/personas"
                    className="mt-4 inline-block text-[var(--isalwa-text-sm)] text-[var(--isalwa-glaze)] hover:opacity-70"
                  >
                    Abrir un cliente mientras tanto →
                  </Link>
                </div>
              </div>
            ) : (
              filteredItems.map((c) => {
                const active = c.id === selectedId;
                const pColor = priorityColor(c);
                const chMeta = CH[c.purpose] ?? {
                  bg: 'var(--isalwa-slate)',
                  text: 'white',
                  label: c.purpose,
                };
                const isOpen = c.status === 'open';
                const href = `/senal?c=${c.id}${activeChannel ? `&channel=${activeChannel}` : ''}`;

                return (
                  <Link
                    key={c.id}
                    href={href}
                    aria-current={active ? 'true' : undefined}
                    className="senal-convo-row flex items-stretch no-underline isalwa-t-fast"
                    style={{
                      background: active
                        ? 'color-mix(in srgb, var(--isalwa-glaze) 8%, white)'
                        : 'transparent',
                      borderBottom: '1px solid var(--isalwa-mist)',
                    }}
                  >
                    <div className="w-[3px] shrink-0" style={{ background: pColor }} aria-hidden />
                    <div className="min-w-0 flex-1 px-3.5 py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1 truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--isalwa-kiln)]">
                          {c.accountName}
                        </p>
                        <span
                          className="shrink-0 font-[var(--isalwa-font-mono)] text-[10px]"
                          style={{
                            color: isOpen ? pColor : 'var(--isalwa-slate)',
                            opacity: isOpen ? 1 : 0.5,
                            fontWeight: isOpen && c.slaStatus === 'breached' ? 700 : 400,
                          }}
                        >
                          {elapsed(c.lastMessageAt)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <span
                          className="rounded px-1.5 py-px text-[9px] font-bold tracking-[0.09em] uppercase"
                          style={{ background: chMeta.bg, color: chMeta.text }}
                        >
                          {chMeta.label}
                        </span>
                        {isOpen ? (
                          <span className="flex items-center gap-1 text-[9px] font-semibold text-[var(--isalwa-success)]">
                            <span className="isalwa-alive-dot block h-1.5 w-1.5 rounded-full bg-[var(--isalwa-success)]" />
                            Abierto
                          </span>
                        ) : null}
                        {c.slaStatus === 'breached' ? (
                          <span className="text-[9px] font-bold text-[var(--isalwa-danger)]">⚠ SLA</span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 truncate text-[12px] leading-snug text-[var(--isalwa-slate)] opacity-75">
                        {c.preview}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div
            className={`senal-detail-pane flex min-w-0 flex-1 flex-col overflow-hidden rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white shadow-[var(--isalwa-shadow-lift)] ${showThreadOnMobile ? '' : 'senal-pane-hidden-mobile'}`}
          >
            {showThreadOnMobile ? (
              <div className="flex items-center border-b border-[var(--isalwa-mist)] px-2 py-1.5 md:hidden">
                <Link
                  href={listHref}
                  className="isalwa-interactive flex min-h-11 items-center rounded-[var(--isalwa-radius-control)] px-3 py-2 text-[var(--isalwa-text-sm)] font-medium text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)] hover:text-[var(--isalwa-kiln)]"
                >
                  ← Bandeja
                </Link>
              </div>
            ) : null}
            {detail ? (
              <SignalConversation
                detail={detail}
                convoItem={
                  selectedItem
                    ? { status: selectedItem.status, slaStatus: selectedItem.slaStatus }
                    : null
                }
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 opacity-40">
                <p className="text-4xl leading-none">◎</p>
                <p
                  className="text-[1.2rem] text-[var(--isalwa-slate)]"
                  style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic' }}
                >
                  Seleccione una conversación
                </p>
                <p className="max-w-[220px] text-center text-[12px] leading-relaxed text-[var(--isalwa-slate)]">
                  La bandeja a la izquierda es el ritmo. El hilo a la derecha es la calma.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
