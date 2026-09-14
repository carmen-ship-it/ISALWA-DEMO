import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  TENANT_SURFACE_REQUIRED_SCOPE,
  readTenantSurface,
  type TenantDenialCode,
  type TenantSurface,
} from './tenant-read-gate';

/**
 * In-process adversarial harness for hosted acceptance.
 * It names the required negative cases and calls importable readers.
 * It does not start hosted acceptance and does not certify live isolation.
 *
 * Fixture organizations only. Not the seven real customers.
 */

export const PINNED_SHA = '316426f272bce29924ffd4991da88ffe7d421bbd' as const;

export const HARNESS_VERDICTS = ['PASS', 'UNPROVEN', 'FAIL'] as const;
export type HarnessVerdict = (typeof HARNESS_VERDICTS)[number];

export const PROOF_STATE_CATALOG = [
  'PLANNED',
  'IMPLEMENTED',
  'TESTED',
  'INTEGRATED',
  'DEPLOYED',
  'HOSTED',
  'BROWSER-VERIFIED',
  'USER-ACCEPTED',
  'UNPROVEN',
] as const;

export type ProofState = (typeof PROOF_STATE_CATALOG)[number];

/** Required adversarial cases. Hosted acceptance has not started, so none are certified. */
export const REQUIRED_NEGATIVE_CASE_IDS = [
  'same-tenant-right-capability',
  'same-tenant-wrong-capability',
  'wrong-tenant-right-capability',
  'no-auth',
  'direct-api',
  'direct-resource-id',
  'search-prefix',
  'autocomplete',
  'normalized-email-phone',
  'count',
  'aggregate',
  'pagination',
  'sort',
  'filter',
  'quick-view',
  'recent-items',
  'command-palette',
  'role-command-center',
] as const;

export type RequiredNegativeCaseId = (typeof REQUIRED_NEGATIVE_CASE_IDS)[number];

/**
 * Known unscoped readers at the pinned SHA. Two commerce methods are one reader family.
 * An observed cross-tenant row stays UNPROVEN, never PASS.
 */
export const UNSCOPED_FUNCTION_IDS = [
  'SearchController.search',
  'CommerceService.listProducts and listQuotes',
  'listAccountTimeline',
  'listUnconfirmedCustomerQuestions',
  'matchingContacts',
] as const;

export type UnscopedFunctionId = (typeof UNSCOPED_FUNCTION_IDS)[number];

export const OPERATING_JOURNEYS = [
  { id: 'login', label: 'login' },
  { id: 'role-home', label: 'role home' },
  { id: 'customer', label: 'customer' },
  { id: 'product', label: 'product' },
  { id: 'quote', label: 'quote' },
  { id: 'order', label: 'order' },
  { id: 'special-order', label: 'special order' },
  { id: 'purchase', label: 'purchase' },
  { id: 'production', label: 'production' },
  { id: 'quema', label: 'quema' },
  { id: 'loss-consumption', label: 'loss/consumption' },
  { id: 'finished-goods', label: 'finished goods' },
  { id: 'allocation', label: 'allocation' },
  { id: 'partial-allocation', label: 'partial allocation' },
  { id: 'warehouse-exit', label: 'warehouse exit' },
  { id: 'partial-delivery', label: 'partial delivery' },
  { id: 'second-delivery', label: 'second delivery' },
  { id: 'coordination-decision', label: 'coordination decision' },
  { id: 'gerencia-view', label: 'Gerencia view' },
  { id: 'modo-guiado', label: 'Modo Guiado' },
] as const;

export type OperatingJourneyId = (typeof OPERATING_JOURNEYS)[number]['id'];

export const FIXTURE_SESSION_ORG_ID = 'org-fixture-alpha';
export const FIXTURE_OTHER_ORG_ID = 'org-fixture-zeta';

const FIXTURE_SESSION_LABEL = 'Fixture Alpha Works';
const FIXTURE_OTHER_LABEL = 'Fixture Zeta Works';
const FIXTURE_OTHER_EMAIL = 'zeta.contact@fixture.invalid';
const FIXTURE_OTHER_EMAIL_VARIANT = 'Zeta.Contact@fixture.invalid';
const FIXTURE_OTHER_PHONE_DIGITS = '0002220002';
const FIXTURE_OTHER_PHONE = '+591 000-222-0002';
const FIXTURE_SESSION_EMAIL = 'alpha.contact@fixture.invalid';
const FIXTURE_SESSION_PHONE = '0001110001';
const FIXTURE_OTHER_ACCOUNT_ID = 'fixture-account-zeta';
const FIXTURE_OTHER_PRODUCT_ID = 'fixture-product-zeta';
const FIXTURE_OTHER_QUOTE_ID = 'fixture-quote-zeta';
const FIXTURE_OTHER_EVENT_ID = 'fixture-event-zeta';
const FIXTURE_OTHER_MESSAGE_ID = 'fixture-msg-zeta';
const FIXTURE_OTHER_CONTACT_ID = 'fixture-contact-zeta';
const FIXTURE_PREFIX = 'Zeta';

