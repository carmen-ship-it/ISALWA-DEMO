import { InsightCard, PageSection, SectionHeader, StatusPill } from '@isalwa/ui';
import {
  PEDIDO_SCOPES_UNCONFIRMED,
  answerValue,
  type PedidoCaseFile,
} from '@/lib/operations/pedido-case-file';
import {
  PEDIDO_NO_SHARED_OWNERSHIP,
  PEDIDO_PAYMENT_NOT_REQUIRED,
} from '@/lib/operations/pedido-case';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="isalwa-section-label">{label}</dt>
      <dd className="mt-2 text-sm leading-relaxed text-[var(--isalwa-kiln)]">{value}</dd>
    </div>
  );
}

/**
 * Answers the case at the top. Closed facts stay closed. No action button.
 */
export function PedidoOperatingSummary({ file }: { file: PedidoCaseFile }) {
  const pedido = answerValue(file, 'pedido');
  const estado = answerValue(file, 'estado');

  return (
    <PageSection card className="bg-white p-8 md:p-10" aria-label="Resumen del pedido">
      <SectionHeader
        kicker="Pedido"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            {pedido}
          </h2>
        }
        action={<StatusPill tone="neutral">{estado}</StatusPill>}
      />

      <dl className="mt-8 grid gap-8 sm:grid-cols-2">
        {file.answer.map((field) => (
          <Field key={field.id} label={field.label} value={field.value} />
        ))}
      </dl>

      {file.blocker ? (
        <InsightCard className="mt-8">
          <span className="not-italic text-sm font-medium">Bloqueo</span>
          <span className="mt-1 block">{file.blocker}</span>
        </InsightCard>
      ) : null}

      <p className="mt-8 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {PEDIDO_NO_SHARED_OWNERSHIP}
      </p>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        {PEDIDO_PAYMENT_NOT_REQUIRED}
      </p>
      {file.scopesConfirmed ? null : (
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {PEDIDO_SCOPES_UNCONFIRMED}
        </p>
      )}
    </PageSection>
  );
}
