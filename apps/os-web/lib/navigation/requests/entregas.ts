/**
 * Navigation request. This lane mounts /entregas and does not edit app-nav.
 * CROSS_LANE: add the item in apps/os-web/components/shell/app-nav.tsx and
 * apps/os-web/lib/navigation/nav-config.ts only if product wants it in the shell.
 * Do not invent a document number on the label.
 */
export const ENTREGAS_NAV_REQUEST = {
  id: 'entregas',
  href: '/entregas',
  label: 'Entregas',
  owner: 'wave2/delivery',
  mounted: true,
  numberingPolicy: 'unknown',
  claimsOfficialNumber: false,
} as const;
