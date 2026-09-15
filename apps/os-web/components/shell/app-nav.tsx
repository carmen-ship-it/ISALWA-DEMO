'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Home,
  MapPin,
  MessageSquare,
  Settings,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { cx } from '@isalwa/ui';
import {
  filterNavByAccess,
  groupNavItems,
  HIDDEN_PRIMARY_NAV_IDS,
  isNavItemDisabled,
  PRIMARY_NAV,
  type NavItem,
} from '@/lib/navigation/nav-config';
import {
  labelForNavItem,
  roleNavPresentation,
  type RoleNavPresentation,
} from '@/lib/navigation/role-nav-labels';
import { t } from '@/lib/i18n/es';
import { TOUR_TARGET } from '@/lib/walkthrough/targets';

const ICONS = {
  home: Home,
  users: Users,
  target: Target,
  fileText: FileText,
  briefcase: Briefcase,
  check: CheckCircle2,
  settings: Settings,
  wallet: Wallet,
  message: MessageSquare,
  map: MapPin,
} as const;

type AppNavProps = {
  showAdmin: boolean;
  /** Trusted scopes for display labeling only — never used to hide nav. */
  grantedScopes?: readonly string[];
  /** Kept for shell API stability; future capability nav is intentionally not rendered. */
  capabilities?: unknown;
  mobile?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  label,
  emphasized,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  label: string;
  emphasized: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];

  const className = cx(
    'isalwa-t-fast flex items-center gap-3 rounded-[var(--isalwa-radius-control)] px-3.5 py-3 text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    active
      ? 'border-l-[3px] border-l-[var(--isalwa-glaze)] bg-[color-mix(in_srgb,var(--isalwa-glaze)_14%,var(--isalwa-porcelain))] font-semibold text-[var(--isalwa-glaze-deep)] pl-[calc(0.875rem-3px)]'
      : emphasized
        ? 'font-medium text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-white)]'
        : 'font-normal text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-white)] hover:text-[var(--isalwa-kiln)]',
  );

  return (
    <Link href={item.href} className={className} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      <Icon aria-hidden size={18} strokeWidth={1.5} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {emphasized && !active ? (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--isalwa-glaze)]"
          title="Su área"
        />
      ) : null}
    </Link>
  );
}

const HIDDEN_NAV_IDS = new Set<string>(HIDDEN_PRIMARY_NAV_IDS);

export function AppNav({ showAdmin, grantedScopes = [], mobile, onNavigate }: AppNavProps) {
  const pathname = usePathname();
  const presentation: RoleNavPresentation = roleNavPresentation(grantedScopes);
  const emphasized = new Set(presentation.emphasizedIds);
  const items = filterNavByAccess(PRIMARY_NAV, { showAdmin }).filter(
    (item) => !HIDDEN_NAV_IDS.has(item.id) && !isNavItemDisabled(item) && Boolean(item.href),
  );
  const sections = groupNavItems(items);

  return (
    <nav
      aria-label={t('nav.mainNav')}
      data-tour={TOUR_TARGET.navPrimary}
      className={mobile ? 'flex flex-col gap-5 px-4 py-5' : 'flex flex-col gap-5'}
    >
      {!mobile && presentation.focusLabel ? (
        <p className="isalwa-kicker px-3.5">{presentation.focusLabel}</p>
      ) : null}
      {sections.map((section) => (
        <div key={section.group} className="flex flex-col gap-1">
          {section.label ? (
            <p className="px-3.5 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const defaultLabel = t(item.labelKey);
            const label = labelForNavItem(item.id, defaultLabel, presentation);
            return (
              <NavLink
                key={item.id}
                item={item}
                label={label}
                emphasized={emphasized.has(item.id)}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}
