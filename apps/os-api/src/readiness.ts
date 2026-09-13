import { getOsPrisma } from '@isalwa/os-database';

export async function pingDatabase(): Promise<boolean> {
  const prisma = getOsPrisma();
  if (!prisma) {
    return false;
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}