const WORKTREE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export type FunctionProbe = {
  id: UnscopedFunctionId;
  status: HarnessVerdict;
  called: boolean;
  otherTenantRowReturned: boolean | null;
  detail: string;
};

export type NegativeCaseResult = {
  id: RequiredNegativeCaseId;
  status: HarnessVerdict;
  proofState: 'UNPROVEN';
  called: readonly string[];
  otherTenantRowReturned: boolean | null;
  detail: string;
};

export type JourneyChecklistItem = {
  id: OperatingJourneyId;
  label: string;
  status: 'UNPROVEN';
  proofState: 'UNPROVEN';
  hostedReviewerRequired: true;
};

export type InProcessGateCheck = {
  id: string;
  held: boolean;
  code: TenantDenialCode | null;
  certifiesLiveIsolation: false;
};

export type AcceptanceHarnessResult = {
  pinnedSha: typeof PINNED_SHA;
  fixtures: {
    sessionOrganizationId: typeof FIXTURE_SESSION_ORG_ID;
    otherOrganizationId: typeof FIXTURE_OTHER_ORG_ID;
    synthetic: true;
    usesRealCustomers: false;
  };
  hostedAcceptanceStarted: false;
  browserVerified: false;
  safeForIsa: false;
  liveTenantIsolationPassed: false;
  proof: {
    current: 'UNPROVEN';
    hostedAcceptance: 'UNPROVEN';
    browserVerified: false;
    userAccepted: false;
    safeForIsa: false;
    liveTenantIsolation: 'UNPROVEN';
  };
  summary: {
    pass: number;
    unproven: number;
    fail: number;
  };
  cases: NegativeCaseResult[];
  unscopedFunctions: FunctionProbe[];
  journeys: JourneyChecklistItem[];
  inProcessGate: {
    certifiesLiveIsolation: false;
    hostedAcceptance: 'UNPROVEN';
    checks: InProcessGateCheck[];
  };
  note: string;
};

/**
 * Hosted acceptance has not started. A returned other-tenant row is not a pass.
 * An empty or filtered in-process call is also not hosted proof.
 */
export function verdictForObservedCall(_input: {
  otherTenantRowReturned: boolean | null;
}): 'UNPROVEN' {
  return 'UNPROVEN';
}

type ProbeDraft = Omit<FunctionProbe, 'status'> & { status?: HarnessVerdict };

function finishProbe(draft: ProbeDraft): FunctionProbe {
  const otherTenantRowReturned = draft.otherTenantRowReturned;
  return {
    id: draft.id,
    called: draft.called,
    otherTenantRowReturned,
    detail: draft.detail,
    status: verdictForObservedCall({ otherTenantRowReturned }),
  };
}

let hooksReady = false;

function sourceIfNoDist(packageDir: string, sourceRelative: string): string | null {
  const dist = path.join(WORKTREE_ROOT, packageDir, 'dist/index.js');
  if (existsSync(dist)) return null;
  const source = path.join(WORKTREE_ROOT, packageDir, sourceRelative);
  return existsSync(source) ? source : null;
}

function resolveOsWebAlias(specifier: string): string | null {
  if (!specifier.startsWith('@/')) return null;
  const base = path.join(WORKTREE_ROOT, 'apps/os-web', specifier.slice(2));
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ];
  return candidates.find((item) => existsSync(item)) ?? null;
}

function parentAllowsAlias(parentURL: string | undefined): boolean {
  if (!parentURL) return false;
  return (
    parentURL.includes('/apps/os-web/') ||
    parentURL.includes('/packages/database/') ||
    parentURL.includes('/packages/os-contracts/') ||
    parentURL.includes('/packages/domain/')
  );
}

