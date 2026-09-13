import { PrismaClient } from './generated/client';

let prisma: PrismaClient | null = null;

export function getOsPrisma(): PrismaClient | null {
  if (!process.env.OS_DATABASE_URL) {
    return null;
  }
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export type OsDb = PrismaClient;

export { PrismaClient as OsPrismaClient };
