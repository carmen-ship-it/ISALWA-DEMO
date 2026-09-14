import {
  CatalogProductRecordSchema,
  assertNoForbiddenProductFields,
  type CatalogCandidate,
  type CatalogPreview,
  type CatalogProductRecord,
  type ProductStatusEvent,
} from '../../os-contracts/src/product-catalog';

export class ProductCatalogError extends Error {
  constructor(
    readonly code: 'organization_required' | 'product_not_in_organization' | 'forbidden_field',
  ) {
    super(code);
    this.name = 'ProductCatalogError';
  }
}

function requireOrganization(organizationId: string): string {
  const org = organizationId.trim();
  if (!org) throw new ProductCatalogError('organization_required');
  return org;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function toRecord(
  organizationId: string,
  candidate: CatalogCandidate,
  registeredAt: string,
): CatalogProductRecord {
  const history: ProductStatusEvent[] = [
    { at: registeredAt, active: true, reason: 'registered' },
  ];
  return CatalogProductRecordSchema.parse({
    id: candidate.id,
    organizationId,
    businessCode: candidate.businessCode,
    name: candidate.name,
    category: candidate.category,
    description: candidate.description,
    active: true,
    provenance: candidate.provenance,
    canonicalKey: candidate.canonicalKey,
    attributes: candidate.attributes,
    reviewStatus: candidate.reviewStatus,
    reviewNotes: candidate.reviewNotes,
    deactivatedAt: null,
    statusHistory: history,
  });
}

/**
 * In-memory master. Does not open a database and does not execute an import job.
 * The same candidate id may exist in two organizations. Reads never cross organizations.
 */
export class MemoryProductCatalog {
  private readonly rows = new Map<string, CatalogProductRecord>();

  private key(organizationId: string, productId: string): string {
    return `${organizationId}\0${productId}`;
  }

  registerPreview(
    organizationId: string,
    preview: CatalogPreview,
    registeredAt: string,
  ): CatalogProductRecord[] {
    const org = requireOrganization(organizationId);
    assertNoForbiddenProductFields(preview);
    const registered: CatalogProductRecord[] = [];
    for (const candidate of preview.products) {
      const key = this.key(org, candidate.id);
      const existing = this.rows.get(key);
      if (existing) {
        registered.push(clone(existing));
        continue;
      }
      const row = toRecord(org, candidate, registeredAt);
      this.rows.set(key, row);
      registered.push(clone(row));
    }
    return registered;
  }

  list(organizationId: string): CatalogProductRecord[] {
    const org = requireOrganization(organizationId);
    return [...this.rows.values()]
      .filter((row) => row.organizationId === org)
      .map((row) => clone(row))
      .sort((left, right) => left.canonicalKey.localeCompare(right.canonicalKey));
  }

  get(organizationId: string, productId: string): CatalogProductRecord | null {
    const org = requireOrganization(organizationId);
    const row = this.rows.get(this.key(org, productId));
    return row ? clone(row) : null;
  }

  /**
   * Sets active to false and appends a status event.
   * The row, its citations, and earlier events stay.
   * A missing row and a row that belongs to another organization are the same error.
   */
  deactivate(
    organizationId: string,
    productId: string,
    at: string,
  ): CatalogProductRecord {
    const org = requireOrganization(organizationId);
    const row = this.rows.get(this.key(org, productId));
    if (!row) throw new ProductCatalogError('product_not_in_organization');
    if (!row.active) return clone(row);
    row.active = false;
    row.deactivatedAt = at;
    row.statusHistory.push({ at, active: false, reason: 'deactivated' });
    return clone(row);
  }
}
