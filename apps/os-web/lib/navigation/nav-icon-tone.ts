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
  principal: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-kiln)_8%,transparent)]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
  /* Commercial — navy structure + sky support */
  comercial: {
    chip: 'bg-[var(--isalwa-sky-100)]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
  /* Ops — teal operational + navy */
  operaciones: {
    chip: 'bg-[var(--isalwa-teal-100)]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  },
  /* Decisions — navy + teal */
  decisiones: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,var(--isalwa-sky-100))]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
  /* System — navy */
  admin: {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-kiln)_10%,transparent)]',
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
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-warning)_10%,var(--isalwa-sky-100))]',
    ink: 'text-[var(--isalwa-kiln)]',
  },
};

export function navIconTone(item: Pick<NavItem, 'id' | 'group'>): NavIconTone {
  const byId = BY_ID[item.id];
  if (byId) return byId;
  return BY_GROUP[item.group ?? 'principal'];
}

export function navIconToneActive(): NavIconTone {
  return {
    chip: 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_16%,var(--isalwa-sky-100))]',
    ink: 'text-[var(--isalwa-glaze-deep)]',
  };
}
