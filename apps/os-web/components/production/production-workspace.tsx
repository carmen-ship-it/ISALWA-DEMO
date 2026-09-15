'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionBar,
  Button,
  Chip,
  ContextDrawer,
  EmptyPanel,
  FeedbackNote,
  OperatingRow,
  PageSection,
  SearchField,
  SectionHeader,
  StatusPill,
} from '@isalwa/ui';
import { formatTimestamp } from '@/lib/commercial/labels';
import {
  ProductionAccessLedger,
  attachQuemaProduct,
  canEnterProductionWorkspace,
  canReviewProductionWorkspace,
  endQuema,
  listWorkspace,
  officialInputStock,
  openQuema,
  qualityRatioForProduct,
  recordClassification,
  recordConsumption,
  recordLoss,
  recordProcess,
  recordReceipt,
  type ProductionSession,
} from '@/lib/production/access';
import {
  CONSUMPTION_LABELS,
  PRODUCTION_DENIAL_COPY,
  PRODUCTION_PAGE_COPY,
  PRODUCTION_STEP_LABELS,
  PRODUCTION_STEP_OPTIONS,
} from '@/lib/production/copy';
import { productionInternalDateFact } from '@/lib/production/dates';
import { searchProductIds, type CatalogProductId } from '@/lib/production/product-search';
import { FINISHED_GOODS_WAREHOUSE_LABEL } from '@isalwa/os-contracts';

type TabId = 'planta' | 'quemas' | 'perdida' | 'consumo' | 'listo';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'planta', label: 'Planta' },
  { id: 'quemas', label: 'Quemas' },
  { id: 'perdida', label: 'Pérdida' },
  { id: 'consumo', label: 'Consumo' },
  { id: 'listo', label: 'Listo' },
];

const fieldClass = 'isalwa-field mt-1 w-full';

export type ProductionWorkspaceProps = {
  status: 'ready' | 'loading' | 'error' | 'permission';
  organizationId: string | null;
  memberId: string | null;
  actorLabel: string;
  grantedScopes: readonly string[];
  scopesConfirmed: boolean;
  catalog: readonly CatalogProductId[] | null;
  productionInternalDate: { targetOn: string; source: 'production_internal'; organizationId: string } | null;
  customerCommittedOn?: string | null;
};

