'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
import type { CapabilityStateReadModel } from '@isalwa/os-contracts';
import { cx } from '@isalwa/ui';
import { useOwnerDemo } from '@/components/demo/owner-demo-provider';
import { useRolePreview } from '@/components/shell/role-preview-provider';
import { withStoryDemoDatos } from '@/lib/demo/story-mode-steps';
import { resolveShellNavSections } from '@/lib/capabilities/resolve-nav';
import { buildClientEvaluationProjection } from '@/lib/role-preview/evaluation-projection-model';
import { evaluationNavItemVisible } from '@/lib/role-preview/evaluation-resource-access';
import { navItemLabel, type NavItem } from '@/lib/navigation/nav-config';
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
  capabilities?: CapabilityStateReadModel[];
  mobile?: boolean;
  /** Desktop icon-rail mode — labels become tooltips. */
  collapsed?: boolean;
  onNavigate?: () => void;
};

function navLinkHref(href: string, demoMode: boolean): string {
  if (!demoMode) return href;
  return withStoryDemoDatos(href) ?? href;
}

function navHrefActive(pathname: string, search: string, href: string): boolean {
  const [path, query] = href.split('?');
  if (query) {
    const normalized = search.startsWith('?') ? search.slice(1) : search;
    return pathname === path && normalized === query;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  active,
  label,
  emphasized,
  collapsed,
  locked,
  href,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  label: string;
  emphasized: boolean;
  collapsed?: boolean;
  locked?: boolean;
  href: string;
  onNavigate?: () => void;
}) {
  const Icon = ICONS[item.icon];
  const tone = active ? navIconToneActive() : navIconTone(item);

  const className = cx(
    'isalwa-t-fast group relative flex items-center rounded-[var(--isalwa-radius-control)] text-sm outline-none focus-visible:shadow-[var(--isalwa-shadow-focus)]',
    collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3.5 py-3',
    locked ? 'cursor-not-allowed opacity-70' : '',
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

  if (locked) {
    return (
      <span className={className} aria-disabled="true" title={`${label} · Próximamente`}>
        <span
          aria-hidden
          className={cx(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--isalwa-radius-control)]',
            tone.chip,
            tone.ink,
          )}
        >
          <Icon size={18} strokeWidth={1.5} />
        </span>
        {collapsed ? null : <span className="min-w-0 flex-1 truncate">{label}</span>}
      </span>
    );
  }

  return (
    <Link
      href={href}
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

export function AppNav({
  showAdmin,
  grantedScopes = [],
  capabilities = [],
  mobile,
  collapsed = false,
  onNavigate,
}: AppNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const { presentationScopes, active: evaluationActive, persona, subjectMemberId } =
    useRolePreview();
  const { dataMode } = useOwnerDemo();
  const demoNav = dataMode === 'demo';
  const presentation: RoleNavPresentation = roleNavPresentation(presentationScopes);
  const emphasized = new Set(presentation.emphasizedIds);
  const sections = resolveShellNavSections({ showAdmin }, capabilities);
  const evaluationProjection = useMemo(
    () =>
      buildClientEvaluationProjection({
        active: evaluationActive,
        persona,
        subjectMemberId,
      }),
    [evaluationActive, persona, subjectMemberId],
  );
  const visibleSections = useMemo(
    () =>
      sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) =>
            evaluationNavItemVisible(evaluationProjection, item.id),
          ),
        }))
        .filter((section) => section.items.length > 0),
    [evaluationProjection, sections],
  );

  return (
    <nav
      aria-label={t('nav.mainNav')}
      data-tour={TOUR_TARGET.navPrimary}
      className={mobile ? 'flex flex-col gap-5 px-4 py-5' : 'flex flex-col gap-5'}
    >
      {!mobile && !collapsed && presentation.focusLabel ? (
        <p className="isalwa-kicker px-3.5">{presentation.focusLabel}</p>
      ) : null}
      {visibleSections.map((section) => (
        <div key={section.group} className="flex flex-col gap-1">
          {!collapsed ? (
            <p className="px-3.5 pb-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--isalwa-slate)]">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => {
            const defaultLabel = navItemLabel(item, t);
            const label = labelForNavItem(item.id, defaultLabel, presentation);
            const href = navLinkHref(item.href, demoNav);
            return (
              <NavLink
                key={item.id}
                item={item}
                href={href}
                label={label}
                emphasized={emphasized.has(item.id)}
                locked={item.state === 'locked'}
                collapsed={collapsed && !mobile}
                active={navHrefActive(pathname, search, href)}
                onNavigate={onNavigate}
              />
            );
          })}
        </div>
      ))}
    </nav>
  );
}
