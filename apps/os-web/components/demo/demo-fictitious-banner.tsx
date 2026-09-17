'use client';

import { DEMO_FICTITIOUS_BADGE } from '@/lib/demo/owner-demo-identity';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';

/** Persistent banner while demo data mode or Story Mode is active. */
export function DemoFictitiousBanner() {
  const { dataMode, storyOpen, canUseOwnerDemo } = useOwnerDemo();
  if (!canUseOwnerDemo) return null;
  if (dataMode !== 'demo' && !storyOpen) return null;

  return (
    <div
      role="status"
      className="border-b border-[color-mix(in_srgb,#2C8C88_35%,var(--isalwa-mist))] bg-[color-mix(in_srgb,#EAF6F4_80%,var(--isalwa-white))] px-4 py-2 lg:px-8"
    >
      <p className="mx-auto max-w-[90rem] text-xs font-bold tracking-[0.12em] text-[var(--isalwa-kiln)] uppercase">
        {DEMO_FICTITIOUS_BADGE}
      </p>
      <p className="mx-auto max-w-[90rem] text-sm text-[var(--isalwa-slate)]">
        Está viendo datos de demostración. No son transacciones reales de la empresa.
      </p>
    </div>
  );
}
