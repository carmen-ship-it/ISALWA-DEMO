'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cx } from '@isalwa/ui';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';
import type { DemoDataMode } from '@/lib/demo/owner-demo-identity';

/** Owner toggle: Datos reales (default) / Demo. Story Mode forces Demo. */
export function DemoDataFilterToggle() {
  const { dataMode, setDataMode, canUseOwnerDemo, storyOpen } = useOwnerDemo();
  const router = useRouter();
  const pathname = usePathname();
  if (!canUseOwnerDemo) return null;

  const lockedDemo = storyOpen;

  function select(mode: DemoDataMode) {
    if (lockedDemo && mode === 'real') return;
    setDataMode(mode);
    const next = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    if (mode === 'demo') next.set('datos', 'demo');
    else next.delete('datos');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      data-shell-demo-toggle
      className="inline-flex items-center gap-1 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-0.5"
      role="group"
      aria-label="Filtro de datos"
    >
      {(
        [
          { mode: 'real' as const, label: 'Datos reales' },
          { mode: 'demo' as const, label: 'Demo' },
        ] as const
      ).map((opt) => {
        const active = dataMode === opt.mode;
        return (
          <button
            key={opt.mode}
            type="button"
            disabled={lockedDemo && opt.mode === 'real'}
            onClick={() => select(opt.mode)}
            className={cx(
              'rounded-[calc(var(--isalwa-radius-control)-2px)] px-2.5 py-1 text-xs font-medium outline-none transition-colors',
              active
                ? 'bg-[color-mix(in_srgb,#EAF6F4_90%,white)] text-[var(--isalwa-kiln)]'
                : 'text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-porcelain)]',
              lockedDemo && opt.mode === 'real' ? 'opacity-40' : '',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
