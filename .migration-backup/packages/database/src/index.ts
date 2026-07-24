import { PrismaClient } from '@prisma/client';

export { PrismaClient } from '@prisma/client';

let singleton: PrismaClient | undefined;

export function getPrisma(url = process.env.DATABASE_URL): PrismaClient | null {
  if (!url) return null;
  if (!singleton) {
    singleton = new PrismaClient({
      datasources: { db: { url } },
    });
  }
  return singleton;
}

export async function checkDatabase(): Promise<'up' | 'down' | 'skipped'> {
  const prisma = getPrisma();
  if (!prisma) return 'skipped';
  try {
    await prisma.$queryRaw`SELECT 1`;
    return 'up';
  } catch {
    return 'down';
  }
}
