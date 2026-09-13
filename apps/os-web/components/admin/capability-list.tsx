import { ListRow, StatusPill } from '@isalwa/ui';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { CAPABILITY_PRESENTATION } from '@/lib/capabilities/presentation';
import {
  capabilityStateTone,
  formatCapabilityState,
} from '@/lib/workforce/labels';

type CapabilityListProps = {
  items: CapabilityStateReadModel[];
};

export function CapabilityList({ items }: CapabilityListProps) {
  return (
    <>
      <p className="mb-4 text-sm text-[var(--isalwa-slate)]">
        Disponibilidad del sistema para su empresa. Esto no indica qué puede hacer cada
        empleado — la autorización se valida en cada consulta.
      </p>
      <ul className="divide-y divide-[var(--isalwa-mist)]" aria-label="Capacidades del sistema">
        {items.map((item) => {
          const presentation = CAPABILITY_PRESENTATION[item.capabilityKey];
          const label = presentation?.label ?? item.capabilityKey;
          return (
            <ListRow key={item.capabilityKey} as="li" className="px-1 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[var(--isalwa-kiln)]">{label}</p>
                  {presentation?.employeeMessage ? (
                    <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
                      {presentation.employeeMessage}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm text-[var(--isalwa-slate)]">
                    {item.implemented ? 'Implementado en el sistema' : 'Aún no implementado'}
                    {item.source === 'org_override' ? ' · Configuración de empresa' : null}
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
