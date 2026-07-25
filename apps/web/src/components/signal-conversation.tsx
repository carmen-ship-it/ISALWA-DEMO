'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

type Msg = {
  id:         string;
  direction:  string;
  body:       string;
  sentAt:     string;
  senderType: string | null;
};

type Detail = {
  id:          string;
  accountId:   string | null;
  accountName: string | null;
  channel:     string;
  purpose:     string | null;
  slaStatus:   string | null;
  messages:    Msg[];
};

type ConvoItem = {
  status:    string;
  slaStatus: string | null;
};

// ── Suggested replies per channel ────────────────────────────────────────────

const REPLIES: Record<string, string[]> = {
  ventas: [
    '¿Le preparo una cotización con precios actuales? Solo indíqueme las cantidades.',
    'Con gusto. ¿Para cuándo necesita el pedido y qué volumen maneja habitualmente?',
    'Tenemos stock disponible. Le envío la lista de precios especiales para su segmento.',
  ],
  cobranzas: [
    'Estimado cliente, le recordamos que tiene un saldo pendiente. ¿Cuándo podría regularizarlo?',
    'Le adjuntamos el estado de cuenta actualizado. ¿Alguna observación sobre las facturas?',
    '¿Podemos coordinar un plan de pago? Queremos encontrar la mejor solución para usted.',
  ],
  soporte: [
    'Recibido. ¿Puede ampliar los detalles del inconveniente para documentarlo correctamente?',
    'Le coordinamos visita técnica. ¿Qué horario le viene mejor esta semana?',
    'Nuestro equipo revisará su caso y le contactará en menos de 24 horas hábiles.',
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMsgTime(iso: string): string {
  const d     = new Date(iso);
  const today = new Date();
  const timeStr = d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return timeStr;
  return `${d.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} ${timeStr}`;
}

type WaitInfo = { minutes: number; label: string; tone: 'ok' | 'warn' | 'urgent' };

function waitingInfo(messages: Msg[]): WaitInfo | null {
  const lastIn = [...messages].reverse().find((m) => m.direction === 'in');
  if (!lastIn) return null;
  const mins = Math.floor((Date.now() - new Date(lastIn.sentAt).getTime()) / 60_000);
  if (mins < 30)  return { minutes: mins, label: `${mins}m`,            tone: 'ok' };
  if (mins < 120) return { minutes: mins, label: `${mins}m esperando`,  tone: 'warn' };
  const h = Math.floor(mins / 60);
  const r = mins % 60;
  return { minutes: mins, label: `${h}h ${r}m sin respuesta`,           tone: 'urgent' };
}

const CH_COLOR: Record<string, { bg: string; text: string }> = {
  ventas:    { bg: 'var(--isalwa-glaze)',   text: 'white'                  },
  cobranzas: { bg: 'var(--isalwa-warning)', text: 'var(--isalwa-kiln)'     },
  soporte:   { bg: 'var(--isalwa-info)',    text: 'white'                  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function SignalConversation({
  detail,
  convoItem,
}: {
  detail:    Detail;
  convoItem: ConvoItem | null;
}) {
  const endRef    = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<number | null>(null);

  // Scroll to newest message on mount + conversation change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [detail.id]);

  const purpose    = (detail.purpose ?? 'ventas').toLowerCase();
  const isOpen     = convoItem?.status === 'open';
  const waiting    = isOpen ? waitingInfo(detail.messages) : null;
  const suggestions = REPLIES[purpose] ?? REPLIES.ventas;
  const chColor    = CH_COLOR[purpose] ?? CH_COLOR.ventas;

  const slaColor =
    !waiting         ? 'var(--isalwa-slate)'
    : waiting.tone === 'urgent' ? 'var(--isalwa-danger)'
    : waiting.tone === 'warn'   ? 'var(--isalwa-warning)'
    :                             'var(--isalwa-success)';

  async function copyReply(text: string, idx: number) {
    try { await navigator.clipboard.writeText(text); } catch { /* fallback ok */ }
    setCopied(idx);
    setTimeout(() => setCopied(null), 2200);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'white' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        flexShrink:    0,
        borderBottom:  '1px solid var(--isalwa-mist)',
        padding:       '14px 20px 12px',
        background:    'white',
        display:       'flex',
        alignItems:    'flex-start',
        justifyContent:'space-between',
        gap:           12,
      }}>
        {/* Identity + status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontFamily:    'var(--isalwa-font-display)',
            fontStyle:     'italic',
            fontWeight:    400,
            fontSize:      'clamp(1rem, 1.5vw, 1.25rem)',
            color:         'var(--isalwa-kiln)',
            letterSpacing: '-0.01em',
            lineHeight:    1.15,
            margin:        0,
            overflow:      'hidden',
            whiteSpace:    'nowrap',
            textOverflow:  'ellipsis',
          }}>
            {detail.accountName ?? 'Conversación'}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
            {/* Channel badge */}
            <span style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding:       '2px 8px',
              borderRadius:  'var(--isalwa-radius-pill)',
              background:    chColor.bg,
              color:         chColor.text,
              flexShrink:    0,
            }}>
              {detail.channel}
            </span>

            {/* Live dot + open/closed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span
                className={isOpen ? 'isalwa-alive-dot' : ''}
                style={{
                  width:        6,
                  height:       6,
                  borderRadius: '50%',
                  background:   isOpen ? 'var(--isalwa-success)' : 'var(--isalwa-slate)',
                  display:      'block',
                  flexShrink:   0,
                  opacity:      isOpen ? 1 : 0.35,
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--isalwa-slate)' }}>
                {isOpen ? 'Abierto' : 'Resuelto'}
              </span>
            </div>

            {/* SLA timer */}
            {waiting && (
              <span style={{
                fontFamily:  'var(--isalwa-font-mono)',
                fontSize:    11,
                color:       slaColor,
                fontWeight:  waiting.tone !== 'ok' ? 700 : 400,
                letterSpacing: '-0.01em',
              }}>
                {waiting.tone !== 'ok' && '⚠ '}{waiting.label}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 7, flexShrink: 0, alignItems: 'center' }}>
          {detail.accountId && (
            <>
              <Link
                href={`/personas/${detail.accountId}`}
                style={{
                  padding:       '6px 13px',
                  borderRadius:  'var(--isalwa-radius-control)',
                  border:        '1px solid var(--isalwa-mist)',
                  background:    'white',
                  color:         'var(--isalwa-kiln)',
                  fontSize:      12,
                  fontWeight:    600,
                  letterSpacing: '-0.01em',
                  whiteSpace:    'nowrap',
                  display:       'block',
                }}
              >
                Dossier →
              </Link>
              <Link
                href={`/cierre?account=${detail.accountId}`}
                style={{
                  padding:       '6px 13px',
                  borderRadius:  'var(--isalwa-radius-control)',
                  background:    'var(--isalwa-glaze)',
                  color:         'white',
                  fontSize:      12,
                  fontWeight:    600,
                  letterSpacing: '-0.01em',
                  whiteSpace:    'nowrap',
                  display:       'block',
                }}
              >
                Cotizar
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ── Message thread ──────────────────────────────────────────────── */}
      <div style={{
        flex:           1,
        overflowY:      'auto',
        padding:        '18px 24px 12px',
        background:     'color-mix(in srgb, var(--isalwa-porcelain) 55%, white)',
        display:        'flex',
        flexDirection:  'column',
        gap:            2,
      }}>
        {detail.messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ maxWidth: 280, textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--isalwa-font-display)', fontStyle: 'italic', color: 'var(--isalwa-kiln)', marginBottom: 8 }}>
                Hilo listo para el primer mensaje
              </p>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--isalwa-slate)' }}>
                Aquí aparecerá el ritmo de la conversación — entrante y saliente — con la calma de un instrumento.
              </p>
            </div>
          </div>
        )}

        {detail.messages.map((m, idx) => {
          const isOut   = m.direction === 'out';
          const prev    = detail.messages[idx - 1];
          const isFirst = !prev || prev.direction !== m.direction;
          const isLast  = !detail.messages[idx + 1] || detail.messages[idx + 1].direction !== m.direction;

          return (
            <div
              key={m.id}
              className="isalwa-message-in"
              style={{
                display:       'flex',
                flexDirection: 'column',
                alignItems:    isOut ? 'flex-end' : 'flex-start',
                marginTop:     isFirst && idx > 0 ? 14 : 2,
                animationDelay:`${Math.min(idx, 10) * 32}ms`,
              }}
            >
              {/* Sender label — only first in a run */}
              {isFirst && (
                <p style={{
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color:         'var(--isalwa-slate)',
                  opacity:       0.5,
                  padding:       '0 4px 3px',
                  margin:        0,
                }}>
                  {isOut
                    ? 'ISALWA'
                    : ((detail.accountName ?? 'Cliente').split(' ')[0] ?? 'Cliente').toUpperCase()}
                </p>
              )}

              {/* Bubble */}
              <div style={{
                maxWidth:     'min(74%, 30rem)',
                padding:      '9px 13px',
                borderRadius: isOut
                  ? (isFirst ? '16px 16px 3px 16px' : isLast ? '16px 3px 3px 16px' : '16px 3px 3px 16px')
                  : (isFirst ? '16px 16px 16px 3px' : isLast ? '3px 16px 16px 3px' : '3px 16px 16px 3px'),
                background:   isOut ? 'var(--isalwa-glaze)' : 'white',
                color:        isOut ? 'white'              : 'var(--isalwa-kiln)',
                fontSize:     13,
                lineHeight:   1.5,
                boxShadow:    isOut
                  ? '0 1px 4px color-mix(in srgb, var(--isalwa-glaze) 28%, transparent)'
                  : '0 1px 3px color-mix(in srgb, var(--isalwa-kiln) 8%, transparent)',
                wordBreak:    'break-word',
              }}>
                {m.body}
              </div>

              {/* Timestamp — only on last in a run */}
              {isLast && (
                <p style={{
                  fontFamily:    'var(--isalwa-font-mono)',
                  fontSize:      9,
                  color:         'var(--isalwa-slate)',
                  opacity:       0.45,
                  margin:        '3px 0 0',
                  padding:       '0 4px',
                }}>
                  {formatMsgTime(m.sentAt)}
                </p>
              )}
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={endRef} />
      </div>

      {/* ── Suggested replies ───────────────────────────────────────────── */}
      <div style={{
        flexShrink:  0,
        borderTop:   '1px solid var(--isalwa-mist)',
        padding:     '11px 20px 14px',
        background:  'white',
      }}>
        <p style={{
          fontSize:      9,
          fontWeight:    700,
          letterSpacing: '0.13em',
          textTransform: 'uppercase',
          color:         'var(--isalwa-slate)',
          opacity:       0.45,
          margin:        '0 0 8px',
        }}>
          Respuestas sugeridas
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {suggestions.map((text, i) => {
            const isCopied = copied === i;
            return (
              <button
                key={i}
                type="button"
                onClick={() => void copyReply(text, i)}
                style={{
                  textAlign:      'left',
                  padding:        '7px 11px',
                  borderRadius:   'var(--isalwa-radius-control)',
                  border:         `1px solid ${isCopied ? 'var(--isalwa-glaze)' : 'var(--isalwa-mist)'}`,
                  background:     isCopied
                    ? 'color-mix(in srgb, var(--isalwa-glaze) 8%, white)'
                    : 'var(--isalwa-porcelain)',
                  color:          isCopied ? 'var(--isalwa-glaze)' : 'var(--isalwa-kiln)',
                  fontSize:       12,
                  lineHeight:     1.45,
                  cursor:         'pointer',
                  transition:     'background-color var(--isalwa-motion-fast) var(--isalwa-ease-out), border-color var(--isalwa-motion-fast) var(--isalwa-ease-out), color var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  gap:            10,
                  width:          '100%',
                }}
              >
                <span style={{ flex: 1 }}>{text}</span>
                <span style={{
                  fontSize:   10,
                  fontWeight: 700,
                  flexShrink: 0,
                  opacity:    isCopied ? 1 : 0.3,
                  color:      'var(--isalwa-glaze)',
                  transition: 'opacity var(--isalwa-motion-fast) var(--isalwa-ease-out)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {isCopied ? '✓ Copiado' : 'Copiar'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