function ensureImportHooks(): void {
  if (hooksReady) return;
  hooksReady = true;
  registerHooks({
    resolve(specifier, context, nextResolve) {
      if (!parentAllowsAlias(context.parentURL)) return nextResolve(specifier, context);
      const alias = resolveOsWebAlias(specifier);
      if (alias) return nextResolve(pathToFileURL(alias).href, context);
      const workspace =
        specifier === '@isalwa/domain'
          ? sourceIfNoDist('packages/domain', 'src/index.ts')
          : specifier === '@isalwa/os-contracts'
            ? sourceIfNoDist('packages/os-contracts', 'src/index.ts')
            : null;
      if (!workspace) return nextResolve(specifier, context);
      return nextResolve(pathToFileURL(workspace).href, context);
    },
  });
}

async function importFile(abs: string): Promise<Record<string, unknown>> {
  const specifier = pathToFileURL(abs).href;
  return import(specifier) as Promise<Record<string, unknown>>;
}

function containsOtherTenant(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return (
    serialized.includes(FIXTURE_OTHER_ORG_ID) ||
    serialized.includes(FIXTURE_OTHER_ACCOUNT_ID) ||
    serialized.includes(FIXTURE_OTHER_PRODUCT_ID) ||
    serialized.includes(FIXTURE_OTHER_QUOTE_ID) ||
    serialized.includes(FIXTURE_OTHER_EVENT_ID) ||
    serialized.includes(FIXTURE_OTHER_MESSAGE_ID) ||
    serialized.includes(FIXTURE_OTHER_CONTACT_ID) ||
    serialized.includes(FIXTURE_OTHER_LABEL) ||
    serialized.includes(FIXTURE_OTHER_EMAIL.toLowerCase())
  );
}

async function probeQuestions(): Promise<FunctionProbe> {
  ensureImportHooks();
  const mod = await importFile(
    path.join(WORKTREE_ROOT, 'packages/os-contracts/src/conversation-evidence.ts'),
  );
  const normalize = mod.normalizedConversationMessage as (input: {
    id: string;
    organizationId: string;
    conversationId: string;
    channel: 'manual';
    occurredAt: string;
    phoneKey: string;
    text: string;
    providerMessageId: null;
  }) => { id: string; organizationId: string; text: string };
  const list = mod.listUnconfirmedCustomerQuestions as (
    messages: readonly { id: string; organizationId: string; text: string }[],
  ) => readonly { messageId: string; text: string }[];
  const questions = list([
    normalize({
      id: FIXTURE_OTHER_MESSAGE_ID,
      organizationId: FIXTURE_OTHER_ORG_ID,
      conversationId: 'fixture-conv-zeta',
      channel: 'manual',
      occurredAt: '2026-01-01T00:00:00.000Z',
      phoneKey: FIXTURE_OTHER_PHONE_DIGITS,
      text: 'Fixture Zeta kiln question?',
      providerMessageId: null,
    }),
    normalize({
      id: 'fixture-msg-alpha',
      organizationId: FIXTURE_SESSION_ORG_ID,
      conversationId: 'fixture-conv-alpha',
      channel: 'manual',
      occurredAt: '2026-01-01T00:00:00.000Z',
      phoneKey: FIXTURE_SESSION_PHONE,
      text: 'Fixture Alpha kiln question?',
      providerMessageId: null,
    }),
  ]);
  const leaked = questions.some(
    (question) =>
      question.messageId === FIXTURE_OTHER_MESSAGE_ID || question.text.includes('Fixture Zeta'),
  );
  return finishProbe({
    id: 'listUnconfirmedCustomerQuestions',
    called: true,
    otherTenantRowReturned: leaked,
    detail: leaked
      ? 'Returned the other fixture tenant question. organizationId is not a filter. Not a pass of isolation.'
      : 'Call did not return the other fixture question. Hosted acceptance has not started, so this is not a pass.',
  });
}

async function probeContacts(): Promise<FunctionProbe> {
  ensureImportHooks();
  const mod = await importFile(
    path.join(WORKTREE_ROOT, 'apps/os-web/lib/productivity/search-extensions.ts'),
  );
  const matchingContacts = mod.matchingContacts as (
    contacts: readonly {
      id: string;
      givenName: string;
      familyName: string;
      email: string | null;
      phone: string | null;
      status: string;
    }[],
    query: string,
  ) => readonly { id: string }[];
  const contacts = [
    {
      id: 'fixture-contact-alpha',
      givenName: 'Fixture',
      familyName: 'Alpha',
      email: FIXTURE_SESSION_EMAIL,
      phone: FIXTURE_SESSION_PHONE,
      status: 'active',
    },
    {
      id: FIXTURE_OTHER_CONTACT_ID,
      givenName: 'Fixture',
      familyName: 'Zeta',
      email: FIXTURE_OTHER_EMAIL_VARIANT,
      phone: FIXTURE_OTHER_PHONE,
      status: 'active',
    },
  ];
  const byEmail = matchingContacts(contacts, FIXTURE_OTHER_EMAIL);
  const byPhone = matchingContacts(contacts, FIXTURE_OTHER_PHONE_DIGITS);
  const byPrefix = matchingContacts(contacts, FIXTURE_PREFIX);
  const leaked =
    byEmail.some((contact) => contact.id === FIXTURE_OTHER_CONTACT_ID) ||
    byPhone.some((contact) => contact.id === FIXTURE_OTHER_CONTACT_ID) ||
    byPrefix.some((contact) => contact.id === FIXTURE_OTHER_CONTACT_ID);
  return finishProbe({
    id: 'matchingContacts',
    called: true,
    otherTenantRowReturned: leaked,
    detail: leaked
      ? 'Matched the other fixture tenant by folded email, digit phone, or prefix. No organization filter. Not a pass of isolation.'
      : 'Call did not return the other fixture contact. Hosted acceptance has not started, so this is not a pass.',
  });
}

