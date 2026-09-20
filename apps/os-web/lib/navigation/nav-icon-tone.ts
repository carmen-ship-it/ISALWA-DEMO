import type { NavGroup, NavItem } from '@/lib/navigation/nav-config';

/**
 * Controlled icon category coloring for shell nav.
 * Subtle containers — navy/teal/sky roles, never rainbow.
 */
export type NavIconTone = {
  /** Soft chip behind the glyph */
  chip: string;
  /** Glyph color */
  ink: string;
};

const BY_GROUP: Record<NavGroup, NavIconTone> = {
  inicio: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-kiln)_8%,transparent)]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
  comercial: {
    chip: 'bg-[var(--isalwa-teal-100)]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  },
  trabajo: {
    chip: 'bg-[var(--isalwa-sky-100)]',
    ink: 'text-[var(--isalwa-info)]',
  },
  operaciones: {
    chip: 'bg-[var(--isalwa-teal-100)]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  },
  control: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-kiln)_10%,transparent)]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
  mas: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-kiln)_8%,transparent)]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
};

/** Id overrides for AI/Map, data health, issues (state-aware elsewhere). */
const BY_ID: Partial<Record<string, NavIconTone>> = {
  mapa: {
    chip: 'bg-[var(--isalwa-sky-100)]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  },
  'salud-datos': {
    chip: 'bg-[var(--isalwa-teal-100)]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  },
  incidencias: {
    chip: 'bg-[var(--isalwa-status-red-bg)]',
    ink: 'text-[var(--isalwa-danger)]',
  },
  aprobaciones: {
    chip: 'bg-[var(--isalwa-status-amber-bg)]',
    ink: 'text-[var(--isalwa-warning)]',
  },
  conversaciones: {
    chip: 'bg-[var(--isalwa-sky-100)]',
    ink: 'text-[var(--isalwa-info)]',
  },
};

export function navIconTone(item: Pick<NavItem, 'id' | 'group'>): NavIconTone {
  const byId = BY_ID[item.id];
  if (byId) return byId;
  return BY_GROUP[item.group ?? 'inicio'];
}

export function navIconToneActive(): NavIconTone {
  return {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_22%,var(--isalwa-teal-100))]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  };
}
