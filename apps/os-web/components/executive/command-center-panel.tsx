import Link from 'next/link';
import { OperatingRow, StatusPill } from '@isalwa/ui';
import {
  submittedQuoteAttentionLine,
  visibleExecutiveSlice,
  type ExecutiveCommandModel,
  type ExecutiveException,
  type ExecutiveIdentityGroup,
} from '@/lib/executive/command-center';

type ExecutiveCommandCenterProps = {
  model: ExecutiveCommandModel;
  /** Quotes-only keeps the commercial reading from repeating the full manager composition. */
  tone?: 'full' | 'quotes';
  /** The commercial reading already states the oldest age. Do not repeat it. */
  quoteSummary?: boolean;
};

export function ExecutiveCommandCenter({
  model,
  tone = 'full',
  quoteSummary = true,
}: ExecutiveCommandCenterProps) {
  if (tone === 'quotes') {
    return <QuoteWaitingBlock model={model} summary={quoteSummary} />;
  }
  if (model.empty && !model.partial) return null;

  return (
    <div className="mb-8 min-w-0 space-y-6" aria-label="Qué concentra la atención">
      <div>
        <p className="isalwa-kicker">Excepciones</p>
        <h3 className="mt-2 font-[family-name:var(--isalwa-font-display)] text-xl italic text-[var(--isalwa-kiln)]">
          Qué concentra la atención
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">{model.lead}</p>
      </div>
      {model.partialNote ? <PartialNote text={model.partialNote} /> : null}
      {model.bottlenecks.length > 0 ? (
        <GroupBlock
          title="Cuellos de botella"
          description="Personas que tienen trabajo ya vencido o una decisión pendiente en esta lectura."
          groups={model.bottlenecks}
        />
      ) : null}
      <ExceptionBlock title="Decisiones pendientes" items={model.pendingDecisions} />
      <ExceptionBlock title="Trabajo vencido" items={model.overdue} />
      <QuoteWaitingBlock model={model} summary={quoteSummary} />
      {model.byResponsible.length > 0 ? (
        <GroupBlock
          title="Por responsable"
          description="Las excepciones de esta lectura, agrupadas por la persona responsable."
          groups={model.byResponsible}
        />
      ) : null}
      {model.byCustomer.length > 0 ? (
        <GroupBlock
          title="Por cliente"
          description="Clientes que aparecen en estas excepciones."
          groups={model.byCustomer}
        />
      ) : null}
    </div>
  );
}

function QuoteWaitingBlock({
  model,
  summary: showSummary,
}: {
  model: ExecutiveCommandModel;
  summary: boolean;
}) {
  if (model.quoteWaiting.length === 0) return null;
  const oldest = model.quoteWaiting.find((item) => item.agePhrase)?.agePhrase ?? null;
  const summary = showSummary
    ? submittedQuoteAttentionLine(model.quoteWaiting.length, oldest)
    : null;

  return (
    <section aria-label="Cotizaciones enviadas" className="min-w-0">
      <h4 className="text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
        Cotizaciones enviadas
      </h4>
      {summary ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{summary}</p>
      ) : null}
      <p className="mt-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">{model.quoteAgeNote}</p>
      <ExceptionRows items={model.quoteWaiting} />
    </section>
  );
}

function ExceptionBlock({ title, items }: { title: string; items: ExecutiveException[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="min-w-0">
      <h4 className="text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">{title}</h4>
      <ExceptionRows items={items} />
    </section>
  );
}

function GroupBlock({
  title,
  description,
  groups,
}: {
  title: string;
  description: string;
  groups: ExecutiveIdentityGroup[];
}) {
  const visible = visibleExecutiveSlice(groups);
  return (
    <section aria-label={title} className="min-w-0">
      <h4 className="text-xs font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">{description}</p>
      <div className="mt-3 space-y-4">
        {visible.items.map((group) => (
          <div key={`${title}:${group.id}`} className="min-w-0">
            {group.href ? (
              <Link
                href={group.href}
                className="text-sm font-medium text-[var(--isalwa-kiln)] hover:text-[var(--isalwa-glaze)] hover:underline"
              >
                {group.label}
              </Link>
            ) : (
              <p className="text-sm font-medium text-[var(--isalwa-kiln)]">{group.label}</p>
            )}
            <ExceptionRows items={group.exceptions} />
          </div>
        ))}
      </div>
      {visible.hidden > 0 ? <MoreInReading /> : null}
    </section>
  );
}

function ExceptionRows({ items }: { items: ExecutiveException[] }) {
  const visible = visibleExecutiveSlice(items);
  return (
    <div className="mt-2 min-w-0">
      <ul className="min-w-0">
        {visible.items.map((item) => (
          <li key={item.id} className="list-none">
            <OperatingRow
              href={item.href}
              subject={item.title}
              meta={item.detail}
              status={<StatusPill tone={toneFor(item.kind)}>{labelFor(item.kind)}</StatusPill>}
            />
          </li>
        ))}
      </ul>
      {visible.hidden > 0 ? <MoreInReading /> : null}
    </div>
  );
}

function PartialNote({ text }: { text: string }) {
  return (
    <p className="rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-info)_8%,white)] px-4 py-3 text-sm leading-relaxed text-[var(--isalwa-slate)]">
      {text}
    </p>
  );
}

function MoreInReading() {
  return <p className="mt-2 text-sm text-[var(--isalwa-slate)]">Hay más en esta lectura.</p>;
}

function labelFor(kind: ExecutiveException['kind']): string {
  switch (kind) {
    case 'overdue_work':
      return 'Vencido';
    case 'pending_decision':
      return 'Aprobación pendiente';
    case 'submitted_quote':
      return 'Enviada';
  }
}

function toneFor(kind: ExecutiveException['kind']): 'danger' | 'warning' | 'info' {
  switch (kind) {
    case 'overdue_work':
      return 'danger';
    case 'pending_decision':
      return 'warning';
    case 'submitted_quote':
      return 'info';
  }
}
