import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Panel,
  StatusPill,
  InsightCard,
  CommercialEventIcon,
  IconSpark,
  resolveCommercialEventIconKind,
} from '@isalwa/ui';
import { AppShell } from '@/components/app-shell';
import { CheckInButton } from '@/components/check-in-button';
import { AnimatedValue } from '@/components/animated-value';
import { ReadingProgress } from '@/components/reading-progress';
import { apiGet } from '@/lib/api';

// ── Full dossier type — mirrors accounts.service.ts output ───────────────────
type Dossier = {
  id: string;
  code: string;
  name: string;
  legalName: string;
  nit: string | null;
  segment: string;
  accountType: string | null;
  personaKey: string | null;
  creditStatus: string;
  creditLimit: { centavos: number; label: string } | null;
  openBalance: { label: string };
  relationshipScore: number;
  ownerName: string;
  territoryCode: string;
  netDays: number | null;
  aiSummary: string | null;
  aiSummaryEvidence: unknown;
  favoriteProducts: unknown;
  predictedNextOrder: {
    start: string | null;
    end: string | null;
    confidence: string | null;
  };
  lastVisitAt: string | null;
  lastPurchaseAt: string | null;
  lastWhatsappAt: string | null;
  contacts: Array<{
    id: string;
    name: string;
    phone: string | null;
    role: string | null;
  }>;
  locations: Array<{
    id: string;
    label: string;
    lat: number;
    lng: number;
    isPrimary: boolean;
  }>;
  recentQuotes: Array<{
    id: string;
    number: string;
    status: string;
    total: { label: string };
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: string;
    total: { label: string };
    orderedAt: string;
  }>;
  recentInvoices: Array<{
    id: string;
    number: string;
    status: string;
    total: { label: string };
    balance: { label: string };
    dueAt: string;
  }>;
  recentVisits: Array<{
    id: string;
    status: string;
    plannedAt: string;
    completedAt: string | null;
    result: string | null;
    notes: string | null;
  }>;
  conversations: Array<{
    id: string;
    channel: string;
    purpose: string | null;
    slaStatus: string | null;
    lastMessageAt: string | null;
    messages: Array<{
      id: string;
      direction: string;
      body: string;
      sentAt: string;
      senderType: string | null;
    }>;
  }>;
  priceMemory: Array<{
    productId: string;
    productName: string;
    sku: string;
    unitPrice: { label: string };
    observedAt: string;
    source: string | null;
  }>;
};

type Timeline = {
  items: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    occurredAt: string;
  }>;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--isalwa-success)';
  if (score >= 60) return 'var(--isalwa-warning)';
  return 'var(--isalwa-danger)';
}

function creditTone(status: string): 'success' | 'warning' | 'danger' {
  if (status === 'ok') return 'success';
  if (status === 'at_risk' || status === 'watch') return 'warning';
  return 'danger';
}

function creditLabel(status: string): string {
  if (status === 'ok')      return 'Crédito al día';
  if (status === 'at_risk' || status === 'watch') return 'En vigilancia';
  if (status === 'hold')    return 'Bloqueado';
  return status;
}

function invoiceLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'paid')    return 'Pagado';
  if (s === 'overdue') return 'Vencido';
  if (s === 'partial') return 'Parcial';
  if (s === 'open')    return 'Abierto';
  if (s === 'draft')   return 'Borrador';
  return status;
}

function quoteLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'draft')    return 'Borrador';
  if (s === 'sent')     return 'Enviado';
  if (s === 'accepted') return 'Aceptado';
  if (s === 'rejected') return 'Rechazado';
  return status;
}

function relativeDate(iso: string | null): string {
  if (!iso) return 'Sin registro';
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return 'Hoy';
  if (d === 1) return 'Ayer';
  if (d < 7) return `Hace ${d} días`;
  if (d < 30) return `Hace ${Math.floor(d / 7)} sem.`;
  if (d < 365) return `Hace ${Math.floor(d / 30)} mes.`;
  return `Hace ${Math.floor(d / 365)} año`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-BO', {
    day: 'numeric',
    month: 'short',
  });
}

function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-BO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function visitTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'done') return 'success';
  if (s === 'missed' || s === 'no_show') return 'danger';
  return 'neutral';
}

