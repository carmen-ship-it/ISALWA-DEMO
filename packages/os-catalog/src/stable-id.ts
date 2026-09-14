import { createHash } from 'node:crypto';

const ID_PREFIX = 'isalwa-product-catalog:v1:';

/** Stable across preview rebuilds. Not derived from a commercial code. */
export function stableProductId(canonicalKey: string): string {
  const digest = createHash('sha256').update(`${ID_PREFIX}${canonicalKey}`).digest('hex');
  return `prd_${digest.slice(0, 24)}`;
}
