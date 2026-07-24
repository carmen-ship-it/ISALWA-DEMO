import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { SignalConversation } from '@/components/signal-conversation';
import { apiGet } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type ConvoItem = {
  id:            string;
  accountId:     string | null;
  accountName:   string;
  channel:       string;
  purpose:       string;
  status:        string;
  slaStatus:     string | null;
  lastMessageAt: string;
  preview:       string;
  href:          string;
};

type List = { items: ConvoItem[] };

type Detail = {
  id:          string;
  accountId:   string | null;
  accountName: string | null;
  channel:     string;
  purpose:     string | null;
  slaStatus:   string | null;
  messages:    Array<{
    id:         string;
    direction:  string;
    body:       string;
    sentAt:     string;
    senderType: string | null;
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'ahora';
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
  ventas:    { bg: 'var(--isalwa-glaze)',   text: 'white',                 label: 'Ventas'    },
  cobranzas: { bg: 'var(--isalwa-warning)', text: 'var(--isalwa-kiln)',    label: 'Cobranzas' },
  soporte:   { bg: 'var(--isalwa-info)',    text: 'white',                 label: 'Soporte'   },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SenalPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; channel?: string }>;
}) {
  const sp = await searchParams;

  let list:   List   = { items: [] };
  let detail: Detail | null = null;

  try {
    list = await apiGet<List>('/conversations?take=50');
    const id = sp.c ?? list.items[0]?.id;
    if (id) detail = await apiGet<Detail>(`/conversations/${id}`);
  } catch {
    list = { items: [] };
  }

  // ── Channel filter ──────────────────────────────────────────────────────
  const activeChannel = sp.channel ?? null;
  const filteredItems = activeChannel
    ? list.items.filter((c) => c.purpose === activeChannel)
    : list.items;

  const selectedId   = sp.c ?? filteredItems[0]?.id ?? list.items[0]?.id;
  const selectedItem = list.items.find((c) => c.id === selectedId) ?? null;

  // ── Stats ────────────────────────────────────────────────────────────────
  const totalOpen   = list.items.filter((c) => c.status === 'open').length;
  const totalBreached = list.items.filter((c) => c.slaStatus === 'breached').length;
  const totalConvos = list.items.length;

  // ── Channel tab counts ───────────────────────────────────────────────────
  const channelCounts = list.items.reduce<Record<string, number>>((acc, c) => {
    acc[c.purpose] = (acc[c.purpose] ?? 0) + 1;
    return acc;
  }, {});
  const channelKeys = ['ventas', 'cobranzas', 'soporte'].filter(
    (k) => (channelCounts[k] ?? 0) > 0,
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AppShell active="/senal">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <header style={{ flexShrink: 0, padding: '24px 32px 0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
            {/* Kicker + title */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--isalwa-glaze)', margin: 0 }}>
                Señal
              </p>
              <h1 style={{
                fontFamily:    'var(--isalwa-font-display)',
                fontStyle:     'italic',
                fontWeight:    400,
                fontSize:      'clamp(1.2rem, 2vw, 1.7rem)',
                color:         'var(--isalwa-kiln)',
                letterSpacing: '-0.01em',
                lineHeight:    1.2,
                marginTop:     7,
              }}>
                {totalBreached > 0
                  ? `${totalBreached} hilo${totalBreached !== 1 ? 's' : ''} fuera de SLA — priorizar primero`
                  : 'WhatsApp como instrumento'}
              </h1>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
              {([
                { label: 'Abiertas',   value: totalOpen,     color: totalOpen > 0 ? 'var(--isalwa-kiln)' : 'var(--isalwa-slate)' },
                { label: 'SLA vencido', value: totalBreached, color: totalBreached > 0 ? 'var(--isalwa-danger)' : 'var(--isalwa-success)' },
                { label: 'Total hilos', value: totalConvos,   color: 'var(--isalwa-kiln)' },
              ] as const).map((s) => (
                <div key={s.label} style={{ padding: '8px 14px', background: 'white', border: '1px solid var(--isalwa-mist)', borderRadius: 'var(--isalwa-radius-control)', textAlign: 'center', boxShadow: 'var(--isalwa-shadow-soft)' }}>
                  <p style={{ fontSize: 18, fontFamily: 'var(--isalwa-font-mono)', fontWeight: 600, color: s.color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1, margin: 0 }}>
                    {s.value}
                  </p>
                  <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--isalwa-slate)', marginTop: 4 }}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Channel tabs ────────────────────────────────────────────── */}
          {channelKeys.length > 0 && (
            <div style={{ display: 'flex', gap: 2, marginTop: 16, borderBottom: '1px solid var(--isalwa-mist)', paddingBottom: 0 }}>
              {/* Todos tab */}
              {[null, ...channelKeys].map((key) => {
                const isActive  = activeChannel === key;
                const meta      = key ? (CH[key] ?? { label: key, bg: 'var(--isalwa-slate)', text: 'white' }) : null;
                const label     = meta?.label ?? 'Todos';
                const count     = key ? (channelCounts[key] ?? 0) : totalConvos;
                const href      = key
                  ? `/senal?channel=${key}${selectedId ? `&c=${selectedId}` : ''}`
                  : `/senal${selectedId ? `?c=${selectedId}` : ''}`;

                return (
                  <Link
                    key={label}
                    href={href}
                    {...(key === 'cobranzas' ? { 'data-tour': 'senal-cobranzas-tab' } : {})}
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      gap:           6,
                      padding:       '8px 16px 9px',
                      fontSize:      12,
                      fontWeight:    600,
                      letterSpacing: '-0.01em',
                      color:         isActive ? 'var(--isalwa-kiln)' : 'var(--isalwa-slate)',
                      borderBottom:  isActive ? '2px solid var(--isalwa-glaze)' : '2px solid transparent',
                      marginBottom:  '-1px',
                      transition:    'color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                      textDecoration:'none',
                    }}
                  >
                    {key && (
                      <span style={{
                        width:        7,
                        height:       7,
                        borderRadius: '50%',
                        background:   meta!.bg,
                        display:      'block',
                        flexShrink:   0,
                      }} />
                    )}
                    {label}
                    <span style={{
                      fontFamily:  'var(--isalwa-font-mono)',
                      fontSize:    10,
                      opacity:     isActive ? 0.7 : 0.4,
                      fontVariantNumeric: 'tabular-nums',
                    }}>
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </header>

        {/* ── Two-column workspace ────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '0 24px 24px', gap: 12, marginTop: 12 }}>

          {/* ── Left: conversation list ──────────────────────────────────── */}
          <div
            data-tour="senal-list"
            style={{
              width:        340,
              flexShrink:   0,
              overflowY:    'auto',
              background:   'white',
              border:       '1px solid var(--isalwa-mist)',
              borderRadius: 'var(--isalwa-radius-panel)',
              boxShadow:    'var(--isalwa-shadow-soft)',
              display:      'flex',
              flexDirection:'column',
            }}>
            {filteredItems.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <div>
                  <p style={{ fontSize: 24, opacity: 0.18, marginBottom: 10 }}>◎</p>
                  <p style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', color: 'var(--isalwa-slate)', fontSize: '1rem' }}>
                    Sin conversaciones
                  </p>
                </div>
              </div>
            ) : (
              filteredItems.map((c) => {
                const active  = c.id === selectedId;
                const pColor  = priorityColor(c);
                const chMeta  = CH[c.purpose] ?? { bg: 'var(--isalwa-slate)', text: 'white', label: c.purpose };
                const isOpen  = c.status === 'open';
                const href    = `/senal?c=${c.id}${activeChannel ? `&channel=${activeChannel}` : ''}`;

                return (
                  <Link
                    key={c.id}
                    href={href}
                    aria-current={active ? 'true' : undefined}
                    className="senal-convo-row"
                    style={{
                      display:        'flex',
                      alignItems:     'stretch',
                      textDecoration: 'none',
                      background:     active
                        ? 'color-mix(in srgb, var(--isalwa-glaze) 8%, white)'
                        : 'transparent',
                      borderBottom:   '1px solid var(--isalwa-mist)',
                      transition:     'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                    }}
                  >
                    {/* Priority bar */}
                    <div style={{
                      width:        3,
                      flexShrink:   0,
                      background:   pColor,
                      borderRadius: active ? 0 : '0',
                      transition:   'background-color var(--isalwa-motion-base) var(--isalwa-ease-out)',
                    }} />

                    {/* Content */}
                    <div style={{ flex: 1, padding: '11px 13px', minWidth: 0 }}>
                      {/* Row 1: name + time */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
                        <p style={{
                          fontWeight:   600,
                          fontSize:     13,
                          color:        'var(--isalwa-kiln)',
                          margin:       0,
                          overflow:     'hidden',
                          whiteSpace:   'nowrap',
                          textOverflow: 'ellipsis',
                          flex:         1,
                          letterSpacing:'-0.01em',
                        }}>
                          {c.accountName}
                        </p>
                        <span style={{
                          fontFamily:  'var(--isalwa-font-mono)',
                          fontSize:    10,
                          color:       isOpen ? pColor : 'var(--isalwa-slate)',
                          flexShrink:  0,
                          opacity:     isOpen ? 1 : 0.5,
                          fontWeight:  isOpen && c.slaStatus === 'breached' ? 700 : 400,
                        }}>
                          {elapsed(c.lastMessageAt)}
                        </span>
                      </div>

                      {/* Row 2: channel badge + purpose */}
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, alignItems: 'center' }}>
                        <span style={{
                          fontSize:      9,
                          fontWeight:    700,
                          letterSpacing: '0.09em',
                          textTransform: 'uppercase',
                          padding:       '1px 6px',
                          borderRadius:  4,
                          background:    chMeta.bg,
                          color:         chMeta.text,
                          flexShrink:    0,
                        }}>
                          {chMeta.label}
                        </span>
                        {isOpen && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span className="isalwa-alive-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--isalwa-success)', display: 'block' }} />
                            <span style={{ fontSize: 9, color: 'var(--isalwa-success)', fontWeight: 600 }}>Abierto</span>
                          </span>
                        )}
                        {c.slaStatus === 'breached' && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--isalwa-danger)' }}>⚠ SLA</span>
                        )}
                      </div>

                      {/* Row 3: preview */}
                      <p style={{
                        fontSize:     12,
                        color:        'var(--isalwa-slate)',
                        marginTop:    5,
                        overflow:     'hidden',
                        whiteSpace:   'nowrap',
                        textOverflow: 'ellipsis',
                        lineHeight:   1.4,
                        opacity:      0.75,
                      }}>
                        {c.preview}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          {/* ── Right: conversation detail ──────────────────────────────── */}
          <div style={{
            flex:         1,
            overflow:     'hidden',
            background:   'white',
            border:       '1px solid var(--isalwa-mist)',
            borderRadius: 'var(--isalwa-radius-panel)',
            boxShadow:    'var(--isalwa-shadow-lift)',
            display:      'flex',
            flexDirection:'column',
          }}>
            {detail ? (
              <SignalConversation
                detail={detail}
                convoItem={selectedItem ? {
                  status:    selectedItem.status,
                  slaStatus: selectedItem.slaStatus,
                } : null}
              />
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 48, opacity: 0.4 }}>
                <p style={{ fontSize: 36, lineHeight: 1 }}>◎</p>
                <p style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--isalwa-slate)' }}>
                  Seleccione una conversación
                </p>
                <p style={{ fontSize: 12, color: 'var(--isalwa-slate)', textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
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
