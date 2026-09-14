/**
 * Account and product search. The tenant predicate is the session organization
 * already bound by authentication. A caller-supplied organizationId is not an
 * input and must not widen the query.
 *
 * Scope strings match TENANT_SURFACE_REQUIRED_SCOPE: global_search and product.
 */

export const ACCOUNT_SEARCH_SCOPE = 'commercial.team.read';
export const PRODUCT_SEARCH_SCOPE = 'master_data.admin';

export type TrustedSearchSession = {
  readonly organizationId: string;
  readonly grantedScopes: readonly string[];
};

export {
  holdsExactScope,
  sessionFromAuthenticatedRequest,
  trustedOrganizationId,
} from '../auth/trusted-session';

export type SearchDenialCode = 'AUTH_REQUIRED' | 'ROLE_FORBIDDEN';

export type SearchHit = {
  id: string;
  type: 'account' | 'product';
  title: string;
  subtitle: string;
  href: string;
};

export type AccountSearchRow = {
  id: string;
  organizationId: string;
  code: string;
  legalName: string;
  tradeName: string | null;
  segment: string;
  relationshipScore: number;
};

export type ProductSearchRow = {
  id: string;
  organizationId: string;
  name: string;
  sku: string;
};

export type AccountFindManyArgs = {
  where: {
    organizationId: string;
    OR: Array<Record<string, { contains: string; mode: 'insensitive' }>>;
  };
  take: number;
  orderBy: { relationshipScore: 'desc' };
};

export type ProductFindManyArgs = {
  where: {
    organizationId: string;
    OR: Array<Record<string, { contains: string; mode: 'insensitive' }>>;
  };
  take: number;
};

export type SearchReadDb = {
  account: {
    findMany: (args: AccountFindManyArgs) => Promise<AccountSearchRow[]>;
  };
  product: {
    findMany: (args: ProductFindManyArgs) => Promise<ProductSearchRow[]>;
  };
};

export type SearchReadResult = {
  results: SearchHit[];
  code: SearchDenialCode | null;
  count: number;
  suggestions: SearchHit[];
  autocomplete: SearchHit[];
};

export type AuthenticatedSearchRequest = {
  authenticatedSession?: unknown;
  query?: { organizationId?: string };
  readDb?: SearchReadDb | null;
};

const EMPTY: SearchReadResult = {
  results: [],
  code: null,
  count: 0,
  suggestions: [],
  autocomplete: [],
};

function denied(code: SearchDenialCode): SearchReadResult {
  return { ...EMPTY, code };
}


function contains(field: string, needle: string): Record<string, { contains: string; mode: 'insensitive' }> {
  return { [field]: { contains: needle, mode: 'insensitive' } };
}

export async function searchAccountsAndProducts(input: {
  query: string;
  limit: string | number;
  session: TrustedSearchSession | null | undefined;
  db: SearchReadDb | null;
  rankAccount: (account: AccountSearchRow, needle: string) => number;
}): Promise<SearchReadResult> {
  const organizationId = trustedOrganizationId(input.session);
  if (!organizationId || !input.session) return denied('AUTH_REQUIRED');

  const canSearchAccounts = holdsExactScope(input.session.grantedScopes, ACCOUNT_SEARCH_SCOPE);
  const canSearchProducts = holdsExactScope(input.session.grantedScopes, PRODUCT_SEARCH_SCOPE);
  if (!canSearchAccounts && !canSearchProducts) return denied('ROLE_FORBIDDEN');

  const needle = input.query.trim();
  if (!needle || !input.db) return { ...EMPTY };

  const take = Math.min(Number(input.limit) || 10, 25);
  const [accounts, products] = await Promise.all([
    canSearchAccounts
      ? input.db.account.findMany({
          where: {
            organizationId,
            OR: [contains('legalName', needle), contains('tradeName', needle), contains('code', needle)],
          },
          take: Math.min(take * 4, 40),
          orderBy: { relationshipScore: 'desc' },
        })
      : Promise.resolve([]),
    canSearchProducts
      ? input.db.product.findMany({
          where: {
            organizationId,
            OR: [contains('name', needle), contains('sku', needle)],
          },
          take: 5,
        })
      : Promise.resolve([]),
  ]);

  const ranked = [...accounts].sort(
    (left, right) => input.rankAccount(right, needle) - input.rankAccount(left, needle),
  );
  const results: SearchHit[] = [
    ...ranked.slice(0, take).map((account) => ({
      id: account.id,
      type: 'account' as const,
      title: account.tradeName ?? account.legalName,
      subtitle: `${account.code} · Segmento ${account.segment} · Score ${account.relationshipScore}`,
      href: `/personas/${account.id}`,
    })),
    ...products.map((product) => ({
      id: product.id,
      type: 'product' as const,
      title: product.name,
      subtitle: product.sku,
      href: `/cierre?product=${product.id}`,
    })),
  ];

  return {
    results,
    code: null,
    count: results.length,
    suggestions: results,
    autocomplete: results,
  };
}
