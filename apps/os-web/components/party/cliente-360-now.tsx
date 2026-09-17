import Link from 'next/link';
import { CLIENTE_360_COPY, type Cliente360Composition } from '@/lib/party/next-action';
import { CLIENTE360_UX_COPY } from '@/lib/cliente/copy';
import { displayCliente360NextAction } from '@/lib/cliente/next-action-display';

const linkClass = 'text-sm font-medium text-[var(--isalwa-glaze)] hover:underline';
const helpLinkClass = 'text-sm font-medium text-[var(--isalwa-info)] hover:underline';

const CLIENTE360_IDENTITY_TARGET = 'cliente360-identity';

type Cliente360NowProps = {
  composition: Cliente360Composition;
  compact?: boolean;
};

/**
 * Resumen facts — next action lives only in the sticky command band.
 * This block summarizes identity / blockers without replaying the hero.
 */
export function Cliente360Now({ composition, compact = false }: Cliente360NowProps) {
  const { location, primaryContact, latestActivity } = composition;
  const nextAction = displayCliente360NextAction(composition.nextAction);

  return (
    <section
      aria-label="Qué hacer con este cliente"
      className={compact ? 'space-y-4' : 'space-y-5'}
      data-tour={CLIENTE360_IDENTITY_TARGET}
    >
      <p className="text-sm text-[var(--isalwa-slate)]">
        {nextAction.isRegisteredAction ? CLIENTE360_UX_COPY.nextActionHeading : CLIENTE_360_COPY.now}
        {': '}
        <a href="#cliente360-command" className={helpLinkClass}>
          ver en la barra de comando
        </a>
        {nextAction.href && nextAction.hrefLabel ? (
          <>
            {' · '}
            <Link href={nextAction.href} className={linkClass}>
              {nextAction.hrefLabel}
            </Link>
          </>
        ) : null}
      </p>

      <dl className={compact ? 'space-y-3 text-sm' : 'grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2'}>
        <Fact label="Responsable comercial" value={composition.owner.label} note={composition.owner.note} />
        <Fact
          label="Contacto"
          value={primaryContact.summary}
          note={primaryContact.source === 'first_active_contact' ? CLIENTE_360_COPY.contactSource : null}
        />
        {primaryContact.phone ? <Fact label="Teléfono" value={primaryContact.phone} /> : null}
        <div className="min-w-0">
          <dt className="isalwa-section-label">Ubicación</dt>
          <dd className="mt-1.5 text-[var(--isalwa-kiln)]">{location.summary}</dd>
          {location.coordinates ? (
            <dd className="mt-1 break-words text-[var(--isalwa-kiln)]">{location.coordinates}</dd>
          ) : null}
          {location.address ? (
            <dd className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{location.address}</dd>
          ) : null}
          {location.provenance ? (
            <dd className="mt-1">
              <a
                href={location.provenance.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {location.provenance.label}
              </a>
            </dd>
          ) : null}
        </div>
        <div className="min-w-0">
          <dt className="isalwa-section-label">Actividad reciente</dt>
          <dd className="mt-1.5 break-words text-[var(--isalwa-kiln)]">
            {latestActivity.label ?? latestActivity.summary}
          </dd>
          {latestActivity.label && latestActivity.summary && latestActivity.summary !== latestActivity.label ? (
            <dd className="mt-1 break-words text-sm text-[var(--isalwa-slate)]">{latestActivity.summary}</dd>
          ) : null}
          {latestActivity.occurredLabel ? (
            <dd className="mt-1 text-sm text-[var(--isalwa-slate)]">
              {latestActivity.occurredAt ? (
                <time dateTime={latestActivity.occurredAt}>{latestActivity.occurredLabel}</time>
              ) : (
                latestActivity.occurredLabel
              )}
            </dd>
          ) : null}
          {latestActivity.href ? (
            <dd className="mt-1">
              <Link href={latestActivity.href} className={linkClass}>
                Ver actividad
              </Link>
            </dd>
          ) : null}
        </div>
        <div className={compact ? 'min-w-0' : 'min-w-0 sm:col-span-2'}>
          <dt className="isalwa-section-label">Relación comercial</dt>
          <dd className="mt-1.5 break-words text-[var(--isalwa-kiln)]">{composition.relationship.summary}</dd>
        </div>
      </dl>

      <div>
        <p className="isalwa-section-label">Bloqueos</p>
        {composition.blockers.length === 0 ? (
          <p className="mt-1.5 text-sm text-[var(--isalwa-slate)]">{composition.blockersSummary}</p>
        ) : (
          <ul className="mt-1.5 space-y-1 text-sm text-[var(--isalwa-danger)]">
            {composition.blockers.map((blocker) => (
              <li key={blocker.code}>{blocker.label}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="isalwa-section-label">{CLIENTE_360_COPY.why}</p>
        <ul className="mt-1.5 space-y-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
          {composition.why.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="isalwa-section-label">{label}</dt>
      <dd className="mt-1.5 break-words text-[var(--isalwa-kiln)]">{value}</dd>
      {note && note !== value ? <dd className="mt-1 text-sm text-[var(--isalwa-slate)]">{note}</dd> : null}
    </div>
  );
}
