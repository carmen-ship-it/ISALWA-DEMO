'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  AlertCircle,
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
import { navIconTone, navIconToneActive } from '@/lib/navigation/nav-icon-tone';
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
  alertCircle: AlertCircle,
} as const;

type AppNavProps = {
  showAdmin: boolean;
  /** Trusted scopes for display labeling only — never used to hide nav. */
  grantedScopes?: readonly string[];
  /** Kept for shell API stability; future capability nav is intentionally not rendered. */
  capabilities?: unknown;
  mobile?: boolean;
  /** Desktop icon-rail mode — labels become tooltips. */
  collapsed?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  label,
  emphasized,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  label: string;
  emphasized: boolean;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const tone = active ? navIconToneActive() : navIconTone(item);

  const className = cx(
    'isalwa-t-fast group relative flex items-center rounded-[var(--isalwa-radius-control)] text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-3',
    active
      ? cx(
          'border-l-[3px] border-l-[var(--isalwa-glaze)] font-semibold text-[var(--isalwa-kiln)]',
          'bg-[color-mix(in_srgb,var(--isalwa-teal-100)_70%,var(--isalwa-sky-100))]',
          collapsed ? 'pl-[calc(0.5rem-3px)]' : 'pl-[calc(0.875rem-3px)]',
        )
      : emphasized
        ? 'font-medium text-[var(--isalwa-kiln)] hover:bg-[var(--isalwa-white)]'
        : 'font-normal text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-white)] hover:text-[var(--isalwa-kiln)]',
  );

  return (
    <Link
      href={item.href}
      className={className}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      onClick={onNavigate}
    >
      <span
        aria-hidden
        className={cx(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)]',
          tone.chip,
          tone.ink,
        )}
      >
        <Icon size={18} strokeWidth={active ? 2 : 1.5} />
      </span>
      {collapsed ? null : (
        <>
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {emphasized && !active ? (
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--isalwa-glaze)]"
              title="Su área"
            />
          ) : null}
        </>
      )}
    </Link>
  );
}

const HIDDEN_NAV_IDS = new Set<string>(HIDDEN_PRIMARY_NAV_IDS);

export function AppNav({
  showAdmin,
  grantedScopes = [],
  mobile,
  collapsed = false,
  onNavigate,
}: AppNavProps) {
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
      {!mobile && !collapsed && presentation.focusLabel ? (
        <p className="isalwa-kicker px-3.5">{presentation.focusLabel}</p>
      ) : null}
      {sections.map((section) => (
        <div key={section.group} className="flex flex-col gap-1">
          {section.label && !collapsed ? (
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
                collapsed={collapsed && !mobile}
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
