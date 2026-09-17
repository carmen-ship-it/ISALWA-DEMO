'use client';

import { useId, useRef, useState, useEffect } from 'react';
import { canUseRolePreview } from '@/lib/role-preview/access';
import { RolePreviewMenu } from '@/components/shell/role-preview-menu';
import { useRolePreview } from '@/components/shell/role-preview-provider';

/** Desktop owner-evaluation control. Hidden when viewer cannot use preview. */
export function RolePreviewDesktopControl({ grantedScopes }: { grantedScopes: readonly string[] }) {
  const allowed = canUseRolePreview(grantedScopes);
  const { active } = useRolePreview();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open]);

  if (!allowed) return null;

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        className="isalwa-t-fast inline-flex h-10 items-center rounded-[var(--isalwa-radius-control)] px-2.5 text-xs font-medium uppercase tracking-[0.12em] text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        {active ? 'Vista previa' : 'Vista de evaluación'}
      </button>
      {open ? (
        <div
          id={menuId}
          className="absolute right-0 z-50 mt-2 w-64 rounded-[var(--isalwa-radius-panel)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] p-2 shadow-[var(--isalwa-shadow-soft)]"
        >
          <RolePreviewMenu onSelect={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