export function ProductionWorkspace({
  status,
  organizationId,
  memberId,
  actorLabel,
  grantedScopes,
  scopesConfirmed,
  catalog,
  productionInternalDate,
  customerCommittedOn = null,
}: ProductionWorkspaceProps) {
  const ledgerRef = useRef<ProductionAccessLedger | null>(null);
  if (!ledgerRef.current) ledgerRef.current = new ProductionAccessLedger();
  const ledger = ledgerRef.current;

  const session = useMemo<ProductionSession>(
    () => ({
      organizationId,
      memberId,
      grantedScopes,
      actorLabel,
    }),
    [organizationId, memberId, grantedScopes, actorLabel],
  );
  const canEnter = scopesConfirmed && canEnterProductionWorkspace(session);
  const canReview = scopesConfirmed && canReviewProductionWorkspace(session);
  const canRead = canEnter || canReview;

  const [tab, setTab] = useState<TabId>('planta');
  const [productQuery, setProductQuery] = useState('');
  const [productId, setProductId] = useState('');
  const [stepKey, setStepKey] = useState<(typeof PRODUCTION_STEP_OPTIONS)[number]['key']>('colaje');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error' | 'info'; title: string; detail?: string } | null>(
    null,
  );
  const [draft, setDraft] = useState(emptyDraft);
  const quantityRef = useRef<HTMLInputElement>(null);

  const dateFact = productionInternalDateFact(productionInternalDate, organizationId, customerCommittedOn);
  const catalogSearch = searchProductIds(catalog, productQuery);
  const board = canRead ? listWorkspace(ledger, session) : null;
  const ratio = canRead && productId ? qualityRatioForProduct(ledger, session, productId) : null;
  const stock = canRead ? officialInputStock(ledger, session, productId || 'entrada') : null;
  const listo = Boolean(board?.ok && productId && board.value.listoProductIds.includes(productId));
  const stepLabel = PRODUCTION_STEP_OPTIONS.find((step) => step.key === stepKey)?.label ?? PRODUCTION_STEP_LABELS[0];

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function patch(next: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...next }));
    setDirty(true);
  }

  function openDrawer() {
    setDraft(emptyDraft());
    setDirty(false);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    if (dirty && !window.confirm(PRODUCTION_PAGE_COPY.unsaved)) return;
    setDrawerOpen(false);
    setDirty(false);
  }

  function selectProductId(id: string) {
    setProductId(id.trim());
    setProductQuery(id.trim());
  }

  function save() {
    if (!canEnter) {
      setFeedback({
        tone: 'error',
        title: scopesConfirmed ? PRODUCTION_PAGE_COPY.permission : PRODUCTION_PAGE_COPY.scopesUnconfirmed,
        detail: PRODUCTION_DENIAL_COPY.unauthorized_role,
      });
      return;
    }
    const occurredAt = toIso(draft.occurredAt) ?? new Date().toISOString();
    const recordedAt = new Date().toISOString();
    const evidence = { reference: null, note: draft.note.trim() || null };
    const base = { occurredAt, recordedAt, evidence, idempotencyKey: null };
    let result: { ok: boolean; message?: string; denial?: string } = { ok: false };

    if (tab === 'planta' && stepKey === 'clasificacion') {
      const saved = recordClassification(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        productId,
        goodCount: parseCount(draft.goodCount),
        lostCount: parseCount(draft.lostCount),
        correctsEntryId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'planta') {
      const saved = recordProcess(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        productId,
        stepKey,
        quemaId: null,
        note: draft.note.trim() || null,
        correctsEntryId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'quemas' && !draft.quemaId) {
      const startedAt = toIso(draft.startedAt);
      if (!startedAt) {
        setFeedback({ tone: 'error', title: 'Escriba el inicio de la quema.' });
        return;
      }
      const saved = openQuema(ledger, session, {
        id: crypto.randomUUID(),
        recordedAt,
        evidence,
        startedAt,
        idempotencyKey: null,
      });
      if (saved.ok) setDraft((current) => ({ ...current, quemaId: saved.value.id }));
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'quemas' && draft.endedAt && draft.quemaId) {
      const saved = endQuema(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        quemaId: draft.quemaId,
        endedAt: toIso(draft.endedAt),
        correctsTimeId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'quemas' && draft.quemaId) {
      const quantity = draft.quantity.trim() || null;
      const saved = attachQuemaProduct(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        quemaId: draft.quemaId,
        productId,
        quantity,
        unit: quantity ? draft.unit.trim() || null : null,
        correctsLinkId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'perdida') {
      const saved = recordLoss(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        productId: productId || null,
        stepKey,
        quantityLost: draft.quantity.trim(),
        percentageLost: draft.percentage.trim(),
        reason: draft.reason.trim(),
        correctsEntryId: draft.correctsEntryId,
        correctionReason: draft.correctsEntryId ? draft.correctionReason.trim() || null : null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else if (tab === 'consumo') {
      const saved = recordConsumption(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        stepKey,
        category: draft.category,
        description: draft.description.trim(),
        reference: null,
        quantity: draft.quantity.trim(),
        unit: draft.unit.trim(),
        correctsEntryId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    } else {
      const saved = recordReceipt(ledger, session, {
        ...base,
        id: crypto.randomUUID(),
        productId,
        quantity: draft.quantity.trim(),
        correctsEntryId: null,
        correctionReason: null,
      });
      result = saved.ok ? { ok: true } : { ok: false, message: saved.message, denial: saved.denial };
    }

    if (!result.ok) {
      const denial = result.denial && result.denial in PRODUCTION_DENIAL_COPY
        ? PRODUCTION_DENIAL_COPY[result.denial as keyof typeof PRODUCTION_DENIAL_COPY]
        : result.message;
      setFeedback({ tone: 'error', title: 'No se anotó.', detail: denial });
      return;
    }

    setRevision((value) => value + 1);
    setDirty(false);
    setDraft((current) => ({
      ...emptyDraft(),
      quemaId: current.quemaId,
      category: current.category,
      unit: current.unit,
    }));
    setFeedback({
      tone: 'success',
      title: tab === 'listo' ? PRODUCTION_PAGE_COPY.savedReceipt : tab === 'consumo' ? PRODUCTION_PAGE_COPY.savedConsumption : PRODUCTION_PAGE_COPY.saved,
      detail: tab === 'listo' ? PRODUCTION_PAGE_COPY.receiptDoesNotAssign : undefined,
    });
    quantityRef.current?.focus();
  }

  if (status === 'loading') {
    return (
      <p className="text-sm text-[var(--isalwa-slate)]" role="status" aria-live="polite" aria-busy="true">
        {PRODUCTION_PAGE_COPY.loading}
      </p>
    );
  }

  if (status === 'error') {
    return <FeedbackNote tone="error" title={PRODUCTION_PAGE_COPY.error} />;
  }

  if (status === 'permission' || !organizationId) {
    return (
      <PageSection card className="mt-6 p-6">
        <FeedbackNote tone="info" title={PRODUCTION_PAGE_COPY.noSessionOrg} detail={PRODUCTION_PAGE_COPY.permission} />
      </PageSection>
    );
  }

  const entries = board?.ok ? board.value.entries : [];
  const quemas = board?.ok ? board.value.quemas : [];
  const shownRatio = ratio?.ok ? ratio.value : null;
  void revision;

  return (
    <div className="mt-6">
      <ActionBar sticky className="mb-4 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)]">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-[0.08em] text-[var(--isalwa-slate)] uppercase">Producto</p>
          <SearchField
            aria-label="Identificador de producto"
            placeholder="Identificador de producto"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') selectProductId(productQuery);
            }}
          />
          {catalogSearch.namesAvailable ? (
            <ul className="mt-1">
              {catalogSearch.hits.map((hit) => (
                <li key={hit.productId}>
                  <button type="button" className="text-sm text-[var(--isalwa-kiln)]" onClick={() => selectProductId(hit.productId)}>
                    {hit.productId}
                    {hit.name ? ` · ${hit.name}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.catalogEmpty}</p>
          )}
          {productId ? <p className="mt-1 text-sm text-[var(--isalwa-kiln)]">En uso · {productId}</p> : null}
        </div>
        <label className="min-w-[12rem] text-xs text-[var(--isalwa-slate)]">
          Paso
          <select
            className={fieldClass}
            value={stepKey}
            aria-label="Paso de planta"
            onChange={(event) => setStepKey(event.target.value as typeof stepKey)}
          >
            {PRODUCTION_STEP_OPTIONS.map((step) => (
              <option key={step.key} value={step.key}>
                {step.label}
              </option>
            ))}
          </select>
        </label>
        <StatusPill tone={listo ? 'success' : 'neutral'}>{listo ? PRODUCTION_PAGE_COPY.listo : PRODUCTION_PAGE_COPY.notListo}</StatusPill>
      </ActionBar>

      {dateFact ? (
        <p className="mb-3 text-sm text-[var(--isalwa-kiln)]">
          {dateFact.label} · {formatTimestamp(dateFact.targetOn) ?? dateFact.targetOn}. {PRODUCTION_PAGE_COPY.dateSeparate}
        </p>
      ) : (
        <p className="mb-3 text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.dateSeparate}</p>
      )}

      {!scopesConfirmed || !canEnter ? (
        <div className="mb-4">
          <FeedbackNote
            tone="info"
            title={scopesConfirmed ? PRODUCTION_PAGE_COPY.permission : PRODUCTION_PAGE_COPY.scopesUnconfirmed}
            detail={canReview ? PRODUCTION_PAGE_COPY.reviewPermission : PRODUCTION_PAGE_COPY.permission}
          />
        </div>
      ) : null}
      {dirty ? (
        <p className="mb-3 text-sm text-[var(--isalwa-kiln)]" role="status">
          {PRODUCTION_PAGE_COPY.unsaved}
        </p>
      ) : null}
      {feedback ? (
        <div className="mb-4">
          <FeedbackNote tone={feedback.tone} title={feedback.title} detail={feedback.detail} />
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Anotación de planta">
        {TABS.map((item) => (
          <Chip key={item.id} active={tab === item.id} onClick={() => setTab(item.id)}>
            {item.label}
          </Chip>
        ))}
      </div>

      <ActionBar className="mb-4 justify-end rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-white px-4 py-3">
        <Button type="button" onClick={openDrawer}>
          Anotar
        </Button>
      </ActionBar>

      <div className="grid gap-4 lg:grid-cols-2">
        <PageSection card className="p-4">
          <SectionHeader title="Pasos" />
          <ol className="space-y-1 text-sm text-[var(--isalwa-kiln)]">
            {PRODUCTION_STEP_LABELS.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-[var(--isalwa-slate)]">En contexto · {stepLabel}</p>
        </PageSection>

        <PageSection card className="p-4">
          <SectionHeader title="Quemas" />
          <p className="text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.quemaNotParent}</p>
          {quemas.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--isalwa-slate)]">Sin quema en esta organización.</p>
          ) : (
            quemas.map((quema) => (
              <div key={quema.id} className="mt-3">
                <p className="text-sm text-[var(--isalwa-kiln)]">
                  Inicio {formatTimestamp(quema.startedAt) ?? 'sin inicio'} · Fin {quema.endedAt ? formatTimestamp(quema.endedAt) : 'sin fin'}
                </p>
                <ul className="mt-1 text-sm text-[var(--isalwa-slate)]">
                  {quema.products.map((product) => (
                    <li key={product.productId}>
                      {product.productId} · {product.quantity ? `${product.quantity}${product.unit ? ` ${product.unit}` : ''}` : PRODUCTION_PAGE_COPY.quantityPending}
                    </li>
                  ))}
                </ul>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() => {
                    setDraft((current) => ({ ...emptyDraft(), quemaId: quema.id, unit: current.unit }));
                    setDrawerOpen(true);
                    setTab('quemas');
                  }}
                >
                  Agregar producto
                </Button>
              </div>
            ))
          )}
        </PageSection>

        <PageSection card className="p-4">
          <SectionHeader title="Calidad" />
          {shownRatio ? (
            <p className="text-sm text-[var(--isalwa-kiln)]">
              {shownRatio.goodPercent}% buenas · {shownRatio.lostPercent}% pérdida. {PRODUCTION_PAGE_COPY.qualityDerived}
            </p>
          ) : (
            <p className="text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.qualityMissing}</p>
          )}
        </PageSection>

        <PageSection card className="p-4">
          <SectionHeader title="Consumo" />
          <p className="text-sm text-[var(--isalwa-slate)]">
            {CONSUMPTION_LABELS.map((item) => item.label).join(', ')}. {PRODUCTION_PAGE_COPY.stockNotOfficial}{' '}
            {PRODUCTION_PAGE_COPY.emptyNotZeroStock}
          </p>
          {stock?.ok ? <p className="mt-2 text-xs text-[var(--isalwa-slate)]">{stock.value.reason}</p> : null}
        </PageSection>
      </div>

      <PageSection card className="mt-4 p-4">
        <SectionHeader
          title="Anotaciones"
          action={
            listo ? <StatusPill tone="success">{PRODUCTION_PAGE_COPY.listo}</StatusPill> : null
          }
        />
        <p className="mb-3 text-sm text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.listoMeaning} {PRODUCTION_PAGE_COPY.receiptDoesNotAssign}</p>
        {!canRead || entries.length === 0 ? (
          <EmptyPanel compact title={PRODUCTION_PAGE_COPY.emptyTitle} description={PRODUCTION_PAGE_COPY.emptyDescription} />
        ) : (
          <div>
            {entries.map((entry) => (
              <OperatingRow
                key={entry.id}
                subject={entrySubject(entry)}
                meta={`${'productId' in entry && entry.productId ? `${entry.productId} · ` : ''}${entry.actorLabel} · ${formatTimestamp(entry.occurredAt) ?? entry.occurredAt}`}
                status={entry.correctsEntryId ? <StatusPill tone="manual">Corrección</StatusPill> : null}
                actions={
                  entry.kind === 'loss' && canEnter ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setTab('perdida');
                        setDraft((current) => ({
                          ...current,
                          correctsEntryId: entry.id,
                          reason: entry.reason,
                          quantity: entry.quantityLost,
                          percentage: entry.percentageLost,
                        }));
                        setDrawerOpen(true);
                        setDirty(false);
                      }}
                    >
                      Corregir
                    </Button>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </PageSection>

      <ContextDrawer open={drawerOpen} title="Una anotación" onClose={closeDrawer}>
        <form
          className="flex min-h-full flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="min-h-0 flex-1 space-y-3">
            <p className="text-sm text-[var(--isalwa-slate)]">
              {productId || 'Sin identificador'} · {stepLabel}
            </p>
            {tab === 'quemas' ? (
              <>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Inicio
                  <input className={fieldClass} type="datetime-local" value={draft.startedAt} onChange={(event) => patch({ startedAt: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Fin
                  <input className={fieldClass} type="datetime-local" value={draft.endedAt} onChange={(event) => patch({ endedAt: event.target.value })} />
                </label>
                <p className="text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.quemaNotParent} {PRODUCTION_PAGE_COPY.quantityPending}</p>
              </>
            ) : null}
            {tab === 'perdida' ? (
              <>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Cantidad
                  <input ref={quantityRef} className={fieldClass} inputMode="decimal" value={draft.quantity} onChange={(event) => patch({ quantity: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Porcentaje
                  <input className={fieldClass} inputMode="decimal" value={draft.percentage} onChange={(event) => patch({ percentage: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Motivo
                  <input className={fieldClass} value={draft.reason} onChange={(event) => patch({ reason: event.target.value })} />
                </label>
                <p className="text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.correctionHint}</p>
              </>
            ) : null}
            {tab === 'consumo' ? (
              <>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Categoría
                  <select className={fieldClass} value={draft.category} onChange={(event) => patch({ category: event.target.value as typeof draft.category })}>
                    {CONSUMPTION_LABELS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Descripción
                  <input className={fieldClass} value={draft.description} onChange={(event) => patch({ description: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Cantidad
                  <input ref={quantityRef} className={fieldClass} inputMode="decimal" value={draft.quantity} onChange={(event) => patch({ quantity: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Unidad
                  <input className={fieldClass} value={draft.unit} onChange={(event) => patch({ unit: event.target.value })} />
                </label>
                <p className="text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.stockNotOfficial}</p>
              </>
            ) : null}
            {tab === 'listo' ? (
              <>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Cantidad
                  <input ref={quantityRef} className={fieldClass} inputMode="decimal" value={draft.quantity} onChange={(event) => patch({ quantity: event.target.value })} />
                </label>
                <p className="text-sm text-[var(--isalwa-kiln)]">{FINISHED_GOODS_WAREHOUSE_LABEL}</p>
                <p className="text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.receiptDoesNotAssign}</p>
              </>
            ) : null}
            {tab === 'planta' && stepKey === 'clasificacion' ? (
              <>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Piezas buenas
                  <input className={fieldClass} inputMode="numeric" value={draft.goodCount} onChange={(event) => patch({ goodCount: event.target.value })} />
                </label>
                <label className="block text-sm text-[var(--isalwa-kiln)]">
                  Piezas perdidas
                  <input className={fieldClass} inputMode="numeric" value={draft.lostCount} onChange={(event) => patch({ lostCount: event.target.value })} />
                </label>
                <p className="text-xs text-[var(--isalwa-slate)]">{PRODUCTION_PAGE_COPY.qualityMissing}</p>
              </>
            ) : null}
            {tab === 'planta' && stepKey !== 'clasificacion' ? (
              <label className="block text-sm text-[var(--isalwa-kiln)]">
                Nota
                <input className={fieldClass} value={draft.note} onChange={(event) => patch({ note: event.target.value })} />
              </label>
            ) : null}
            <label className="block text-sm text-[var(--isalwa-kiln)]">
              Ocurrió
              <input className={fieldClass} type="datetime-local" value={draft.occurredAt} onChange={(event) => patch({ occurredAt: event.target.value })} />
            </label>
          </div>
          <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-porcelain)_94%,white)] px-4 py-3 backdrop-blur-md">
            <Button type="submit" disabled={!canEnter}>
              Guardar
            </Button>
          </div>
        </form>
      </ContextDrawer>
    </div>
  );
}

function entrySubject(entry: {
  kind: string;
  stepKey?: string;
}): string {
  if (entry.kind === 'finished_goods_receipt') return FINISHED_GOODS_WAREHOUSE_LABEL;
  if (entry.kind === 'loss') return 'Pérdida';
  if (entry.kind === 'consumption') return 'Consumo';
  if (entry.kind === 'classification') return 'Clasificación';
  const step = PRODUCTION_STEP_OPTIONS.find((item) => item.key === entry.stepKey);
  return step?.label ?? 'Paso';
}

function emptyDraft() {
  return {
    occurredAt: toLocalInput(),
    startedAt: toLocalInput(),
    endedAt: '',
    note: '',
    quantity: '',
    percentage: '',
    reason: '',
    description: '',
    unit: '',
    category: 'raw_material' as const,
    goodCount: '',
    lostCount: '',
    correctionReason: '',
    correctsEntryId: null as string | null,
    quemaId: null as string | null,
  };
}

function toLocalInput(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function parseCount(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}
