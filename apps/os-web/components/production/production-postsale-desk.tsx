'use client';

import { useMemo, useState, type FormEvent } from 'react';
import {
  ActionBar,
  Button,
  FeedbackNote,
  PageSection,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { PedidoHandoffPanel } from '@/components/postsale/pedido-handoff-panel';
import { ProductionWorkspace } from '@/components/production/production-workspace';
import { OPS_STICKY_ACTION_CLASS, OpsDeskSurface } from '@/components/production/ops-desk-surface';
import {
  POSTSALE_HANDOFF_COPY,
  PRODUCTION_PEDIDO_LINK_PROVENANCE,
  resolveLineProduct,
  type PostSalePedidoOption,
} from '@/lib/postsale/pedido-context';
import {
  buildProductionExpectedDateWork,
  PRODUCTION_EXPECTED_DATE_COPY,
} from '@/lib/postsale/expected-date-work';
import {
  canEnterProductionWorkspace,
  recordProcess,
  ProductionAccessLedger,
  type ProductionSession,
} from '@/lib/production/access';
import { PRODUCTION_STEP_OPTIONS } from '@/lib/production/copy';
import { catalogContainsProductId, type CatalogProductId } from '@/lib/production/product-search';

const fieldClass = 'isalwa-field mt-1 w-full';

type ProductionPostSaleDeskProps = {
  status: 'ready' | 'loading' | 'error' | 'permission';
  organizationId: string | null;
  memberId: string | null;
  actorLabel: string;
  grantedScopes: readonly string[];
  scopesConfirmed: boolean;
  catalog: readonly CatalogProductId[] | null;
  pedidos: readonly PostSalePedidoOption[];
  onCreateExpectedWork?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Pedido-rooted production desk.
 * Manufacturing annotation stays product-keyed; Pedido supplies inherited context.
 * Optional expected date creates Work with dueAt (existing Attention overdue rule).
 */
export function ProductionPostSaleDesk({
  status,
  organizationId,
  memberId,
  actorLabel,
  grantedScopes,
  scopesConfirmed,
  catalog,
  pedidos,
  onCreateExpectedWork,
}: ProductionPostSaleDeskProps) {
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState('');
  const [note, setNote] = useState('');
  const [expectedAt, setExpectedAt] = useState('');
  const [stepKey, setStepKey] = useState<(typeof PRODUCTION_STEP_OPTIONS)[number]['key']>('colaje');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; title: string; detail?: string } | null>(
    null,
  );
  const [ledger] = useState(() => new ProductionAccessLedger());

  const session = useMemo<ProductionSession>(
    () => ({ organizationId, memberId, grantedScopes, actorLabel }),
    [organizationId, memberId, grantedScopes, actorLabel],
  );
  const canEnter = scopesConfirmed && canEnterProductionWorkspace(session);
  const pedido = pedidos.find((row) => row.orderId === orderId) ?? null;
  const line = resolveLineProduct(pedido, orderLineId);
  const productFromCatalog = line ? catalogContainsProductId(catalog, line.productId) : false;

  async function saveMilestone(event: FormEvent) {
    event.preventDefault();
    setFeedback(null);
    if (!canEnter || !memberId) {
      setFeedback({
        tone: 'error',
        title: 'Hace falta el permiso de planta.',
        detail: 'El cargo solo no autoriza.',
      });
      return;
    }
    if (!pedido || !line) {
      setFeedback({
        tone: 'error',
        title: PRODUCTION_EXPECTED_DATE_COPY.pedidoMissing,
      });
      return;
    }

    const built = buildProductionExpectedDateWork({
      annotation,
      note,
      expectedAt,
      ownerMemberId: memberId,
      partyId: pedido.partyId,
      orderId: pedido.orderId,
      orderLabel: pedido.orderLabel,
      productLabel: line.productLabel,
      orderLineId: line.orderLineId,
    });
    if (!built.ok) {
      setFeedback({ tone: 'error', title: built.error });
      return;
    }

    if (productFromCatalog) {
      const now = new Date().toISOString();
      const recorded = recordProcess(ledger, session, {
        id: `proc-${pedido.orderId}-${now}`,
        organizationId: organizationId ?? '',
        productId: line.productId,
        stepKey,
        quemaId: null,
        note: [built.annotation, built.note].filter(Boolean).join(' — ') || null,
        actorMemberId: memberId,
        actorLabel,
        source: 'manual',
        occurredAt: now,
        recordedAt: now,
        evidence: {
          reference: pedido.orderLabel,
          note: `Pedido ${pedido.orderLabel} · vínculo ${PRODUCTION_PEDIDO_LINK_PROVENANCE}`,
        },
        correctsEntryId: null,
        correctionReason: null,
        idempotencyKey: null,
      });
      if (!recorded.ok) {
        setFeedback({
          tone: 'error',
          title: 'No se anotó en planta.',
          detail: recorded.message,
        });
        return;
      }
    }

    if (built.work && onCreateExpectedWork) {
      const workResult = await onCreateExpectedWork(built.work.payload);
      if (!workResult.ok) {
        setFeedback({
          tone: 'error',
          title: 'Anotación lista; no se pudo registrar la fecha en Trabajo.',
          detail: workResult.error,
        });
        return;
      }
    }

    setFeedback({
      tone: 'success',
      title: built.work
        ? 'Anotación registrada. La fecha esperada quedó en Trabajo / Atención.'
        : productFromCatalog
          ? 'Anotación de planta registrada para el producto del pedido.'
          : 'Anotación registrada en el contexto del pedido.',
    });
    setAnnotation('');
    setNote('');
    setExpectedAt('');
  }

  return (
    <OpsDeskSurface className="space-y-6" data-postsale-spine="production">
      <PedidoHandoffPanel
        pedidos={pedidos}
        selectedOrderId={orderId}
        selectedOrderLineId={orderLineId}
        onSelectPedido={setOrderId}
        onSelectLine={setOrderLineId}
      />

      <PageSection card className="p-6 md:p-8" aria-label={POSTSALE_HANDOFF_COPY.milestone}>
        <SectionHeader
          kicker="Producción"
          title={POSTSALE_HANDOFF_COPY.milestone}
          action={<StatusPill tone="manual">Confirmación humana</StatusPill>}
        />
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          Anote un hito confirmado por una persona. No se inventa un SLA de fábrica ni se marca
          iniciado/completado desde otros eventos. {POSTSALE_HANDOFF_COPY.humanLinkProvenance}
        </p>
        <form className="mt-6 space-y-4" onSubmit={saveMilestone}>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Paso de planta
            <select
              className={fieldClass}
              value={stepKey}
              onChange={(event) =>
                setStepKey(event.target.value as (typeof PRODUCTION_STEP_OPTIONS)[number]['key'])
              }
            >
              {PRODUCTION_STEP_OPTIONS.map((step) => (
                <option key={step.key} value={step.key}>
                  {step.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            {POSTSALE_HANDOFF_COPY.milestone}
            <input
              className={fieldClass}
              value={annotation}
              onChange={(event) => setAnnotation(event.target.value)}
              placeholder="Ej. Secado confirmado"
              required
            />
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            {POSTSALE_HANDOFF_COPY.note}
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            {POSTSALE_HANDOFF_COPY.expectedDate}
            <input
              className={fieldClass}
              type="datetime-local"
              value={expectedAt}
              onChange={(event) => setExpectedAt(event.target.value)}
              aria-describedby="postsale-expected-hint"
            />
          </label>
          <p id="postsale-expected-hint" className="text-sm text-[var(--isalwa-slate)]">
            {POSTSALE_HANDOFF_COPY.expectedDateHint}
          </p>
          {memberId ? (
            <p className="text-sm text-[var(--isalwa-slate)]">
              {POSTSALE_HANDOFF_COPY.responsible}: queda a su nombre cuando la sesión lo autoriza.
            </p>
          ) : null}
          <div className={`${OPS_STICKY_ACTION_CLASS} -mx-2 px-2 py-3`}>
            <ActionBar>
              <Button type="submit" disabled={!canEnter}>
                Registrar anotación
              </Button>
            </ActionBar>
          </div>
        </form>
        {feedback ? (
          <div className="mt-4">
            <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
          </div>
        ) : null}
      </PageSection>

      <ProductionWorkspace
        status={status}
        organizationId={organizationId}
        memberId={memberId}
        actorLabel={actorLabel}
        grantedScopes={grantedScopes}
        scopesConfirmed={scopesConfirmed}
        catalog={catalog}
        productionInternalDate={null}
      />
    </OpsDeskSurface>
  );
}
