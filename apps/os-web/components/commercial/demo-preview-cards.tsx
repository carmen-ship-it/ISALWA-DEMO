import { StatusPill } from '@isalwa/ui';

const PREVIEWS = [
  {
    id: 'cobranza',
    title: 'COBRANZA',
    body: 'Se activará con información real cuando conectemos ISALWA al sistema o fuente donde hoy registran pagos y cobranzas.',
  },
  {
    id: 'despachos',
    title: 'DESPACHOS',
    body: 'Se activará con datos reales cuando conectemos ISALWA al sistema de despacho o logística.',
  },
  {
    id: 'inventario',
    title: 'INVENTARIO',
    body: 'Se activará cuando conectemos el sistema donde controlan stock y movimientos de almacén.',
  },
  {
    id: 'produccion',
    title: 'PRODUCCIÓN',
    body: 'Se activará cuando conectemos la información real de producción.',
  },
  {
    id: 'ingresos-cobrados',
    title: 'INGRESOS COBRADOS',
    body: 'Se activará cuando conectemos la fuente oficial de ventas y cobranza.',
  },
] as const;

/**
 * Future areas. Visually distinct from live records.
 * No figures, no commands, and nothing that can feed a total or an alert.
 */
export function DemoPreviewCards() {
  return (
    <section
      aria-label="Vista demo"
      className="mt-12 border-t border-dashed border-[var(--isalwa-slate)] pt-8"
    >
      <p className="isalwa-kicker text-[var(--isalwa-slate)]">Vista demo</p>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Estas áreas no están conectadas. No son cifras ni pendientes de hoy.
      </p>
      <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {PREVIEWS.map((item) => (
          <li
            key={item.id}
            className="rounded-[var(--isalwa-radius-panel)] border border-dashed border-[var(--isalwa-slate)] bg-[var(--isalwa-porcelain)] px-4 py-3"
          >
            <StatusPill tone="demo">Vista demo</StatusPill>
            <h2 className="mt-1 text-sm font-medium tracking-wide text-[var(--isalwa-slate)] uppercase">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--isalwa-slate)]">
              Vista demo. {item.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