async function probeTimeline(): Promise<FunctionProbe> {
  ensureImportHooks();
  const mod = await importFile(path.join(WORKTREE_ROOT, 'packages/database/src/timeline/read.ts'));
  const listAccountTimeline = mod.listAccountTimeline as (
    db: {
      activityEvent: {
        findMany: (args: { where: { accountId: string } }) => Promise<
          readonly {
            id: string;
            type: string;
            title: string;
            body: null;
            occurredAt: Date;
            accountId: string;
            actorUserId: null;
            payloadJson: { organizationId: string };
          }[]
        >;
      };
    },
    accountId: string,
  ) => Promise<{ items: readonly { id: string; accountId: string | null }[] }>;
  const result = await listAccountTimeline(
    {
      activityEvent: {
        findMany: async (args) => {
          if (args.where.accountId !== FIXTURE_OTHER_ACCOUNT_ID) return [];
          return [
            {
              id: FIXTURE_OTHER_EVENT_ID,
              type: 'note',
              title: 'Fixture Zeta timeline',
              body: null,
              occurredAt: new Date('2026-01-02T00:00:00.000Z'),
              accountId: FIXTURE_OTHER_ACCOUNT_ID,
              actorUserId: null,
              payloadJson: { organizationId: FIXTURE_OTHER_ORG_ID },
            },
          ];
        },
      },
    },
    FIXTURE_OTHER_ACCOUNT_ID,
  );
  const leaked = result.items.some((item) => item.id === FIXTURE_OTHER_EVENT_ID);
  return finishProbe({
    id: 'listAccountTimeline',
    called: true,
    otherTenantRowReturned: leaked,
    detail: leaked
      ? 'Returned the timeline row for the other fixture account id. The query has no organization predicate. Not a pass of isolation.'
      : 'Call did not return the other fixture timeline row. Hosted acceptance has not started, so this is not a pass.',
  });
}

type ReaderCall = {
  called: boolean;
  otherTenantRowReturned: boolean | null;
  detail: string;
  whereHadOrganizationId: boolean | null;
};

const READER_GLOBALS = globalThis as typeof globalThis & {
  __ISALWA_ACCEPTANCE_PRISMA?: {
    account: { findMany: (args: { where?: unknown }) => Promise<readonly Record<string, unknown>[]> };
    product: { findMany: (args: { where?: unknown }) => Promise<readonly Record<string, unknown>[]> };
    quote: { findMany: (args: { where?: unknown }) => Promise<readonly Record<string, unknown>[]> };
  };
};

function whereHasOrganizationId(where: unknown): boolean {
  return JSON.stringify(where ?? null).includes('organizationId');
}

async function bundleReader(
  entry: string,
  outfile: string,
  databaseFixture: string,
  unusedIdFixture: string,
): Promise<void> {
  const specifier = 'esbuild';
  const esbuild = (await import(specifier)) as {
    build: (options: object) => Promise<unknown>;
  };
  const domainSource = path.join(WORKTREE_ROOT, 'packages/domain/src/index.ts');
  const contractsSource = path.join(WORKTREE_ROOT, 'packages/contracts/src/index.ts');
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    tsconfigRaw: {
      compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
    },
    external: ['@nestjs/common'],
    plugins: [
      {
        name: 'acceptance-fixture',
        setup(build: {
          onResolve: (
            options: { filter: RegExp },
            callback: () => { path: string },
          ) => void;
        }) {
          // Read methods close over getPrisma. The id helper is imported but unused by the lists.
          build.onResolve({ filter: /^@isalwa\/database$/ }, () => ({ path: databaseFixture }));
          build.onResolve({ filter: /^@isalwa\/ts-utils$/ }, () => ({ path: unusedIdFixture }));
          build.onResolve({ filter: /^@isalwa\/domain$/ }, () => ({ path: domainSource }));
          build.onResolve({ filter: /^@isalwa\/contracts$/ }, () => ({ path: contractsSource }));
        },
      },
    ],
  });
}