function invoiceTone(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'paid') return 'success';
  if (s === 'overdue') return 'danger';
  if (s === 'partial') return 'warning';
  return 'neutral';
}

// ── Timeline event visual config ─────────────────────────────────────────────
// Keys match the dot-notation types from activityEvent.type (e.g. "visit.completed")
// We match by prefix so any visit.* / invoice.* variant resolves correctly.
const TIMELINE_EVENT_PREFIXES: Array<{
  prefix: string;
  color: string;
  bg: string;
}> = [
  { prefix: 'visit',    color: 'var(--isalwa-glaze)',   bg: 'color-mix(in srgb, var(--isalwa-glaze) 13%, white)' },
  { prefix: 'invoice',  color: 'var(--isalwa-slate)',   bg: 'color-mix(in srgb, var(--isalwa-slate) 10%, white)' },
  { prefix: 'quote',    color: 'var(--isalwa-info)',    bg: 'color-mix(in srgb, var(--isalwa-info) 13%, white)' },
  { prefix: 'payment',  color: 'var(--isalwa-success)', bg: 'color-mix(in srgb, var(--isalwa-success) 12%, white)' },
  { prefix: 'order',    color: 'var(--isalwa-copper)',  bg: 'color-mix(in srgb, var(--isalwa-copper) 12%, white)' },
  { prefix: 'whatsapp', color: 'var(--isalwa-glaze)',   bg: 'color-mix(in srgb, var(--isalwa-glaze) 9%, white)' },
  { prefix: 'message',  color: 'var(--isalwa-glaze)',   bg: 'color-mix(in srgb, var(--isalwa-glaze) 9%, white)' },
];

// Maps known raw API body strings from timeline events to Spanish
const BODY_TRANSLATIONS: Record<string, string> = {
  sold:           'Venta cerrada',
  not_available:  'Sin disponibilidad',
  follow_up:      'Seguimiento',
  quoted:         'Cotizado',
  pending:        'Pendiente',
  cancelled:      'Cancelado',
  accepted:       'Aceptado',
  rejected:       'Rechazado',
  paid:           'Pagado',
  overdue:        'Vencido',
};

function translateBody(raw: string): string {
  // Handle "Estado: accepted" style patterns from quote events
  return raw.replace(/\b(sold|not_available|follow_up|quoted|pending|cancelled|accepted|rejected|paid|overdue)\b/gi,
    (match) => BODY_TRANSLATIONS[match.toLowerCase()] ?? match);
}

function getEventMeta(type: string) {
  const t = type.toLowerCase();
  return (
    TIMELINE_EVENT_PREFIXES.find((e) => t.startsWith(e.prefix)) ?? {
      color: 'var(--isalwa-slate)',
      bg: 'var(--isalwa-mist)',
    }
  );
}

