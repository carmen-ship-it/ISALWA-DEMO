'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CheckCircle2,
  Home,
  MessageSquare,
  Settings,
  Users,
  Wallet,
} from 'lucide-react';
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { cx } from '@isalwa/ui';
import { resolveFutureNavItems } from '@/lib/capabilities/resolve-nav';
import {
  filterNavByAccess,
  isNavItemDisabled,
  PRIMARY_NAV,
  type NavItem,
} from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';

const ICONS = {
  home: Home,
  users: Users,
  briefcase: Briefcase,
  check: CheckCircle2,
  settings: Settings,
  wallet: Wallet,
  message: MessageSquare,
} as const;

type AppNavProps = {
  showAdmin: boolean;
  capabilities: CapabilityStateReadModel[];
  mobile?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: NavItem & { badge?: string | null };
  active: boolean;
  badge?: string | null;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const disabled = isNavItemDisabled(item);
  const label = t(item.labelKey);

  const className = cx(
    'isalwa-t-fast flex items-center gap-3 rounded-[var(--isalwa-radius-control)] px-3 py-2.5 text-sm font-medium outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    active && !disabled
      ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_12%,white)] text-[var(--isalwa-glaze-deep)]'
      : 'text-[var(--isalwa-slate)] hover:bg-[color-mix(in_srgb,var(--isalwa-glaze)_6%,white)] hover:text-[var(--isalwa-kiln)]',
    disabled && 'cursor-not-allowed opacity-60 hover:bg-transparent',
  );

  const content = (
    <>
      <Icon aria-hidden size={18} strokeWidth={1.75} />
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[color-mix(in_srgb,var(--isalwa-copper)_14%,white)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--isalwa-copper)]">
          {badge}
        </span>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" title={badge ?? undefined}>
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      {content}
    </Link>
  );
}

export function AppNav({ showAdmin, capabilities, mobile, onNavigate }: AppNavProps) {
  const pathname = usePathname();
  const futureNav = resolveFutureNavItems(capabilities).map((item) => ({
    id: item.id,
    href: item.href,
    labelKey: item.labelKey,
    icon: item.icon,
    state: item.state,
    badge: item.badge,
  }));
  const items = [...filterNavByAccess(PRIMARY_NAV, { showAdmin }), ...futureNav];

  return (
    <nav aria-label={t('nav.mainNav')} className={mobile ? 'flex flex-col gap-1 p-4' : 'flex flex-col gap-1'}>
      {items.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          badge={'badge' in item ? item.badge : null}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
