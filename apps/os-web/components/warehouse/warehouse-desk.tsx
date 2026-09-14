'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Button,
  EmptyState,
  ListRow,
  PageSection,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { ServiceUnavailableState } from '@/components/states/app-states';
import {
  WAREHOUSE_EXIT_HREF,
  WAREHOUSE_TASK_COPY,
  type WarehouseDenialReason,
  type WarehouseTaskView,
} from '@/lib/warehouse';

export type WarehouseDeskStatus = 'loading' | 'error' | 'denied' | 'ready';

type AllocateDraft = {
  orderLineId: string;
  productId: string;
  quantity: string;
};

type WarehouseDeskProps = {
  status: WarehouseDeskStatus;
  denial?: WarehouseDenialReason | null;
  view?: WarehouseTaskView | null;
  canAllocate?: boolean;
  onRetry?: () => void;
  onAllocate?: (draft: AllocateDraft) => void;
  onCorrect?: (draft: { allocationId: string; quantity: string; reason: string }) => void;
};

const fieldClass =
  'mt-1.5 w-full rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-white px-3 py-2 text-sm text-[var(--isalwa-kiln)] outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]';

export function WarehouseDesk({
  status,
  denial = null,
  view = null,
  canAllocate = false,
  onRetry,
  onAllocate,
  onCorrect,
}: WarehouseDeskProps) {
  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-live="polite" aria-busy="true">
        <p className="text-sm text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.loading}</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div data-warehouse-status="error">
        <ServiceUnavailableState onRetry={onRetry} />
        <p className="mt-4 max-w-xl text-sm text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.errorDescription}</p>
      </div>
    );
  }

  if (status === 'denied' || !view) {
    return <WarehousePermission denial={denial ?? 'unauthorized_role'} />;
  }

  const empty =
    view.waiting.length === 0 && view.pedidos.length === 0 && view.allocations.length === 0;

  return (
    <div className="space-y-8" data-warehouse-boundary="allocation" data-warehouse-status="ready">
      <BoundaryNotes />
      {empty ? (
        <EmptyState
          title={WAREHOUSE_TASK_COPY.emptyWaiting}
          description={`${WAREHOUSE_TASK_COPY.receiptDoesNotAllocate} ${WAREHOUSE_TASK_COPY.unknownAvailability}`}
          example={WAREHOUSE_TASK_COPY.partialAllowed}
        />
      ) : null}
      <WaitingSection view={view} />
      <AllocateSection view={view} canAllocate={canAllocate} onAllocate={onAllocate} />
      <RemainsSection view={view} />
      <HistorySection view={view} canAllocate={canAllocate} onCorrect={onCorrect} />
      <ExitNote />
    </div>
  );
}

function BoundaryNotes() {
  return (
    <PageSection card className="bg-white p-8 md:p-10">
      <SectionHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {WAREHOUSE_TASK_COPY.title}
          </h2>
        }
        action={
          <>
            <StatusPill tone="manual">{WAREHOUSE_TASK_COPY.notOfficialStock}</StatusPill>
            <StatusPill tone="neutral">No es entrega</StatusPill>
          </>
        }
      />
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.intro}</p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {WAREHOUSE_TASK_COPY.receiptDoesNotAllocate}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {WAREHOUSE_TASK_COPY.partialAllowed}
      </p>
    </PageSection>
  );
}

