import { getOsPrisma, PrismaOsWorkforceStore } from '@isalwa/os-database';
import { MemoryOsStore, type OsWorkforceStore } from '@isalwa/os-workforce';

/**
 * Same store factory as os-api. Missing production database fails closed.
 * A memory store is only for non-production process startup, not a grant source.
 */
export function createCanonicalSessionStore(): OsWorkforceStore {
  const prisma = getOsPrisma();
  if (prisma) return new PrismaOsWorkforceStore(prisma);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('OS_DATABASE_URL required in production');
  }
  return new MemoryOsStore();
}
