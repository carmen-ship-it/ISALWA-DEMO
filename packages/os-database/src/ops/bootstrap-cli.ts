import { readFileSync } from 'node:fs';
import { getOsPrisma } from '../client';
import {
  BootstrapRefused,
  executeInitialCommercialBootstrap,
  planInitialCommercialBootstrap,
  type BootstrapRequest,
} from './initial-commercial-bootstrap';

/**
 * Operator entry point for the initial commercial bootstrap. Not an HTTP route.
 *
 *   node --import tsx src/ops/bootstrap-cli.ts <request.json>                     # dry run
 *   node --import tsx src/ops/bootstrap-cli.ts <request.json> --execute <planHash> # apply
 *
 * The request file names the organization (id + slug), every initial holder (existing
 * member id + email, proposal from BOOTSTRAP_PROPOSALS, its range, the scopes, and for
 * team range the exact current direct reports), the owner approval reference, the operator
 * and the reason. Nothing is filled in by default. Output is the plan or result only; no
 * connection string or environment value is printed.
 */
async function main(): Promise<number> {
  const [file, flag, planHash] = process.argv.slice(2);
  if (!file || (flag !== undefined && (flag !== '--execute' || !planHash))) {
    process.stderr.write('usage: bootstrap-cli <request.json> [--execute <planHash>]\n');
    return 2;
  }
  const request = JSON.parse(readFileSync(file, 'utf8')) as BootstrapRequest;
  const prisma = getOsPrisma();
  if (!prisma) {
    process.stderr.write('database not configured\n');
    return 2;
  }
  try {
    const out = flag
      ? { mode: 'execute', ...(await executeInitialCommercialBootstrap(prisma, request, planHash!)) }
      : { mode: 'dry-run', ...(await planInitialCommercialBootstrap(prisma, request)) };
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof BootstrapRefused) {
      process.stdout.write(`${JSON.stringify({ refused: error.reason, detail: error.detail })}\n`);
      return 1;
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().then((code) => process.exit(code));
