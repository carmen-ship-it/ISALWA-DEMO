import { PrismaClient } from '@prisma/client';
import { seedUniverse } from './universe';

async function main() {
  const prisma = new PrismaClient();
  try {
    const result = await seedUniverse(prisma, process.env);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
