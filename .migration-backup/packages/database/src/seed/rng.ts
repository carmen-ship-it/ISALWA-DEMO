/**
 * Deterministic PRNG (Mulberry32) + helpers for the ISALWA universe.
 * Same seedKey ⇒ same sequence ⇒ same database contents.
 */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seedKey: string) {
  let state = hashString(seedKey) || 1;
  const next = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(min: number, max: number) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    pick<T>(items: readonly T[]): T {
      return items[Math.floor(next() * items.length)] as T;
    },
    chance(p: number) {
      return next() < p;
    },
    shuffle<T>(items: T[]): T[] {
      const arr = [...items];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j] as T, arr[i] as T];
      }
      return arr;
    },
  };
}

export type Rng = ReturnType<typeof createRng>;

/** Stable ID from parts — not ULID time-sortable, but deterministic & unique. */
export function stableId(prefix: string, ...parts: Array<string | number>): string {
  const raw = `${prefix}:${parts.join('|')}`;
  const h = hashString(raw).toString(16).padStart(8, '0');
  const h2 = hashString(raw + '#2').toString(16).padStart(8, '0');
  const h3 = hashString(raw + '#3').toString(16).padStart(8, '0');
  return `${prefix}_${h}${h2}${h3}`.slice(0, 26);
}

export function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

export function addDays(from: Date, days: number): Date {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}
