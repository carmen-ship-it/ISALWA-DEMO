'use client';

import { useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Button,
  EmptyState,
  ListRow,
  PageSection,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { SearchableSelect } from '@/components/experience/searchable-select';
import { OPS_STICKY_ACTION_CLASS, OpsDeskSurface } from '@/components/production/ops-desk-surface';
import { ServiceUnavailableState } from '@/components/states/app-states';
import { isEngineeringFixtureCopy } from '@/lib/work/staff-subject';
import { presentHumanCopy } from '@/lib/demo/human-facing-copy';
import { boundHistoryItems, LIST_PAGE_SIZE } from '@/lib/lists/ops-collection';
import {
  WAREHOUSE_EXIT_HREF,
  WAREHOUSE_MISSING_NAME,
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

  const persistWriteMounted = Boolean(onAllocate);

  return (
    <OpsDeskSurface className="space-y-6" data-warehouse-boundary="allocation" data-warehouse-status="ready">
      {empty ? (
        <div data-owner-review-state="no-data">
          <EmptyState
            title="Todavía no hay producto para asignar"
            description="Cuando haya ingreso a Almacén de Productos Terminados y pedidos de esta empresa, aparecerán aquí. Un vacío no es cero de stock ni un error de pantalla."
            example="Espere un Listo de planta o un pedido real. No se inventan cantidades ni asignaciones."
          />
        </div>
      ) : null}
      <WaitingSection view={view} />
      <AllocateSection
        view={view}
        canAllocate={canAllocate}
        persistWriteMounted={persistWriteMounted}
        onAllocate={onAllocate}
      />
      <RemainsSection view={view} />
      <HistorySection view={view} canAllocate={canAllocate} onCorrect={onCorrect} />
      <ExitNote />
    </OpsDeskSurface>
  );
}

function humanWarehouseText(text: string | null | undefined): string | null {
  const raw = text?.trim() ?? '';
  if (!raw || raw === WAREHOUSE_MISSING_NAME || isEngineeringFixtureCopy(raw)) return null;
  const human = presentHumanCopy(raw);
  if (!human || human === WAREHOUSE_MISSING_NAME || isEngineeringFixtureCopy(human)) return null;
  return human;
}

/** Pedido O-xxx · Cliente — never “El nombre no fue registrado”. */
function pedidoHumanLabel(orderText: string | null | undefined, customerText: string | null | undefined): string | null {
  const order = humanWarehouseText(orderText);
  const customer = humanWarehouseText(customerText);
  if (!order && !customer) return null;
  const orderRef = order
    ? (order.match(/^Pedido\b/i) ? order : `Pedido ${order}`)
    : 'Pedido';
  return customer ? `${orderRef} · ${customer}` : orderRef;
}

function contextLabel(parts: Array<string | null | undefined>): string | null {
  const human = parts
    .map((part) => humanWarehouseText(part))
    .filter((part): part is string => Boolean(part));
  return human.length > 0 ? human.join(' · ') : null;
}

function WaitingSection({ view }: { view: WarehouseTaskView }) {
  const rows = boundHistoryItems(
    view.waiting.filter((row) => humanWarehouseText(row.productName.text)),
    LIST_PAGE_SIZE,
  ).items;
  if (rows.length === 0) return null;
  return (
    <PageSection card className="p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.waiting}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.waiting} />
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Producto terminado citado sin cantidad asignable todavía.
      </p>
      <ul className="mt-4">
        {rows.map((row) => (
          <ListRow key={row.productId} as="li">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{humanWarehouseText(row.productName.text)}</p>
              <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{row.waitingText}</p>
            </div>
          </ListRow>
        ))}
      </ul>
    </PageSection>
  );
}

function AllocateSection({
  view,
  canAllocate,
  persistWriteMounted,
  onAllocate,
}: {
  view: WarehouseTaskView;
  canAllocate: boolean;
  persistWriteMounted: boolean;
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
    if (!onAllocate || !canAllocate || !persistWriteMounted || !orderLineId || !productId || !quantity.trim()) return;
    onAllocate({ orderLineId, productId, quantity: quantity.trim() });
  }

  const pedidos = view.pedidos.filter((pedido) => !productId || pedido.productId === productId);
  const allocatableRows = boundHistoryItems(
    view.allocatable.filter((row) => humanWarehouseText(row.productName.text)),
    LIST_PAGE_SIZE,
  ).items;
  const pedidoRows = boundHistoryItems(
    view.pedidos.filter(
      (pedido) =>
        humanWarehouseText(pedido.optionLabel) ||
        pedidoHumanLabel(pedido.orderName.text, pedido.customerName.text),
    ),
    LIST_PAGE_SIZE,
  ).items;
  const productOptions = useMemo(
    () =>
      boundHistoryItems(
        choosable
          .map((row) => ({
            id: row.productId,
            label: humanWarehouseText(row.productName.text) ?? '',
          }))
          .filter((row) => row.label),
        LIST_PAGE_SIZE,
      ).items,
    [choosable],
  );
  const pedidoOptions = useMemo(
    () =>
      boundHistoryItems(
        pedidos
          .map((pedido) => ({
            id: pedido.orderLineId,
            label:
              humanWarehouseText(pedido.optionLabel) ??
              pedidoHumanLabel(pedido.orderName.text, pedido.customerName.text) ??
              '',
          }))
          .filter((row) => row.label),
        LIST_PAGE_SIZE,
      ).items,
    [pedidos],
  );

  return (
    <PageSection card className="p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.allocatable}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.allocatable} />
      <p className="mt-1.5 mb-4 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Cantidad del registro de ingresos menos asignaciones ya hechas. Desde aquí se asigna al pedido.
      </p>
      {view.allocatable.length === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">
          No hay cantidad asignable todavía. Cuando el ingreso tenga cantidad conocida, aparecerá aquí.
        </p>
      ) : (
        <ul className="mb-6">
          {allocatableRows.map((row) => (
            <ListRow key={row.productId} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{humanWarehouseText(row.productName.text)}</p>
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
        <div data-owner-review-state="no-data">
          <p className="mt-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">{WAREHOUSE_TASK_COPY.emptyPedidos}</p>
        </div>
      ) : (
        <ul className="mt-3" aria-label={WAREHOUSE_TASK_COPY.pedido}>
          {pedidoRows.map((pedido) => (
            <ListRow key={pedido.orderLineId} as="li">
              <p className="text-sm text-[var(--isalwa-kiln)]">
                {humanWarehouseText(pedido.optionLabel) ??
                  pedidoHumanLabel(pedido.orderName.text, pedido.customerName.text)}
              </p>
            </ListRow>
          ))}
        </ul>
      )}
      {canAllocate && persistWriteMounted && onAllocate && choosable.length > 0 && pedidos.length > 0 ? (
        <form className="mt-8 space-y-4" onSubmit={submit}>
          <SearchableSelect
            id="warehouse-product"
            label="Producto"
            options={productOptions}
            value={productId || null}
            onChange={(id) => {
              const next = id ?? '';
              setProductId(next);
              const nextLine =
                view.pedidos.find((pedido) => !next || pedido.productId === next)?.orderLineId ?? '';
              setOrderLineId(nextLine);
            }}
            placeholder="Buscar producto"
          />
          <SearchableSelect
            id="warehouse-pedido"
            label={WAREHOUSE_TASK_COPY.pedido}
            options={pedidoOptions}
            value={orderLineId || null}
            onChange={(id) => setOrderLineId(id ?? '')}
            placeholder="Buscar pedido"
          />
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
          <div className={`${OPS_STICKY_ACTION_CLASS} -mx-2 px-2 py-3`}>
            <Button type="submit">Asignar al pedido</Button>
          </div>
        </form>
      ) : !canAllocate ? (
        <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]" data-owner-review-state="not-authorized">
          {WAREHOUSE_TASK_COPY.permissionRole}
        </p>
      ) : !persistWriteMounted ? (
        <p className="mt-6 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          El contexto de pedidos y producto se muestra arriba. La asignación definitiva aparece cuando el permiso de escritura está montado en esta sesión.
        </p>
      ) : choosable.length === 0 || pedidos.length === 0 ? (
        <div data-owner-review-state="no-data" className="mt-6">
          <EmptyState
            title={view.pedidos.length === 0 ? WAREHOUSE_TASK_COPY.emptyPedidos : WAREHOUSE_TASK_COPY.emptyWaiting}
            description={
              view.pedidos.length === 0
                ? 'Los pedidos de esta empresa aparecerán cuando existan. No se inventan líneas ni cantidades.'
                : 'No hay cantidad asignable para elegir todavía.'
            }
            example="Si falta producto terminado, espere Listo en Producción. Si faltan pedidos, espere carga comercial."
          />
        </div>
      ) : null}
    </PageSection>
  );
}

function RemainsSection({ view }: { view: WarehouseTaskView }) {
  const rows = boundHistoryItems(view.remains, LIST_PAGE_SIZE).items;
  return (
    <PageSection card className="p-8 md:p-10" aria-label={WAREHOUSE_TASK_COPY.remains}>
      <SectionHeader kicker={WAREHOUSE_TASK_COPY.kicker} title={WAREHOUSE_TASK_COPY.remains} />
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Estas cantidades muestran asignaciones pendientes; no representan cumplimiento del pedido.
      </p>
      {view.remains.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Sin remanente registrado"
            description={WAREHOUSE_TASK_COPY.noRemainderRecorded}
            example="Cuando haya una asignación parcial, aquí se verá lo que queda de la línea."
          />
        </div>
      ) : (
        <ul className="mt-4">
          {rows.map((row) => {
            const label =
              pedidoHumanLabel(row.orderName.text, row.customerName.text) ??
              humanWarehouseText(row.productName.text);
            if (!label) return null;
            const remainFact =
              row.remainingQuantity !== null
                ? `Quedan ${row.remainingQuantity} por asignar`
                : row.remainingText;
            return (
              <ListRow key={row.orderLineId} as="li">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{label}</p>
                  {humanWarehouseText(row.productName.text) &&
                  pedidoHumanLabel(row.orderName.text, row.customerName.text) ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {humanWarehouseText(row.productName.text)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{remainFact}</p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">Asignado {row.allocatedQuantity}</p>
                </div>
              </ListRow>
            );
          })}
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
  const history = [
    ...view.allocations.map((row) => ({ kind: 'allocation' as const, at: row.allocatedAt, row })),
    ...view.corrections.map((row) => ({ kind: 'correction' as const, at: row.correctedAt, row })),
  ].sort((left, right) => {
    const leftTime = Date.parse(left.at);
    const rightTime = Date.parse(right.at);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
    return rightTime - leftTime;
  });
  const recent = boundHistoryItems(history, LIST_PAGE_SIZE);
  if (history.length === 0) return null;
  return (
    <PageSection card className="p-8 md:p-10" aria-label="Asignaciones">
      <SectionHeader
        kicker={WAREHOUSE_TASK_COPY.kicker}
        title="Asignaciones"
        action={<StatusPill tone="neutral">{WAREHOUSE_TASK_COPY.correctionKeepsOriginal}</StatusPill>}
      />
      {recent.truncated ? (
        <p className="mt-3 text-sm text-[var(--isalwa-slate)]">
          Mostrando los {recent.shown} más recientes de esta vista.
        </p>
      ) : null}
      <ul>
        {recent.items.map((item) => {
          if (item.kind === 'correction') {
            const correction = item.row;
            return (
              <ListRow key={`correction-${correction.id}`} as="li">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                    Corrección · {correction.quantity}
                  </p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {humanWarehouseText(correction.reason) ?? ''}
                  </p>
                  <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                    {[humanWarehouseText(correction.actorLabel), formatWhen(correction.correctedAt)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <StatusPill tone="manual">Corrección</StatusPill>
              </ListRow>
            );
          }

          const row = item.row;
          const label = contextLabel([row.productName.text, row.customerName.text, row.orderName.text]);
          const who = contextLabel([row.customerName.text, row.orderName.text]);
          if (!label) return null;
          return (
            <ListRow key={`allocation-${row.id}`} as="li">
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--isalwa-kiln)]">
                  {humanWarehouseText(row.productName.text)
                    ? `${humanWarehouseText(row.productName.text)} · ${row.quantity}`
                    : row.quantity}
                </p>
                {who ? <p className="mt-1 text-sm text-[var(--isalwa-slate)]">{who}</p> : null}
                <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {[humanWarehouseText(row.actorLabel), formatWhen(row.allocatedAt)].filter(Boolean).join(' · ')}
                </p>
                {canAllocate && onCorrect ? <CorrectionForm allocationId={row.id} onCorrect={onCorrect} /> : null}
              </div>
              {row.corrected ? <StatusPill tone="manual">Se conserva</StatusPill> : null}
            </ListRow>
          );
        })}
      </ul>
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
      <Button type="submit" variant="secondary" size="sm" className="sticky bottom-0">
        Registrar corrección
      </Button>
    </form>
  );
}

function ExitNote() {
  return (
    <PageSection card className="p-8 md:p-10">
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
    <OpsDeskSurface data-warehouse-status="denied" role="alert" data-owner-review-state="not-authorized">
      <EmptyState
        title={WAREHOUSE_TASK_COPY.permissionTitle}
        description={description}
        example="Con el permiso de almacén confirmado en la sesión, podrá asignar producto terminado a pedidos."
      />
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
    </OpsDeskSurface>
  );
}
