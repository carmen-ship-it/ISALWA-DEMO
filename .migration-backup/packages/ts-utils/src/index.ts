import { ulid } from 'ulid';

export function createId(): string {
  return ulid();
}

/** Normalize Bolivian mobile numbers toward E.164 when possible. */
export function normalizeBoliviaPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('591') && digits.length >= 11) {
    return `+${digits}`;
  }
  if (digits.length === 8) {
    return `+591${digits}`;
  }
  if (input.trim().startsWith('+')) {
    return `+${digits}`;
  }
  return input.trim();
}

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Money helpers — amounts are always integer centavos. */
export function formatBob(centavos: bigint | number): string {
  const n = typeof centavos === 'bigint' ? Number(centavos) : centavos;
  const whole = Math.trunc(n / 100);
  const frac = Math.abs(n % 100)
    .toString()
    .padStart(2, '0');
  return `Bs ${whole.toLocaleString('es-BO')},${frac}`;
}
