import { readFileSync } from 'node:fs';
import { getOsPrisma } from '../client';
import {
  BackfillRefused,
  executeLifecycleRevivalBackfill,
  planLifecycleRevivalBackfill,
  type BackfillRequest,
} from './lifecycle-revival-backfill';

/**
 * Operator entry point for the lifecycle revival backfill. Not an HTTP route.
 *
 *   node --import tsx src/ops/lifecycle-backfill-cli.ts <request.json>                     # dry run
 *   node --import tsx src/ops/lifecycle-backfill-cli.ts <request.json> --execute <planHash> # apply
 *
 * The request names the organization (id + slug), the owner approval reference,
 * the operator and the reason. Execution against shared or hosted data needs a
 * separate authorization. Output is the plan or result only; no connection
 * string or environment value is printed.
 */
async function main(): Promise<number> {
  const [file, flag, planHash] = process.argv.slice(2);
  if (!file || (flag !== undefined && (flag !== '--execute' || !planHash))) {
    process.stderr.write('usage: lifecycle-backfill-cli <request.json> [--execute <planHash>]\n');
    return 2;
  }
  const request = JSON.parse(readFileSync(file, 'utf8')) as BackfillRequest;
  const prisma = getOsPrisma();
  if (!prisma) {
    process.stderr.write('database not configured\n');
    return 2;
  }
  try {
    const out = flag
      ? { mode: 'execute', ...(await executeLifecycleRevivalBackfill(prisma, request, planHash!)) }
      : { mode: 'dry-run', ...(await planLifecycleRevivalBackfill(prisma, request)) };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof BackfillRefused) {
      process.stdout.write(`${JSON.stringify({ refused: error.reason, detail: error.detail })}\n`);
      return 1;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
