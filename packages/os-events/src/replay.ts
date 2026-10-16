import { createHash } from 'node:crypto';

/**
 * S11 replay rules shared by every command path that stores a result under an
 * idempotency key.
 *
 * A stored result is bound to organization (the row key), actor, command name,
 * and a fingerprint of the validated payload. The binding lives beside the
 * result, never inside it, so nothing a command returns can overwrite it.
 *
 * - The caller authorizes the current actor for the current command before
 *   asking for a stored result.
 * - The stored result is returned only when actor, command, and payload
 *   fingerprint all match. Any mismatch is CONFLICT and never returns the body.
 * - A row written before this binding existed is neither replayed nor re-run:
 *   the caller gets REPLAY_REVIEW_REQUIRED.
 */

export const REPLAY_REVIEW_REQUIRED = 'REPLAY_REVIEW_REQUIRED' as const;
export const REPLAY_REVIEW_REQUIRED_MESSAGE =
  'Esta solicitud anterior necesita revisión antes de repetirse.';

const ENVELOPE_KEY = '__s11Replay';
const ENVELOPE_VERSION = 2;

export type ReplayBinding = {
  actorMemberId: string;
  command: string;
  fingerprint: string;
};

type SealedReplay = {
  [ENVELOPE_KEY]: { v: typeof ENVELOPE_VERSION } & ReplayBinding;
  result: Record<string, unknown>;
};

/** Stable JSON: object keys sorted, undefined dropped, Date as ISO, bigint as decimal string. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => (item === undefined ? null : normalize(item)));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item === undefined) continue;
      out[key] = normalize(item);
    }
    return out;
  }
  return value;
}

/** SHA-256 of the canonical JSON of a validated payload. */
export function replayFingerprint(payload: unknown): string {
  return createHash('sha256').update(canonicalJson(payload)).digest('hex');
}

export function replayBinding(
  actorMemberId: string,
  command: string,
  payload: unknown,
): ReplayBinding {
  return { actorMemberId, command, fingerprint: replayFingerprint(payload) };
}

/** The stored form of a command result. */
export function sealReplay(result: object, binding: ReplayBinding): Record<string, unknown> {
  const sealed: SealedReplay = {
    [ENVELOPE_KEY]: { v: ENVELOPE_VERSION, ...binding },
    result: { ...(result as Record<string, unknown>) },
  };
  return sealed as unknown as Record<string, unknown>;
}

export function isSealedReplay(stored: unknown): boolean {
  if (!stored || typeof stored !== 'object') return false;
  const meta = (stored as Record<string, unknown>)[ENVELOPE_KEY] as Record<string, unknown> | undefined;
  return Boolean(
    meta &&
      meta.v === ENVELOPE_VERSION &&
      typeof meta.actorMemberId === 'string' &&
      meta.actorMemberId.length > 0 &&
      typeof meta.command === 'string' &&
      typeof meta.fingerprint === 'string' &&
      (stored as Record<string, unknown>).result &&
      typeof (stored as Record<string, unknown>).result === 'object',
  );
}

/** The stored result without opening it. Used only to decide whether a row is complete. */
export function sealedResult(stored: unknown): Record<string, unknown> | null {
  return isSealedReplay(stored) ? ((stored as SealedReplay).result as Record<string, unknown>) : null;
}

/**
 * Returns the stored result when the binding matches. Call only after the
 * current actor passed the current authorization check.
 */
export function openReplay<T>(stored: unknown, binding: ReplayBinding): T {
  if (!isSealedReplay(stored)) throw new Error(REPLAY_REVIEW_REQUIRED);
  const sealed = stored as SealedReplay;
  const meta = sealed[ENVELOPE_KEY];
  if (
    meta.actorMemberId !== binding.actorMemberId ||
    meta.command !== binding.command ||
    meta.fingerprint !== binding.fingerprint
  ) {
    throw new Error('CONFLICT');
  }
  return { ...sealed.result } as T;
}

/** True when a write lost the race on a unique key (Postgres P2002 or the memory-store equivalent). */
export function isIdempotencyConflict(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  if (code === 'P2002') return true;
  const message = err instanceof Error ? err.message : '';
  return message === 'IDEMPOTENCY_CONFLICT' || /Unique constraint/i.test(message);
}
