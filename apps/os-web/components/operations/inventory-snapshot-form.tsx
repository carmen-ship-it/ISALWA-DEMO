'use client';

import { useState, type FormEvent } from 'react';
import { Button, StatusPill } from '@isalwa/ui';
import { FormFeedback } from '@/components/commercial/form-feedback';
import {
  INVENTORY_SNAPSHOT_COPY,
  recordReportedOperationalFact,
  reportedFactCopy,
  reportedFactErrorCopy,
  type ReportedFactWriteResult,
} from '@/lib/operations/reported-fact';
import { fieldClass, subjectLine, type ManualOperationSubject } from './subject';

type InventorySnapshotFormProps = ManualOperationSubject & {
  onRecorded: (result: ReportedFactWriteResult) => void;
};

export function InventorySnapshotForm(props: InventorySnapshotFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const recorded = recordReportedOperationalFact({
        id: crypto.randomUUID(),
        organizationId: props.organizationId,
        subjectType: props.subjectType,
        subjectId: props.subjectId,
        reportedAt: new Date().toISOString(),
        reportedByLabel: props.reportedByLabel,
        kind: 'stock',
        itemLabel,
        quantity,
        unit,
        note,
      });
      reportedFactCopy(recorded.fact);
      setError(null);
      setItemLabel('');
      setQuantity('');
      setUnit('');
      setNote('');
      props.onRecorded(recorded);
    } catch (caught) {
      setError(reportedFactErrorCopy(caught));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 border-t border-[var(--isalwa-mist)] pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-medium text-[var(--isalwa-kiln)]">{INVENTORY_SNAPSHOT_COPY.title}</h3>
        <StatusPill tone="manual">Dato manual</StatusPill>
        <StatusPill tone="warning">Pendiente de confirmar</StatusPill>
      </div>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{subjectLine(props)}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{INVENTORY_SNAPSHOT_COPY.intro}</p>
      <p className="text-sm leading-relaxed text-[var(--isalwa-slate)]">{INVENTORY_SNAPSHOT_COPY.boundary}</p>
      <FormFeedback error={error} />
      <div>
        <label htmlFor="manual-stock-item" className="isalwa-section-label">
          {INVENTORY_SNAPSHOT_COPY.item}
        </label>
        <input
          id="manual-stock-item"
          name="itemLabel"
          required
          value={itemLabel}
          onChange={(event) => setItemLabel(event.target.value)}
          className={fieldClass}
          autoComplete="off"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="manual-stock-quantity" className="isalwa-section-label">
            {INVENTORY_SNAPSHOT_COPY.quantity}
          </label>
          <input
            id="manual-stock-quantity"
            name="quantity"
            inputMode="numeric"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="manual-stock-unit" className="isalwa-section-label">
            {INVENTORY_SNAPSHOT_COPY.unit}
          </label>
          <input
            id="manual-stock-unit"
            name="unit"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="unidades"
            className={fieldClass}
            autoComplete="off"
          />
        </div>
      </div>
      <div>
        <label htmlFor="manual-stock-note" className="isalwa-section-label">
          {INVENTORY_SNAPSHOT_COPY.note}
        </label>
        <textarea
          id="manual-stock-note"
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className={fieldClass}
        />
      </div>
      <Button type="submit">{INVENTORY_SNAPSHOT_COPY.submit}</Button>
    </form>
  );
}
