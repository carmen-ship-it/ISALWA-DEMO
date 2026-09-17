'use client';

import Link from 'next/link';
import { Button, PageSection } from '@isalwa/ui';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';

/** Inicio owner/evaluation card — CT3 §74. */
export function InicioOwnerDemoCard() {
  const { canUseOwnerDemo, openStory } = useOwnerDemo();
  if (!canUseOwnerDemo) return null;

  return (
    <PageSection
      card
      className="border border-[color-mix(in_srgb,#2C8C88_25%,var(--isalwa-mist))] bg-[color-mix(in_srgb,#EAF6F4_55%,var(--isalwa-white))] p-4 md:p-5"
    >
      <p className="text-[10px] font-bold tracking-[0.14em] text-[var(--isalwa-slate)] uppercase">
        Recorrido de evaluación
      </p>
      <p className="mt-2 text-sm font-medium text-[var(--isalwa-kiln)]">
        ¿Quiere ver ISALWA con un proceso completo?
      </p>
      <p className="mt-1 text-sm text-[var(--isalwa-slate)]">
        Un recorrido guiado con datos DEMO · ficticios. No altera clientes reales.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="primary" size="sm" onClick={openStory}>
          Ver recorrido completo
        </Button>
        <Link href="/inicio?story=1" className="inline-flex">
          <Button type="button" variant="tertiary" size="sm">
            Abrir con enlace
          </Button>
        </Link>
      </div>
    </PageSection>
  );
}
