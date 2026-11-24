'use client';

import { useEffect, useMemo, useState, useTransition, type FormEvent } from 'react';
import {
  ActionBar,
  Button,
  FeedbackNote,
  PageSection,
  SectionHeader,
} from '@isalwa/ui';
import { PedidoHandoffPanel } from '@/components/postsale/pedido-handoff-panel';
import { OPS_STICKY_ACTION_CLASS, OpsDeskSurface } from '@/components/production/ops-desk-surface';
import {
  POSTSALE_HANDOFF_COPY,
  resolveLineProduct,
  type PostSalePedidoOption,
} from '@/lib/postsale/pedido-context';
import {
  buildProductionFollowUpWork,
  buildProductionPlantUpdateWork,
  PRODUCTION_FOLLOW_UP_COPY,
  PRODUCTION_PLANT_UPDATE_COPY,
} from '@/lib/postsale/expected-date-work';
import { canEnterProductionWorkspace, type ProductionSession } from '@/lib/production/access';
import { PRODUCTION_STEP_OPTIONS } from '@/lib/production/copy';
import type { CatalogProductId } from '@/lib/production/product-search';

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
  initialOrderId?: string | null;
  onCreateExpectedWork?: (payload: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;
};

type DeskFeedback = {
  tone: 'success' | 'error' | 'info';
  title: string;
  detail?: string;
  workTitle?: string;
  listHint?: string;
};

/**
 * Pedido-rooted production desk.
 * Two distinct persisted actions (CreateWorkItem via the same server action):
 * 1) Plant update — no due date required (server dueAt is optional).
 * 2) Follow-up — due date required so Attention can surface overdue work.
 * No in-memory ledger: success only after the API confirms.
 */