function WaitingSection({ view }: { view: WarehouseTaskView }) {
  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.waiting}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.waiting} />
      {view.waiting.length === 0 ? (
        <EmptyState title={WAREHOUSE_TASK_COPY.emptyWaiting} description={WAREHOUSE_TASK_COPY.unknownAvailability} />
      ) : (
        <ul>
          {view.waiting.map((row) => (
            <ListRow key={row.productId} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.productName.text}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.waitingText}</p>
              </div>
              <StatusPill tone="manual">{WAREHOUSE_TASK_COPY.notOfficialStock}</StatusPill>
            </ListRow>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

function AllocateSection({
  view,
  canAllocate,
  onAllocate,
}: {
  view: WarehouseTaskView;
  canAllocate: boolean;
  onAllocate?: (draft: AllocateDraft) => void;
}) {
  const choosable = view.allocatable.filter((row) => row.canChooseQuantity && row.availableQuantity);
  const firstProduct = choosable[0]?.productId ?? '';
  const firstLine = view.pedidos.find((pedido) => pedido.productId === firstProduct)?.orderLineId ?? view.pedidos[0]?.orderLineId ?? '';
  const [productId, setProductId] = useState(firstProduct);
  const [orderLineId, setOrderLineId] = useState(firstLine);
  const [quantity, setQuantity] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!onAllocate || !canAllocate || !orderLineId || !productId || !quantity.trim()) return;
    onAllocate({ orderLineId, productId, quantity: quantity.trim() });
  }

  const pedidos = view.pedidos.filter((pedido) => !productId || pedido.productId === productId);

  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.allocatable}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.allocatable} />
      {view.allocatable.length === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.unknownAvailability}</p>
      ) : (
        <ul className="mb-6">
          {view.allocatable.map((row) => (
            <ListRow key={row.productId} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{row.productName.text}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.availableText}</p>
              </div>
            </ListRow>
          ))}
        </ul>
      )}
      <h3 className="font-[family-name:var(--isalwa-font-display)] text-xl font-normal italic text-[var(--isalwa-kiln)]">
        {WAREHOUSE_TASK_COPY.pedido}
      </h3>
      {view.pedidos.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.emptyPedidos}</p>
      ) : (
        <ul className="mt-3" aria-label={WAREHOUSE_TASK_COPY.pedido}>
          {view.pedidos.map((pedido) => (
            <ListRow key={pedido.orderLineId} as="li">
              <p className="text-sm text-[var(--isalwa-kiln)]">{pedido.optionLabel}</p>
            </ListRow>
          ))}
        </ul>
      )}
      {canAllocate && onAllocate && choosable.length > 0 && pedidos.length > 0 ? (
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            Producto
            <select className={fieldClass} value={productId} onChange={(event) => setProductId(event.target.value)}>
              {choosable.map((row) => (
                <option key={row.productId} value={row.productId}>
                  {row.productName.text}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            {WAREHOUSE_TASK_COPY.pedido}
            <select className={fieldClass} value={orderLineId} onChange={(event) => setOrderLineId(event.target.value)}>
              {pedidos.map((pedido) => (
                <option key={pedido.orderLineId} value={pedido.orderLineId}>
                  {pedido.optionLabel}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-[var(--isalwa-slate)]">
            {WAREHOUSE_TASK_COPY.quantity}
            <input
              className={fieldClass}
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              aria-describedby="warehouse-quantity-hint"
            />
          </label>
          <p id="warehouse-quantity-hint" className="text-sm text-[var(--isalwa-slate)]">
            {WAREHOUSE_TASK_COPY.partialAllowed}
          </p>
          <Button type="submit">Asignar al pedido</Button>
        </form>
      ) : !canAllocate ? (
        <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.permissionRole}</p>
      ) : choosable.length === 0 || pedidos.length === 0 ? (
        <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {view.pedidos.length === 0 ? WAREHOUSE_TASK_COPY.emptyPedidos : WAREHOUSE_TASK_COPY.unknownAvailability}
        </p>
      ) : null}
    </PageSection>
  );
}

function RemainsSection({ view }: { view: WarehouseTaskView }) {
  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.remains}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.remains} />
      {view.remains.length === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.noRemainderRecorded}</p>
      ) : (
        <ul>
          {view.remains.map((row) => (
            <ListRow key={row.orderLineId} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {row.customerName.text} · {row.orderName.text} · {row.productName.text}
                </p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.remainingText}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Asignado {row.allocatedQuantity}</p>
              </div>
              <StatusPill tone="neutral">{WAREHOUSE_TASK_COPY.notFulfillment}</StatusPill>
            </ListRow>
          ))}
        </ul>
      )}
    </PageSection>
  );
}

