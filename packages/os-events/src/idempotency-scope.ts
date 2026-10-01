import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Command services are singletons, so a per-request idempotency key cannot live
 * in an instance field: a second request overwrites it while the first is still
 * awaiting its transaction, and the first event is then stamped with the wrong
 * key. The key belongs to the async context of one command execution.
 */
const scope = new AsyncLocalStorage<{ readonly key?: string }>();

/** Runs one command execution with its own idempotency key. */
export function withIdempotencyKey<T>(
  key: string | undefined,
  run: () => Promise<T>,
): Promise<T> {
  return scope.run({ key }, run);
}

/** The idempotency key of the command currently executing, if the caller sent one. */
export function currentIdempotencyKey(): string | undefined {
  return scope.getStore()?.key;
}
