import { Button, cx } from '@isalwa/ui';
import { readActiveQaView, endQaView } from '@/lib/qa/actions';

export async function QaViewBanner() {
  const active = await readActiveQaView();
  if (!active?.persona) return null;

  return (
    <div
      className={cx(
        'border-b border-[color-mix(in_srgb,var(--isalwa-glaze)_22%,var(--isalwa-mist))]',
        'bg-[color-mix(in_srgb,var(--isalwa-glaze)_8%,var(--isalwa-porcelain))]',
        'px-4 py-3 md:px-6',
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--isalwa-kiln)]">
          <span className="isalwa-kicker mr-2">Ver como</span>
          Está revisando la experiencia como{' '}
          <strong className="font-semibold">{active.persona.label}</strong> (
          {active.persona.email}). Su sesión real sigue activa; esto es una vista de prueba en SYNTH.
        </p>
        <form action={endQaView}>
          <Button type="submit" variant="secondary" size="sm">
            Terminar vista
          </Button>
        </form>
      </div>
    </div>
  );
}