function HistorySection({
  view,
  canAllocate,
  onCorrect,
}: {
  view: WarehouseTaskView;
  canAllocate: boolean;
  onCorrect?: (draft: { allocationId: string; quantity: string; reason: string }) => void;
}) {
  if (view.allocations.length === 0 && view.corrections.length === 0) return null;
  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label="Asignaciones">
      <SectionHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title="Asignaciones"
        action={<StatusPill tone="neutral">{WAREHOUSE_TASK_COPY.correctionKeepsOriginal}</StatusPill>}
      />
      <ul>
        {view.allocations.map((row) => (
          <ListRow key={row.id} as="li">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                {row.productName.text} · {row.quantity}
              </p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                {row.customerName.text} · {row.orderName.text}
              </p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                {row.actorLabel} · {formatWhen(row.allocatedAt)}
              </p>
              {canAllocate && onCorrect ? <CorrectionForm allocationId={row.id} onCorrect={onCorrect} /> : null}
            </div>
            {row.corrected ? <StatusPill tone="manual">Se conserva</StatusPill> : null}
          </ListRow>
        ))}
      </ul>
      {view.corrections.length > 0 ? (
        <ul className="mt-4" aria-label="Correcciones">
          {view.corrections.map((correction) => (
            <ListRow key={correction.id} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">Corrección · {correction.quantity}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{correction.reason}</p>
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {correction.actorLabel} · {formatWhen(correction.correctedAt)}
                </p>
              </div>
              <StatusPill tone="manual">Corrección</StatusPill>
            </ListRow>
          ))}
        </ul>
      ) : null}
    </PageSection>
  );
}

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function CorrectionForm({
  allocationId,
  onCorrect,
}: {
  allocationId: string;
  onCorrect: (draft: { allocationId: string; quantity: string; reason: string }) => void;
}) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!quantity.trim() || !reason.trim()) return;
    onCorrect({ allocationId, quantity: quantity.trim(), reason: reason.trim() });
  }

  return (
    <form className="mt-3 space-y-2" onSubmit={submit}>
      <label className="block text-sm text-[var(--isalwa-slate)]">
        Cantidad a corregir
        <input className={fieldClass} inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <label className="block text-sm text-[var(--isalwa-slate)]">
        Motivo
        <input className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <Button type="submit" variant="secondary" size="sm">
        Registrar corrección
      </Button>
    </form>
  );
}

function ExitNote() {
  return (
    <PageSection card className="bg-white p-8 md:p-10">
      <p className="max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.exitNote}</p>
      <Link href={WAREHOUSE_EXIT_HREF} className="mt-4 inline-flex">
        <Button type="button" variant="secondary">
          {WAREHOUSE_TASK_COPY.exitLink}
        </Button>
      </Link>
    </PageSection>
  );
}

function WarehousePermission({ denial }: { denial: WarehouseDenialReason }) {
  const description =
    denial === 'no_session_org'
      ? WAREHOUSE_TASK_COPY.permissionNoSession
      : denial === 'permission_unconfirmed'
        ? WAREHOUSE_TASK_COPY.permissionUnconfirmed
        : denial === 'cross_tenant'
          ? WAREHOUSE_TASK_COPY.permissionNoSession
          : WAREHOUSE_TASK_COPY.permissionRole;
  return (
    <div data-warehouse-status="denied" role="alert">
      <EmptyState title={WAREHOUSE_TASK_COPY.permissionTitle} description={description} />
      <div className="mt-6 max-w-xl space-y-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
        <p>{WAREHOUSE_TASK_COPY.waiting}: {WAREHOUSE_TASK_COPY.emptyWaiting}</p>
        <p>{WAREHOUSE_TASK_COPY.allocatable}: {WAREHOUSE_TASK_COPY.unknownAvailability}</p>
        <p>{WAREHOUSE_TASK_COPY.pedido}: {WAREHOUSE_TASK_COPY.emptyPedidos}</p>
        <p>{WAREHOUSE_TASK_COPY.remains}: {WAREHOUSE_TASK_COPY.noRemainderRecorded}</p>
        <p>{WAREHOUSE_TASK_COPY.receiptDoesNotAllocate}</p>
        <p>{WAREHOUSE_TASK_COPY.notOfficialStock}</p>
        <p>{WAREHOUSE_TASK_COPY.exitNote}</p>
        <Link href="/entregas" className="inline-flex">
          <Button type="button" variant="secondary">
            {WAREHOUSE_TASK_COPY.exitLink}
          </Button>
        </Link>
      </div>
    </div>
  );
}
