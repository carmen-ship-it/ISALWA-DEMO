'use client';

import { useRolePreview } from '@/components/shell/role-preview-provider';
import { rolePreviewPresetLabel } from '@/lib/role-preview/presets';

export function RolePreviewBanner() {
  const { active, persona, resetToMyView } = useRolePreview();
  if (!active) return null;

  const label = rolePreviewPresetLabel(persona);

  return (
    <div
      role="status"
      className="border-b border-[var(--isalwa-mist)] bg-[color-mix(in_srgb,var(--isalwa-sky-100)_55%,var(--isalwa-white))] px-4 py-2.5 lg:px-8"
    >
      <div className="mx-auto flex max-w-[90rem] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--isalwa-kiln)]">
          <span className="font-medium">Vista previa de rol · {label}</span>
          <span className="text-[var(--isalwa-slate)]"> · No estás actuando como esta persona</span>
        </p>
        <button
          type="button"
          className="isalwa-t-fast shrink-0 rounded-[var(--isalwa-radius-control)] border border-[var(--isalwa-mist)] bg-[var(--isalwa-white)] px-3 py-1.5 text-sm font-medium text-[var(--isalwa-kiln)] outline-none hover:bg-[var(--isalwa-porcelain)] focus-visible:shadow-[var(--isalwa-shadow-focus)]"
          onClick={resetToMyView}
        >
          Volver a mi vista
        </button>
      </div>
    </div>
  );
}