async function probeClosedOverReaders(): Promise<{
  search: ReaderCall;
  commerce: ReaderCall;
}> {
  const cacheDir = path.join(
    WORKTREE_ROOT,
    'packages/os-domain/node_modules/.cache/acceptance-harness',
  );
  mkdirSync(cacheDir, { recursive: true });
  const databaseFixture = path.join(cacheDir, 'database-fixture.mjs');
  const unusedIdFixture = path.join(cacheDir, 'unused-id-fixture.mjs');
  writeFileSync(
    databaseFixture,
    [
      'export function getPrisma() {',
      '  return globalThis.__ISALWA_ACCEPTANCE_PRISMA ?? null;',
      '}',
      'export async function emitCommercialEvent() { return undefined; }',
      '',
    ].join('\n'),
  );
  writeFileSync(
    unusedIdFixture,
    [
      'export function createId() {',
      "  throw new Error('createId is not used by the list probes');",
      '}',
      '',
    ].join('\n'),
  );
  const observed: { account?: unknown; product?: unknown; quote?: unknown } = {};
  READER_GLOBALS.__ISALWA_ACCEPTANCE_PRISMA = {
    account: {
      findMany: async (args) => {
        observed.account = args?.where ?? null;
        return [
          {
            id: FIXTURE_OTHER_ACCOUNT_ID,
            legalName: 'ZetaFixtureWorks',
            tradeName: FIXTURE_OTHER_LABEL,
            code: 'FX-ZETA',
            segment: 'fixture',
            relationshipScore: 1,
          },
        ];
      },
    },
    product: {
      findMany: async (args) => {
        observed.product = args?.where ?? null;
        return [
          {
            id: FIXTURE_OTHER_PRODUCT_ID,
            name: FIXTURE_OTHER_LABEL,
            sku: 'FX-ZETA-SHAPE',
            listPriceCentavos: 0,
            category: { name: 'fixture' },
          },
        ];
      },
    },
    quote: {
      findMany: async (args) => {
        observed.quote = args?.where ?? null;
        return [
          {
            id: FIXTURE_OTHER_QUOTE_ID,
            number: 'Q-FIXTURE-ZETA',
            status: 'draft',
            accountId: FIXTURE_OTHER_ACCOUNT_ID,
            totalCentavos: 0,
            createdAt: new Date('2026-01-03T00:00:00.000Z'),
            sentAt: null,
            account: { tradeName: FIXTURE_OTHER_LABEL, legalName: 'ZetaFixtureWorks' },
            items: [{}],
          },
        ];
      },
    },
  };
  try {
    const searchOut = path.join(cacheDir, 'search.mjs');
    const commerceOut = path.join(cacheDir, 'commerce.mjs');
    await bundleReader(
      path.join(WORKTREE_ROOT, 'apps/api/src/search/search.controller.ts'),
      searchOut,
      databaseFixture,
      unusedIdFixture,
    );
    await bundleReader(
      path.join(WORKTREE_ROOT, 'apps/api/src/commerce/commerce.service.ts'),
      commerceOut,
      databaseFixture,
      unusedIdFixture,
    );
    const searchMod = await importFile(searchOut);
    const commerceMod = await importFile(commerceOut);
    const SearchController = searchMod.SearchController as new () => {
      search: (q?: string, limit?: string) => Promise<unknown>;
    };
    const CommerceService = commerceMod.CommerceService as new (providers: object) => {
      listProducts: (q?: string) => Promise<unknown>;
      listQuotes: (accountId?: string) => Promise<unknown>;
    };
    const searched = await new SearchController().search(FIXTURE_PREFIX, '10');
    const service = new CommerceService({});
    const products = await service.listProducts(FIXTURE_PREFIX);
    const quotes = await service.listQuotes(FIXTURE_OTHER_ACCOUNT_ID);
    const searchLeaked = containsOtherTenant(searched);
    const commerceLeaked = containsOtherTenant(products) || containsOtherTenant(quotes);
    return {
      search: {
        called: true,
        otherTenantRowReturned: searchLeaked,
        whereHadOrganizationId: whereHasOrganizationId(observed.account),
        detail: searchLeaked
          ? 'SearchController.search returned the other fixture tenant row for a prefix query. Not a pass of isolation.'
          : 'SearchController.search ran and did not return the other fixture row in this call. Hosted acceptance has not started, so this is not a pass.',
      },
      commerce: {
        called: true,
        otherTenantRowReturned: commerceLeaked,
        whereHadOrganizationId:
          whereHasOrganizationId(observed.product) || whereHasOrganizationId(observed.quote),
        detail: commerceLeaked
          ? 'listProducts and listQuotes returned the other fixture tenant row. Neither query is an organization predicate. Not a pass of isolation.'
          : 'Commerce list methods ran and did not return the other fixture row in this call. Hosted acceptance has not started, so this is not a pass.',
      },
    };
  } finally {
    delete READER_GLOBALS.__ISALWA_ACCEPTANCE_PRISMA;
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

async function safeProbe(id: UnscopedFunctionId, run: () => Promise<FunctionProbe>): Promise<FunctionProbe> {
  try {
    return await run();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'import or call failed';
    return finishProbe({
      id,
      called: false,
      otherTenantRowReturned: null,
      detail: `Could not execute without editing the owned file or a hosted database. ${message} Hosted acceptance has not started, so this is not a pass.`,
    });
  }
}

function gateRow(id: string, organizationId: string, label: string) {
  return { id, organizationId, label };
}

function runGateChecks(): InProcessGateCheck[] {
  const surface: TenantSurface = 'customer';
  const requiredScope = TENANT_SURFACE_REQUIRED_SCOPE[surface];
  const rows = [
    gateRow('fixture-row-zeta', FIXTURE_OTHER_ORG_ID, FIXTURE_OTHER_LABEL),
    gateRow('fixture-row-alpha', FIXTURE_SESSION_ORG_ID, FIXTURE_SESSION_LABEL),
  ];
  const sameTenantRight = readTenantSurface({
    surface,
    sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
    resourceOrganizationId: FIXTURE_SESSION_ORG_ID,
    grantedScopes: [requiredScope],
    requiredScope,
    rows,
    query: FIXTURE_PREFIX,
  });
  const sameTenantWrong = readTenantSurface({
    surface,
    sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
    resourceOrganizationId: FIXTURE_SESSION_ORG_ID,
    grantedScopes: ['people.admin'],
    requiredScope,
    rows,
    query: FIXTURE_PREFIX,
  });
  const wrongTenant = readTenantSurface({
    surface,
    sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
    resourceOrganizationId: FIXTURE_OTHER_ORG_ID,
    grantedScopes: [requiredScope],
    requiredScope,
    rows,
    query: FIXTURE_PREFIX,
  });
  const noAuth = readTenantSurface({
    surface,
    sessionOrganizationId: null,
    resourceOrganizationId: FIXTURE_OTHER_ORG_ID,
    grantedScopes: [requiredScope],
    requiredScope,
    rows,
    query: FIXTURE_PREFIX,
  });
  const quickRecent = readTenantSurface({
    surface,
    sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
    resourceOrganizationId: FIXTURE_SESSION_ORG_ID,
    grantedScopes: [requiredScope],
    requiredScope,
    rows,
  });
  const commandCenter = readTenantSurface({
    surface: 'management_command_center',
    sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
    resourceOrganizationId: FIXTURE_SESSION_ORG_ID,
    grantedScopes: [TENANT_SURFACE_REQUIRED_SCOPE.management_command_center],
    requiredScope: TENANT_SURFACE_REQUIRED_SCOPE.management_command_center,
    rows,
    query: FIXTURE_PREFIX,
  });
  return [
    {
      id: 'same-tenant-right-capability',
      held: sameTenantRight.ok && !containsOtherTenant(sameTenantRight),
      code: sameTenantRight.code,
      certifiesLiveIsolation: false,
    },
    {
      id: 'same-tenant-wrong-capability',
      held: !sameTenantWrong.ok && sameTenantWrong.code === 'ROLE_FORBIDDEN' && sameTenantWrong.count === 0,
      code: sameTenantWrong.code,
      certifiesLiveIsolation: false,
    },
    {
      id: 'wrong-tenant-right-capability',
      held: !wrongTenant.ok && wrongTenant.code === 'TENANT_FORBIDDEN' && wrongTenant.count === 0,
      code: wrongTenant.code,
      certifiesLiveIsolation: false,
    },
    {
      id: 'no-auth',
      held: !noAuth.ok && noAuth.code === 'AUTH_REQUIRED' && noAuth.count === 0,
      code: noAuth.code,
      certifiesLiveIsolation: false,
    },
    {
      id: 'quick-view-and-recent',
      held:
        quickRecent.ok &&
        !containsOtherTenant(quickRecent.quickView) &&
        !containsOtherTenant(quickRecent.recent),
      code: quickRecent.code,
      certifiesLiveIsolation: false,
    },
    {
      id: 'management-command-center-gate',
      held: commandCenter.ok && !containsOtherTenant(commandCenter),
      code: commandCenter.code,
      certifiesLiveIsolation: false,
    },
  ];
}

function caseResult(
  id: RequiredNegativeCaseId,
  called: readonly string[],
  otherTenantRowReturned: boolean | null,
  detail: string,
): NegativeCaseResult {
  return {
    id,
    status: verdictForObservedCall({ otherTenantRowReturned }),
    proofState: 'UNPROVEN',
    called,
    otherTenantRowReturned,
    detail,
  };
}

function leakedFlag(probe: FunctionProbe | undefined): boolean | null {
  return probe?.otherTenantRowReturned ?? null;
}

function anyLeaked(flags: readonly (boolean | null)[]): boolean | null {
  if (flags.some((flag) => flag === true)) return true;
  if (flags.every((flag) => flag === false)) return false;
  if (flags.every((flag) => flag === null)) return null;
  return flags.some((flag) => flag === true) ? true : null;
}

async function executeHarness(): Promise<AcceptanceHarnessResult> {
  const [questions, contacts, timeline, readers] = await Promise.all([
    safeProbe('listUnconfirmedCustomerQuestions', probeQuestions),
    safeProbe('matchingContacts', probeContacts),
    safeProbe('listAccountTimeline', probeTimeline),
    probeClosedOverReaders()
      .then((value) => value)
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'import or call failed';
        const missed: ReaderCall = {
          called: false,
          otherTenantRowReturned: null,
          whereHadOrganizationId: null,
          detail: `Could not execute without editing the owned file or a hosted database. ${message} Hosted acceptance has not started, so this is not a pass.`,
        };
        return { search: missed, commerce: missed };
      }),
  ]);
  const search = finishProbe({
    id: 'SearchController.search',
    called: readers.search.called,
    otherTenantRowReturned: readers.search.otherTenantRowReturned,
    detail: readers.search.detail,
  });
  const commerce = finishProbe({
    id: 'CommerceService.listProducts and listQuotes',
    called: readers.commerce.called,
    otherTenantRowReturned: readers.commerce.otherTenantRowReturned,
    detail: readers.commerce.detail,
  });
  const unscopedFunctions = [search, commerce, timeline, questions, contacts];
  const gate = runGateChecks();
  const searchLeak = leakedFlag(search);
  const commerceLeak = leakedFlag(commerce);
  const timelineLeak = leakedFlag(timeline);
  const questionLeak = leakedFlag(questions);
  const contactLeak = leakedFlag(contacts);
  const liveLeak = anyLeaked([searchLeak, commerceLeak, timelineLeak, questionLeak, contactLeak]);

  const cases: NegativeCaseResult[] = [
    caseResult(
      'same-tenant-right-capability',
      ['readTenantSurface', 'SearchController.search'],
      anyLeaked([searchLeak, commerceLeak]),
      'In-process gate was called. Live list methods do not take a capability argument. A gate hold does not certify them.',
    ),
    caseResult(
      'same-tenant-wrong-capability',
      ['readTenantSurface', 'SearchController.search'],
      anyLeaked([searchLeak, commerceLeak]),
      'In-process gate denies a sibling scope. Live list methods were not given a capability check. Not hosted proof.',
    ),
    caseResult(
      'wrong-tenant-right-capability',
      UNSCOPED_FUNCTION_IDS,
      liveLeak,
      'In-process gate denies a cross-tenant resource id. Known unscoped readers can still return the other fixture tenant.',
    ),
    caseResult(
      'no-auth',
      ['readTenantSurface', 'SearchController.search', 'CommerceService.listProducts', 'CommerceService.listQuotes'],
      anyLeaked([searchLeak, commerceLeak]),
      'In-process gate requires a session organization. The closed-over list methods were called without a session and are not hosted proof.',
    ),
    caseResult(
      'direct-api',
      ['SearchController.search', 'CommerceService.listProducts', 'CommerceService.listQuotes'],
      anyLeaked([searchLeak, commerceLeak]),
      search.detail,
    ),
    caseResult(
      'direct-resource-id',
      ['listAccountTimeline', 'CommerceService.listQuotes'],
      anyLeaked([timelineLeak, commerceLeak]),
      timeline.detail,
    ),
    caseResult(
      'search-prefix',
      ['SearchController.search', 'matchingContacts'],
      anyLeaked([searchLeak, contactLeak]),
      'Prefix query was sent to the live search method and to matchingContacts.',
    ),
    caseResult(
      'autocomplete',
      ['matchingContacts', 'SearchController.search'],
      anyLeaked([contactLeak, searchLeak]),
      contacts.detail,
    ),
    caseResult(
      'normalized-email-phone',
      ['matchingContacts'],
      contactLeak,
      'Folded email and digit-only phone were sent to matchingContacts. The contact type has no organizationId.',
    ),
    caseResult(
      'count',
      ['CommerceService.listProducts', 'CommerceService.listQuotes', 'SearchController.search'],
      anyLeaked([commerceLeak, searchLeak]),
      'No organization-scoped count was proven. A count of an unscoped list would include the other fixture tenant.',
    ),
    caseResult(
      'aggregate',
      ['CommerceService.listProducts', 'CommerceService.listQuotes'],
      commerceLeak,
      'No organization-scoped aggregate function was imported. Unscoped list results are not an aggregate proof.',
    ),
    caseResult(
      'pagination',
      ['SearchController.search', 'CommerceService.listProducts', 'CommerceService.listQuotes', 'listAccountTimeline'],
      anyLeaked([searchLeak, commerceLeak, timelineLeak]),
      'Limit and take were exercised on readers that do not add an organization predicate.',
    ),
    caseResult(
      'sort',
      ['SearchController.search', 'CommerceService.listProducts', 'CommerceService.listQuotes'],
      anyLeaked([searchLeak, commerceLeak]),
      'Ordering ran without an organization predicate.',
    ),
    caseResult(
      'filter',
      ['SearchController.search', 'CommerceService.listProducts', 'CommerceService.listQuotes', 'listUnconfirmedCustomerQuestions'],
      anyLeaked([searchLeak, commerceLeak, questionLeak]),
      'Text, account id, and question filters do not apply an organization predicate.',
    ),
    caseResult(
      'quick-view',
      ['readTenantSurface'],
      null,
      'Only the in-process gate quick view was called. No hosted quick view ran. A gate hold is not hosted proof.',
    ),
    caseResult(
      'recent-items',
      ['readTenantSurface'],
      null,
      'Only the in-process gate recent list was called. Hosted recents have not been reviewed.',
    ),
    caseResult(
      'command-palette',
      ['matchingContacts'],
      contactLeak,
      'matchingContacts feeds palette extensions and returned the other fixture contact. searchPalette needs a hosted session and was not called.',
    ),
    caseResult(
      'role-command-center',
      ['readTenantSurface'],
      null,
      'The in-process command-center gate was called. The hosted Gerencia surface has not been reviewed.',
    ),
  ];

  const journeys: JourneyChecklistItem[] = OPERATING_JOURNEYS.map((journey) => ({
    id: journey.id,
    label: journey.label,
    status: 'UNPROVEN',
    proofState: 'UNPROVEN',
    hostedReviewerRequired: true,
  }));

  return {
    pinnedSha: PINNED_SHA,
    fixtures: {
      sessionOrganizationId: FIXTURE_SESSION_ORG_ID,
      otherOrganizationId: FIXTURE_OTHER_ORG_ID,
      synthetic: true,
      usesRealCustomers: false,
    },
    hostedAcceptanceStarted: false,
    browserVerified: false,
    safeForIsa: false,
    liveTenantIsolationPassed: false,
    proof: {
      current: 'UNPROVEN',
      hostedAcceptance: 'UNPROVEN',
      browserVerified: false,
      userAccepted: false,
      safeForIsa: false,
      liveTenantIsolation: 'UNPROVEN',
    },
    summary: {
      pass: cases.filter((item) => item.status === 'PASS').length,
      unproven: cases.filter((item) => item.status === 'UNPROVEN').length,
      fail: cases.filter((item) => item.status === 'FAIL').length,
    },
    cases,
    unscopedFunctions,
    journeys,
    inProcessGate: {
      certifiesLiveIsolation: false,
      hostedAcceptance: 'UNPROVEN',
      checks: gate,
    },
    note: 'Hosted acceptance has not started. UNPROVEN is not a pass of tenant isolation. An in-process gate hold does not certify live readers.',
  };
}

let cached: Promise<AcceptanceHarnessResult> | null = null;

export function runHostedAcceptanceHarness(): Promise<AcceptanceHarnessResult> {
  cached ??= executeHarness();
  return cached;
}