// ── Relationship score — SVG gauge (semicircle) ───────────────────────────────
function ScoreGauge({ score }: { score: number }) {
  const r = 34;
  const arc = Math.PI * r;
  const clamped = Math.min(100, Math.max(0, score));
  const dashoffset = arc * (1 - clamped / 100);
  const color = scoreColor(score);
  const d = `M 16 44 A ${r} ${r} 0 0 0 84 44`;

  return (
    <svg
      width="100"
      height="50"
      viewBox="0 0 100 50"
      aria-hidden
      focusable="false"
      style={{ display: 'block', margin: '0 auto' }}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--isalwa-mist)"
        strokeWidth="6"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={arc}
        strokeDashoffset={dashoffset}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function DossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let dossier: Dossier | null = null;
  let timeline: Timeline = { items: [] };

  try {
    [dossier, timeline] = await Promise.all([
      apiGet<Dossier>(`/accounts/${id}`),
      apiGet<Timeline>(`/accounts/${id}/timeline`),
    ]);
  } catch {
    notFound();
  }
  if (!dossier) notFound();

  // Derived values
  const evidence = Array.isArray(dossier.aiSummaryEvidence)
    ? (dossier.aiSummaryEvidence as string[])
    : [];

  const lastActivity =
    [dossier.lastVisitAt, dossier.lastPurchaseAt, dossier.lastWhatsappAt]
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] ?? null;

  const sColor = scoreColor(dossier.relationshipScore);

  const hasPrediction =
    dossier.predictedNextOrder.confidence !== null &&
    dossier.predictedNextOrder.start !== null;

  const primaryContact = dossier.contacts[0] ?? null;
  const recentConv = dossier.conversations[0] ?? null;

  return (
    <AppShell active="/personas">
      <ReadingProgress />

      {/* ── Sticky identity bar ────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 border-b border-[var(--isalwa-mist)] backdrop-blur-md"
        style={{
          background: 'color-mix(in srgb, var(--isalwa-porcelain) 90%, white)',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 md:px-8">

          {/* Left: back navigation + compressed identity */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/personas"
              className="shrink-0 rounded-[var(--isalwa-radius-control)] px-2 py-1.5 text-xs font-medium text-[var(--isalwa-slate)] transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-mist)] hover:text-[var(--isalwa-kiln)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              ← Personas
            </Link>
            <span
              aria-hidden
              style={{
                display: 'block',
                width: 1,
                height: 16,
                background: 'var(--isalwa-mist)',
                flexShrink: 0,
              }}
            />
            <div className="min-w-0">
              <p
                className="truncate"
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--isalwa-font-mono)',
                  color: 'var(--isalwa-slate)',
                  letterSpacing: '0.08em',
                }}
              >
                {dossier.code}
              </p>
              <p
                className="truncate"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--isalwa-kiln)',
                  letterSpacing: '-0.01em',
                }}
              >
                {dossier.name}
              </p>
            </div>
          </div>

          {/* Right: primary actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/cierre?account=${dossier.id}`}
              className="rounded-[var(--isalwa-radius-control)] bg-[var(--isalwa-glaze)] px-4 py-2 text-sm font-medium text-white cursor-pointer transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-glaze-deep)] active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              Cotizar
            </Link>
            <CheckInButton accountId={dossier.id} />
            <Link
              href="/senal"
              className="rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] cursor-pointer transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:border-[var(--isalwa-glaze)] hover:text-[var(--isalwa-glaze)] focus-visible:outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]"
            >
              WhatsApp
            </Link>
          </div>
        </div>
      </div>

      <main className="isalwa-page pt-6 md:pt-8">

        {/* ── Customer hero ──────────────────────────────────────────────────── */}
        <header className="isalwa-enter mb-8">

          {/* Metadata — code, legal name, NIT, contact */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span
              style={{
                fontSize: 11,
                fontFamily: 'var(--isalwa-font-mono)',
                color: 'var(--isalwa-slate)',
                letterSpacing: '0.06em',
              }}
            >
              {dossier.legalName}
            </span>
            {dossier.nit && (
              <>
                <span style={{ fontSize: 10, color: 'var(--isalwa-mist)' }}>·</span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--isalwa-font-mono)',
                    color: 'var(--isalwa-slate)',
                  }}
                >
                  NIT {dossier.nit}
                </span>
              </>
            )}
            {primaryContact?.phone && (
              <>
                <span style={{ fontSize: 10, color: 'var(--isalwa-mist)' }}>·</span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--isalwa-font-mono)',
                    color: 'var(--isalwa-slate)',
                  }}
                >
                  {primaryContact.phone}
                </span>
              </>
            )}
          </div>

          {/* Name — Newsreader italic. This is the relationship. */}
          <h1
            style={{
              fontFamily: 'var(--isalwa-font-display)',
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 'clamp(1.6rem, 3vw, 2.5rem)',
              lineHeight: 1.17,
              color: 'var(--isalwa-kiln)',
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {dossier.name}
          </h1>

          {/* Status pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            <StatusPill tone="info">Seg. {dossier.segment}</StatusPill>
            <StatusPill tone={creditTone(dossier.creditStatus)}>
              {creditLabel(dossier.creditStatus)}
            </StatusPill>
            {dossier.netDays ? (
              <StatusPill tone="neutral">{dossier.netDays} días neto</StatusPill>
            ) : null}
            <StatusPill tone="neutral">
              {dossier.ownerName} · {dossier.territoryCode}
            </StatusPill>
          </div>

          {/* AI summary — editorial voice, Newsreader italic */}
          {dossier.aiSummary && (
            <InsightCard className="mt-6">{dossier.aiSummary}</InsightCard>
          )}

          {/* Evidence chips */}
          {evidence.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {evidence.slice(0, 5).map((e) => (
                <StatusPill key={e} tone="neutral">{e}</StatusPill>
              ))}
            </div>
          )}
        </header>

        {/* ── Vitals strip — 3 numbers that answer "how are we doing?" ──────── */}
        <div
          className="isalwa-enter isalwa-enter-delay-1 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3"
          role="region"
          aria-label="Indicadores clave"
        >
          {/* Relationship score gauge */}
          <Panel style={{ padding: 0, textAlign: 'center' as const }}>
            <div style={{ padding: '14px 12px 12px' }}>
              <ScoreGauge score={dossier.relationshipScore} />
              <p
                style={{
                  fontFamily: 'var(--isalwa-font-mono)',
                  fontSize: 24,
                  fontWeight: 600,
                  color: sColor,
                  lineHeight: 1,
                  marginTop: -2,
                }}
              >
                {dossier.relationshipScore}
              </p>
              <p
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--isalwa-slate)',
                  marginTop: 5,
                }}
              >
                Relación
              </p>
            </div>
          </Panel>

          {/* Open balance */}
          <Panel style={{ padding: '16px 16px 14px' }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: 'var(--isalwa-slate)',
                margin: 0,
              }}
            >
              Saldo abierto
            </p>
            <p
              style={{
                marginTop: 10,
                fontFamily: 'var(--isalwa-font-mono)',
                fontSize: 'clamp(14px, 1.5vw, 20px)',
                fontWeight: 500,
                color: 'var(--isalwa-kiln)',
                whiteSpace: 'nowrap' as const,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              <AnimatedValue value={dossier.openBalance.label} />
            </p>
            {dossier.creditLimit && (
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--isalwa-slate)' }}>
                Límite {dossier.creditLimit.label}
              </p>
            )}
          </Panel>

          {/* Last activity */}
          <Panel style={{ padding: '16px 16px 14px' }}>
            <p
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: 'var(--isalwa-slate)',
                margin: 0,
              }}
            >
              Último contacto
            </p>
            <p
              style={{
                marginTop: 10,
                fontFamily: 'var(--isalwa-font-mono)',
                fontSize: 'clamp(13px, 1.4vw, 18px)',
                fontWeight: 500,
                color: 'var(--isalwa-kiln)',
                lineHeight: 1.15,
                letterSpacing: '-0.01em',
              }}
            >
              {relativeDate(lastActivity)}
            </p>
            {dossier.lastPurchaseAt && (
              <p style={{ marginTop: 6, fontSize: 11, color: 'var(--isalwa-slate)' }}>
                Compra {relativeDate(dossier.lastPurchaseAt)}
              </p>
            )}
          </Panel>
        </div>

        {/* ── Predicted next order ───────────────────────────────────────────── */}
        {hasPrediction && (
          <div
            className="isalwa-enter isalwa-enter-delay-2 mb-5"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 16px',
              borderRadius: 'var(--isalwa-radius-control)',
              background: 'color-mix(in srgb, var(--isalwa-info) 7%, white)',
              border: '1px solid color-mix(in srgb, var(--isalwa-info) 16%, white)',
            }}
          >
            <span
              aria-hidden
              style={{
                color: 'var(--isalwa-info)',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              <IconSpark size={15} />
            </span>
            <p style={{ fontSize: 13, color: 'var(--isalwa-kiln)', margin: 0, flex: 1 }}>
              <span style={{ fontWeight: 600 }}>Próximo pedido predicho:</span>{' '}
              {dossier.predictedNextOrder.start
                ? shortDate(dossier.predictedNextOrder.start)
                : '—'}
              {dossier.predictedNextOrder.end
                ? ` – ${shortDate(dossier.predictedNextOrder.end)}`
                : ''}
            </p>
            <StatusPill tone="info" style={{ flexShrink: 0 }}>
              {dossier.predictedNextOrder.confidence}
            </StatusPill>
          </div>
        )}

        {/* ── Main grid — Timeline + Sidebar ────────────────────────────────── */}
        <div className="isalwa-enter isalwa-enter-delay-2 grid gap-5 xl:grid-cols-[1fr_296px]">

          {/* ── Timeline ───────────────────────────────────────────────────── */}
          <section
            aria-label="Actividad"
            style={{
              background: 'var(--isalwa-white)',
              border: '1px solid var(--isalwa-mist)',
              borderRadius: 'var(--isalwa-radius-panel)',
              boxShadow: 'var(--isalwa-shadow-soft)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 24px',
                borderBottom: '1px solid var(--isalwa-mist)',
              }}
            >
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--isalwa-kiln)',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Actividad
              </h2>
              {timeline.items.length > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--isalwa-font-mono)',
                    color: 'var(--isalwa-slate)',
                  }}
                >
                  {Math.min(timeline.items.length, 14)} eventos
                </span>
              )}
            </div>

            {/* Events list */}
            {timeline.items.length === 0 ? (
              <div style={{ padding: '32px 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--isalwa-slate)', margin: 0 }}>
                  Sin actividad registrada aún.
                </p>
              </div>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: '8px 0 12px',
                  listStyle: 'none',
                  position: 'relative',
                }}
              >
                {/* Vertical connector behind all events */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 40,
                    top: 20,
                    bottom: 20,
                    width: 1,
                    background: 'var(--isalwa-mist)',
                    zIndex: 0,
                  }}
                />

                {timeline.items.slice(0, 14).map((ev) => {
                  const meta = getEventMeta(ev.type);
                  return (
                    <li
                      key={ev.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 14,
                        padding: '11px 24px',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {/* Event type icon — sits above the connector line */}
                      <div
                        aria-hidden
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: meta.bg,
                          color: meta.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          border: '2px solid var(--isalwa-white)',
                          boxShadow: '0 0 0 1px var(--isalwa-mist)',
                        }}
                      >
                        <CommercialEventIcon
                          kind={resolveCommercialEventIconKind(ev.type)}
                          size={15}
                        />
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--isalwa-kiln)',
                              letterSpacing: '-0.01em',
                              margin: 0,
                              lineHeight: 1.3,
                            }}
                          >
                            {ev.title}
                          </p>
                          <span
                            style={{
                              fontSize: 10,
                              fontFamily: 'var(--isalwa-font-mono)',
                              color: 'var(--isalwa-slate)',
                              flexShrink: 0,
                              letterSpacing: '0.04em',
                              paddingTop: 1,
                            }}
                          >
                            {shortDate(ev.occurredAt)}
                          </span>
                        </div>
                        {ev.body && (
                          <p
                            style={{
                              marginTop: 3,
                              fontSize: 12,
                              color: 'var(--isalwa-slate)',
                              lineHeight: 1.4,
                            }}
                          >
                            {translateBody(ev.body)}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── Sidebar ────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Dinero en movimiento */}
            <section
              aria-label="Finanzas"
              style={{
                background: 'var(--isalwa-white)',
                border: '1px solid var(--isalwa-mist)',
                borderRadius: 'var(--isalwa-radius-panel)',
                boxShadow: 'var(--isalwa-shadow-soft)',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px 20px 12px' }}>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--isalwa-slate)',
                    margin: 0,
                  }}
                >
                  Dinero en movimiento
                </p>
                <p
                  style={{
                    marginTop: 8,
                    fontFamily: 'var(--isalwa-font-mono)',
                    fontSize: 22,
                    fontWeight: 500,
                    color: 'var(--isalwa-kiln)',
                    letterSpacing: '-0.02em',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  <AnimatedValue value={dossier.openBalance.label} />
                </p>
                <p style={{ marginTop: 4, fontSize: 11, color: 'var(--isalwa-slate)' }}>
                  Saldo abierto en facturas
                </p>
              </div>

              {/* Invoices */}
              {dossier.recentInvoices.length > 0 && (
                <ul
                  style={{
                    margin: 0,
                    padding: '4px 0',
                    listStyle: 'none',
                    borderTop: '1px solid var(--isalwa-mist)',
                  }}
                >
                  {dossier.recentInvoices.slice(0, 5).map((inv) => (
                    <li key={inv.id}>
                      <Link
                        href={`/cierre/facturas/${inv.id}`}
                        className="group flex items-center justify-between gap-2 px-5 py-2.5 transition-colors duration-[var(--isalwa-motion-fast)] ease-[var(--isalwa-ease-out)] hover:bg-[var(--isalwa-porcelain)] focus-visible:outline-none focus-visible:bg-[var(--isalwa-porcelain)]"
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'var(--isalwa-font-mono)',
                            color: 'var(--isalwa-kiln)',
                            fontWeight: 500,
                          }}
                        >
                          {inv.number}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 7,
                            flexShrink: 0,
                          }}
                        >
                          <StatusPill tone={invoiceTone(inv.status)}>
                            {invoiceLabel(inv.status)}
                          </StatusPill>
                          <span
                            style={{
                              fontFamily: 'var(--isalwa-font-mono)',
                              fontSize: 12,
                              fontVariantNumeric: 'tabular-nums',
                              color: 'var(--isalwa-kiln)',
                            }}
                          >
                            {inv.balance.label}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}

              {/* Last quote */}
              {dossier.recentQuotes[0] && (
                <div
                  style={{
                    padding: '10px 20px 14px',
                    borderTop: '1px solid var(--isalwa-mist)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 11, color: 'var(--isalwa-slate)' }}>
                    Última cotización
                  </span>
                  <Link
                    href={`/cierre/cotizaciones/${dossier.recentQuotes[0].id}`}
                    className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                    style={{ fontSize: 12, color: 'var(--isalwa-glaze)', fontWeight: 500 }}
                  >
                    {dossier.recentQuotes[0].number} →
                  </Link>
                </div>
              )}
            </section>

            {/* Precios negociados */}
            {dossier.priceMemory.length > 0 && (
              <section
                aria-label="Precios negociados"
                style={{
                  background: 'var(--isalwa-white)',
                  border: '1px solid var(--isalwa-mist)',
                  borderRadius: 'var(--isalwa-radius-panel)',
                  boxShadow: 'var(--isalwa-shadow-soft)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--isalwa-mist)',
                  }}
                >
                  <h2
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--isalwa-kiln)',
                      letterSpacing: '-0.01em',
                      margin: 0,
                    }}
                  >
                    Precios negociados
                  </h2>
                  <Link
                    href={`/cierre?account=${dossier.id}`}
                    className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                    style={{ fontSize: 12, color: 'var(--isalwa-glaze)', fontWeight: 500 }}
                  >
                    Usar →
                  </Link>
                </div>
                <ul style={{ margin: 0, padding: '4px 0 8px', listStyle: 'none' }}>
                  {dossier.priceMemory.slice(0, 6).map((p, i) => (
                    <li
                      key={`${p.sku}-${i}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 20px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--isalwa-kiln)',
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {p.productName}
                      </span>
                      <div style={{ flexShrink: 0, textAlign: 'right' as const }}>
                        <div
                          style={{
                            fontFamily: 'var(--isalwa-font-mono)',
                            fontSize: 12,
                            fontWeight: 500,
                            color: 'var(--isalwa-kiln)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {p.unitPrice.label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--isalwa-slate)',
                            fontFamily: 'var(--isalwa-font-mono)',
                          }}
                        >
                          {shortDate(p.observedAt)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>

        {/* ── Bottom grid — Visits + WhatsApp signal ─────────────────────────── */}
        <div className="isalwa-enter isalwa-enter-delay-3 mt-5 grid gap-4 md:grid-cols-2">

          {/* Visits */}
          <section
            aria-label="Visitas recientes"
            style={{
              background: 'var(--isalwa-white)',
              border: '1px solid var(--isalwa-mist)',
              borderRadius: 'var(--isalwa-radius-panel)',
              boxShadow: 'var(--isalwa-shadow-soft)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '14px 20px',
                borderBottom: '1px solid var(--isalwa-mist)',
              }}
            >
              <h2
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--isalwa-kiln)',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Visitas
              </h2>
              <CheckInButton accountId={dossier.id} />
            </div>

            {dossier.recentVisits.length === 0 ? (
              <p style={{ padding: '20px', fontSize: 13, color: 'var(--isalwa-slate)', margin: 0 }}>
                Sin visitas registradas.
              </p>
            ) : (
              <ul style={{ margin: 0, padding: '4px 0 8px', listStyle: 'none' }}>
                {dossier.recentVisits.slice(0, 7).map((v, i) => (
                  <li
                    key={v.id ?? `${v.plannedAt}-${i}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 20px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--isalwa-font-mono)',
                        fontSize: 11,
                        color: 'var(--isalwa-slate)',
                        flexShrink: 0,
                        letterSpacing: '0.02em',
                        minWidth: 52,
                      }}
                    >
                      {shortDate(v.plannedAt)}
                    </span>
                    <StatusPill tone={visitTone(v.status)} style={{ flexShrink: 0 }}>
                      {v.status === 'completed' || v.status === 'done' ? 'Realizada'
                        : v.status === 'missed' || v.status === 'no_show' ? 'No show'
                        : v.status === 'scheduled' ? 'Agendada'
                        : v.status}
                    </StatusPill>
                    {v.result && (
                      <span
                        style={{
                          fontSize: 12,
                          color: 'var(--isalwa-slate)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap' as const,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        {translateBody(v.result)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* WhatsApp conversation bubbles */}
          <section
            aria-label="Conversación reciente"
            style={{
              background: 'var(--isalwa-white)',
              border: '1px solid var(--isalwa-mist)',
              borderRadius: 'var(--isalwa-radius-panel)',
              boxShadow: 'var(--isalwa-shadow-soft)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '14px 20px',
                borderBottom: '1px solid var(--isalwa-mist)',
                flexShrink: 0,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--isalwa-kiln)',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  Señal reciente
                </h2>
                {recentConv && (
                  <p style={{ fontSize: 11, color: 'var(--isalwa-slate)', marginTop: 1 }}>
                    {recentConv.channel === 'whatsapp' ? 'WhatsApp'
                      : recentConv.channel === 'ventas' ? 'Ventas'
                      : recentConv.channel === 'cobranzas' ? 'Cobranzas'
                      : recentConv.channel === 'soporte' ? 'Soporte'
                      : recentConv.channel}
                  </p>
                )}
              </div>
              <Link
                href="/senal"
                className="transition-opacity duration-[var(--isalwa-motion-fast)] hover:opacity-70"
                style={{ fontSize: 12, color: 'var(--isalwa-glaze)', fontWeight: 500, flexShrink: 0 }}
              >
                Abrir Señal →
              </Link>
            </div>

            {!recentConv || recentConv.messages.length === 0 ? (
              <p style={{ padding: '20px', fontSize: 13, color: 'var(--isalwa-slate)', margin: 0 }}>
                Sin conversaciones recientes.
              </p>
            ) : (
              <ul
                style={{
                  margin: 0,
                  padding: '16px',
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  flex: 1,
                  overflowY: 'auto',
                }}
              >
                {recentConv.messages.slice(-5).map((m, i) => {
                  const isOut = m.direction === 'out';
                  return (
                    <li
                      key={m.id ?? `${m.sentAt}-${i}`}
                      style={{
                        display: 'flex',
                        flexDirection: isOut ? 'row-reverse' : 'row',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '82%',
                          padding: '8px 12px',
                          borderRadius: isOut
                            ? '12px 12px 2px 12px'
                            : '12px 12px 12px 2px',
                          background: isOut
                            ? 'color-mix(in srgb, var(--isalwa-glaze) 11%, white)'
                            : 'var(--isalwa-porcelain)',
                          border: isOut
                            ? '1px solid color-mix(in srgb, var(--isalwa-glaze) 20%, white)'
                            : '1px solid var(--isalwa-mist)',
                        }}
                      >
                        {/* Sender label */}
                        <p
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase' as const,
                            color: isOut ? 'var(--isalwa-glaze)' : 'var(--isalwa-slate)',
                            marginBottom: 4,
                            textAlign: isOut ? 'right' as const : 'left' as const,
                          }}
                        >
                          {isOut ? 'ISALWA' : 'Cliente'}
                        </p>

                        {/* Message body */}
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--isalwa-kiln)',
                            lineHeight: 1.45,
                            margin: 0,
                          }}
                        >
                          {m.body}
                        </p>

                        {/* Timestamp */}
                        <p
                          style={{
                            fontSize: 10,
                            fontFamily: 'var(--isalwa-font-mono)',
                            color: 'var(--isalwa-slate)',
                            marginTop: 5,
                            textAlign: isOut ? 'right' as const : 'left' as const,
                          }}
                        >
                          {shortTime(m.sentAt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
