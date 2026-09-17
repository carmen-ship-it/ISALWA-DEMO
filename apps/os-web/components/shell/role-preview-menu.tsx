'use client';

import { useRolePreview } from '@/components/shell/role-preview-provider';
import type { RolePreviewPersonaId } from '@/lib/role-preview/types';

type RolePreviewMenuProps = {
  onSelect?: () => void;
};

export function RolePreviewMenu({ onSelect }: RolePreviewMenuProps) {
  const { persona, subjectMemberId, setPersona, presets, asesorOptions } = useRolePreview();

  return (
    <div className="mt-3 border-t border-[var(--isalwa-mist)] pt-3">
      <p className="isalwa-kicker px-2">Vista de evaluación</p>
      <p className="mt-1 px-2 text-xs leading-relaxed text-[var(--isalwa-slate)]">
        Sigue siendo Carmen. La proyección se estrecha; las mutaciones quedan deshabilitadas.
      </p>
      <ul className="mt-2 flex flex-col gap-0.5" role="menu">
        {presets.map((preset) => {
          if (preset.id === 'asesor' && asesorOptions.length > 0) {
            return (
              <li key={preset.id} className="flex flex-col gap-0.5">
                <p className="px-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-[var(--isalwa-slate)]">
                  Asesor
                </p>
                {asesorOptions.map((opt) => {
                  const selected = persona === 'asesor' && subjectMemberId === opt.memberId;
                  return (
                    <button
                      key={opt.memberId}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={`isalwa-t-fast w-full rounded-[var(--isalwa-radius-control)] px-2 py-2 text-left text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] ${
                        selected
                          ? 'bg-[var(--isalwa-mist)] font-medium text-[var(--isalwa-kiln)]'
                          : 'text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]'
                      }`}
                      onClick={() => {
                        setPersona('asesor', opt.memberId);
                        onSelect?.();
                      }}
                    >
                      Asesor · {opt.label}
                    </button>
                  );
                })}
              </li>
            );
          }

          const selected =
            preset.id === 'own' ? persona === null : persona === (preset.id as RolePreviewPersonaId);
          return (
            <li key={preset.id}>
              <button
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                className={`isalwa-t-fast w-full rounded-[var(--isalwa-radius-control)] px-2 py-2 text-left text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)] ${
                  selected
                    ? 'bg-[var(--isalwa-mist)] font-medium text-[var(--isalwa-kiln)]'
                    : 'text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-porcelain)]'
                }`}
                onClick={() => {
                  setPersona(preset.id);
                  onSelect?.();
                }}
              >
                {preset.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