export function ProductionPostSaleDesk({
  status: _status,
  organizationId,
  memberId,
  grantedScopes,
  scopesConfirmed,
  actorLabel,
  pedidos,
  initialOrderId = null,
  onCreateExpectedWork,
}: ProductionPostSaleDeskProps) {
  const [orderId, setOrderId] = useState<string | null>(initialOrderId?.trim() || null);
  const [orderLineId, setOrderLineId] = useState<string | null>(null);
  const [annotation, setAnnotation] = useState('');
  const [note, setNote] = useState('');
  const [followUpDueAt, setFollowUpDueAt] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');
  const [stepKey, setStepKey] = useState<(typeof PRODUCTION_STEP_OPTIONS)[number]['key']>('colaje');
  const [feedback, setFeedback] = useState<DeskFeedback | null>(null);
  const [pending, startTransition] = useTransition();

  const session = useMemo<ProductionSession>(
    () => ({ organizationId, memberId, grantedScopes, actorLabel }),
    [organizationId, memberId, grantedScopes, actorLabel],
  );
  const canEnter = scopesConfirmed && canEnterProductionWorkspace(session);

  useEffect(() => {
    const target = initialOrderId?.trim();
    if (!target) return;
    if (pedidos.some((row) => row.orderId === target)) {
      setOrderId(target);
    }
  }, [initialOrderId, pedidos]);

  const pedido = pedidos.find((row) => row.orderId === orderId) ?? null;
  const line = resolveLineProduct(pedido, orderLineId);
  const canWrite = canEnter && Boolean(onCreateExpectedWork) && Boolean(memberId);
  const canSaveUpdate = canWrite && annotation.trim() !== '';
  const canSaveFollowUp = canWrite && annotation.trim() !== '' && followUpDueAt.trim() !== '';

  function sharedContextError(): DeskFeedback | null {
    if (!canEnter || !memberId) {
      return {
        tone: 'error',
        title: 'Hace falta el permiso de planta.',
        detail: 'El cargo solo no autoriza.',
      };
    }
    if (!pedido || !line) {
      return {
        tone: 'error',
        title: 'Seleccione un pedido y un producto del pedido.',
      };
    }
    if (!onCreateExpectedWork) {
      return {
        tone: 'error',
        title: PRODUCTION_PLANT_UPDATE_COPY.notSaved,
        detail: 'No hay acción de guardado disponible.',
      };
    }
    return null;
  }

  function annotatedText(): string {
    const stepLabel = PRODUCTION_STEP_OPTIONS.find((step) => step.key === stepKey)?.label;
    return stepLabel && annotation.trim() ? `${stepLabel}: ${annotation.trim()}` : annotation;
  }

  function savePlantUpdate(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFeedback(null);

    const contextError = sharedContextError();
    if (contextError) {
      setFeedback(contextError);
      return;
    }
    if (!pedido || !line || !memberId || !onCreateExpectedWork) return;
    const createWork = onCreateExpectedWork;

    const built = buildProductionPlantUpdateWork({
      annotation: annotatedText(),
      note,
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

    startTransition(async () => {
      const workResult = await createWork(built.work.payload);
      if (!workResult.ok) {
        setFeedback({
          tone: 'error',
          title: PRODUCTION_PLANT_UPDATE_COPY.notSaved,
          detail: workResult.error,
        });
        return;
      }

      const workTitle = String(built.work.payload.title ?? '');
      setFeedback({
        tone: 'success',
        title: PRODUCTION_PLANT_UPDATE_COPY.success,
        workTitle,
        listHint: 'Ábralo en Trabajo para verlo en la lista.',
      });
      setAnnotation('');
      setNote('');
    });
  }

  function saveFollowUp(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setFeedback(null);

    const contextError = sharedContextError();
    if (contextError) {
      setFeedback(contextError);
      return;
    }
    if (!pedido || !line || !memberId || !onCreateExpectedWork) return;
    const createWork = onCreateExpectedWork;

    if (!followUpDueAt.trim()) {
      setFeedback({
        tone: 'error',
        title: PRODUCTION_FOLLOW_UP_COPY.notSaved,
        detail: PRODUCTION_FOLLOW_UP_COPY.needsDate,
      });
      return;
    }

    const built = buildProductionFollowUpWork({
      annotation: annotatedText(),
      note: followUpNote,
      expectedAt: followUpDueAt,
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

    startTransition(async () => {
      const workResult = await createWork(built.work.payload);
      if (!workResult.ok) {
        setFeedback({
          tone: 'error',
          title: PRODUCTION_FOLLOW_UP_COPY.notSaved,
          detail: workResult.error,
        });
        return;
      }

      const workTitle = String(built.work.payload.title ?? '');
      setFeedback({
        tone: 'success',
        title: PRODUCTION_FOLLOW_UP_COPY.success,
        workTitle,
        listHint: 'Aparece en Trabajo y, al vencer, en Atención.',
      });
      setAnnotation('');
      setFollowUpDueAt('');
      setFollowUpNote('');
    });
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

      <PageSection card className="p-6 md:p-8" data-section-tone="active" aria-label={PRODUCTION_PLANT_UPDATE_COPY.sectionTitle}>
        <SectionHeader
          kicker="Producción"
          title={PRODUCTION_PLANT_UPDATE_COPY.sectionTitle}
        />
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PLANT_UPDATE_COPY.hint}</p>
        <form className="mt-6 space-y-4" onSubmit={savePlantUpdate}>
          <label className="block text-sm text-[var(--isalwa-kiln)]">
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
          <label className="block text-sm text-[var(--isalwa-kiln)]">
            Qué ocurrió en planta
            <input
              className={fieldClass}
              value={annotation}
              onChange={(event) => setAnnotation(event.target.value)}
              placeholder="Ej. Secado confirmado"
              required
            />
          </label>
          <label className="block text-sm text-[var(--isalwa-kiln)]">
            {POSTSALE_HANDOFF_COPY.note}
            <input className={fieldClass} value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
          <div className={`${OPS_STICKY_ACTION_CLASS} -mx-2 px-2 py-3`}>
            <ActionBar>
              <Button type="submit" variant="primary" disabled={!canSaveUpdate || pending}>
                {pending ? 'Guardando…' : PRODUCTION_PLANT_UPDATE_COPY.action}
              </Button>
            </ActionBar>
          </div>
        </form>
      </PageSection>

      <PageSection
        card
        className="p-6 md:p-8"
        data-section-tone="active"
        aria-label={PRODUCTION_FOLLOW_UP_COPY.sectionTitle}
        id="produccion-crear-seguimiento"
      >
        <SectionHeader kicker="Seguimiento" title={PRODUCTION_FOLLOW_UP_COPY.sectionTitle} />
        <p className="mt-2 text-sm text-[var(--isalwa-slate)]">{PRODUCTION_FOLLOW_UP_COPY.hint}</p>
        <form className="mt-6 space-y-4" onSubmit={saveFollowUp}>
          <label className="block text-sm font-medium text-[var(--isalwa-kiln)]" htmlFor="produccion-follow-up-due">
            {PRODUCTION_FOLLOW_UP_COPY.dueLabel}
            <span className="ml-1 text-[var(--isalwa-glaze)]" aria-hidden="true">
              *
            </span>
            <input
              id="produccion-follow-up-due"
              className={fieldClass}
              type="datetime-local"
              value={followUpDueAt}
              onChange={(event) => setFollowUpDueAt(event.target.value)}
              aria-describedby="produccion-follow-up-due-hint"
              required
            />
          </label>
          <p id="produccion-follow-up-due-hint" className="text-sm text-[var(--isalwa-slate)]">
            {PRODUCTION_FOLLOW_UP_COPY.dueRequiredHint}
          </p>
          <label className="block text-sm text-[var(--isalwa-kiln)]">
            Acción del seguimiento
            <input
              className={fieldClass}
              value={annotation}
              onChange={(event) => setAnnotation(event.target.value)}
              placeholder="Ej. Confirmar salida de horno"
              required
            />
          </label>
          <label className="block text-sm text-[var(--isalwa-kiln)]">
            {POSTSALE_HANDOFF_COPY.note}
            <input
              className={fieldClass}
              value={followUpNote}
              onChange={(event) => setFollowUpNote(event.target.value)}
            />
          </label>
          <div className={`${OPS_STICKY_ACTION_CLASS} -mx-2 px-2 py-3`}>
            <ActionBar>
              <Button type="submit" variant="primary" disabled={!canSaveFollowUp || pending}>
                {pending ? 'Guardando…' : PRODUCTION_FOLLOW_UP_COPY.action}
              </Button>
            </ActionBar>
          </div>
        </form>
      </PageSection>

      {feedback ? (
        <div className="mt-2" role="status">
          <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
          {feedback.workTitle ? (
            <p className="mt-3 text-sm text-[var(--isalwa-kiln)]">
              <span className="isalwa-section-label">Registrado</span>
              <span className="mt-1 block font-medium">{feedback.workTitle}</span>
              {feedback.listHint ? (
                <span className="mt-1 block text-[var(--isalwa-slate)]">
                  {feedback.listHint}{' '}
                  <a className="font-medium text-[var(--isalwa-glaze)] hover:underline" href="/trabajo">
                    Ir a Trabajo
                  </a>
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}
    </OpsDeskSurface>
  );
}
