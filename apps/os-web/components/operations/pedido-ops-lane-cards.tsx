import Link from 'next/link';
import { InsightCard, PageSection, SectionHeader } from '@isalwa/ui';
import { PEDIDO_FUNCTION_ROUTES } from '@/lib/navigation/requests/pedido';

export type PedidoOpsLaneCard = {
  id: 'production' | 'warehouse' | 'delivery';
  title: string;
  body: string;
  href: string;
  cta: string;
};

const DEFAULT_LANES: PedidoOpsLaneCard[] = [
  {
    id: 'production',
    title: 'Producción',
    body: 'Apertura el escritorio de planta con este pedido como contexto. No inventa un estado de fábrica.',
    href: PEDIDO_FUNCTION_ROUTES.produccion,
    cta: 'Abrir producción',
  },
  {
    id: 'warehouse',
    title: 'Almacén',
    body: 'Ingreso de producto terminado y asignación son decisiones distintas. Sin stock inventado.',
    href: PEDIDO_FUNCTION_ROUTES.almacen,
    cta: 'Abrir almacén',
  },
  {
    id: 'delivery',
    title: 'Entregas',
    body: 'Nota de entrega, salida y entrega se registran por hechos. Salida no es entrega.',
    href: PEDIDO_FUNCTION_ROUTES.entregas,
    cta: 'Abrir entregas',
  },
];

type PedidoOpsLaneCardsProps = {
  orderId: string;
  lanes?: readonly PedidoOpsLaneCard[];
};

/**
 * Production / Warehouse / Delivery cards — links only, no invented progress.
 */
export function PedidoOpsLaneCards({ orderId, lanes = DEFAULT_LANES }: PedidoOpsLaneCardsProps) {
  return (
    <PageSection card className="mt-10 bg-white p-8 md:p-10" aria-label="Escritorios operativos">
      <SectionHeader
        kicker="Operaciones"
        title={
          <h2 className="font-[family-name:var(--isalwa-font-display)] text-2xl font-normal italic text-[var(--isalwa-kiln)]">
            Escritorios vinculados
          </h2>
        }
      />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {lanes.map((lane) => {
          const href = `${lane.href}?orderId=${encodeURIComponent(orderId)}`;
          return (
            <InsightCard key={lane.id} className="flex h-full flex-col">
              <span className="not-italic text-sm font-medium text-[var(--isalwa-kiln)]">
                {lane.title}
              </span>
              <span className="mt-2 block flex-1 text-sm leading-relaxed text-[var(--isalwa-slate)]">
                {lane.body}
              </span>
              <Link
                href={href}
                className="mt-4 text-sm font-medium text-[var(--isalwa-glaze)] underline-offset-4 hover:underline"
              >
                {lane.cta}
              </Link>
            </InsightCard>
          );
        })}
      </div>
    </PageSection>
  );
}
