'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Home,
  MessageSquare,
  Settings,
  Target,
  Users,
  Wallet,
} from 'lucide-react';
import { cx } from '@isalwa/ui';
import {
  filterNavByAccess,
  HIDDEN_PRIMARY_NAV_IDS,
  isNavItemDisabled,
  PRIMARY_NAV,
  type NavItem,
} from '@/lib/navigation/nav-config';
import { t } from '@/lib/i18n/es';

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
} as const;

type AppNavProps = {
  showAdmin: boolean;
  /** Kept for shell API stability; future capability nav is intentionally not rendered. */
  capabilities?: unknown;
  mobile?: boolean;
  onNavigate?: () => void;
};

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const label = t(item.labelKey);

  const className = cx(
    'isalwa-t-fast flex items-center gap-3 rounded-[var(--isalwa-radius-control)] px-3.5 py-3 text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    active
      ? 'bg-[color-mix(in_srgb,var(--isalwa-glaze)_10%,var(--isalwa-white))] font-medium text-[var(--isalwa-glaze)]'
      : 'font-normal text-[var(--isalwa-slate)] hover:bg-[var(--isalwa-white)] hover:text-[var(--isalwa-kiln)]',
  );

  const content = (
    <>
      <Icon aria-hidden size={18} strokeWidth={1.5} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </>
  );

  return (
    <Link href={item.href} className={className} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
      {content}
    </Link>
  );
}

const HIDDEN_NAV_IDS = new Set<string>(HIDDEN_PRIMARY_NAV_IDS);

export function AppNav({ showAdmin, mobile, onNavigate }: AppNavProps) {
  const pathname = usePathname();
  const items = filterNavByAccess(PRIMARY_NAV, { showAdmin }).filter(
    (item) => !HIDDEN_NAV_IDS.has(item.id) && !isNavItemDisabled(item) && Boolean(item.href),
  );

  return (
    <nav aria-label={t('nav.mainNav')} className={mobile ? 'flex flex-col gap-1 px-4 py-5' : 'flex flex-col gap-1'}>
      {items.map((item) => (
        <NavLink
          key={item.id}
          item={item}
          active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
