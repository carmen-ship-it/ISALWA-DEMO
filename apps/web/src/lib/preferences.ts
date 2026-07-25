/**
 * Client preferences / feature flags for the experience layer.
 * No backend. Fail soft in private mode.
 */

export const PREF = {
  introDone: 'isalwa_intro_v1_done',
  tourDone: 'isalwa_tour_v1_done',
  demoMode: 'isalwa_demo_mode',
  recentNav: 'isalwa_recent_nav_v1',
  favorites: 'isalwa_favorites_v1',
} as const;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

export function isIntroDone(): boolean {
  return read(PREF.introDone) === '1';
}

export function markIntroDone() {
  write(PREF.introDone, '1');
  try {
    sessionStorage.setItem('isalwa_intro_done', '1');
  } catch {
    /* ignore */
  }
}

export function isTourDone(): boolean {
  return read(PREF.tourDone) === '1';
}

export function markTourDone() {
  write(PREF.tourDone, '1');
}

export function clearTourDone() {
  remove(PREF.tourDone);
}

/** Demo mode: URL ?demo=1, env, or localStorage — never traps returning users when off. */
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_DEMO_MODE === '1';
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') return true;
    if (params.get('demo') === '0') return false;
  } catch {
    /* ignore */
  }
  if (process.env.NEXT_PUBLIC_DEMO_MODE === '1') return true;
  return read(PREF.demoMode) === '1';
}

export function setDemoMode(on: boolean) {
  if (on) write(PREF.demoMode, '1');
  else remove(PREF.demoMode);
}

export type RecentItem = {
  href: string;
  title: string;
  subtitle?: string;
  at: number;
};

export function getRecentNav(): RecentItem[] {
  try {
    const raw = read(PREF.recentNav);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentItem[];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentNav(item: Omit<RecentItem, 'at'>) {
  const prev = getRecentNav().filter((r) => r.href !== item.href);
  const next = [{ ...item, at: Date.now() }, ...prev].slice(0, 8);
  write(PREF.recentNav, JSON.stringify(next));
}

export function getFavorites(): string[] {
  try {
    const raw = read(PREF.favorites);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(href: string): string[] {
  const cur = getFavorites();
  const next = cur.includes(href) ? cur.filter((h) => h !== href) : [href, ...cur].slice(0, 12);
  write(PREF.favorites, JSON.stringify(next));
  return next;
}
