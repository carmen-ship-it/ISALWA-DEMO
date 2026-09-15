/**
 * Bounded Prisma interactive-transaction options for OS command stores.
 *
 * Prisma defaults: maxWait ?= 2000, timeout ?= 5000.
 * CreateParty (and similar) perform many sequential round-trips inside one
 * interactive transaction (authorize reads + party/fiscal/role/account +
 * event/outbox/audit). Under WAN latency (e.g. laptop → remote staging),
 * the 5s default closes the tx before appendEventAndAudit completes:
 * "Transaction API error: Transaction not found".
 *
 * Values are bounded (not unlimited). 20s covers ~12 sequential RTTs at
 * ~1.5s each; 10s maxWait absorbs pool contention without hanging forever.
 */
export const OS_INTERACTIVE_TX = {
  maxWait: 10_000,
  timeout: 20_000,
} as const;

export type OsInteractiveTxOptions = {
  maxWait: number;
  timeout: number;
};

/** Prisma's historical interactive-transaction default timeout (ms). */
export const PRISMA_DEFAULT_INTERACTIVE_TX_TIMEOUT_MS = 5_000 as const;
