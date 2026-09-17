/**
 * Dry-run: prove owner-demo seed plans 5 OsCustomerConversation rows (no DB writes).
 *
 * Run (no staging URL / confirm required):
 *   corepack pnpm --filter @isalwa/os-database exec node --import tsx src/owner-demo/seed-conversations-dry-run.ts
 *
 * Apply for real against staging (separate; no deploy):
 *   STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo
 */
import { OWNER_DEMO_CLIENTS } from './catalog';
import { OWNER_DEMO_SYNTH_ORG } from './guards';
import {
  OWNER_DEMO_CONVERSATION_SEED_COUNT,
  planOwnerDemoConversationSeeds,
} from './conversations';

const plan = planOwnerDemoConversationSeeds();
const requiredNames = [
  'MADERAS ORIENTE',
  'CONSTRUCTORA ANDINA',
  'PROYECTOS DEL SUR',
  'HOTEL CENTRAL',
  'FERRETERÍA NORTE',
];

for (const name of requiredNames) {
  const hit = plan.some((row) => row.displayName.includes(name));
  if (!hit) {
    throw new Error(`OWNER_DEMO_CONVERSATION_DRY_RUN_MISSING_CLIENT:${name}`);
  }
}

if (plan.length !== OWNER_DEMO_CONVERSATION_SEED_COUNT) {
  throw new Error(
    `OWNER_DEMO_CONVERSATION_DRY_RUN_COUNT:expected=${OWNER_DEMO_CONVERSATION_SEED_COUNT} got=${plan.length}`,
  );
}

if (OWNER_DEMO_CLIENTS.length !== OWNER_DEMO_CONVERSATION_SEED_COUNT) {
  throw new Error('OWNER_DEMO_CLIENT_COUNT_MISMATCH');
}

// eslint-disable-next-line no-console
console.log(
  JSON.stringify(
    {
      ok: true,
      mode: 'dry-run',
      organizationId: OWNER_DEMO_SYNTH_ORG,
      expectedOsCustomerConversationRows: OWNER_DEMO_CONVERSATION_SEED_COUNT,
      rows: plan,
      applyScript: 'fixture:owner-demo',
      applyCommand:
        'STAGING_FIXTURE_CONFIRM=1 corepack pnpm --filter @isalwa/os-database run fixture:owner-demo',
    },
    null,
    2,
  ),
);
