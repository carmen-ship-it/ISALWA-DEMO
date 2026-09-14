import { ListRow, StatusPill } from '@isalwa/ui';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { CAPABILITY_PRESENTATION } from '@/lib/capabilities/presentation';
import {
  capabilityStateTone,
  formatCapabilityDescription,
  formatCapabilityLabel,
  formatCapabilityState,
} from '@/lib/workforce/labels';

type CapabilityListProps = {
  items: CapabilityStateReadModel[];
};

function capabilityDetail(
  capabilityKey: string,
  state: string,
  employeeMessage: string | undefined,
): string {
  if (state !== 'ACTIVE') {
    return employeeMessage ?? formatCapabilityDescription(capabilityKey);
  }
  switch (capabilityKey) {
    case 'commercial':
      return 'El trabajo comercial se hace en Clientes.';
    case 'work':
      return 'La cola de trabajo está disponible.';
    case 'partygraph':
      return 'Clientes y relaciones están disponibles.';
    case 'workforce':
      return 'El directorio está disponible para administración.';
    default:
      return 'Disponible para su empresa.';
  }
}

export function CapabilityList({ items }: CapabilityListProps) {
  return (
    <>
      <p className="mb-6 max-w-2xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
        Qué tiene habilitado su empresa. Esto no indica qué puede hacer cada persona.
      </p>
      <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Funciones habilitadas">
        {items.map((item) => {
          const presentation = CAPABILITY_PRESENTATION[item.capabilityKey];
          const label = presentation?.label ?? formatCapabilityLabel(item.capabilityKey);
          const detail = capabilityDetail(item.capabilityKey, item.state, presentation?.employeeMessage);
          return (
            <ListRow key={item.capabilityKey} as="li" className="px-1 py-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--isalwa-kiln)]">{label}</p>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--isalwa-slate)]">
                    {detail}
                  </p>
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    {item.implemented ? 'Forma parte del producto' : 'Todavía no forma parte del producto'}
                    {item.source === 'org_override' ? ' · Ajuste de su empresa' : null}
                  </p>
                </div>
                <StatusPill tone={capabilityStateTone(item.state)}>
                  {formatCapabilityState(item.state)}
                </StatusPill>
              </div>
            </ListRow>
          );
        })}
      </ul>
    </>
  );
}
